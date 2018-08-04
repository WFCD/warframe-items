/**
 * Update all items locally by default. The entrypoint can then pick those up
 * immediately without fetching them. This storing process is automated by the
 * docker image.
 */
const colors = require('colors/safe')
const crypto = require('crypto')
const fs = require('fs')
const minify = require('imagemin')
const minifyPng = require('imagemin-pngquant')
const minifyJpeg = require('imagemin-jpegtran')
const request = require('requestretry').defaults({ fullResponse: false })
const sharp = require('sharp')
const ProgressBar = require('progress')
const stringify = require('./stringify.js')
const scraper = require('./scraper.js')
const imageCache = require('../data/cache/.images.json')
const exportCache = require('../data/cache/.export.json')

class Update {
  async scrape () {
    const items = await scraper.fetchAll()
    let all = []

    // Save json data
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

    // Save images - also adds imageName and hashes
    // this is a very long process
    await this.saveImages(all)
  }

  /**
   * Get all images unless hashes match with existing images
   */
  async saveImages (items) {
    const Manifest = await request('http://content.warframe.com/MobileExport/Manifest/ExportManifest.json')
    const manifest = JSON.parse(Manifest).Manifest
    const manifestHash = crypto.createHash('md5').update(Manifest).digest('hex')
    const bar = new ProgressBar(`:check Fetching  Images:    ${colors.green('[')}:bar${colors.green(']')} :current/:total :etas remaining :image :updated`, {
      incomplete: colors.red('-'),
      width: 20,
      total: items.length
    })

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

    // Go through each item and download/save image
    const savedComponents = [] // Don't download component images twice
    let done = 0

    await new Promise(async resolve => {
      for (let item of items) {
        await this.saveImage(item, items, false, savedComponents, manifest, bar)
        if (item.components) {
          for (let component of item.components) {
            await this.saveImage(component, items, true, savedComponents, manifest, bar)
          }
        }
        done++
        if (done === items.length) resolve()
      }
    })

    // Write new cache to disk
    fs.writeFileSync(`${__dirname}/../data/cache/.images.json`, JSON.stringify(imageCache, null, 1))
  }

  /**
   * Download and save images for items or components.
   */
  async saveImage (item, items, isComponent, savedComponents, manifest, bar) {
    const imageStub = manifest.find(i => i.uniqueName === item.uniqueName).textureLocation.replace(/\\/g, '/')
    const imageUrl = `http://content.warframe.com/MobileExport${imageStub}`
    const basePath = `${__dirname}/../data/img/`
    const filePath = `${basePath}${item.imageName}`
    const sizeBig = ['Warframes', 'Primary', 'Secondary', 'Melee', 'Relics', 'Sentinels', 'Archwing', 'Skins', 'Pets', 'Arcanes']
    const sizeMedium = ['Resources', 'Misc', 'Fish']
    const hash = manifest.find(i => i.uniqueName === item.uniqueName).fileTime
    const cached = imageCache.find(c => c.uniqueName === item.uniqueName)

    // Don't download component images twice
    if (isComponent) {
      if (item.name === 'Blueprint') {
        return
      }
      if (savedComponents.includes(item.imageName)) {
        return
      } else {
        savedComponents.push(item.imageName)
      }
    }

    if (!cached || cached.hash !== hash) {
      const image = await request({ url: imageUrl, encoding: null })
      this.updateCache(item, hash)

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
            quality: '20-40'
          })
        ]
      })
    }
    bar.tick({
      image: colors.cyan(item.name),
      updated: !cached || cached.hash !== hash ? colors.yellow('(Updated)') : '',
      check: (bar.curr === items.length - 1) ? colors.green('✓') : colors.yellow('-')
    })
  }

  /**
   * Update image cache with new hash if things changed
   */
  updateCache (item, hash) {
    let cached
    for (let image of imageCache) {
      if (image.uniqueName === item.uniqueName) {
        cached = image
        break
      }
    }

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

const update = new Update()
update.scrape()
