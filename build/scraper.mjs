import Agent from 'socks5-http-client/lib/Agent.js';
import fetch from 'node-fetch';
import crypto from 'crypto';
import lzma from 'lzma';
import fs from 'node:fs/promises';
import cheerio from 'cheerio';

import { Generator as RelicGenerator } from '@wfcd/relics';
import patchlogs from 'warframe-patchlogs';

import Progress from './progress.mjs';
import ModScraper from './wikia/scrapers/ModScraper.mjs';
import WeaponScraper from './wikia/scrapers/WeaponScraper.mjs';
import WarframeScraper from './wikia/scrapers/WarframeScraper.mjs';
import VersionScraper from './wikia/scrapers/VersionScraper.mjs';
import readJson from './readJson.mjs';

const exportCache = await readJson(new URL('../data/cache/.export.json', import.meta.url));
const locales = await readJson(new URL('../config/locales.json', import.meta.url));

const prod = process.env.NODE_ENV === 'production';
// eslint-disable-next-line no-control-regex
const sanitize = (str) => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, "'");
const agent = process.env.SOCK5_HOST
  ? new Agent({
      socksHost: process.env.SOCKS5_HOST,
      socksPort: process.env.SOCKS5_PORT,
      socksUsername: process.env.SOCKS5_USER,
      socksPassword: process.env.SOCKS5_PASS,
    })
  : undefined;
const get = async (url, disableProxy = !prod, compress = false) => {
  const res = await fetch(url, {
    agent: disableProxy ? undefined : agent,
  });
  return compress === false ? Uint8Array.from(await res.buffer()) : res.text();
};
const getJSON = async (url, disableProxy) => JSON.parse(sanitize(await get(url, disableProxy, true)));

/**
 * Retrieves the base item data necessary for the parsing process
 */
class Scraper {
  /**
   * Get Endpoints from Warframe's origin file
   * @param {boolean} [manifest] to fetch only the manifest or everything else
   * @param {string} [locale] Locale to fetch data for
   */
  async fetchEndpoints(manifest, locale) {
    const origin = `https://content.warframe.com/PublicExport/index_${locale || 'en'}.txt.lzma`;
    const raw = await get(origin, !prod);
    const decompressed = lzma.decompress(raw);
    const manifestRegex = /(\r?\n)?ExportManifest.*/;

    // We either don't need the manifest, or *only* the manifest
    if (manifest) {
      return manifestRegex.exec(decompressed)[0].replace(/\r?\n/, '');
    }
    return decompressed.replace(manifestRegex, '').split(/\r?\n/g);
  }

  /**
   * Fetch Warframe API data, split up by endpoint.
   */
  async fetchResources() {
    const endpoints = await this.fetchEndpoints();
    const result = [];
    const i18nEndpoints = {};
    await Promise.all(
      locales.map(async (locale) => {
        i18nEndpoints[locale] = await this.fetchEndpoints(false, locale);
      })
    );
    const totalEndpoints =
      i18nEndpoints[Object.keys(i18nEndpoints)[0]].length * Object.keys(i18nEndpoints).length + endpoints.length;
    const bar = new Progress('Fetching API Endpoints', totalEndpoints);

    const fetchEndpoint = async (endpoint) => {
      const category = endpoint.replace('Export', '').replace(/_[a-z]{2}\.json.*/, '');
      const raw = await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`);
      const data = raw ? raw[`Export${category}`] : undefined;
      bar.tick();

      if (category === 'Upgrades') {
        const modSets = raw.ExportModSet.map((modSet) => ({
          ...modSet,
          type: 'Mod Set',
        }));
        data.push(...modSets, ...raw.ExportAvionics, ...raw.ExportFocusUpgrades);
      }
      return { category, data };
    };

    await Promise.all(
      endpoints.map(async (endpoint) => {
        result.push(await fetchEndpoint(endpoint));
      })
    );

    const i18n = {
      en: result,
    };

    // Request i18n sequentially by locale to avoid getting randomly stuck in some computers
    // It is roughly the same speed as the "all async" method but is always successfull
    for (let i = 0; i < locales.length; i += 1) {
      const locale = locales[i];
      i18n[locale] = [];
      await Promise.all(
        i18nEndpoints[locale].map(async (endpoint) => {
          i18n[locale].push(await fetchEndpoint(endpoint));
        })
      );
    }
    return i18n;
  }

  /**
   * @typedef {Object} ImageManifestItem
   * @property {string} uniqueName unique string
   *    identifier corresponding to a {@link module:warframe-items.Item.uniqueName|uniqueName}
   * @property {string} textureLocation location of the image for the corresponding item
   */
  /**
   * @typedef {Object} ImageManifest
   * @property {ImageManifestItem[]} Manifest
   */
  /**
   * Get the manifest of all available images.
   * @param {boolean} [skipProgress] whether to show progress
   * @returns {ImageManifest.Manifest}
   */
  async fetchImageManifest(skipProgress) {
    const bar = skipProgress ? undefined : new Progress('Fetching Image Manifest', 1);
    const endpoint = await this.fetchEndpoints(true);
    const manifest = (await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`)).Manifest;
    if (!skipProgress) {
      bar.tick();
    }

    return manifest;
  }

  /**
   * Get official drop rates and check if they changed since last build.
   * @returns {DropData}
   */
  async fetchDropRates() {
    const bar = new Progress('Fetching Drop Rates', 1);
    const rates = await getJSON('https://drops.warframestat.us/data/all.slim.json', true);
    const ratesHash = crypto.createHash('md5').update(JSON.stringify(rates)).digest('hex');
    const changed = exportCache.DropChances.hash !== ratesHash;

    // Update checksum
    if (changed) {
      exportCache.DropChances.hash = ratesHash;
      await fs.writeFile(
        new URL('../data/cache/.export.json', import.meta.url),
        JSON.stringify(exportCache, undefined, 1)
      );
    }

    bar.tick();
    return {
      rates,
      changed,
    };
  }

  /**
   * @typedef {Object} PatchlogWrap
   * @property {module:warframe-patchlogs.Patchlogs} patchlogs Warframe patchlogs
   * @property {boolean} changed whether or not there's an update
   */
  /**
   * Get patchlogs from the forums
   * @returns {PatchlogWrap}
   */
  async fetchPatchLogs() {
    const bar = new Progress('Fetching Patchlogs', 1);
    const patchlogsHash = crypto.createHash('md5').update(JSON.stringify(patchlogs.posts)).digest('hex');
    const changed = exportCache.Patchlogs.hash !== patchlogsHash;

    if (changed) {
      exportCache.Patchlogs.hash = patchlogsHash;
      await fs.writeFile(
        new URL('../data/cache/.export.json', import.meta.url),
        JSON.stringify(exportCache, undefined, 1)
      );
    }

    bar.tick();
    return {
      patchlogs,
      changed,
    };
  }

  /**
   * @typedef {Object} WikiaData
   * @property {Array<WikiaWeapon>} weapons
   * @property {Array<WikiaWarframe>} warframes
   * @property {Array<WikiaMods>} mods
   * @property {Array<WikiaVersions>} versions
   * @property {Array<WikiaDucats>} ducats
   */
  /**
   * Get additional data from wikia if it's not provided in the API
   * @returns {WikiaData}
   */
  async fetchWikiaData() {
    const bar = new Progress('Fetching Wikia Data', 5);
    const ducats = [];
    const ducatsWikia = await get('http://warframe.wikia.com/wiki/Ducats/Prices/All');
    const $ = cheerio.load(ducatsWikia);

    $('.mw-content-text table tbody tr').each(function () {
      const name = $(this).find('td:nth-of-type(1) a:nth-of-type(2)').text();
      const value = $(this).find('td:nth-of-type(3)').attr('data-sort-value');
      ducats.push({ name, ducats: Number.parseInt(value, 10) });
    });
    bar.tick();

    const weapons = await new WeaponScraper().scrape();
    bar.tick();
    const warframes = await new WarframeScraper().scrape();
    bar.tick();
    const mods = await new ModScraper().scrape();
    bar.tick();
    const versions = await new VersionScraper().scrape();
    bar.tick();

    return {
      weapons,
      warframes,
      mods,
      versions,
      ducats,
    };
  }

  /**
   * Formatted date string. Format: "YYYY MM DD"
   * @typedef {string} OggDateStamp
   */
  /**
   * @typedef {Object} OggRelic
   * @property {string<module:warframe-items.Rarity>} Rarity
   * @property {string} Name relic name, format: "%RelicEra% %Identifier%"
   * @property {boolean} Vaulted whether or not the relic is vaulted
   */
  /**
   * @typedef {Object} OggComponent
   * @property {string} Name component name
   * @property {Array<OggRelic>} Relics relics that can drop this component
   * @property {number} Ducats sell price in ducats
   */
  /**
   * @typedef {Object} VaultDataItem
   * @property {boolean} Vaulted whether the item is vaulted
   * @property {string<OggDateStamp>} ReleaseDate Ogg-date-formatted date stamp
   * @property {Array<OggComponent>} Components
   * @property {string<OggDateStamp>} EstimatedVaultedDate estimated date for the vault date
   * @property {string<OggDateStamp>} VaultedDate actual vault date
   */
  /**
   * @typedef {Object} VaultData
   * @property {{code: number}} metadata
   * @property {Array<VaultDataItem>} data
   */
  /**
   * Get (estimated) vault dates from ducats or plat.
   * @returns {VaultData}
   */
  async fetchVaultData() {
    const bar = new Progress('Fetching Vault Data', 1);
    const vaultData = (await getJSON('http://www.oggtechnologies.com/api/ducatsorplat/v2/MainItemData.json')).data;

    bar.tick();
    return vaultData;
  }

  /**
   * Generate Relic Data from Titania Project
   * @returns {Promise<Array<TitaniaRelic>>}
   */
  async generateRelicData() {
    const bar = new Progress('Generating Relic Data', 1);
    const relicGenerator = new RelicGenerator();
    try {
      const relicData = await relicGenerator.generate();
      bar.tick();
      return relicData;
    } catch (e) {
      console.error(e);
    }
  }
}

export default new Scraper();
