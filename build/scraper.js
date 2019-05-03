const prod = process.env.NODE_ENV === 'production'
const request = require('requestretry').defaults({ fullResponse: false })
const cheerio = require('cheerio')
const crypto = require('crypto')
const fs = require('fs')
const _ = require('lodash')
const patchlogs = require('warframe-patchlogs')
const ProgressBar = require('progress')
const colors = require('colors/safe')
const precompiled = require('../data/json/All.json')
const exportCache = require('../data/cache/.export.json')
const WeaponScraper = require('./wikia/scrapers/WeaponScraper')
const WarframeScraper = require('./wikia/scrapers/WarframeScraper')

const damageTypes = [
  'impact',
  'slash',
  'puncture',
  'heat',
  'cold',
  'electricity',
  'toxin',
  'viral',
  'corrosive',
  'radiation',
  'blast',
  'magnetic',
  'gas',
  'void'
]

process.on('unhandledRejection', err => {
  console.log(err)
  process.exit()
})

// Helper functions for messy parsing to make code less messy.
const title = (str) => str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
const sanitize = (str) => str.replace(/\n/g, '').replace(/\\r\\r/g, '\\n')
const get = async (url) => JSON.parse(sanitize(await request(url)))

// Wikia data scraping for additional information
const scrapeWikia = async () => ({
  weapons: await new WeaponScraper().scrape(),
  warframes: await new WarframeScraper().scrape()
})

// We'll get these later before processing items as they're required for item
// attributes.
let dropChances, dropChancesChanged, patchlogsChanged, manifest, wikiaData, ducatsOrPlatData
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
    this.data = []
    this.componentManifest = []
    this.bar = prod ? {
      interrupt () {},
      tick () {}
    } : new ProgressBar(`:check Procesing Endpoints: ${colors.green('[')}:bar${colors.green(']')} :current/:total :etas remaining ${colors.cyan(':type')}`, {
      incomplete: colors.red('-'),
      width: 20,
      total: this.endpoints.length
    })
  }

  /**
   * Generate All.json data
   */
  async fetchAll () {
    let data = {}

    await this.fetchEndpoints()
    await this.fetchAdditional()

    await Promise.all(this.endpoints.map(async e => {
      const type = e.split('/')[e.split('/').length - 1].replace('Export', '').replace('.json', '')
      const categories = await this.fetch(type)
      data = _.mergeWith(data, categories, (a, b) => _.isArray(a) ? a.concat(b) : undefined)
      this.bar.tick({
        type,
        check: (this.bar.curr === this.endpoints.length - 1) ? colors.green('✓') : colors.yellow('-')
      })
    }))

    // Order everything alphabetically
    for (let category of Object.keys(data)) {
      data[category].sort((a, b) => {
        const res = a.name.localeCompare(b.name)
        if (res === 0) {
          return a.uniqueName.localeCompare(b.uniqueName)
        } else {
          return res
        }
      })
    }
    return data
  }

  /**
   * Generate single .json data
   */
  async fetch (type) {
    const url = this.endpoints.find(e => e.includes(type))
    const items = (await get(url))[`Export${type}`]
    return this.filter(items, type, new Date())
  }

  /**
   * Fetch item data for each endpoint beforehand. We'll need them for adding
   * certain item attributes.
   */
  async fetchEndpoints () {
    const recipes = 'http://content.warframe.com/MobileExport/Manifest/ExportRecipes.json'

    for (let endpoint of this.endpoints.concat(recipes)) {
      const type = endpoint.split('/')[endpoint.split('/').length - 1].replace('.json', '')
      const data = (await get(endpoint))[type]
      this.data.push({ type, data })
    }
  }

  /**
   * Retrieve additional resources required for processing. Ducats, components,
   * etc
   */
  async fetchAdditional () {
    manifest = (await get('http://content.warframe.com/MobileExport/Manifest/ExportManifest.json')).Manifest
    dropChances = await get('https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/all.json')
    wikiaData = await scrapeWikia()
    // Fetches data from "Ducats or Plat" which contains releaseDate, vaultDate and estimatedVaultDate for all primes.
    ducatsOrPlatData = await get('http://www.oggtechnologies.com/api/ducatsorplat/v2/MainItemData.json')
    const ducatsWikia = await request('http://warframe.wikia.com/wiki/Ducats/Prices/All')
    const $ = cheerio.load(ducatsWikia)

    // Add ducats to an array here immediately because processing this for
    // every component is *very* slow compared to running through an array.
    $('.mw-content-text table tbody tr').each(function () {
      const name = $(this).find('td:nth-of-type(1) a:nth-of-type(2)').text()
      const value = $(this).find('td:nth-of-type(3)').attr('data-sort-value')
      ducats.push({ name, ducats: parseInt(value) })
    })

    // Check if sources have changed from previous compilation
    const dropChanceHash = crypto.createHash('md5').update(JSON.stringify(dropChances)).digest('hex')
    const patchlogsHash = crypto.createHash('md5').update(JSON.stringify(patchlogs.posts)).digest('hex')

    if (exportCache.DropChances.hash !== dropChanceHash) {
      dropChancesChanged = true
      exportCache.DropChances.hash = dropChanceHash
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
    }
    if (exportCache.Patchlogs.hash !== patchlogsHash) {
      patchlogsChanged = true
      exportCache.Patchlogs.hash = patchlogsHash
      fs.writeFileSync(`${__dirname}/../data/cache/.export.json`, JSON.stringify(exportCache, null, 1))
    }
  }

  typeCleanPrep (items, type) {
    items.forEach(item => {
      this.addType(item)
      this.sanitize(item)
      this.addComponents(item, type)
    })
  }

  populateComponentManifest (items) {
    items.forEach(item => {
      (item.components || []).forEach(component => {
        if (!this.componentManifest.includes(component.uniqueName)) this.componentManifest.push(component.uniqueName)
      })
    })
  }

  /**
   * Add, modify, remove certain keys as I deem sensible. Complaints go to
   * management.
   */
  async filter (items, type, timer) {
    const data = {}

    items = this.removeComponents(items)
    this.typeCleanPrep(items, type)

    for (let i = 0; i < items.length; i++) {
      let item = items[i]

      this.addImageName(item, items[i - 1])
      if (item.components) {
        for (let component of item.components) {
          this.addImageName(component, null, true)
        }
      }
      this.addCategory(item, type)
      this.addTradable(item, type)
      this.addDropRate(item)
      this.addPatchlogs(item)
      this.addAdditionalWikiaData(item, type)
      this.addDates(item)
      this.applyOverrides(item)

      // Add to category
      if (!data[item.category]) {
        data[item.category] = [item]
      } else {
        data[item.category].push(item)
      }
    }
    return data
  }

  /**
   * Adds releaseDate, vaultDate and estimatedVaultDate to all primes using
   * data from "Ducats or Plat".
   */
  addDates (item) {
    if (!ducatsOrPlatData) {
      return
    }
    if (item.name.endsWith('Prime')) {
      for (const dataItem of ducatsOrPlatData.data) {
        if (!dataItem.Name) {
          continue
        }
        if (item.name.toLowerCase() === dataItem.Name.toLowerCase()) {
          if (dataItem.ReleaseDate) {
            item.releaseDate = dataItem.ReleaseDate
          }
          if (dataItem.VaultedDate) {
            item.vaultDate = dataItem.VaultedDate
          }
          if (dataItem.EstimatedVaultedDate) {
            item.estimatedVaultDate = dataItem.EstimatedVaultedDate
          }
        }
      }
    }
  }

  /**
   * Delete item components that are separate from their parent. We'll add them
   * to the parent in `this.addComponents`.
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

    // Relics don't have their grade in the name for some reason
    if (item.type === 'Relic') {
      const grades = [
        { id: 'Bronze', tier: 'Intact' },
        { id: 'Silver', tier: 'Exceptional' },
        { id: 'Gold', tier: 'Flawless' },
        { id: 'Platinum', tier: 'Radiant' }
      ]
      for (let grade of grades) {
        if (item.uniqueName.includes(grade.id)) {
          item.name = item.name.replace('Relic', grade.tier)
        }
      }
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
   * Add image name for images that will be fetched outside of this scraper.
   */
  addImageName (item, previous, isComponent) {
    const image = manifest.find(i => i.uniqueName === item.uniqueName)
    if (!image) return
    const imageStub = image.textureLocation
    const ext = imageStub.split('.')[imageStub.split('.').length - 1] // .png, .jpg, etc

    if (isComponent || this.componentManifest.includes(item.uniqueName)) {
      if (item.name === 'Blueprint') {
        item.imageName = 'blueprint'
      } else {
        item.imageName = imageStub.split('\\')[imageStub.split('\\').length - 1]
          .split('.')[0].replace(/([a-z](?=[A-Z]))/g, '$1-').toLowerCase()
      }
    } else {
      item.imageName = item.name.replace('/', '').replace(/( |\/|\*)/g, '-').toLowerCase()
    }

    // Some items have the same name - so add their uniqueName as an identifier
    if (previous && item.name === previous.name) {
      item.imageName += ` - ${item.uniqueName.replace('/', '').replace(/( |\/|\*)/g, '-')}`
    }
    item.imageName += `.${ext}`
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
        break
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
  addComponents (item, type) {
    const components = []
    const recipes = this.data.find(d => d.type === 'ExportRecipes').data

    // Add blueprint
    for (let recipe of recipes) {
      if (recipe.resultType === item.uniqueName) {
        const uniqueName = recipe.uniqueName // spaghett

        // Add actual components
        for (const ingredient of recipe.ingredients) {
          let component

          for (let endpoint of this.data) {
            const full = endpoint.data.find(r => r.uniqueName === ingredient.ItemType)
            component = full ? Object.assign({}, full) : null
            if (component) break
          }
          if (!component) continue
          component.itemCount = ingredient.ItemCount
          components.push(component)
        }

        // Add blueprint keys to parent (includes build time, price, etc), but
        // delete unnecessary or duplicate keys
        delete recipe.ingredients
        delete recipe.secretIngredients
        delete recipe.uniqueName
        delete recipe.resultType
        delete recipe.codexSecret
        recipe.buildQuantity = recipe.num // Probably hard to understand otherwise
        recipe.consumeOnBuild = recipe.consumeOnUse
        delete recipe.num
        delete recipe.consumeOnUse
        item = Object.assign(item, recipe)

        components.push({
          uniqueName,
          name: 'Blueprint',
          description: item.description,
          itemCount: 1
        })
        break
      }
    }

    // Get stuff into a prettier shape
    if (components.length) {
      item.components = components

      for (let component of item.components) {
        if (!component.name) console.log(component)
        component.name = title(component.name).replace(item.name + ' ', '')
        this.sanitize(component)
        this.addDucats(item, component)
        this.addTradable(component, type)
      }
      // This sorting is fine, since it's on an unordered list
      item.components.sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  /**
   * Add ducats for prime items. We'll need to get this data from the wikia.
   */
  addDucats (item, component) {
    if (title(item.name).includes('Prime')) {
      for (let stub of ducats) {
        if (stub.name.includes(`${title(item.name)} ${component.name}`)) {
          component.ducats = stub.ducats
          break
        }
      }
    }
  }

  /**
   * Limit items to tradable/untradable if specified.
   */
  addTradable (item, type) {
    const tradableTypes = ['Gem', 'Fish', 'Key', 'Focus Lens', 'Relic']
    const untradableTypes = ['Skin', 'Medallion', 'Extractor', 'Pets', 'Ship Decoration']
    const tradableRegex = /(Prime|Vandal|Wraith|Rakta|Synoid|Sancti|Vaykor|Telos|Secura)/i
    const untradableRegex = /(Glyph|Mandachord|Greater.*Lens|Sugatra)/i
    const notFiltered = !untradableTypes.includes(item.type) && !item.name.match(untradableRegex)
    const isTradable = type === 'Upgrades' || (item.uniqueName.match(tradableRegex) && notFiltered) || (tradableTypes.includes(item.type) && notFiltered)

    item.tradable = isTradable
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   */
  addCategory (item, type) {
    switch (type) {
      case 'Customs':
        if (item.type === 'Sigil') item.category = 'Sigils'
        else item.category = 'Skins'
        break

      case 'Drones':
        item.category = 'Misc'
        break

      case 'Flavour':
        if (item.name.includes('Sigil')) item.category = 'Sigils'
        else if (item.name.includes('Glyph')) item.category = 'Glyphs'
        else item.category = 'Skins'
        break

      case 'Gear':
        item.category = 'Gear'
        break

      case 'Keys':
        if (item.name.includes('Derelict')) item.category = 'Relics'
        else item.category = 'Quests'
        break

      case 'RelicArcane':
        if (!item.type === 'Relic') item.category = 'Arcanes'
        else item.category = 'Relics'
        break

      case 'Sentinels':
        if (item.type === 'Sentinel') item.category = 'Sentinels'
        else item.category = 'Pets'
        break

      case 'Upgrades':
        item.category = 'Mods'
        break

      case 'Warframes':
        if (item.isArchwing) item.category = 'Archwing'
        else item.category = 'Warframes'
        delete item.isArchwing
        break

      case 'Weapons':
        if (item.isArchwing) item.category = 'Archwing'
        else if (item.slot === 5) item.category = 'Melee'
        else if (item.slot === 0) item.category = 'Secondary'
        else if (item.slot === 1) item.category = 'Primary'
        else item.category = 'Misc'
        delete item.isArchwing
        break

      case 'Resources':
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
    // This process takes quite a bit of cpu time, so skip if drop rates haven't
    // changed.
    if (!dropChancesChanged) {
      if (item.components) {
        for (let component of item.components) {
          let savedDrops
          const precompItem = precompiled.find(i => i.name === item.name)
          if (!precompItem) return
          const components = precompItem.components

          if (components) {
            savedDrops = components.find(c => c.name === component.name)
            if (savedDrops && savedDrops.drops) {
              savedDrops.drops = savedDrops.drops.map(drop => {
                drop.location = drop.location.replace('Derelict/', '')
                  .replace('Assassinate (Assassination)', 'Assassinate')
                  .replace('Defense (Defense)', 'Defense')
                  .replace('Survival (Survival)', 'Survival')
                  .replace('Teralyst (Special)', 'Teralyst (Capture)')
                  .replace('Gantulyst (Special)', 'Gantulyst (Capture)')
                  .replace('Hydrolyst (Special)', 'Hydrolyst (Capture)')
                  .replace('The Law Of Retribution C', 'Law Of Retribution')
                  .replace('The Jordas Verdict C', 'Jordas Verdict')
                  .replace('The Law Of Retribution (Nightmare) C', 'Law Of Retribution (Nightmare)')
                  .replace('Sanctuary/Elite Sanctuary Onslaught (Sanctuary Onslaught)', 'Elite Sanctuary Onslaught')
                  .replace('Sanctuary/Sanctuary Onslaught (Sanctuary Onslaught)', 'Sanctuary Onslaught')
                  .replace('/Lunaro Arena (Conclave)', '/Lunaro')
                  .replace('/Lunaro Arena (Extra) (Conclave)', '/Lunaro')
                  .replace('Variant Cephalon Capture (Conclave)', 'Variant Cephalon Capture')
                  .replace('Variant Cephalon Capture (Extra) (Conclave)', 'Variant Cephalon Capture')
                  .replace('Variant Team Annihilation (Extra) (Conclave)', 'Variant Team Annihilation')
                  .replace('Variant Annihilation (Extra)', 'Variant Annihilation')
                  .replace(' (Conclave)', '')
                return drop
              })
            }
          }
          if (savedDrops && savedDrops.drops) {
            component.drops = savedDrops.drops
          }
        }
      } else {
        const savedDrops = precompiled.find(i => i.name === item.name)
        if (savedDrops && savedDrops.drops) item.drops = savedDrops.drops
      }
      return
    }

    // Do the actual processing
    if (item.components) {
      for (let component of item.components) {
        const drops = this.findDropLocations(`${item.name} ${component.name}`)
        if (drops.length) component.drops = drops
      }
    } else {
      // Last word of relic is intact/rad, etc instead of 'Relic'
      const name = item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name
      const drops = this.findDropLocations(name)
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
    // This process takes a lot of cpu time, so we won't repeat it unless the
    // patchlog hash changed.
    if (!patchlogsChanged) {
      const savedPatchlogs = precompiled.find(i => i.name === item.name)
      if (savedPatchlogs && savedPatchlogs.patchlogs) item.patchlogs = savedPatchlogs.patchlogs
      return
    }

    const target = {
      name: item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name,
      type: item.type
    }

    const logs = patchlogs.getItemChanges(target)
    if (logs.length) item.patchlogs = logs
  }

  /**
   * Adds data scraped from the wiki to a particular item
   * @param {Object} item              item to modify
   * @param {String} type type of the item, defaults to warframe
   */
  addAdditionalWikiaData (item, type) {
    if (!['weapons', 'warframes'].includes(type.toLowerCase())) return
    const wikiaItem = wikiaData[type.toLowerCase()].find(i => i.name === item.name)
    if (!wikiaItem) return
    switch (type.toLowerCase()) {
      case 'warframes':
        this.addWarframeWikiaData(item, wikiaItem)
        break
      case 'weapons':
        this.addWeaponWikiaData(item, wikiaItem)
        break
      default:
        break
    }
  }

  addWarframeWikiaData (item, wikiaItem) {
    item.aura = wikiaItem.auraPolarity
    item.conclave = wikiaItem.conclave
    item.color = wikiaItem.color
    item.introduced = wikiaItem.introduced
    item.masteryReq = item.masteryReq || wikiaItem.mr
    item.polarities = wikiaItem.polarities
    item.sex = wikiaItem.sex
    item.sprint = wikiaItem.sprint
    item.vaulted = wikiaItem.vaulted
    item.wikiaThumbnail = wikiaItem.thumbnail
    item.wikiaUrl = wikiaItem.url
  }

  addWeaponWikiaData (item, wikiaItem) {
    item.ammo = wikiaItem.ammo
    item.channeling = wikiaItem.channeling
    item.damage = wikiaItem.damage
    item.damageTypes = {}
    damageTypes.forEach(type => {
      item.damageTypes[type] = wikiaItem[type]
    })
    item.flight = wikiaItem.flight
    item.marketCost = wikiaItem.marketCost
    item.masteryReq = item.masteryReq || wikiaItem.mr
    item.polarities = wikiaItem.polarities
    item.projectile = wikiaItem.projectile
    item.secondary = wikiaItem.secondary
    item.secondaryArea = wikiaItem.secondaryArea
    item.stancePolarity = wikiaItem.stancePolarity
    item.statusChance = wikiaItem.status_chance
    item.tags = wikiaItem.tags
    item.type = wikiaItem.type
    item.vaulted = wikiaItem.vaulted
    item.wikiaThumbnail = wikiaItem.thumbnail
    item.wikiaUrl = wikiaItem.url

    if (item.omegaAttenuation <= 0.75) {
      item.disposition = 1
    } else if (item.omegaAttenuation <= 0.895) {
      item.disposition = 2
    } else if (item.omegaAttenuation <= 1.105) {
      item.disposition = 3
    } else if (item.omegaAttenuation <= 1.3) {
      item.disposition = 4
    } else if (item.omegaAttenuation <= 1.6) {
      item.disposition = 5
    }
  }

  applyOverrides (item) {
    const override = require('../config/overrides.json')[item.uniqueName]
    if (override) {
      console.log(item.uniqueName)
      console.log(JSON.stringify(override))
      item = {
        ...item,
        ...override
      }
    }
  }
}

module.exports = new Scraper()
