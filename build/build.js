'use strict';

const fs = require('node:fs/promises');
const path = require('path');
const crypto = require('crypto');
const minify = require('imagemin');
const minifyPng = require('imagemin-pngquant');
const minifyJpeg = require('imagemin-jpegtran');
const fetch = require('node-fetch');
const sharp = require('sharp');
const Progress = require('./progress');
const stringify = require('./stringify');
const scraper = require('./scraper');
const parser = require('./parser');
const imageCache = require('../data/cache/.images.json');
const exportCache = require('../data/cache/.export.json');

const allowedCustomCategories = ['SentinelWeapons'];

const get = async (url, binary = true) => {
  const res = await fetch(url);
  return binary ? res.buffer() : res.text();
};

class Build {
  async init() {
    const resources = await scraper.fetchResources();
    /** @type {RawItemData} */
    const raw = {
      api: resources.en,
      manifest: await scraper.fetchImageManifest(),
      drops: await scraper.fetchDropRates(),
      patchlogs: await scraper.fetchPatchLogs(),
      wikia: await scraper.fetchWikiaData(),
      vaultData: await scraper.fetchVaultData(),
      i18n: resources,
    };
    const parsed = parser.parse(raw);
    const data = this.applyCustomCategories(parsed.data);
    const i18n = parser.applyI18n(data, raw.i18n);
    const all = await this.saveJson(data, i18n);
    await this.saveWarnings(parsed.warnings);
    await this.saveImages(all, raw.manifest);
    await this.updateReadme(raw.patchlogs.patchlogs);

    // Log number of warnings at the end of the script
    let warningNum = 0;
    await Promise.all(
      Object.keys(parsed.warnings).map(async (warning) => {
        warningNum += parsed.warnings[warning].length;
      })
    );
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
    data.forEach((chunk) => {
      if (chunk.category === 'Recipes') return; // Skip blueprints
      chunk.data.forEach((item) => {
        // write an additional file for the desired custom categories
        if (item.productCategory && allowedCustomCategories.includes(item.productCategory)) {
          if (result[item.productCategory]) {
            result[item.productCategory].push(item);
          } else {
            result[item.productCategory] = [item];
          }
          return;
        }

        if (result[item.category]) {
          result[item.category].push(item);
        } else {
          result[item.category] = [item];
        }
      });
    });

    return result;
  }

  /**
   * Generate JSON file for each category and one for all combined.
   * @param {Array<string>} categories list of categories to save and separate
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
    await Promise.all(
      categories.map(
        categories.map(async (category) => {
          const data = categories[category].sort(sort);
          all = all.concat(data);
          await fs.writeFile(
            path.join(__dirname, `../data/json/${category}.json`),
            JSON.stringify(JSON.parse(stringify(data)))
          );
        })
      )
    );

    // All.json (all items in one file)
    all.sort(sort);
    fs.writeFileSync(path.join(__dirname, '../data/json/All.json'), stringify(all));
    fs.writeFileSync(path.join(__dirname, '../data/json/i18n.json'), stringify(i18n));

    return all;
  }

  /**
   * @typedef {Object} Warnings
   * @property {Array<module:warframe-items.Item.name>} missingImage list of item names for those missing images
   * @property {Array<string>} missingDucats list of item names for those missing ducat values
   * @property {Array<module:warframe-items.Item.name>} missingComponents list of item names for those
   *    missing components (usually weapons)
   * @property {Array<module:warframe-items.Item.name>} missingVaultData list of item names for those missing vault data
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
    return fs.writeFile(path.join(__dirname, '../data/warnings.json'), stringify(warnings));
  }

  /**
   * Get all images unless hashes match with existing images
   * @param {Array<module:warframe-items.Item>} items items to append images to
   * @param {ImageManifest.Manifest} manifest image manifest to look up items from
   * @async
   */
  async saveImages(items, manifest) {
    const manifestHash = crypto.createHash('md5').update(JSON.stringify(manifest)).digest('hex');
    // No need to go through every item if the manifest didn't change. I'm
    // guessing the `fileTime` key in each element works more or less like a
    // hash, so any change to that changes the hash of the full thing.
    if (exportCache.Manifest.hash === manifestHash) return;
    const bar = new Progress('Fetching Images', items.length);
    const duplicates = []; // Don't download component images or relics twice

    await Promise.all(
      items.map(async (item) => {
        // Save image for parent item
        await this.saveImage(item, false, duplicates, manifest);
        // Save images for components if necessary
        if (item.components) {
          await Promise.all(
            item.components.map(async (component) => {
              return this.saveImage(component, true, duplicates, manifest);
            })
          );
        }
        bar.tick();
      })
    );

    // write the manifests after images have all succeeded
    exportCache.Manifest.hash = manifestHash;
    await fs.writeFile(path.join(__dirname, '../data/cache/.export.json'), JSON.stringify(exportCache, undefined, 1));

    // Write new cache to disk
    await fs.writeFile(
      path.join(__dirname, '../data/cache/.images.json'),
      JSON.stringify(
        imageCache.filter((i) => i.hash),
        undefined,
        1
      )
    );
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
    const basePath = path.join(__dirname, '../data/img/');
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
        const image = await get(imageUrl);
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
        // console.error(e)
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

  /* eslint-disable valid-jsdoc */
  /**
   * Update readme with newest patchlog version
   * @param {module:warframe-patchlogs.Patchlogs} patchlogs
   * @returns Promise<void>
   * @async
   */
  async updateReadme(patchlogs) {
    // eslint-disable-next-line import/no-dynamic-require
    const logob64 = require(path.join(__dirname, '../data/logo.json'));
    const version = patchlogs.posts[0].name
      .replace(/ \+ /g, '--')
      .replace(/[^0-9\-.]/g, '')
      .trim();
    const { url } = patchlogs.posts[0];
    const readmeLocation = path.join(__dirname, '../README.md');
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
