import lzma from 'lzma';
import { load } from 'cheerio';
import { Generator as RelicGenerator } from '@wfcd/relics';
import patchlogs from '@wfcd/patchlogs';

import Progress from './progress';
import ArcaneScraper from './wikia/scrapers/ArcaneScraper';
import ArchwingScraper from './wikia/scrapers/ArchwingScraper';
import CompanionScraper from './wikia/scrapers/CompanionScraper';
import ModScraper from './wikia/scrapers/ModScraper';
import WeaponScraper from './wikia/scrapers/WeaponScraper';
import WarframeScraper from './wikia/scrapers/WarframeScraper';
import VaultScraper from './wikia/scrapers/VaultScraper';
import VersionScraper from './wikia/scrapers/VersionScraper';
import readJson from './readJson';
import sleep from './sleep';
import { get, getJSON, retryAttempts } from './network';
import type { WikiaData } from './types/shared';
import type { TitaniaRelic } from '@wfcd/relics';
import type { Patchlogs } from '@wfcd/patchlogs';

const locales = await readJson<string[]>(new URL('../config/locales.json', import.meta.url));

const prod = process.env.NODE_ENV === 'production';

interface ApiChunk {
  category: string;
  data: Record<string, unknown>[];
}

interface WikiaDucat {
  name: string;
  ducats: number;
}

/**
 * Retrieves the base item data necessary for the parsing process
 */
class Scraper {
  endpointCache = new Map<string, Uint8Array>();

  originServerAvailable = false;

  async checkOriginServerAvailability(): Promise<void> {
    this.originServerAvailable = true;
    try {
      // If this call is successful, it means that the origin server is available.
      await this.fetchEndpoints(true, 'en');
    } catch (_err) {
      // Origin server not available, fall back to content server
      this.originServerAvailable = false;
      console.warn(
        'origin.warframe.com not available. Using content.warframe.com instead. Data might not be up-to-date!!!'
      );
    }
  }

  /**
   * Get Endpoints from Warframe's origin file
   * @param manifest - to fetch only the manifest or everything else
   * @param locale - Locale to fetch data for
   */
  async fetchEndpoints(manifest?: boolean, locale?: string): Promise<string | string[] | undefined> {
    return await retryAttempts(5, async () => {
      const origin = `https://${this.originServerAvailable ? 'origin' : 'content'}.warframe.com/PublicExport/index_${
        locale ?? 'en'
      }.txt.lzma`;

      let raw = this.endpointCache.get(origin);
      raw ??= (await get(origin, !prod)) as Uint8Array;

      const decompressed = lzma.decompress(raw);
      this.endpointCache.set(origin, raw); // Cache endpoint only if lzma.decompress didn't throw an error

      const manifestRegex = /(\r?\n)?ExportManifest.*/;
      // We either don't need the manifest, or *only* the manifest
      if (manifest) {
        if (typeof decompressed === 'string') {
          const match = manifestRegex.exec(decompressed);
          return match ? match[0].replace(/\r?\n/, '') : '';
        }
        if (typeof decompressed === 'object') {
          const match = manifestRegex.exec(decompressed.toString());
          return match ? match[0].replace(/\r?\n/, '') : '';
        }
      }
      if (typeof decompressed === 'string') {
        return decompressed
          .replace(manifestRegex, '')
          .split(/\r?\n/g)
          .filter((d) => d !== '');
      }
      if (typeof decompressed === 'object') {
        return decompressed.toString()
          .replace(manifestRegex, '')
          .split(/\r?\n/g)
          .filter((d) => d !== '');
      }
      return undefined;
    });
  }

  /**
   * Fetch Warframe API data, split up by endpoint.
   */
  async fetchResources(): Promise<Record<string, ApiChunk[]>> {
    const endpoints = (await this.fetchEndpoints()) as string[];
    const result: ApiChunk[] = [];
    const i18nEndpoints: Record<string, string[]> = {};
    await Promise.all(
      locales.map(async (locale) => {
        i18nEndpoints[locale] = (await this.fetchEndpoints(false, locale)) as string[];
      })
    );
    const firstKey = Object.keys(i18nEndpoints)[0];
    const totalEndpoints =
      (firstKey && i18nEndpoints[firstKey] ? i18nEndpoints[firstKey].length : 0) * Object.keys(i18nEndpoints).length +
      endpoints.length;
    const bar = new Progress('Fetching API Endpoints', totalEndpoints);

    const fetchEndpoint = async (endpoint: string | undefined): Promise<ApiChunk | undefined> => {
      if (!endpoint) {
        return undefined;
      }
      const category = endpoint.replace('Export', '').replace(/_[a-z]{2}\.json.*/, '');
      const raw = await getJSON<Record<string, unknown>>(
        `https://content.warframe.com/PublicExport/Manifest/${endpoint}`,
        true
      );
      const data = raw[`Export${category}`] as Record<string, unknown>[] | undefined;
      bar.tick();

      if (category === 'SortieRewards' && data) {
        const nightwave = raw.ExportNightwave as { challenges?: Record<string, unknown>[] } | undefined;
        if (nightwave?.challenges) {
          data.push(...nightwave.challenges);
        }
      }

      if (category === 'Weapons' && data) {
        const railjackWeapons = raw.ExportRailjackWeapons as Record<string, unknown>[];
        data.push(...railjackWeapons);
      }

      if (category === 'Warframes' && data) {
        const helminth = {
          uniqueName: '/Lotus/Powersuits/PowersuitAbilities/Helminth',
          name: 'Helminth',
          health: 0,
          shield: 0,
          armor: 0,
          stamina: 0,
          power: 0,
          abilities: raw.ExportAbilities,
        };

        data.push(helminth);
      }

      if (category === 'Upgrades' && data) {
        const modSets = raw.ExportModSet as Record<string, unknown>[] | undefined;
        const avionics = raw.ExportAvionics as Record<string, unknown>[] | undefined;
        const focusUpgrades = raw.ExportFocusUpgrades as Record<string, unknown>[] | undefined;
        if (modSets) {
          data.push(...modSets.map((modSet) => ({ ...modSet, type: 'Mod Set' })));
        }
        if (avionics) {
          data.push(...avionics);
        }
        if (focusUpgrades) {
          data.push(...focusUpgrades);
        }
      }

      return { category, data: data ?? [] };
    };

    await Promise.all(
      endpoints
        .filter(Boolean)
        .map(async (endpoint) => {
          const endpointResult = await fetchEndpoint(endpoint);
          if (endpointResult) {
            result.push(endpointResult);
          }
      })
    );

    const i18n: Record<string, ApiChunk[]> = {
      en: result,
    };

    // Request i18n sequentially by locale to avoid getting randomly stuck in some computers
    // It is roughly the same speed as the "all async" method but is always successful
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < locales.length; i += 1) {
      const locale = locales[i];
      if (!locale) continue;
      i18n[locale] = [];
      const localeEndpoints = i18nEndpoints[locale];
      if (localeEndpoints) {
        await Promise.all(
          localeEndpoints.map(async (endpoint: string) => {
            if (i18n[locale]) {
              const result = await fetchEndpoint(endpoint);
              if (result) {
                i18n[locale].push(result);
              }
            }
          })
        );
      }
    }
    return i18n;
  }

  /**
   * Get the manifest of all available images.
   * @param skipProgress - whether to show progress
   * @returns image manifest
   */
  async fetchImageManifest(skipProgress?: boolean): Promise<unknown[]> {
    const bar = skipProgress ? undefined : new Progress('Fetching Image Manifest', 1);
    const endpoint = await this.fetchEndpoints(true);
    if (!endpoint) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      console.error(`No Image Manifest Retrieved from API: ${endpoint!}`);
      return process.exit(1);
    }
    const manifest = (
      await getJSON<{ Manifest: unknown[] }>(`https://content.warframe.com/PublicExport/Manifest/${endpoint as string}`, true)
    ).Manifest;
    if (!skipProgress) {
      bar?.tick();
    }

    return manifest;
  }

  /**
   * Get official drop rates and check if they changed since last build.
   * @param skipProgress - whether to show progress
   * @returns drop data
   */
  async fetchDropRates(skipProgress?: boolean): Promise<unknown> {
    const bar = skipProgress ? undefined : new Progress('Fetching Drop Rates', 1);
    const rates = await getJSON('https://drops.warframestat.us/data/all.slim.json', true);
    if (!skipProgress) {
      bar?.tick();
    }

    return rates;
  }

  /**
   * Get patchlogs from the forums
   * @param skipProgress - whether to show progress
   * @returns patchlogs object
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async fetchPatchLogs(skipProgress?: boolean): Promise<Patchlogs> {
    const bar = skipProgress ? undefined : new Progress('Fetching Patchlogs', 1);
    if (!skipProgress) {
      bar?.tick();
    }

    return patchlogs;
  }

  /**
   * Get additional data from wikia if it's not provided in the API
   * @returns wikia data
   */
  async fetchWikiaData(): Promise<WikiaData> {
    const bar = new Progress('Fetching Wikia Data', 9);
    const ducats: WikiaDucat[] = [];
    const ducatsWikia = await get('https://wiki.warframe.com/w/Ducats/Prices/All', true);
    const $ = load(ducatsWikia as string);

    $('.mw-content-text table tbody tr').each(function () {
      const $this = $(this);
      const name = $this.find('td:nth-of-type(1) a:nth-of-type(2)').text();
      const value = $this.find('td:nth-of-type(3)').attr('data-sort-value');
      ducats.push({ name, ducats: Number.parseInt(value ?? '0', 10) });
    });
    bar.tick();

    await sleep(100);
    const weapons = await new WeaponScraper().scrape();
    bar.tick();
    await sleep(100);
    const warframes = await new WarframeScraper().scrape();
    bar.tick();
    await sleep(100);
    const mods = await new ModScraper().scrape();
    bar.tick();
    await sleep(100);
    const arcanes = await new ArcaneScraper().scrape();
    bar.tick();
    await sleep(100);
    const versions = await new VersionScraper().scrape();
    bar.tick();
    await sleep(100);
    const archwings = await new ArchwingScraper().scrape();
    bar.tick();
    await sleep(100);
    const companions = await new CompanionScraper().scrape();
    bar.tick();
    await sleep(100);
    const vaultData = await new VaultScraper().scrape();
    bar.tick();

    return {
      weapons,
      warframes,
      mods,
      versions,
      ducats,
      archwings,
      companions,
      arcanes,
      vaultData,
    };
  }

  /**
   * Generate Relic Data from Titania Project
   * @returns relic data array
   */
  async generateRelicData(): Promise<TitaniaRelic[] | undefined> {
    const bar = new Progress('Generating Relic Data', 1);
    const relicGenerator = new RelicGenerator();
    try {
      const relicData = await relicGenerator.generate();
      bar.tick();
      return relicData;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}

export default new Scraper();
