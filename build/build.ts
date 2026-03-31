import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import minify from 'imagemin';
import minifyPng from 'imagemin-pngquant';
import minifyJpeg from 'imagemin-jpegtran';
import fetch from 'node-fetch';
import sharp from 'sharp';

import Progress from './progress';
import stringify from './stringify';
import scraper from './scraper';
import parser from './parser';
import hashManager from './hashManager';
import readJson from './readJson';

import type {
  RawItemData,
  Item,
  ImageManifest,
  Warnings,
  CachedItem,
  PatchlogWrap,
  CategoryData,
  ApiCategory,
} from './types/shared';

let imageCache: CachedItem[] = [];

const allowedCustomCategories = ['SentinelWeapons'];

const get = async (url: string, binary = true): Promise<Buffer | string> => {
  const res = await fetch(url);
  return binary ? res.buffer() : res.text();
};

const force = process.argv.slice(2).some((arg) => ['--force', '-f'].includes(arg)) || process.env.FORCE === 'true';

class Build {
  async init(): Promise<void> {
    // Load image cache
    imageCache = await readJson<CachedItem[]>(new URL('../data/cache/.images.json', import.meta.url));

    await scraper.checkOriginServerAvailability();

    await hashManager.updateExportCache();
    if (!force && hashManager.isUpdated) {
      console.log('Data already up-to-date');
      return;
    }

    const resources = await scraper.fetchResources();
    const raw: RawItemData = {
      api: resources.en as ApiCategory[],
      manifest: (await scraper.fetchImageManifest()) as ImageManifest,
      drops: (await scraper.fetchDropRates()) as never,
      patchlogs: (await scraper.fetchPatchLogs()) as unknown as PatchlogWrap,
      wikia: await scraper.fetchWikiaData(),
      relics: ((await scraper.generateRelicData()) ?? []) as never,
      i18n: resources,
    };
    const parsed = parser.parse(raw);
    const data = this.applyCustomCategories(parsed.data);
    const i18n = parser.applyI18n(data, raw.i18n);
    const all = await this.saveJson(data, i18n);
    await this.saveWarnings(parsed.warnings);
    await this.saveImages(all, raw.manifest);
    await this.updateReadme(raw.patchlogs);

    // Log number of warnings at the end of the script
    let warningNum = 0;
    for (const warning of Object.keys(parsed.warnings)) {
      warningNum += parsed.warnings[warning as keyof Warnings].length;
    }

    await hashManager.saveExportCache();

    console.log(`\nFinished with ${String(warningNum)} warnings.`);
  }

  /**
   * DE's data categories are a bit vague, so we'll use the ones
   * we generated in item.category instead. (parser.addCategory)
   * @param data items to parse out
   * @returns categorized items
   */
  applyCustomCategories(data: CategoryData[]): Record<string, Item[]> {
    const result: Record<string, Item[]> = {};
    for (const chunk of data) {
      if (chunk.category === 'Recipes') continue; // Skip blueprints

      for (const item of chunk.data) {
        if (!item) continue;

        // write an additional file for the desired custom categories
        if (item.productCategory && allowedCustomCategories.includes(item.productCategory)) {
          if (result[item.productCategory]) {
            result[item.productCategory]?.push(item);
          } else {
            result[item.productCategory] = [item];
          }
          continue;
        }

        if (result[item.category]) {
          result[item.category]?.push(item);
        } else {
          result[item.category] = [item];
        }
      }
    }

    return result;
  }

  /**
   * Generate JSON file for each category and one for all combined.
   * @param categories list of categories to save and separate
   * @param i18n internationalization partials of Items
   * @returns all items
   */
  async saveJson(
    categories: Record<string, Item[]>,
    i18n: Record<string, Record<string, Partial<Item>>>
  ): Promise<Item[]> {
    let all: Item[] = [];
    const sort = (a: Item, b: Item): number => {
      if (!a.name) console.log(a);
      const res = a.name.localeCompare(b.name);
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName);
      }
      return res;
    };

    // Category names are provided by this.applyCustomCategories
    for (const category of Object.keys(categories)) {
      const categoryData = categories[category];
      if (!categoryData) continue;
      const data = categoryData.sort(sort);
      all = all.concat(data);
      await fs.writeFile(
        new URL(`../data/json/${category}.json`, import.meta.url),
        JSON.stringify(JSON.parse(stringify(data)))
      );
    }

    // All.json (all items in one file)
    all.sort(sort);
    await fs.writeFile(new URL('../data/json/All.json', import.meta.url), stringify(all));
    await fs.writeFile(new URL('../data/json/i18n.json', import.meta.url), JSON.stringify(JSON.parse(stringify(i18n))));

    return all;
  }

  /**
   * Store warnings during parse process to disk
   * @param warnings warnings to save to file
   */
  async saveWarnings(warnings: Warnings): Promise<void> {
    return fs.writeFile(new URL('../data/warnings.json', import.meta.url), stringify(warnings));
  }

  /**
   * Get all images unless hashes match with existing images
   * @param items items to append images to
   * @param manifest image manifest to look up items from
   */
  async saveImages(items: Item[], manifest: ImageManifest): Promise<void> {
    // No need to go through every item if the manifest didn't change. I'm
    // guessing the `fileTime` key in each element works more or less like a
    // hash, so any change to that changes the hash of the full thing.
    if (!hashManager.hasChanged('Manifest')) return;
    const bar = new Progress('Fetching Images', items.length);
    const duplicates: string[] = []; // Don't download component images or relics twice

    for (const item of items) {
      // Save image for parent item
      await this.saveImage(item, false, duplicates, manifest);
      // Save images for components if necessary
      if (item.components) {
        for (const component of item.components) {
          await this.saveImage(component, true, duplicates, manifest);
        }
      }
      // Save images for abilities
      if (item.abilities) {
        for (const ability of item.abilities) {
          await this.saveImage(ability as Item, false, duplicates, manifest);
        }
      }
      bar.tick();
    }

    // write the manifests after images have all succeeded
    hashManager.imagesUpdated = true;
    try {
      await hashManager.saveExportCache();
      // Write new cache to disk
      await hashManager.saveImageCache(imageCache);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Download and save images for items or components.
   * @param item to determine and save an image for
   * @param isComponent whether the item is a component or a parent
   * @param duplicates list of duplicated (already existing) image names
   * @param manifest image lookup list
   */
  async saveImage(item: Item, isComponent: boolean, duplicates: string[], manifest: ImageManifest): Promise<void> {
    let { uniqueName } = item;
    if (item.type === 'Nightwave Act') {
      uniqueName = item.uniqueName.replace(/[0-9]{1,3}$/, '');
    }

    const imageBase = manifest.find((i) => i.uniqueName === uniqueName);
    if (!imageBase) return;

    const imageStub = imageBase.textureLocation.replace(/\\/g, '/').replace('xport/', '');
    const imageHash = /!00_([\S]+)/.exec(imageStub);
    const imageUrl = `https://content.warframe.com/PublicExport/${imageStub}`;
    const basePath = fileURLToPath(new URL('../data/img/', import.meta.url));
    const filePath = path.join(basePath, item.imageName);
    const manifestItem = manifest.find((i) => i.uniqueName === item.uniqueName);
    const hash = manifestItem?.fileTime ?? imageHash?.[1] ?? undefined;
    const cached = imageCache.find((c) => c.uniqueName === item.uniqueName);

    // We'll use a custom blueprint image
    if (item.name === 'Blueprint' || item.name === 'Arcane') return;

    // Don't download component images or relic images twice
    if (isComponent || item.type === 'Relic') {
      if (duplicates.includes(item.imageName)) {
        return;
      }
      duplicates.push(item.imageName);
    }

    // Check if the previous image was for a component because they might
    // have different naming schemes like lex-prime
    if (!cached || cached.hash !== hash || cached.isComponent !== isComponent) {
      try {
        const retry = (err: Error & { code?: string }): Promise<Buffer | string> => {
          if (err.code === 'ENOTFOUND') {
            return get(imageUrl);
          }

          throw err;
        };
        const image = await get(imageUrl).catch(retry).catch(retry);

        await sharp(image as Buffer).toFile(filePath);
        await minify([filePath], {
          destination: basePath,
          plugins: [
            minifyJpeg(),
            minifyPng({
              quality: [0.2, 0.4],
            }),
          ],
        });

        this.updateCache(item, cached, hash, isComponent);
      } catch (e) {
        // swallow error
        console.error(e);
      }
    }
  }

  /**
   * Update image cache with new hash if things changed
   * @param item item to add to the cache
   * @param cached list of existing cached items
   * @param hash of an existing cached item
   * @param isComponent whether the item to be cached is a component
   */
  updateCache(item: Item, cached: CachedItem | undefined, hash: string | undefined, isComponent: boolean): void {
    if (!cached) {
      imageCache.push({
        uniqueName: item.uniqueName,
        hash: hash ?? '',
        isComponent,
      });
    } else {
      cached.hash = hash ?? '';
      cached.isComponent = isComponent;
    }
  }

  /**
   * Update readme with newest patchlog version
   * @param patchlogs for pulling the latest update
   */
  async updateReadme(patchlogs: PatchlogWrap): Promise<void> {
    const logob64 = await readJson<string>(new URL('../data/logo.json', import.meta.url));
    const firstPost = patchlogs.posts[0];
    if (!firstPost) return;

    const version = firstPost.name
      .replace(/ \+ /g, '--')
      .replace(/[^0-9\-.]/g, '')
      .trim();
    const { url } = firstPost;
    const readmeLocation = new URL('../README.md', import.meta.url);
    const readmeOld = await fs.readFile(readmeLocation, 'utf-8');
    const readmeNew = readmeOld.replace(
      /\[!\[warframe update.*/,
      `[![warframe update](https://img.shields.io/badge/warframe_update-${version}-blue.svg?logo=${encodeURIComponent(
        logob64
      )})](${url})`
    );
    return fs.writeFile(readmeLocation, readmeNew);
  }
}

const build = new Build();
void build.init();
