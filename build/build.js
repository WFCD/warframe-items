const fs = require('fs')
const minify = require('imagemin')
const minifyPng = require('imagemin-pngquant')
const minifyJpeg = require('imagemin-jpegtran')
const request = require('requestretry').defaults({ fullResponse: false })
const sharp = require('sharp')
const Progress = require('./progress.js')
const stringify = require('./stringify.js')
const scraper = require('./scraper.js')
const parser = require('./parser.js')
const imageCache = require('../data/cache/.images.json')
const exportCache = require('../data/cache/.export.json')

class Build {
  async init () {
    const raw = {
      api: await scraper.fetchApiData(),
      manifest: await scraper.fetchImageManifest(),
      drops: await scraper.fetchDropRates(),
      patchlogs: scraper.fetchPatchLogs(),
      wikia: await scraper.fetchWikiaData(),
      vaultData: await scraper.fetchVaultData()
    }
    const parsed = parser.parse(raw)
    console.log(parsed.data)
    console.log(parsed.warnings)
    this.saveJson(parsed.data)
    //await this.saveImages(all)
  }

  /**
   * Generate JSON file for each category and one for
   * all combined.
   */
  saveJson (categories) {
    const all = []
    const sort = (a, b) => {
      if (!a.name) console.log(a)
      const res = a.name.localeCompare(b.name)
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName)
      } else {
        return res
      }
    }

    // Transform [{ category, data }, ...] into [data] for each category
    // and [data].concat([data]) for all.json
    // Note that the data must be sorted to ensure that we don't have different
    // orders triggering a new push.
    for (const category of categories) {
      const filename = category.category
      const data = category.data.sort(sort)
      all.concat(data)
      fs.writeFileSync(`${__dirname}/../data/json/${filename}.json`, stringify(data))
    }
    fs.writeFileSync(`${__dirname}/../data/json/All.json`, stringify(all.sort(sort)))

    return all
  }
}

const build = new Build()
build.init()
