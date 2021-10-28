const prod = process.env.NODE_ENV === 'production'
// const Agent = require('socks5-http-client/lib/Agent')
const fetch = require('node-fetch')
const Progress = require('./progress.js')
const crypto = require('crypto')
const lzma = require('lzma')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const exportCache = require('../data/cache/.export.json')
const locales = require('../config/locales.json')
const ModScraper = require('./wikia/scrapers/ModScraper')
const WeaponScraper = require('./wikia/scrapers/WeaponScraper')
const WarframeScraper = require('./wikia/scrapers/WarframeScraper')
const VersionScraper = require('./wikia/scrapers/VersionScraper')
// eslint-disable-next-line no-control-regex
const sanitize = (str) => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, '\'')
// const agent = new Agent({
//  socksHost: process.env.SOCKS5_HOST,
//  socksPort: process.env.SOCKS5_PORT,
//  socksUsername: process.env.SOCKS5_USER,
//  socksPassword: process.env.SOCKS5_PASS
// })
const get = async (url, disableProxy = !prod, compress = false) => {
  const res = await fetch(url, {
    /* agent: disableProxy ? null : agent */
  })
  return compress === false ? Uint8Array.from(await res.buffer()) : res.text()
}
const getJSON = async (url, disableProxy) => JSON.parse(sanitize(await get(url, disableProxy, true)))

/**
 * Retrieves the base item data necessary for the parsing process
 */
class Scraper {
  /**
   * Get Endpoints from Warframe's origin file
   * @param {boolean} [manifest] to fetch only the manifest or everything else
   * @param {string} [locale] Locale to fetch data for
   */
  async fetchEndpoints (manifest, locale) {
    const origin = `https://content.warframe.com/PublicExport/index_${locale || 'en'}.txt.lzma`
    const raw = await get(origin, !prod)
    const decompressed = lzma.decompress(raw)
    const manifestRegex = /(\r?\n)?ExportManifest.*/

    // We either don't need the manifest, or *only* the manifest
    if (manifest) {
      return manifestRegex.exec(decompressed)[0].replace(/\r?\n/, '')
    } else {
      return decompressed.replace(manifestRegex, '').split(/\r?\n/g)
    }
  }

  /**
   * Fetch Warframe API data, split up by endpoint.
   */
  async fetchResources () {
    const endpoints = await this.fetchEndpoints()
    const result = []
    const i18nEndpoints = {}
    for (const locale of locales) {
      i18nEndpoints[locale] = await this.fetchEndpoints(false, locale)
    }
    const totalEndpoints = (i18nEndpoints[Object.keys(i18nEndpoints)[0]].length * Object.keys(i18nEndpoints).length) + endpoints.length
    const bar = new Progress('Fetching API Endpoints', totalEndpoints)

    const fetchEndpoint = async (endpoint) => {
      const category = endpoint.replace('Export', '').replace(/_[a-z]{2}\.json.*/, '')
      const raw = await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`)
      const data = raw ? raw[`Export${category}`] : null
      bar.tick()
      return { category, data }
    }

    for (const endpoint of endpoints) {
      result.push(await fetchEndpoint(endpoint))
    }

    const i18n = {
      en: result
    }

    for (const locale of locales) {
      i18n[locale] = []
      for (const endpoint of i18nEndpoints[locale]) {
        i18n[locale].push(await fetchEndpoint(endpoint))
      }
    }
    return i18n
  }

  /**
   * Get the manifest of all available images.
   */
  async fetchImageManifest () {
    const bar = new Progress('Fetching Image Manifest', 1)
    const endpoint = await this.fetchEndpoints(true)
    const manifest = (await getJSON(`https://content.warframe.com/PublicExport/Manifest/${endpoint}`)).Manifest
    bar.tick()
    return manifest
  }

  /**
   * Get official drop rates and check if they changed since last build.
   */
  async fetchDropRates () {
    const bar = new Progress('Fetching Drop Rates', 1)
    const rates = await getJSON('https://drops.warframestat.us/data/all.slim.json', true)
    const ratesHash = crypto.createHash('md5').update(JSON.stringify(rates)).digest('hex')
    const changed = exportCache.DropChances.hash !== ratesHash

    // Update checksum
    if (changed) {
      exportCache.DropChances.hash = ratesHash
      fs.writeFileSync(path.join(__dirname, '../data/cache/.export.json'), JSON.stringify(exportCache, null, 1))
    }

    bar.tick()
    return {
      rates,
      changed
    }
  }

  /**
   * Get patchlogs from the forums
   */
  fetchPatchLogs () {
    const bar = new Progress('Fetching Patchlogs', 1)
    const patchlogs = require('warframe-patchlogs')
    const patchlogsHash = crypto.createHash('md5').update(JSON.stringify(patchlogs.posts)).digest('hex')
    const changed = exportCache.Patchlogs.hash !== patchlogsHash

    if (changed) {
      exportCache.Patchlogs.hash = patchlogsHash
      fs.writeFileSync(path.join(__dirname, '../data/cache/.export.json'), JSON.stringify(exportCache, null, 1))
    }

    bar.tick()
    return {
      patchlogs,
      changed
    }
  }

  /**
   * Get additional data from wikia if it's not provided in the API
   */
  async fetchWikiaData () {
    const bar = new Progress('Fetching Wikia Data', 5)
    const ducats = []
    const ducatsWikia = await get('http://warframe.wikia.com/wiki/Ducats/Prices/All')
    const $ = cheerio.load(ducatsWikia)

    $('.mw-content-text table tbody tr').each(function () {
      const name = $(this).find('td:nth-of-type(1) a:nth-of-type(2)').text()
      const value = $(this).find('td:nth-of-type(3)').attr('data-sort-value')
      ducats.push({ name, ducats: parseInt(value) })
    })
    bar.tick()

    const weapons = await new WeaponScraper().scrape()
    bar.tick()
    const warframes = await new WarframeScraper().scrape()
    bar.tick()
    const mods = await new ModScraper().scrape()
    bar.tick()
    const versions = await new VersionScraper().scrape()
    bar.tick()

    return {
      weapons,
      warframes,
      mods,
      versions,
      ducats
    }
  }

  /**
   * Get (estimated) vault dates from ducats or plat.
   */
  async fetchVaultData () {
    const bar = new Progress('Fetching Vault Data', 1)
    const vaultData = (await getJSON('http://www.oggtechnologies.com/api/ducatsorplat/v2/MainItemData.json')).data

    bar.tick()
    return vaultData
  }
}

module.exports = new Scraper()
