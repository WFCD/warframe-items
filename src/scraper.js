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
    const data = JSON.parse(sanitized)[`Export${type}`]

    return this.filter(data, tradable, hash)
  }

  /**
   * Add, modify, remove certain keys as I deem sensible. Complaints go to
   * management.
   */
  filter (data, tradable, hash) {
    for (let obj of data) {
      // Add hash to check if udpates are necessary
      if (hash) obj.contentHash = this.hash(JSON.stringify(obj))

      // Capitalize item names which are usually all uppercase
      if (obj.name) obj.name = obj.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

      // Remove <Archwing> from archwing names, add archwing key instead
      if (obj.name && obj.name.includes('<Archwing>')) {
        obj.name = obj.name.replace(/<Archwing> /, '')
        obj.isArchwing = true
      }

      // Set other all-caps values to lowercase
      if (obj.trigger) obj.trigger = obj.trigger.toLowerCase()
      if (obj.noise) obj.noise = obj.noise.toLowerCase()
      if (obj.type) obj.type = obj.type.toLowerCase()
      if (obj.rarity) obj.rarity = obj.rarity.toLowerCase()

      // Make descriptions a string, not array
      if (obj.description && obj.description instanceof Array) obj.description = obj.description.join()

      // Use proper polarity names
      switch (obj.polarity) {
        case 'AP_DEFENSE':
          obj.polarity = 'vazarin'
          break
        case 'AP_TACTIC':
          obj.polarity = 'naramon'
          break
        case 'AP_ATTACK':
          obj.polarity = 'madurai'
          break
        case 'AP_POWER':
          obj.polarity = 'zenurik'
          break
        case 'AP_WARD':
          obj.polarity = 'unairu'
      }

      // Remove keys that only increase output size.
      delete obj.codexSecret
      delete obj.longDescription
      delete obj.parentName
      delete obj.relicRewards // We'll fetch the official drop data for this
    }
    return data
  }
}

module.exports = new Scraper()
