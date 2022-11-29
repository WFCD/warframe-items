import fs from 'node:fs/promises';

import scraper from './scraper.mjs';
import readJson from './readJson.mjs';

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
   * Compares DE's endpoint hashs between the cache and the last fetched ones
   * @returns {boolean}
   */
  isUptodate() {
    const oldCacheEntries = Object.entries(exportCache);
    const cacheEntries = Object.entries(this.exportCache);

    const compareHashs = () =>
      Object.entries(this.exportCache).every(([key, { hash }]) => hash === exportCache[key]?.hash);

    return oldCacheEntries.length === cacheEntries.length && compareHashs();
  }

  async saveExportCache() {
    await fs.writeFile(
      new URL('../data/cache/.export.json', import.meta.url),
      JSON.stringify(this.exportCache, undefined, 1)
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
  }
}

export default new HashManager();
