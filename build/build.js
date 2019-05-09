const fs = require('fs')
const crypto = require('crypto')
const colors = require('colors')
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
    const data = this.applyCustomCategories(parsed.data)
    const all = this.saveJson(data)
    this.saveWarnings(parsed.warnings)
    await this.saveImages(all)

    // Log number of warnings at the end of the script
    let warningNum = 0
    for (const warning of Object.keys(parsed.warnings)) {
      warningNum += parsed.warnings[warning].length
    }
    console.log(`\nFinished with ${warningNum} warnings.`)
  }

  /**
   * DE's data categories are a bit vague, so we'll use the ones
   * we generated in item.category instead. (parser.addCategory)
   */
  applyCustomCategories (data) {
    const result = {}

    for (const chunk of data) {
      if (chunk.category === 'Recipes') continue // Skip blueprints

      for (let i = 0; i < chunk.data.length; i++) {
        const item = chunk.data[i]

        if (result[item.category]) {
          result[item.category].push(item)
        } else {
          result[item.category] = [item]
        }
      }
    }

    return result
  }

  /**
   * Generate JSON file for each category and one for all combined.
   */
  saveJson (categories) {
    let all = []
    const sort = (a, b) => {
      if (!a.name) console.log(a)
      const res = a.name.localeCompare(b.name)
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName)
      } else {
        return res
      }
    }

    // Category names are provided by this.applyCustomCategories
    for (const category in categories) {
      const data = categories[category].sort(sort)
      all = all.concat(data)
      fs.writeFileSync(`${__dirname}/../data/json/${category}.json`, stringify(data))
    }

    // All.json (all items in one file)
    all.sort(sort)
    fs.writeFileSync(`${__dirname}/../data/json/All.json`, stringify(all))

    return all
  }

  /**
   * Store warnings during parse process to disk
   */
  saveWarnings (warnings) {
    fs.writeFileSync(`${__dirname}/../data/warnings.json`, stringify(warnings))
  }

  /**
   * Get all images unless hashes match with existing images
   */
  async saveImages (items) {
    const Manifest = await request('http://content.warframe.com/MobileExport/Manifest/ExportManifest.json')
    const manifest = JSON.parse(Manifest).Manifest
    const manifestHash = crypto.createHash('md5').update(Manifest).digest('hex')
    const bar = new Progress('Fetching Images', items.length)

    // No need to go through every item if the manifest didn't change. I'm
    // guessing the `fileTime` key in each element works more or less like a
    // hash, so any change to that changes the hash of the full thing.
    if (exportCache.Manifest.hash === manifestHash) {
      bar.interrupt(`${colors.green('✓')} No updates required for images.`)
      return
    } else {
      exportCache.Manifest.hash = manifestHash
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
    }

    const duplicates = [] // Don't download component images or relics twice

    for (const item of items) {
      // Save image for parent item
      await this.saveImage(item, items, false, duplicates, manifest, bar)

      // Save images for components if necessary
      if (item.components) {
        for (let component of item.components) {
          await this.saveImage(component, items, true, duplicates, manifest)
        }
      }
    }

    // Write new cache to disk
    fs.writeFileSync(`${__dirname}/../data/cache/.images.json`, JSON.stringify(imageCache, null, 1))
  }

  /**
   * Download and save images for items or components.
   */
  async saveImage (item, items, isComponent, duplicates, manifest, bar) {
    const imageStub = manifest.find(i => i.uniqueName === item.uniqueName).textureLocation.replace(/\\/g, '/')
    const imageUrl = `http://content.warframe.com/MobileExport${imageStub}`
    const basePath = `${__dirname}/../data/img/`
    const filePath = `${basePath}${item.imageName}`
    const sizeBig = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Relics', 'Sentinels', 'Archwing', 'Skins', 'Pets', 'Arcanes']
    const sizeMedium = ['Resources', 'Misc', 'Fish']
    const hash = manifest.find(i => i.uniqueName === item.uniqueName).fileTime
    const cached = imageCache.find(c => c.uniqueName === item.uniqueName)

    // Don't download component images or relic images twice
    if (isComponent || item.type === 'Relic') {
      if (duplicates.includes(item.imageName)) {
        return
      } else {
        duplicates.push(item.imageName)
      }
    }

    if (!cached || cached.hash !== hash) {
      const image = await request({ url: imageUrl, encoding: null })
      this.updateCache(item, cached, hash)

      if (sizeBig.includes(item.category) || isComponent) {
        await sharp(image).resize(512, 342).ignoreAspectRatio().toFile(filePath)
      } else if (sizeMedium.includes(item.category)) {
        await sharp(image).resize(512, 352).ignoreAspectRatio().toFile(filePath)
      } else {
        await sharp(image).toFile(filePath)
      }
      await minify([filePath], basePath, {
        plugins: [
          minifyJpeg(),
          minifyPng({
            quality: [0.2, 0.4]
          })
        ]
      })
    }

    if (bar) {
      bar.tick({
        image: colors.cyan(item.name),
        updated: !cached || cached.hash !== hash ? colors.yellow('(Updated)') : '',
        check: (bar.curr === items.length - 1) ? colors.green('✓') : colors.yellow('-')
      })
    }
  }

  /**
   * Update image cache with new hash if things changed
   */
  updateCache (item, cached, hash) {
    if (!cached) {
      imageCache.push({
        uniqueName: item.uniqueName,
        hash
      })
    } else {
      cached.hash = hash
    }
  }
}

const build = new Build()
build.init()
