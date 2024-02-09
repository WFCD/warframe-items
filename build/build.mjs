import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import minify from 'imagemin';
import minifyPng from 'imagemin-pngquant';
import minifyJpeg from 'imagemin-jpegtran';
import fetch from 'node-fetch';
import sharp from 'sharp';

import Progress from './progress.mjs';
import stringify from './stringify.mjs';
import scraper from './scraper.mjs';
import parser from './parser.mjs';
import hashManager from './hashManager.mjs';
import readJson from './readJson.mjs';

const imageCache = await readJson(new URL('../data/cache/.images.json', import.meta.url));

const allowedCustomCategories = ['SentinelWeapons'];

const get = async (url, binary = true) => {
  const res = await fetch(url);
  return binary ? res.buffer() : res.text();
};

const force = process.argv.slice(2).some((arg) => ['--force', '-f'].includes(arg)) || process.env.FORCE === 'true';

class Build {
  async init() {
    await scraper.checkOriginServerAvailability();

    await hashManager.updateExportCache();
    if (!force && hashManager.isUpdated) {
      console.log('Data already up-to-date');
      return;
    }

    const resources = await scraper.fetchResources();
    /** @type {RawItemData} */
    const raw = {
      api: resources.en,
      manifest: await scraper.fetchImageManifest(),
      drops: await scraper.fetchDropRates(),
      patchlogs: await scraper.fetchPatchLogs(),
      wikia: await scraper.fetchWikiaData(),
      vaultData: await scraper.fetchVaultData(),
      relics: await scraper.generateRelicData(),
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
    // eslint-disable-next-line no-restricted-syntax
    for (const warning of Object.keys(parsed.warnings)) {
      warningNum += parsed.warnings[warning].length;
    }

    await hashManager.saveExportCache();

    console.log(`\nFinished with ${warningNum} warnings.`);
  }

  /**
   * DE's data categories are a bit vague, so we'll use the ones
   * we generated in item.category instead. (parser.addCategory)
   * @param {Array<module:warframe-items.Item>} data items to parse out
   * @returns {Object<string, Array<module:warframe-items.Item>>}
   */
  applyCustomCategories(data) {
    const result = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of data) {
      if (chunk.category === 'Recipes') continue; // Skip blueprints

      for (let i = 0; i < chunk.data.length; i += 1) {
        const item = chunk.data[i];

        // write an additional file for the desired custom categories
        if (item.productCategory && allowedCustomCategories.includes(item.productCategory)) {
          if (result[item.productCategory]) {
            result[item.productCategory].push(item);
          } else {
            result[item.productCategory] = [item];
          }
          continue;
        }

        if (result[item.category]) {
          result[item.category].push(item);
        } else {
          result[item.category] = [item];
        }
      }
    }

    return result;
  }

  /**
   * Generate JSON file for each category and one for all combined.
   * @param {Object<string, Array<module:warframe-items.Item>>} categories list of categories to save and separate
   * @param {Object<Partial<module:warframe-items.Item>>} i18n internationalization partials of Items
   * @returns {Array<module:warframe-items.Item>}
   * @async
   */
  async saveJson(categories, i18n) {
    let all = [];
    const sort = (a, b) => {
      if (!a.name) console.log(a);
      const res = a.name.localeCompare(b.name);
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName);
      }
      return res;
    };

    // Category names are provided by this.applyCustomCategories
    // eslint-disable-next-line no-restricted-syntax
    for (const category of Object.keys(categories)) {
      const data = categories[category].sort(sort);
      all = all.concat(data);
      await fs.writeFile(
        new URL(`../data/json/${category}.json`, import.meta.url),
        JSON.stringify(JSON.parse(stringify(data)))
      );
    }

    // All.json (all items in one file)
    all.sort(sort);
    await fs.writeFile(new URL('../data/json/All.json', import.meta.url), stringify(all));
    await fs.writeFile(new URL('../data/json/i18n.json', import.meta.url), stringify(i18n));

    return all;
  }

  /**
   * @typedef {Object} Warnings
   * @property {Array<module:warframe-items.Item.name>} missingImage list of item names for those missing images
   * @property {Array<string>} missingDucats list of item names for those missing ducat values
   * @property {Array<module:warframe-items.Item.name>} missingComponents list of item names for those
   *    missing components (usually weapons)
   * @property {Array<string<module:warframe-items.Item.name>>} missingVaultData list
   *  of item names for those missing vault data
   * @property {Array<Array<module:warframe-items.Item.name, module:warframe-items.Polarity>>} polarity
   *  list of item names for those missing polarities
   * @property {Array<module:warframe-items.Item.name>} missingType list of item names for those missing item types
   * @property {Array<module:warframe-items.Item.name>} failedImage list of item names for those
   *    whose image download failed
   * @property {Array<module:warframe-items.Item.name>} missingWikiThumb list of item names for those
   *    missing images from the fandom wikia
   */

  /**
   * Store warnings during parse process to disk
   * @param {Warnings} warnings warnings to save to file
   */
  async saveWarnings(warnings) {
    return fs.writeFile(new URL('../data/warnings.json', import.meta.url), stringify(warnings));
  }

  /**
   * Get all images unless hashes match with existing images
   * @param {Array<module:warframe-items.Item>} items items to append images to
   * @param {ImageManifest.Manifest} manifest image manifest to look up items from
   * @async
   */
  async saveImages(items, manifest) {
    // No need to go through every item if the manifest didn't change. I'm
    // guessing the `fileTime` key in each element works more or less like a
    // hash, so any change to that changes the hash of the full thing.
    if (!hashManager.hasChanged('Manifest')) return;
    const bar = new Progress('Fetching Images', items.length);
    const duplicates = []; // Don't download component images or relics twice

    // eslint-disable-next-line no-restricted-syntax
    for (const item of items) {
      // Save image for parent item
      await this.saveImage(item, false, duplicates, manifest);
      // Save images for components if necessary
      if (item.components) {
        // eslint-disable-next-line no-restricted-syntax
        for (const component of item.components) {
          await this.saveImage(component, true, duplicates, manifest);
        }
      }
      // Save images for abilities
      if (item.abilities) {
        // eslint-disable-next-line no-restricted-syntax
        for (const ability of item.abilities) {
          await this.saveImage(ability, false, duplicates, manifest);
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
   * @param {module:warframe-items.Item} item to determine and save an image for
   * @param {boolean} isComponent whether the item is a component or a parent
   * @param {Array<module:warframe-items.Item.imageName>} duplicates list of duplicated (already existing) image names
   * @param {ImageManifest.Manifest} manifest image lookup list
   * @async
   */
  async saveImage(item, isComponent, duplicates, manifest) {
    const imageBase = manifest.find((i) => i.uniqueName === item.uniqueName);
    if (!imageBase) return;
    const imageStub = imageBase.textureLocation.replace(/\\/g, '/').replace('xport/', '');
    const imageUrl = `https://content.warframe.com/PublicExport/${imageStub}`;
    const basePath = fileURLToPath(new URL('../data/img/', import.meta.url));
    const filePath = path.join(basePath, item.imageName);
    const hash = manifest.find((i) => i.uniqueName === item.uniqueName).fileTime;
    const cached = imageCache.find((c) => c.uniqueName === item.uniqueName);

    // We'll use a custom blueprint image
    if (item.name === 'Blueprint') return;

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
        const retry = (err) => {
          if (err.code === 'ENOTFOUND') {
            return get(imageUrl);
          }

          throw err;
        };
        const image = await get(imageUrl).catch(retry).catch(retry);
        this.updateCache(item, cached, hash, isComponent);

        await sharp(image).toFile(filePath);
        await minify([filePath], {
          destination: basePath,
          plugins: [
            minifyJpeg(),
            minifyPng({
              quality: [0.2, 0.4],
            }),
          ],
        });
      } catch (e) {
        // swallow error
        console.error(e);
      }
    }
  }

  /**
   * A Cached Item
   * @typedef {Object} CachedItem
   * @property {module:warframe-items.Item.uniqueName} uniqueName unique name corresponding to the item's
   *    {@link module:warframe-items.Item.uniqueName|uniqueName}
   * @property {string} hash Corresponding hash of the item representing the item
   * @property {boolean} isComponent whether this item is a component
   */
  /**
   * Update image cache with new hash if things changed
   * @param {module:warframe-items.Item} item item to add to the cache
   * @param {Iterable<CachedItem>} cached list of existing cached items
   * @param {CachedItem.hash} hash of an existing cached item
   * @param {CachedItem.isComponent} isComponent whether the item to be cached is a component
   */
  updateCache(item, cached, hash, isComponent) {
    if (!cached) {
      imageCache.push({
        uniqueName: item.uniqueName,
        hash,
        isComponent,
      });
    } else {
      cached.hash = hash;
      cached.isComponent = isComponent;
    }
  }

  /**
   * Update readme with newest patchlog version
   * @param {module:warframe-patchlogs.Patchlogs} patchlogs for pulling the latest update
   */
  async updateReadme(patchlogs) {
    const logob64 = await readJson(new URL('../data/logo.json', import.meta.url));
    const version = patchlogs.posts[0].name
      .replace(/ \+ /g, '--')
      .replace(/[^0-9\-.]/g, '')
      .trim();
    const { url } = patchlogs.posts[0];
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
build.init();
