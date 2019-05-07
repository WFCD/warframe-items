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
    const data = parser.parse(raw)
    console.log(data)
    //const all = this.saveJson(data)
    //await this.saveImages(all)
  }

  /**
   * Generate JSON file for each category and one for
   * all combined.
   */
  saveJson (items) {
    const all = []

    Object.keys(items).forEach(key => {
      all = all.concat(items[key]).sort((a, b) => {
        const res = a.name.localeCompare(b.name)
        if (res === 0) {
          return a.uniqueName.localeCompare(b.uniqueName)
        } else {
          return res
        }
      })
      fs.writeFileSync(`${__dirname}/../data/json/${key}.json`, stringify(items[key]))
    })
    fs.writeFileSync(`${__dirname}/../data/json/All.json`, stringify(all))

    return all
  }
}

const build = new Build()
build.init()