import fs from 'node:fs/promises';
import crypto from 'crypto';

import readJson from './readJson';
import scraper from './scraper';
import type { ExportCache, CachedItem } from './types/shared';

const previousExportCache = await readJson<ExportCache>(new URL('../data/cache/.export.json', import.meta.url));
const locales = await readJson<string[]>(new URL('../config/locales.json', import.meta.url));

const hashObject = (obj: unknown): string => crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

class HashManager {
  exportCache: ExportCache;
  imagesUpdated: boolean;

  constructor() {
    this.exportCache = {};
    this.imagesUpdated = false;
  }

  /**
   * Compares DE's endpoint hashes between the cache and the last fetched ones
   * @returns {boolean}
   */
  get isUpdated(): boolean {
    const oldCacheKeys = Object.keys(previousExportCache);
    const cacheKeys = Object.keys(this.exportCache);

    const compareHashes = (): boolean => cacheKeys.every((key) => !this.hasChanged(key));

    return oldCacheKeys.length === cacheKeys.length && compareHashes();
  }

  hasChanged(key: string): boolean {
    const keyInBoth = key in this.exportCache && key in previousExportCache;
    if (!keyInBoth) {
      console.warn(`Key not found... ${key} missing`);
    }

    return !keyInBoth || this.exportCache[key]?.hash !== previousExportCache[key]?.hash;
  }

  async saveExportCache(): Promise<void> {
    await fs.writeFile(
      new URL('../data/cache/.export.json', import.meta.url),
      JSON.stringify(this.exportCache, undefined, 1)
    );
  }

  async saveImageCache(imageCache: CachedItem[]): Promise<void> {
    await fs.writeFile(
      new URL('../data/cache/.images.json', import.meta.url),
      JSON.stringify(
        imageCache.filter((i) => i.hash),
        undefined,
        1
      )
    );
  }

  async updateExportCache(): Promise<void> {
    const endpoints: string[] = [];

    const allLocales = [...locales, 'en'];
    for (const locale of allLocales) {
      const fetchedItems = await scraper.fetchEndpoints(false, locale);
      if (Array.isArray(fetchedItems)) {
        endpoints.push(...fetchedItems);
      } else if (fetchedItems) {
        endpoints.push(fetchedItems);
      }
    }

    const endpointPairs = endpoints
      .flat()
      .map((endpoint) => (endpoint as string | undefined)?.split('!00_'))
      .filter((e): e is string[] => Boolean(e) && Array.isArray(e))
      .filter(([key, hash]) => key && hash) as [string, string][];

    endpointPairs.forEach(([key, hash]) => {
      this.exportCache[key] = { hash };
    });

    const manifest = await scraper.fetchImageManifest(true);
    this.exportCache.Manifest = { hash: hashObject(manifest) };

    const dropRates = await scraper.fetchDropRates(true);
    this.exportCache.DropChances = { hash: hashObject(dropRates) };

    const patchlogs = await scraper.fetchPatchLogs(true);
    this.exportCache.Patchlogs = { hash: hashObject(patchlogs.posts) };
  }
}

export default new HashManager();
