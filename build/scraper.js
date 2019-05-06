const request = require('requestretry').defaults({ fullResponse: false })
const Progress = require('./progress.js')
const crypto = require('crypto')
const fs = require('fs')
const cheerio = require('cheerio')
const exportCache = require('../data/cache/.export.json')
const WeaponScraper = require('./wikia/scrapers/WeaponScraper')
const WarframeScraper = require('./wikia/scrapers/WarframeScraper')
const sanitize = (str) => str.replace(/\n/g, '').replace(/\\r\\r/g, '\\n')
const get = async (url) => JSON.parse(sanitize(await request(url)))

/**
 * Retrieves base item data from the API and the Wikia
 */
class Scraper {
  /**
   * Fetch Warframe API data, split up by endpoint.
   */
  async fetchApiData () {
    const endpoints = require('../config/endpoints.json')
    const data = []
    const bar = new Progress('Fetching API Endpoints', endpoints.length)

    for (const endpoint of endpoints) {
      const split = endpoint.split('/')
      const category = split[split.length - 1].replace('.json')
      const data = (await get(endpoint))[category]
      data.push({ category, data })
      bar.tick()
    }
    return data
  }

  /**
   * Get the manifest of all available images.
   */
  async fetchImageManifest () {
    return (await get('http://content.warframe.com/MobileExport/Manifest/ExportManifest.json')).Manifest
  }

  /**
   * Get official drop rates and check if they changed since last build.
   */
  async fetchDropRates () {
    const rates = await get('https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/all.json')
    const ratesHash = crypto.createHash('md5').update(JSON.stringify(rates)).digest('hex')
    const changed = exportCache.DropChances.hash !== ratesHash

    // Update checksum
    if (changed) {
      exportCache.DropChances.hash = ratesHash
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
    }

    return {
      rates,
      changed
    }
  }

  /**
   * Get patchlogs from the forums
   */
  async fetchPatchLogs () {
    
  }
}

module.exports = Scraper
