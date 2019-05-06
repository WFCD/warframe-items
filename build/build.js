const patchlogs = require('warframe-patchlogs')
const Progress = require('./progress.js')
const Scraper = require('./scraper.js')
const _ = require('lodash')
const title = (str) => str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
const warnings = [] // Mostly about missing data

/**
 * Generate JSON output from original API data.
 */
class Build {
  /**
   * Entrypoint for build process.
   */
  async init () {
    const data = {
      api: await Scraper.fetchApiData(),
      manifest: await Scraper.fetchImageManifest(),
      drops: await Scraper.fetchDropRates()
    }
    const blueprints = data.api.find(c => c.category === 'Recipes').data

    // Modify data from API to fit our schema. Note that we'll
    // skip 'Recipes' (Blueprints) as their data will be attached
    // to the parent item instead.
    for (const chunk of data.api) {
      if (chunk.category === 'Recipes') continue
      chunk.data = this.process(chunk.data, chunk.category, blueprints, data)
    }
  }

  /**
   * Go through every category on the API and adapt to our schema.
   */
  async process (items, category, blueprints, data) {
    const result = []
    const bar = new Progress(`Processing ${category} items`, items.length)

    for (let i = 0; i < items.length; i++) {
      let item = items[i]
      item = this.addComponents(item, category, blueprints, data)
      item = this.filter(items[i], category, data, items[i - 1])
      result.push(item)
      bar.tick()
    }
    return result
  }

  /**
   * Modify individual keys of API data.
   */
  filter (original, category, data, previous) {
    const result = _.cloneDeep(original)

    this.sanitize(result)
    this.addType(result)
    this.addImageName(result, data.manifest, previous)
    this.addCategory(result, category)
    this.addTradable(result)
    this.addDropRate(result, data.drops)
    this.addPatchlogs(result)
    this.addAdditionalWikiaData(result, category)
    this.addDates(result)

    return result
  }

  /**
   * Move components to the parent directly. This also means that we
   * won't store the blueprint as independent item as all its data is
   * attached to the parent.
   */
  addComponents (item, category, blueprints, data) {
    const blueprint = blueprints.find(b => b.resultType === item.uniqueName)
    if (!blueprint) return // Some items just don't have blueprints
    const components = []
    let result = _.cloneDeep(item)

    // Look for original component entry in all categories
    for (const ingredient of blueprint.ingredients) {
      const component = data.api.find(c => c.data.find(i => i.uniqueName === ingredient.ItemType))
      if (!component) {
        warnings.push(`Could not find full data for component ${ingredient.ItemType}`)
        continue
      }
      component.itemCount = ingredient.ItemCount
      components.push(component)
    }

    // Add Blueprint itself
    components.push({
      uniqueName: blueprint.uniqueName,
      name: 'Blueprint',
      description: item.description,
      itemCount: 1
    })

    // Add blueprint keys to parent (includes build time, price, etc), but
    // delete unnecessary or duplicate keys
    delete blueprint.ingredients
    delete blueprint.secretIngredients
    delete blueprint.resultType
    delete blueprint.codexSecret
    blueprint.buildQuantity = blueprint.num // Probably hard to understand otherwise
    blueprint.consumeOnBuild = blueprint.consumeOnUse
    delete blueprint.num
    delete blueprint.consumeOnUse
    delete blueprint.uniqueName
    result = { ...result, ...blueprint }

    // Sanitize component array
    for (const component of components) {
      this.filter(component, category, data)
    }

    // Sort to avoid "fake" updates due to order when data is rebuilt
    result.components = components.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   */
  sanitize (item) {
    // Capitalize properties which are usually all uppercase
    const props = ['name', 'type', 'trigger', 'noise', 'rarity']
    for (const prop of props) {
      if (item[prop]) item[prop] = title(item[prop])
    }

    // Remove <Archwing> from archwing names, add archwing key instead
    if (item.name && item.name.includes('<Archwing>')) {
      item.name = item.name.replace(/<Archwing> /, '')
      item.isArchwing = true
    }

    // Relics don't have their grade in the name for some reason
    if (item.type === 'Relic') {
      const grades = require('../config/relicGrades.json')
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
    if (item.polarity) {
      const polarities = require('../config/polarities.json')
      item.polarity = polarities.find(p => p.id === item.polarity).name
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
   * first, otherwise it would be considered a Warframe.
   */
  addType (item) {
    const types = require('../config/types.json')
    for (let type of types) {
      if (item.uniqueName.includes(`/${type.id}`)) {
        item.type = type.name
        break
      }
    }

    // No type assigned? Add 'Misc'.
    if (!item.type) {
      if ((item.description || '').includes('This resource')) {
        item.type = 'Resource'
      } else {
        item.type = 'Misc'
      }
    }
  }

  /**
   * Add image name for images that will be fetched outside of this scraper.
   */
  addImageName (item, manifest, previous) {
    const image = manifest.find(i => i.uniqueName === item.uniqueName)
    if (!image) return
    const imageStub = image.textureLocation
    const ext = imageStub.split('.')[imageStub.split('.').length - 1] // .png, .jpg, etc

    // Turn any separators into dashes and remove characters that would break
    // the filesystem.
    item.imageName = item.name.replace('/', '').replace(/( |\/|\*)/g, '-').replace(/[:<>\[\]]/g, '').toLowerCase()

    // Relics should use the same image based on type, as they all use the same.
    // The resulting format looks like `axi-intact`, `axi-radiant`
    if (item.type === 'Relic') {
      item.imageName = item.imageName.replace(/-(.*?)-/, '-') // Remove second word (type)
    }

    // Some items have the same name - so add their uniqueName as an identifier
    if (previous && item.name === previous.name) {
      item.imageName += `-${item.uniqueName.replace('/', '').replace(/( |\/|\*)/g, '-').replace(/[:<>\[\]]/g, '')}`
      /* eslint-enable no-useless-escape */
    }

    // Add original file extension
    item.imageName += `.${ext}`
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   */
  addCategory (item, category) {
    switch (category) {
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
        if (item.type !== 'Relic') item.category = 'Arcanes'
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
        break

      default:
        item.category = 'Misc'
        break
    }
  }

  /**
   * Limit items to tradable/untradable if specified.
   */
  addTradable (item) {
    const tradableTypes = ['Upgrades', 'Gem', 'Fish', 'Key', 'Focus Lens', 'Relic']
    const untradableTypes = ['Skin', 'Medallion', 'Extractor', 'Pets', 'Ship Decoration']
    const tradableRegex = /(Prime|Vandal|Wraith|Rakta|Synoid|Sancti|Vaykor|Telos|Secura)/i
    const untradableRegex = /(Glyph|Mandachord|Greater.*Lens|Sugatra)/i
    const notFiltered = !untradableTypes.includes(item.type) && !item.name.match(untradableRegex)
    const tradableByType = tradableTypes.includes(item.type) && notFiltered
    const tradableByName = (item.uniqueName.match(tradableRegex) || item.name.match(tradableRegex)) && notFiltered
    const isTradable = tradableByType || tradableByName

    item.tradable = isTradable || false
  }

  /**
   * Add drop chances based on official drop tables
   */
  addDropRate (item, drops) {
    if (!drops.changed) return

    // Don't look for drop rates on item itself if it has components.
    if (item.components) {
      for (let component of item.components) {
        const data = this.findDropLocations(`${item.name} ${component.name}`, drops.rates)
        if (drops.length) component.drops = data
      }
    } else {
      // Last word of relic is intact/rad, etc instead of 'Relic'
      const name = item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name
      const data = this.findDropLocations(name, drops.rates)
      if (drops.length) item.drops = data
    }

    // Sort by drop rate
    if (item.drops) {
      item.drops.sort((a, b) => b.chance - a.chance)
    }
  }

  findDropLocations (item, dropChances) {
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

      // Remove trailing spaces
      drop.location = drop.location.trim()

      // Replace drop location with correct ingame names
      const overrides = require('../config/dropLocations.json')
      for (const override of overrides) {
        drop.location.replace(override.id, override.name)
      }

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
}

module.exports = new Build()
