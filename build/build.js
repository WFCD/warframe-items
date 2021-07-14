const fs = require('fs')
const crypto = require('crypto')
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
const allowedCustomCategories = ['SentinelWeapons']

class Build {
  async init () {
    const raw = {
      api: await scraper.fetchResources(),
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
    await this.saveImages(all, raw.manifest)
    this.updateReadme(raw.patchlogs.patchlogs)

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

        // write an additional file for the desired custom categories
        if (item.productCategory && allowedCustomCategories.includes(item.productCategory)) {
          if (result[item.productCategory]) {
            result[item.productCategory].push(item)
          } else {
            result[item.productCategory] = [item]
          }
        }

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
      // don't add the generated custom category data to all separately, since it's duplicate data
      if (!allowedCustomCategories.includes(category)) all = all.concat(data)
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
  async saveImages (items, manifest) {
    const manifestHash = crypto.createHash('md5').update(JSON.stringify(manifest)).digest('hex')

    // No need to go through every item if the manifest didn't change. I'm
    // guessing the `fileTime` key in each element works more or less like a
    // hash, so any change to that changes the hash of the full thing.
    if (exportCache.Manifest.hash === manifestHash) {
      return
    } else {
      exportCache.Manifest.hash = manifestHash
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
    }
    const bar = new Progress('Fetching Images', items.length)
    const duplicates = [] // Don't download component images or relics twice

    for (const item of items) {
      // Save image for parent item
      await this.saveImage(item, false, duplicates, manifest)

      // Save images for components if necessary
      if (item.components) {
        for (let component of item.components) {
          await this.saveImage(component, true, duplicates, manifest)
        }
      }
      bar.tick()
    }

    // Write new cache to disk
    fs.writeFileSync(`${__dirname}/../data/cache/.images.json`, JSON.stringify(imageCache, null, 1))
  }

  /**
   * Download and save images for items or components.
   */
  async saveImage (item, isComponent, duplicates, manifest) {
    const imageBase = manifest.find(i => i.uniqueName === item.uniqueName)
    if (!imageBase) return
    const imageStub = imageBase.textureLocation.replace(/\\/g, '/').replace('xport/', '')
    const imageUrl = `http://content.warframe.com/PublicExport/${imageStub}`
    const basePath = `${__dirname}/../data/img/`
    const filePath = `${basePath}${item.imageName}`
    const sizeBig = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Relics', 'Sentinels', 'Archwing', 'Skins', 'Pets', 'Arcanes']
    const sizeMedium = ['Resources', 'Misc', 'Fish']
    const hash = manifest.find(i => i.uniqueName === item.uniqueName).fileTime
    const cached = imageCache.find(c => c.uniqueName === item.uniqueName)

    // We'll use a custom blueprint image
    if (item.name === 'Blueprint') return

    // Don't download component images or relic images twice
    if (isComponent || item.type === 'Relic') {
      if (duplicates.includes(item.imageName)) {
        return
      } else {
        duplicates.push(item.imageName)
      }
    }

    // Check if the previous image was for a component because they might
    // have different naming schemes like lex-prime
    if (!cached || cached.hash !== hash || cached.isComponent !== isComponent) {
      const image = await request({ url: imageUrl, encoding: null })
      this.updateCache(item, cached, hash, isComponent)

      if (sizeBig.includes(item.category) || isComponent) {
        await sharp(image).resize({ fit: 'fill', height: 342, width: 512 }).toFile(filePath)
      } else if (sizeMedium.includes(item.category)) {
        await sharp(image).resize({ fit: 'fill', height: 342, width: 512 }).toFile(filePath)
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
  }

  /**
   * Update image cache with new hash if things changed
   */
  updateCache (item, cached, hash, isComponent) {
    if (!cached) {
      imageCache.push({
        uniqueName: item.uniqueName,
        hash,
        isComponent
      })
    } else {
      cached.hash = hash
      cached.isComponent = isComponent
    }
  }

  /**
   * Update readme with newest patchlog version
   */
  updateReadme (patchlogs) {
    const logob64 = require(`${__dirname}/../data/logo.json`)
    const version = patchlogs.posts[0].name.replace(/ \+ /g, '--').replace(/[^0-9\-.]/g, '').trim()
    const url = patchlogs.posts[0].url
    const readmeLocation = `${__dirname}/../README.md`
    const readmeOld = fs.readFileSync(readmeLocation, 'utf-8')
    const readmeNew = readmeOld.replace(/\[!\[warframe update.*/, `[![warframe update](https://img.shields.io/badge/warframe_update-${version}-blue.svg?logo=${encodeURIComponent(logob64)})](${url})`)
    fs.writeFileSync(readmeLocation, readmeNew)
  }
}

const build = new Build()
build.init()
