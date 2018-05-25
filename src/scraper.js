const request = require('request-promise')
const crypto = require('crypto')
const cheerio = require('cheerio')

// Capitaliz each word. No idea why this isn't a js standard yet.
const title = (str) => str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

// We'll get these in the fetch function
let resourceExports
let ducats = []

class Scraper {
  constructor () {
    this.endpoints = [
      'http://content.warframe.com/MobileExport/Manifest/ExportWeapons.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportUpgrades.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportSentinels.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportResources.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportDrones.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportCustoms.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportFlavour.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportKeys.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportGear.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportRelicArcane.json',
      'http://content.warframe.com/MobileExport/Manifest/ExportWarframes.json'
    ]
  }

  /**
   * Utility function for content hashes
   */
  hash (value) {
    return crypto.createHash('md5').update(value).digest('hex')
  }

  /**
   * Generate All.json data
   */
  async fetchAll (tradable, hash) {
    const items = await Promise.all(this.endpoints.map(async e => {
      const type = e.split('/').slice(-1)[0].replace('Export', '').replace('.json', '')
      return this.fetch(type, tradable, hash)
    }))
    return items.reduce((a, b) => a.concat(b)) // merged array of arrays
  }

  /**
   * Generate single .json data
   */
  async fetch (type, tradable, hash) {
    console.log(`* Fetching ${type} ${tradable ? '- tradable ' : ''}${hash ? '- hash ' : ''} `)
    const url = this.endpoints.find(e => e.includes(type))
    const res = await request.get(url)
    const sanitized = res.replace(/\n/g, '').replace(/\\r\\r/g, '\\n') // What the fuck DE
    const items = JSON.parse(sanitized)[`Export${type}`]
    await this.fetchAdditional()

    console.log(`* Fetched data for ${type}, processing...`)
    return this.filter(items, tradable, hash, new Date())
  }

  /**
   * Retrieve additional resources required for processing. Ducats, components,
   * etc
   */
  async fetchAdditional () {
    resourceExports = await request.get('http://content.warframe.com/MobileExport/Manifest/ExportResources.json')
    const ducatsWikia = await request('http://warframe.wikia.com/wiki/Ducats/Prices/All')
    const $ = cheerio.load(ducatsWikia)

    // Add ducats to an array here immediately because processing this for
    // every component is *very* slow compared to running through an array.
    $('.mw-content-text table tbody tr').each(function () {
      const name = $(this).find('td:nth-of-type(1) a:nth-of-type(2)').text()
      const value = $(this).find('td:nth-of-type(3) b').text()
      ducats.push({ name, ducats: parseInt(value) })
    })
  }

  /**
   * Add, modify, remove certain keys as I deem sensible. Complaints go to
   * management.
   */
  async filter (items, tradable, hash, timer) {
    // Delete components if included in item list. We'll assign them to the
    // parent directly.
    items = this.removeComponents(items)

    // Filter individual items
    for (let i = 0; i < items.length; i++) {
      let item = items[i]

      // Add hash to check if udpates are necessary, don't keep any other data
      if (hash) {
        items[i] = {
          uniqueName: item.uniqueName,
          contentHash: this.hash(JSON.stringify(item))
        }
        continue
      }
      this.addType(item)
      this.addComponents(item)
      this.sanitize(item)
    }
    console.log(`* Finished in ${new Date() - timer}ms \n`)
    return items
  }

  /**
   * Delete item components that are separate from their parent. We're hard
   * working to unite families here at nexus :^)
   */
  removeComponents (items) {
    const result = []

    for (let item of items) {
      if (!item.uniqueName.includes('/Recipes') && item.name) {
        result.push(item)
      }
    }
    return result
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   */
  sanitize (item) {
    // Capitalize item names which are usually all uppercase
    if (item.name) item.name = title(item.name)
    if (item.type) item.type = title(item.type)
    if (item.trigger) item.trigger = title(item.trigger)
    if (item.noise) item.noise = title(item.noise)
    if (item.type) item.type = title(item.type)
    if (item.rarity) item.rarity = title(item.rarity)

    // Remove <Archwing> from archwing names, add archwing key instead
    if (item.name && item.name.includes('<Archwing>')) {
      item.name = item.name.replace(/<Archwing> /, '')
      item.isArchwing = true
    }

    // Use `name` key for abilities as well.
    if (item.abilities) {
      item.abilities = item.abilities.map(a => {
        return {
          name: title(a.abilityName),
          description: a.description
        }
      })
    }

    // Make descriptions a string, not array
    if (item.description && item.description instanceof Array) item.description = item.description.join()

    // Use proper polarity names
    switch (item.polarity) {
      case 'AP_DEFENSE':
        item.polarity = 'Vazarin'
        break
      case 'AP_TACTIC':
        item.polarity = 'Naramon'
        break
      case 'AP_ATTACK':
        item.polarity = 'Madurai'
        break
      case 'AP_POWER':
        item.polarity = 'Zenurik'
        break
      case 'AP_WARD':
        item.polarity = 'Unairu'
    }

    // Remove keys that only increase output size.
    delete item.codexSecret
    delete item.longDescription
    delete item.parentName
    delete item.relicRewards // We'll fetch the official drop data for this
    delete item.subtype
    delete item.uniqueName
  }

  /**
   * Add item type. Stuff like warframe, archwing, polearm, dagger, etc.
   * Most types can be found in the uniqueName key. If present, just assign it
   * as the type. Note that whatever key is found first 'wins'. For example
   * Archwings are saved as /Lotus/Powersuits/Archwing/*, while Warframes are
   * saved as /Lotus/Powersuits/*, meaning that Archwing has to be looked for
   * first, otherwise it would consider it a Warframe.
   */
  addType (item) {
    const types = require('../config/types.json')
    for (let type of types) {
      if (item.uniqueName.includes(`/${type.id}`)) {
        item.type = type.name
      }
    }
    // No type assigned? Add 'Special'.
    if (!item.type) {
      item.type = 'Special'
    }
  }

  /**
   * Add item components. Resources.json includes all item components separately
   * so we can just look for items with /Lotus/Types/Recipes/* there and match
   * them with the parents.
   */
  addComponents (item) {
    const sanitized = resourceExports.replace(/\n/g, '').replace(/\\r\\r/g, '\\n') // What the fuck DE
    const resources = JSON.parse(sanitized).ExportResources
    const keywords = ['prime', 'vandal', 'wraith']

    item.components = resources.filter(r => {
      const resourceName = r.name.toLowerCase()
      const itemName = item.name.toLowerCase()

      if (!r.uniqueName.includes('/Recipes')) {
        return false
      }

      // Don't mix up prime/vandal/wraith with normal variants.
      for (let keyword of keywords) {
        if (resourceName.includes(keyword) && !itemName.includes(keyword)) {
          return false
        }
      }

      // Remove item name from resource name (this should leave us with the
      // component name).
      if (resourceName.startsWith(itemName)) {
        return true
      }
    })

    // Delete components key if array is empty
    if (!item.components.length) {
      delete item.components
    }

    // Otherwise, clean up component object as it currently holds the entire
    // original component item.
    else {
      // Add Blueprint. For some reason it's not present in resources.json
      item.components.push({ name: 'Blueprint' })

      for (let component of item.components) {
        component.name = component.name.replace(item.name + ' ', '')
        this.sanitize(component)
        delete component.description
        this.addDucats(item, component)
      }
    }
  }

  /**
   * Add ducats for prime items. We'll need to get this data from the wikia.
   */
  addDucats (item, component) {
    for (let stub of ducats) {
      if (`${title(item.name)} ${component.name}` === stub.name) {
        component.ducats = stub.ducats
        return false // break loop
      }
    }
  }
}

module.exports = new Scraper()
