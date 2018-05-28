const request = require('requestretry').defaults({ fullResponse: false })
const cheerio = require('cheerio')
const _ = require('lodash')
const patchlogs = require('warframe-patchlogs')

process.on('unhandledRejection', err => {
  console.log(err)
  process.exit()
})

// Capitaliz each word. No idea why this isn't a js standard yet.
const title = (str) => str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

// We'll get these in the fetch function
let resourceExports
let dropChances
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
   * Generate All.json data
   */
  async fetchAll () {
    let data = {}

    // this would heavily interfere with other downloads. So I'd rather wait a bit.
    console.log('Waiting for patchlogs to download, this will take a while...')
    const t0 = new Date()
    await patchlogs.setup
    console.log(`Finished in ${new Date() - t0}ms\n`)

    await Promise.all(this.endpoints.map(async e => {
      const type = e.split('/').slice(-1)[0].replace('Export', '').replace('.json', '')
      const categories = await this.fetch(type)
      data = _.mergeWith(data, categories, (a, b) => _.isArray(a) ? a.concat(b) : undefined)
    }))

    // Order everything alphabetically
    for (let category of Object.keys(data)) {
      data[category].sort((a, b) => a.name.localeCompare(b.name))
    }
    return data
  }

  /**
   * Generate single .json data
   */
  async fetch (type) {
    console.log(`Fetching ${type}`)
    const url = this.endpoints.find(e => e.includes(type))
    const res = await request.get(url)
    const sanitized = res.replace(/\n/g, '').replace(/\\r\\r/g, '\\n') // What the fuck DE
    const items = JSON.parse(sanitized)[`Export${type}`]
    await this.fetchAdditional()

    console.log(`Fetched data for ${type}, processing...`)
    return this.filter(items, type, new Date())
  }

  /**
   * Retrieve additional resources required for processing. Ducats, components,
   * etc
   */
  async fetchAdditional () {
    dropChances = JSON.parse(await request.get('https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/all.json'))
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
  async filter (items, type, timer) {
    const data = {}
    items = this.removeComponents(items)

    for (let i = 0; i < items.length; i++) {
      let item = items[i]

      this.addType(item)
      this.sanitize(item)
      this.addComponents(item)
      this.addCategory(item, type)
      this.addTradable(item, type)
      this.addDropRate(item)
      this.addPatchlogs(item)

      // Add to category
      if (!data[item.category]) {
        data[item.category] = [item]
      } else {
        data[item.category].push(item)
      }
    }
    console.log(`Finished in ${new Date() - timer}ms \n`)
    return data
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
      item.abilities.sort((a, b) => a.name.localeCompare(b.name))
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
      case 'AP_PRECEPT':
        item.polarity = 'Penjaga'
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
      item.type = 'Misc'
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
        component.name = title(component.name).replace(item.name + ' ', '')
        this.sanitize(component)
        delete component.description
        this.addDucats(item, component)
      }
      item.components.sort((a, b) => a.name.localeCompare(b.name))
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

  /**
   * Limit items to tradable/untradable if specified.
   */
  addTradable (item, type) {
    const tradableTypes = ['Gem', 'Fish', 'Key', 'Focus Lens']
    const untradableTypes = ['Skin', 'Medallion', 'Extractor', 'Pets', 'Ship Decoration']
    const tradableRegex = /(Prime|Vandal|Wraith|Rakta|Synoid|Sancti|Vaykor|Telos|Secura)/i
    const untradableRegex = /(Glyph|Mandachord|Greater.*Lens|Sugatra)/i
    const notFiltered = !untradableTypes.includes(item.type) && !item.name.match(untradableRegex)
    const isTradable = type === 'Upgrades' || (item.name.match(tradableRegex) && notFiltered) || (tradableTypes.includes(item.type) && notFiltered)

    item.tradable = isTradable
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   */
  addCategory (item, type) {
    if (type === 'Customs') item.category = 'Skins'
    if (type === 'Drones') item.category = 'Misc'
    if (type === 'Flavour') item.category = 'Skins'
    if (type === 'Gear') item.category = 'Gear'
    if (type === 'Keys') {
      if (item.name.includes('Derelict')) item.category = 'Relics'
      else item.category = 'Quests'
    }
    if (type === 'RelicArcane') {
      if (!item.name.includes('Relic')) item.category = 'Arcanes'
      else item.category = 'Relics'
    }
    if (type === 'Sentinels') {
      if (item.type === 'Sentinel') item.category = 'Sentinels'
      else item.category = 'Pets'
    }
    if (type === 'Upgrades') item.category = 'Mods'
    if (type === 'Warframes') {
      if (item.isArchwing) item.category = 'Archwing'
      else item.category = 'Warframes'
      delete item.isArchwing
    }
    if (type === 'Weapons') {
      if (item.isArchwing) item.category = 'Archwing'
      else if (item.slot === 5) item.category = 'Melee'
      else if (item.slot === 0) item.category = 'Secondary'
      else if (item.slot === 1) item.category = 'Primary'
      else item.category = 'Misc'
      delete item.isArchwing
    }
    if (type === 'Resources') {
      if (item.type === 'Pets') item.category = 'Pets'
      else if (item.type === 'Specter') item.category = 'Gear'
      else if (item.type === 'Resource') item.category = 'Resources'
      else if (item.type === 'Fish') item.category = 'Fish'
      else if (item.type === 'Ship Decoration') item.category = 'Skins'
      else if (item.type === 'Gem') item.category = 'Resources'
      else if (item.type === 'Plant') item.category = 'Resources'
      else item.category = 'Misc'
    }
  }

  /**
   * Add drop chances based on official drop tables
   */
  addDropRate (item) {
    if (item.components) {
      for (let component of item.components) {
        const drops = this.findDropLocations(`${item.name} ${component.name}`)
        if (drops.length) component.drops = drops
      }
    } else {
      const drops = this.findDropLocations(`${item.name}`)
      if (drops.length) item.drops = drops
    }
    // Sort by drop rate
    if (item.drops) {
      item.drops.sort((a, b) => b.chance - a.chance)
    }
  }

  findDropLocations (item) {
    let result = []
    let dropLocations = []

    this.findDropRecursive(item, dropChances, dropLocations, '')

    if (!dropLocations.length) {
      return []
    }

    // The find function returns an array of mentions with their respective paths.
    // So because I'm lazy and don't want to directly implement it into the
    // recursion, we'll gather the info "around" the found key here.
    dropLocations.forEach(location => {
      const propBlacklist = ['_id', 'ememyModDropChance', 'enemyModDropChance']
      const path = location.path.replace(/\[/g, '').replace(/\]/g, ' ').split(' ')
      const dropData = dropChances[path[0]][path[1]]
      const drop = {
        location: '',
        type: path[0].replace(/([a-z](?=[A-Z]))/g, '$1 '), // Regex transforms camelCase to normal words
        rarity: location.drop.rarity,
        chance: location.drop.chance * 0.01
      }
      // Capitalize drop type
      drop.type = drop.type[0].toUpperCase() + drop.type.slice(1)

      // If enemy mod drop chance is present, multiply drop chance with that
      // value, so the drop chance is accurate for each kill, not for each drop.
      if (dropData && dropData.ememyModDropChance) {
        drop.chance = drop.chance * (dropData.ememyModDropChance * 0.01)
      }

      // First few Properties of the first object form the drop location name
      for (let prop in dropData) {
        if (typeof dropData[prop] === 'string' && !propBlacklist.includes(prop)) {
          drop.location += dropData[prop] + ' '
        }
      }

      // Add some fixes for Mission rewards. Their results are more nested
      // than other drop locations. Path looks like:
      // [missionRewards][Void][Belenus][rewards][C][12][itemName]
      if (drop.type === 'Mission Rewards') {
        drop.location = `${path[1]} - ${path[2]}`

        // Has rotations
        if (path[4].match(/[a-z]/i)) {
          drop.rotation = path[4]
        }
      }

      // Remove trailing space from location
      drop.location = drop.location.trim()
      result.push(drop)
    })
    return result
  }

  findDropRecursive (target, child, dropLocations, path) {
    if (typeof child === 'object') {
      for (let prop in child) {
        const nextPath = `${path}[${prop}]`
        const found = this.findDropRecursive(target, child[prop], dropLocations, nextPath)
        if (found && !child.enemies) {
          dropLocations.push({ path: nextPath, drop: child })
        }
      }
    }

    // String ? check if it's the component we want
    else if (typeof child === 'string') {
      return child === target || child === target + ' Blueprint' ? child : null
    }
  }

  /**
   * Get patchlogs from forums and attach when changes are found for item.
   */
  addPatchlogs (item) {
    const logs = patchlogs.getItemChanges(item)
    if (logs.length) item.patchlogs = logs
  }
}

module.exports = new Scraper()
