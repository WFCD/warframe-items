const prod = process.env.NODE_ENV === 'production'
// const Agent = require('socks5-http-client/lib/Agent')
const request = require('requestretry').defaults({ fullResponse: false })
const Progress = require('./progress.js')
const crypto = require('crypto')
const lzma = require('lzma')
const fs = require('fs')
const cheerio = require('cheerio')
const exportCache = require('../data/cache/.export.json')
const ModScraper = require('./wikia/scrapers/ModScraper')
const WeaponScraper = require('./wikia/scrapers/WeaponScraper')
const WarframeScraper = require('./wikia/scrapers/WarframeScraper')
const sanitize = (str) => str.replace(/\\r|\r?\n/g, '')
const get = async (url, disableProxy = !prod, encoding) => request({
  url,
  // Old proxy options. Kept in case this would be required for local builds.
  // agentClass: disableProxy ? undefined : Agent,
  // agentOptions: disableProxy ? {} : {
  //  socksHost: process.env.SOCKS5_HOST,
  //  socksPort: process.env.SOCKS5_PORT,
  //  socksUsername: process.env.SOCKS5_USER,
  //  socksPassword: process.env.SOCKS5_PASS
  // },
  ...encoding === false ? {
    encoding: null
  } : {}
})
const getJSON = async (url, disableProxy) => JSON.parse(sanitize(await get(url, disableProxy)))

/**
 * Retrieves the base item data necessary for the parsing process
 */
class Scraper {
  /**
   * Get Endpoints from Warframe's origin file
   */
  async fetchEndpoints (manifest) {
    const origin = 'http://content.warframe.com/PublicExport/index_en.txt.lzma'
    const raw = await get(origin, !prod, false)
    const decompressed = lzma.decompress(raw)
    const manifestRegex = /(\r?\n)?ExportManifest.*/
    let filtered

    // We either don't need the manifest, or *only* the manifest
    if (manifest) {
      filtered = manifestRegex.exec(decompressed)[0].replace(/\r?\n/, '')
      return filtered
    } else {
      filtered = decompressed.replace(manifestRegex, '')
      return filtered.split(/\r?\n/g)
    }
  }

  /**
   * Fetch Warframe API data, split up by endpoint.
   */
  async fetchResources () {
    const endpoints = await this.fetchEndpoints()
    const result = []
    const bar = new Progress('Fetching API Endpoints', endpoints.length)

    for (const endpoint of endpoints) {
      const category = endpoint.replace('Export', '').replace(/_[a-z]{2}\.json.*/, '')
      const data = (await getJSON(`http://content.warframe.com/PublicExport/Manifest/${endpoint}`))[`Export${category}`]
      result.push({ category, data })
      bar.tick()
    }
    return result
  }

  /**
   * Get the manifest of all available images.
   */
  async fetchImageManifest () {
    const bar = new Progress('Fetching Image Manifest', 1)
    const endpoint = await this.fetchEndpoints(true)
    const manifest = (await getJSON(`http://content.warframe.com/PublicExport/Manifest/${endpoint}`)).Manifest
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
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
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
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
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
    const bar = new Progress('Fetching Wikia Data', 1)
    const ducats = []
    const ducatsWikia = await get('http://warframe.wikia.com/wiki/Ducats/Prices/All')
    const $ = cheerio.load(ducatsWikia)

    $('.mw-content-text table tbody tr').each(function () {
      const name = $(this).find('td:nth-of-type(1) a:nth-of-type(2)').text()
      const value = $(this).find('td:nth-of-type(3)').attr('data-sort-value')
      ducats.push({ name, ducats: parseInt(value) })
    })

    bar.tick()
    return {
      weapons: await new WeaponScraper().scrape(),
      warframes: await new WarframeScraper().scrape(),
      mods: await new ModScraper().scrape(),
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
