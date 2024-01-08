import lzma from 'lzma';
import { load } from 'cheerio';

import { Generator as RelicGenerator } from '@wfcd/relics';
import patchlogs from 'warframe-patchlogs';

import Progress from './progress.mjs';
import ArchwingScraper from './wikia/scrapers/ArchwingScraper.mjs';
import CompanionScraper from './wikia/scrapers/CompanionScraper.mjs';
import ModScraper from './wikia/scrapers/ModScraper.mjs';
import WeaponScraper from './wikia/scrapers/WeaponScraper.mjs';
import WarframeScraper from './wikia/scrapers/WarframeScraper.mjs';
import VersionScraper from './wikia/scrapers/VersionScraper.mjs';
import readJson from './readJson.mjs';

import { get, getJSON, retryAttempts } from './network.mjs';

const locales = await readJson(new URL('../config/locales.json', import.meta.url));

const prod = process.env.NODE_ENV === 'production';

/**
 * Retrieves the base item data necessary for the parsing process
 */
class Scraper {
  endpointCache = new Map();

  originServerAvailable = false;

  async checkOriginServerAvailability() {
    this.originServerAvailable = true;
    try {
      // If this call is successful, it means that the origin server is available.
      await this.fetchEndpoints(true, 'en');
    } catch (err) {
      console.error(err);
      // Origin server not available, fall back to content server
      this.originServerAvailable = false;
      console.warn(
        'origin.warframe.com not available. Using content.warframe.com instead. Data might not be up-to-date!!!'
      );
    }
  }

  /**
   * Get Endpoints from Warframe's origin file
   * @param {boolean} [manifest] to fetch only the manifest or everything else
   * @param {string} [locale] Locale to fetch data for
   */
  async fetchEndpoints(manifest, locale) {
    return retryAttempts(5, async () => {
      let origin = '';

      // Use content.warframe.com if the origin server is not available
      origin = `https://${this.originServerAvailable ? 'origin' : 'content'}.warframe.com/PublicExport/index_${
        locale || 'en'
      }.txt.lzma`;

      let raw = this.endpointCache.get(origin);
      if (raw === undefined) {
        raw = await get(origin, !prod);
      }

      const decompressed = lzma.decompress(raw);
      this.endpointCache.set(origin, raw); // Cache endpoint only if lzma.decrompress didn't throw an error

      const manifestRegex = /(\r?\n)?ExportManifest.*/;
      // We either don't need the manifest, or *only* the manifest
      if (manifest) {
        return manifestRegex.exec(decompressed)[0].replace(/\r?\n/, '');
      }
      return decompressed.replace(manifestRegex, '').split(/\r?\n/g);
    });
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
      const raw = await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`, true);
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
    const manifest = (await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`, true)).Manifest;
    if (!skipProgress) {
      bar.tick();
    }

    return manifest;
  }

  /**
   * Get official drop rates and check if they changed since last build.
   * @param {boolean} [skipProgress] whether to show progress
   * @returns {DropData}
   */
  async fetchDropRates(skipProgress) {
    const bar = skipProgress ? undefined : new Progress('Fetching Drop Rates', 1);
    const rates = await getJSON('https://drops.warframestat.us/data/all.slim.json', true);
    if (!skipProgress) {
      bar.tick();
    }

    return rates;
  }

  /**
   * Get patchlogs from the forums
   * @param {boolean} [skipProgress] whether to show progress
   * @returns {module:warframe-patchlogs.Patchlogs}
   */
  async fetchPatchLogs(skipProgress) {
    const bar = skipProgress ? undefined : new Progress('Fetching Patchlogs', 1);
    if (!skipProgress) {
      bar.tick();
    }

    return patchlogs;
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
    const bar = new Progress('Fetching Wikia Data', 7);
    const ducats = [];
    const ducatsWikia = await get('http://warframe.wikia.com/wiki/Ducats/Prices/All', true);
    const $ = load(ducatsWikia);

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
    const archwings = await new ArchwingScraper().scrape();
    bar.tick();
    const companions = await new CompanionScraper().scrape();
    bar.tick();

    return {
      weapons,
      warframes,
      mods,
      versions,
      ducats,
      archwings,
      companions,
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
    const vaultData = (await getJSON('http://www.oggtechnologies.com/api/ducatsorplat/v2/MainItemData.json', true))
      .data;

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
