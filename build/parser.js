const Progress = require('./progress.js')
const previousBuild = require('../data/json/All.json')
const watson = require('../config/dt_map.json')
const bpConflicts = require('../config/bpConflicts.json')
const _ = require('lodash')
const title = (str) => str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
const warnings = {
  missingImage: [],
  missingDucats: [],
  missingComponents: [],
  missingVaultData: [],
  polarity: [],
  missingType: []
}

const filterBps = (blueprint) => !bpConflicts.includes(blueprint.uniqueName)

/**
 * Parse API data into a more clear or complete format.
 */
class Parser {
  /**
   * Entrypoint for build process.
   */
  parse (data) {
    const blueprints = data.api.find(c => c.category === 'Recipes').data
    const result = []

    // Modify data from API to fit our schema. Note that we'll
    // skip 'Recipes' (Blueprints) as their data will be attached
    // to the parent item instead.
    for (const chunk of data.api) {
      if (chunk.category === 'Recipes') continue
      result.push({
        category: chunk.category,
        data: this.process(chunk.data, chunk.category, blueprints, data)
      })
    }

    return {
      data: result,
      warnings
    }
  }

  /**
   * Go through every category on the API and adapt to our schema.
   */
  process (items, category, blueprints, data) {
    const result = []
    const bar = new Progress(`Parsing ${category}`, items.length)

    for (let i = 0; i < items.length; i++) {
      let item = items[i]

      // Skip Weapon Components as they'll be accessible
      // through their parent. Warframe components are an exception
      // since they are not items itself, but have compononents.
      if (item.uniqueName && item.uniqueName.includes('/Recipes') && !item.uniqueName.includes('/WarframeRecipes')) continue

      item = this.addComponents(item, category, blueprints, data)
      item = this.filter(item, category, data, items[i - 1])
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

    if (result.rewardName) result.uniqueName = result.rewardName
    this.addType(result)
    this.sanitize(result)
    this.addImageName(result, data.manifest, previous)
    this.addCategory(result, category)
    this.addTradable(result)
    this.addDucats(result, data.wikia.ducats)
    this.addDropRate(result, data.drops)
    this.addPatchlogs(result, data.patchlogs)
    this.addAdditionalWikiaData(result, category, data.wikia)
    this.addVaultData(result, data.vaultData)
    this.addResistenceData(result, category)
    this.applyOverrides(result)

    return result
  }

  /**
   * Debug method for parsing the bare minimum of data to finish
   * the build process without errors. Useful when you don't wanna
   * wait several minutes to test something.
   */
  quickFilter (original, category, data, previous) {
    const result = _.cloneDeep(original)

    if (result.rewardName) result.uniqueName = result.rewardName
    this.addType(result)
    this.sanitize(result)
    this.addImageName(result, data.manifest, previous)
    this.addCategory(result, category)

    return result
  }

  /**
   * Move components to the parent directly. This also means that we
   * won't store the blueprint as independent item as all its data is
   * attached to the parent.
   */
  addComponents (item, category, blueprints, data, secondPass) {
    const blueprint = blueprints.filter(filterBps).find(b => b.resultType === item.uniqueName)
    if (!blueprint) return item // Some items just don't have blueprints
    const components = []
    let result = _.cloneDeep(item)

    // Look for original component entry in all categories
    for (const ingredient of blueprint.ingredients) {
      let component

      for (const category of data.api) {
        component = category.data.find(i => i.uniqueName === ingredient.ItemType)
        if (component) break
      }

      if (!component) {
        warnings.missingComponents.push(ingredient.ItemType)
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

    // Attach relevant keys from blueprint to parent
    this.addBlueprintData(result, blueprint)
    this.sanitizeComponents(components, result, item, category, blueprints, data, secondPass)

    return result
  }

  /**
   * Attach blueprint data to the parent item where sensible.
   */
  addBlueprintData (item, blueprint) {
    item.buildPrice = blueprint.buildPrice
    item.buildTime = blueprint.buildTime
    item.skipBuildTimePrice = blueprint.skipBuildTimePrice
    item.buildQuantity = blueprint.num
    item.consumeOnBuild = blueprint.consumeOnUse
  }

  /**
   * Sanitize components slightly differently from normal items. Note that
   * we also add a .parents key which will give the component as standalone
   * item a list of all its parents.
   */
  sanitizeComponents (components, result, item, category, blueprints, data, secondPass) {
    for (let i = 0; i < components.length; i++) {
      components[i].parent = title(item.name) // Direct parent for this pass

      // If a .parents key already exists from another item, add our
      // component additionally, otherwise create one. This mutates the
      // original component object.
      if (components[i].parents) {
        if (!components[i].parents.includes(title(item.name))) {
          components[i].parents.push(title(item.name))
          components[i].parents.sort((a, b) => a.localeCompare(b))
        }
      } else {
        components[i].parents = [title(item.name)]
      }
      const override = this.filter(components[i], category, data)
      delete components[i].parent
      delete override.parent
      delete override.parents

      // Warframe/Weapon components should not include their parent's
      // name so it's easier to work with them. This is especially critical
      // for parsing trade chat data.
      if (override.uniqueName.includes('/Recipes') || item.tradable) {
        override.name = override.name.replace(`${title(item.name).replace(/<Archwing> /, '')} `, '')
      }
      components[i] = override

      // Add component's components one level deep. Disabled for now because of
      // too much duplicate data.
      // if (!secondPass) {
      //  components[i] = this.addComponents(components[i], category, blueprints, data, true)
      // }
    }

    // Sort to avoid "fake" updates due to order when data is rebuilt
    result.components = components.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   */
  sanitize (item) {
    // Some items have no name, so we use the last bit of the
    // uniqueName instead.
    if (!item.name) {
      item.name = item.uniqueName.split('/').reverse()[0]
    }

    // Capitalize properties which are usually all uppercase
    const props = ['name', 'type', 'trigger', 'noise', 'rarity', 'faction']
    for (const prop of props) {
      if (item[prop]) item[prop] = title(item[prop])
    }

    // Remove <Archwing> from archwing names, add archwing key instead
    if (item.name && item.name.includes('<Archwing>')) {
      item.name = item.name.replace(/<Archwing> /, '')
      item.isArchwing = true
    }

    // Fix Mk1 weapons not matching wikia url
    if (item.name && item.name.includes('Mk1')) {
      item.name = item.name.replace('Mk1', 'MK1')
    }

    // Relics don't have their grade in the name for some reason
    if (item.type === 'Relic') {
      const grades = require('../config/relicGrades.json')
      for (let grade of grades) {
        if (item.uniqueName.includes(grade.id)) {
          item.name = item.name.replace('Relic', grade.refinement)
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
      const polarity = polarities.find(p => p.id === item.polarity)
      if (polarity) {
        item.polarity = polarity.name
      } else {
        warnings.polarity.push(`Could not find matching polarity ${item.polarity} for ${item.name}`)
      }
    }

    // Remove keys that only increase output size.
    delete item.codexSecret
    if (item.type !== 'enemy') delete item.longDescription
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
    if (item.parent) return
    const types = require('../config/itemTypes.json')

    for (let type of types) {
      if (item.uniqueName.includes(type.id)) {
        item.type = type.name
        break
      }
    }

    // No type assigned? Add 'Misc'.
    if (!item.type) {
      if ((item.description || '').includes('This resource')) {
        item.type = 'Resource'
      } else if (item.faction) {
        item.type = item.faction
        delete item.faction
      } else {
        if (!warnings.missingType.includes(item.name)) warnings.missingType.push(item.name)
        item.type = 'Misc'
      }
    }
  }

  /**
   * Add image name for images that will be fetched outside of this scraper.
   */
  addImageName (item, manifest, previous) {
    const image = manifest.find(i => i.uniqueName === item.uniqueName)
    if (!image) {
      warnings.missingImage.push(item.name)
      return
    }
    // eslint-disable-next-line no-useless-escape
    const encode = (str) => str.replace('/', '').replace(/( |\/|\*)/g, '-').replace(/[:<>\[\]]/g, '').toLowerCase()
    const imageStub = image.textureLocation
    const ext = imageStub.split('.')[imageStub.split('.').length - 1].replace(/!.*/, '') // .png, .jpg, etc

    // Turn any separators into dashes and remove characters that would break
    // the filesystem.
    item.imageName = encode(item.name)

    // Components usually have the same generic images, so we should remove the
    // parent name here. Note that there's a difference between prime/non-prime
    // components, so we'll keep the prime in the name.
    if (item.parent) {
      item.imageName = item.imageName.replace(encode(item.parent) + '-', '')
      if (item.name.includes('Prime')) item.imageName = `prime-${item.imageName}`
    }

    // Relics should use the same image based on type, as they all use the same.
    // The resulting format looks like `axi-intact`, `axi-radiant`
    if (item.type === 'Relic') {
      item.imageName = item.imageName.replace(/-(.*?)-/, '-') // Remove second word (type)
    }

    // Some items have the same name - so add their uniqueName as an identifier
    if (previous && item.name === previous.name) {
      item.imageName += `-${encode(item.uniqueName)}`
    }

    // Add original file extension
    item.imageName += `.${ext}`
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   */
  addCategory (item, category) {
    // Don't add categories for components when the parent already has one
    if (item.parent) return

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
        else if (item.type === 'Pets') item.category = 'Pets'
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

      case 'Enemies':
        item.category = 'Enemy'
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
    const tradableTypes = ['Upgrades', 'Fish', 'Key', 'Focus Lens', 'Relic', 'Rifle Mod',
      'Secondary Mod', 'Shotgun Mod', 'Warframe Mod', 'Companion Mod', 'Archwing Mod', 'K-Drive Mod',
      'Melee Mod']
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
   * Add ducats for prime items. We'll need to get this data from the wikia.
   */
  addDucats (item, ducats) {
    if (!item.name.includes('Prime') || !item.components) return

    for (const component of item.components) {
      if (!component.tradable) continue
      const wikiaItem = ducats.find(d => d.name.includes(`${item.name} ${component.name}`))
      if (wikiaItem) {
        component.ducats = wikiaItem.ducats
      } else {
        warnings.missingDucats.push(`${item.name} ${component.name}`)
      }
    }
  }

  /**
   * Add drop chances based on official drop tables
   */
  addDropRate (item, drops) {
    // Take drops from previous build if the droptables didn't change
    if (!drops.changed) {
      // Get drop rates for components if available...
      if (item.components) {
        for (let component of item.components) {
          const previous = previousBuild.find(i => i.name === item.name)
          if (!previous || !previous.components) return

          const saved = previous.components.find(c => c.name === component.name)
          if (saved && saved.drops) {
            component.drops = saved.drops
          }
        }
      }

      // Otherwise attach to main item
      else {
        const saved = previousBuild.find(i => i.name === item.name)
        if (saved && saved.drops) item.drops = saved.drops
      }
    }

    // Don't look for drop rates on item itself if it has components.
    if (item.components) {
      for (const component of item.components) {
        const data = this.findDropLocations(`${item.name} ${component.name}`, drops.rates)
        if (data.length) component.drops = data
      }
    } else {
      // Last word of relic is intact/rad, etc instead of 'Relic'
      const name = item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name
      const data = this.findDropLocations(name, drops.rates)
      if (data.length) item.drops = data
    }

    // Sort by drop rate
    if (item.drops) {
      item.drops.sort((a, b) => b.chance - a.chance)
    }
  }

  findDropLocations (item, dropChances) {
    // Prime drop locations array
    let result = []
    let dropLocations = []
    this.findDropRecursive(item, dropChances, dropLocations, '')

    if (!dropLocations.length) {
      return []
    }

    // The find function returns an array of mentions with their respective paths.
    // So because I'm lazy and don't want to directly implement it into the
    // recursion, we'll gather the info "around" the found key here.
    for (const location of dropLocations) {
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
    }
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
  addPatchlogs (item, patchlogs) {
    // Don't add patchlogs for components
    if (item.parent) return

    // This process takes a lot of cpu time, so we won't repeat it unless the
    // patchlog hash changed.
    if (!patchlogs.changed) {
      const previous = previousBuild.find(i => i.name === item.name)
      if (previous && previous.patchlogs) item.patchlogs = previous.patchlogs
      return
    }

    const target = {
      name: item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name,
      type: item.type
    }

    const logs = patchlogs.patchlogs.getItemChanges(target)
    if (logs.length) item.patchlogs = logs
  }

  /**
   * Adds data scraped from the wiki to a particular item
   */
  addAdditionalWikiaData (item, category, wikiaData) {
    if (!['weapons', 'warframes'].includes(category.toLowerCase())) return

    const wikiaItem = wikiaData[category.toLowerCase()].find(i => i.name === item.name)
    if (!wikiaItem) return

    switch (category.toLowerCase()) {
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
    item.wikiaThumbnail = wikiaItem.thumbnail
    item.wikiaUrl = wikiaItem.url
  }

  addWeaponWikiaData (item, wikiaItem) {
    const damageTypes = require('../config/damageTypes.json')
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
    // Re-apply correct names to MK1-weapons
    if (item.name && item.name.includes('MK1')) {
      item.name = item.name.replace('MK1', 'Mk1')
    }
  }

  /**
   * Adds releaseDate, vaultDate and estimatedVaultDate to all primes using
   * data from "Ducats or Plat".
   */
  addVaultData (item, vaultData) {
    if (!item.name.endsWith('Prime')) return
    const target = vaultData.find(i => i.Name.toLowerCase() === item.name.toLowerCase())

    if (!target) {
      warnings.missingVaultData.push(item.name)
      return
    }

    if (target.ReleaseDate) {
      item.releaseDate = target.ReleaseDate
    }
    if (target.VaultedDate) {
      item.vaultDate = target.VaultedDate
    }
    if (target.EstimatedVaultedDate) {
      item.estimatedVaultDate = target.EstimatedVaultedDate
    }
    if (target.Vaulted) {
      item.vaulted = target.Vaulted
    }
  }

  applyOverrides (item) {
    const override = require('../config/overrides.json')[item.uniqueName]
    if (override) {
      item = {
        ...item,
        ...override
      }
    }
  }

  addResistenceData (item, category) {
    if (category.toLowerCase() !== 'enemies') return

    const quantities = {
      positive: [0.25, 0.5, 0.75],
      negative: [-0.25, -0.5, -0.75]
    }
    const parseAffectors = (affectors) => {
      return affectors.split(' ').map(element => {
        if (element.includes('+')) {
          // positives
          const pSplit = (element || '').split('+')
          return {
            element: pSplit[0].length > 0 ? (watson[pSplit[0]] || title(pSplit[0].split('_')[1])) : 'None',
            modifier: quantities.positive[pSplit.length - 1] || 0
          }
        }
        if (element.includes('-')) {
          // positives
          const nSplit = (element || '').split('-')
          return {
            element: nSplit[0].length > 0 ? watson[nSplit[0]] || title(nSplit[0].split('_')[1]) : 'None',
            modifier: quantities.negative[nSplit.length - 1] || 0
          }
        }
        return {
          element: 'None',
          modifier: 0
        }
      })
    }
    const parseArmor = enemy => {
      return enemy.resistValues.map((resist, index) => ({
        amount: resist,
        type: title(enemy.resistPrefix[index]),
        affectors: parseAffectors(enemy.resistTexts[index].trim().replace(/\s\s/g, ' '))
      }))
    }

    item.resistances = parseArmor(item)
    item.name = title(item.name)
    delete item.resistValues
    delete item.resistPrefix
    delete item.resistTexts
  }
}

module.exports = new Parser()
