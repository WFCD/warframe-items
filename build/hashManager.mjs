import fs from 'node:fs/promises';

import scraper from './scraper.mjs';
import readJson from './readJson.mjs';
import crypto from "crypto";

const exportCache = await readJson(new URL('../data/cache/.export.json', import.meta.url));
const locales = await readJson(new URL('../config/locales.json', import.meta.url));

const exportKeyWhitelist = ['Manifest', 'DropChances', 'Patchlogs'];

class HashManager {
  constructor() {
    this.exportCache = Object.fromEntries(
      exportKeyWhitelist.filter((key) => key in exportCache).map((key) => [key, exportCache[key]])
    );
  }

  /**
   * Compares DE's endpoint hashes between the cache and the last fetched ones
   * @returns {boolean}
   */
  get isUpdated() {
    const oldCacheEntries = Object.entries(exportCache);
    const cacheEntries = Object.entries(this.exportCache);

    const compareHashes = () =>
      Object.entries(this.exportCache).every(([key, { hash }]) => hash === exportCache[key]?.hash);

    return oldCacheEntries.length === cacheEntries.length && compareHashes();
  }

  set imagesUpdated(updated) {
    this.imagesManuallyUpdated = updated;
  }

  get needsImagePull() {
    return !this.imagesManuallyUpdated || this.exportCache.Manifest.hash === exportCache.Manifest.hash;
  }

  async saveExportCache() {
    await fs.writeFile(
      new URL('../data/cache/.export.json', import.meta.url),
      JSON.stringify(this.exportCache, undefined, 1)
    );
  }

  async saveImageCache(imageCache) {
    return fs.writeFile(
      new URL("../data/cache/.images.json", import.meta.url),
      JSON.stringify(
        imageCache.filter((i) => i.hash),
        undefined,
        1
      )
    );
  }

  async updateExportCache() {
    const endpoints = [];

    const allLocales = [...locales, 'en'];
    for (let i = 0; i < allLocales.length; i += 1) {
      const locale = allLocales[i];
      endpoints.push(...(await scraper.fetchEndpoints(false, locale)));
    }

    endpoints
      .flat()
      .map((endpoint) => endpoint.split('!00_'))
      .filter(([key, hash]) => key && hash)
      .forEach(([key, hash]) => {
        this.exportCache[key] = { hash };
      });

    const manifest = await scraper.fetchImageManifest(true);
    this.exportCache.Manifest.hash = crypto.createHash('md5').update(JSON.stringify(manifest)).digest('hex');
  }
}

export default new HashManager();
