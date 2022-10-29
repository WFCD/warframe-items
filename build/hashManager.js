'use strict';

const fs = require('fs/promises');
const path = require('path');
const scraper = require('./scraper');
const exportCache = require('../data/cache/.export.json');
const locales = require('../config/locales.json');

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
      path.join(__dirname, '../data/cache/.export.json'),
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

module.exports = new HashManager();
