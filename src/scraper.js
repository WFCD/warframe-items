const request = require('request-promise')
const crypto = require('crypto')

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
    const url = this.endpoints.find(e => e.includes(type))
    const res = await request.get(url)
    const sanitized = res.replace(/\n/g, '').replace(/\\r\\r/g, '\\n') // What the fuck DE
    const items = JSON.parse(sanitized)[`Export${type}`]

    return this.filter(items, tradable, hash)
  }

  /**
   * Add, modify, remove certain keys as I deem sensible. Complaints go to
   * management.
   */
  filter (items, tradable, hash) {
    // Filter individual items
    for (let i = 0; i < items.length; i++) {
      let item = items[i]

      // Add hash to check if udpates are necessary, don't keep any other data
      if (hash) {
        items[i] = {
          uniqueName: item.uniqueName,
          contentHash: this.hash(JSON.stringify(item))
        }
      }
      this.addType(item)
      this.sanitize(item)
    }
    return items
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   */
  sanitize (item) {
    // Capitalize item names which are usually all uppercase
    if (item.name) item.name = item.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    if (item.type) item.type = item.type.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

    // Remove <Archwing> from archwing names, add archwing key instead
    if (item.name && item.name.includes('<Archwing>')) {
      item.name = item.name.replace(/<Archwing> /, '')
      item.isArchwing = true
    }

    // Use `name` key for abilities as well.
    if (item.abilities) {
      item.abilities = item.abilities.map(a => {
        return {
          name: a.abilityName,
          description: a.description
        }
      })
    }

    // Set other all-caps values to lowercase
    if (item.trigger) item.trigger = item.trigger.toLowerCase()
    if (item.noise) item.noise = item.noise.toLowerCase()
    if (item.type) item.type = item.type.toLowerCase()
    if (item.rarity) item.rarity = item.rarity.toLowerCase()

    // Make descriptions a string, not array
    if (item.description && item.description instanceof Array) item.description = item.description.join()

    // Use proper polarity names
    switch (item.polarity) {
      case 'AP_DEFENSE':
        item.polarity = 'vazarin'
        break
      case 'AP_TACTIC':
        item.polarity = 'naramon'
        break
      case 'AP_ATTACK':
        item.polarity = 'madurai'
        break
      case 'AP_POWER':
        item.polarity = 'zenurik'
        break
      case 'AP_WARD':
        item.polarity = 'unairu'
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
    // Keep existing types. Mods have this for instance.
    if (item.type) {
      return
    }

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
}

module.exports = new Scraper()
