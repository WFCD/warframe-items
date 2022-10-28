'use strict';

const fs = require('fs/promises');
const path = require('path');
const scraper = require('./scraper');
const exportCache = require('../data/cache/.export.json');
const locales = require('../config/locales.json');

const exportKeyWhitelist = ['Manifest', 'DropChances', 'Patchlogs'];

class DataHash {
  constructor() {
    this.exportCache = Object.fromEntries(
      exportKeyWhitelist.filter((key) => key in exportCache).map((key) => [key, exportCache[key]])
    );
  }

  isUptodate() {
    const oldCacheEntries = Object.entries(exportCache);
    const cacheEntries = Object.entries(this.exportCache);

    const compareHashs = () =>
      Object.entries(this.exportCache)
        .filter(([key]) => !exportKeyWhitelist.includes(key))
        .every(([key, { hash }]) => hash === exportCache[key]?.hash);

    return oldCacheEntries.length === cacheEntries.length && compareHashs();
  }

  async saveExportCache() {
    await fs.writeFile(
      path.join(__dirname, '../data/cache/.export.json'),
      JSON.stringify(this.exportCache, undefined, 1)
    );
  }

  async updateExportCache() {
    const endpoints = await this.fetchEndpoints();
    endpoints
      .flat()
      .map((endpoint) => endpoint.split('!00_'))
      .filter(([key, hash]) => key && hash)
      .forEach(([key, hash]) => {
        this.exportCache[key] = { hash };
      });
  }

  async fetchEndpoints() {
    const localeEndpoints = await Promise.all(
      [...locales, 'en'].map((locale) => scraper.fetchEndpoints(false, locale))
    );

    return localeEndpoints.flat();
  }
}

module.exports = new DataHash();
