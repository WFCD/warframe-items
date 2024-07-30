import cloneDeep from 'lodash.clonedeep';
import { lastResourceName } from 'warframe-worldstate-data/utilities';

import dedupe from './dedupe.mjs';
import hashManager from './hashManager.mjs';
import Progress from './progress.mjs';
import readJson from './readJson.mjs';
import tradable from './tradable.mjs';

const previousBuild = await readJson(new URL('../data/json/All.json', import.meta.url));
const watson = await readJson(new URL('../config/dt_map.json', import.meta.url));
const bpConflicts = await readJson(new URL('../config/bpConflicts.json', import.meta.url));
const { prefixes, suffixes } = await readJson(new URL('../config/variants.json', import.meta.url));
const grades = await readJson(new URL('../config/relicGrades.json', import.meta.url));
const polarities = await readJson(new URL('../config/polarities.json', import.meta.url));
const types = await readJson(new URL('../config/itemTypes.json', import.meta.url));
const overrides = await readJson(new URL('../config/overrides.json', import.meta.url));
const masterableCategories = await readJson(new URL('../config/masterableCategories.json', import.meta.url));

/**
 * Titlecase a string
 * @param {string} str string to be titlecased
 * @returns {string}
 */
const title = (str = '') =>
  str
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/'S /gi, "'s ");

/** @type {Warnings} */
const warnings = {
  missingImage: [],
  missingDucats: [],
  missingComponents: [],
  missingVaultData: [],
  polarity: [],
  missingType: [],
  failedImage: [],
  missingWikiThumb: [],
};

const filterBps = (blueprint) => !bpConflicts.includes(blueprint.uniqueName);
const primeExcludeRegex = /(^Noggle .*|Extractor .*|^[A-Z] Prime$|^Excalibur .*|^Lato .*|^Skana .*)/i;
const prefixed = (name) =>
  new RegExp(`(((?:${prefixes.join('|')})\\s?${name}.*)|(?:${name}\\s?(?:${suffixes.join('|')})\\s?.*))+`, 'i');

/**
 * Drop comparator
 * Compares drop locations for items lexicographically by chance + location + rotation + rarity
 * @param {Drop} dropA first drop to compare
 * @param {Drop} dropB second drop to compare
 * @returns {number}
 */
const dropComparator = (dropA, dropB) => {
  const keyA = `${dropA.chance}:${dropA.location}:${dropA.rotation}:${dropA.rarity}`.toUpperCase();
  const keyB = `${dropB.chance}:${dropB.location}:${dropB.rotation}:${dropB.rarity}`.toUpperCase();
  return keyA.localeCompare(keyB);
};

/**
 * @typedef {Object} RawDrop
 * @property {string} place
 * @property {string} item
 * @property {number|string} chance
 * @property {string} rarity
 */
/**
 * Map raw drops to minimal drops
 * @param {RawDrop} drop raw drop info to map
 * @returns {Drop}
 */
const dropMap = (drop) => {
  return {
    location: drop.place.replace('<b>', '').replace('</b>', ''),
    type: drop.item,
    chance: Number.parseFloat(Number(drop.chance * 0.01).toFixed(5)),
    rarity: drop.rarity,
  };
};

/**
 * @typedef {RawDrop} DropRate
 */
/**
 * @typedef {Object} RawItemData
 * @property {Array<Partial<Item>>} api Raw api data
 * @property {ImageManifest.Manifest} manifest of image data
 * @property {Array<DropRate>} drops drop rates
 * @property {PatchlogWrap} patchlogs patch data
 * @property {WikiaData} wikia warframe wikia data
 * @property {VaultData} vaultData Ogg vault data
 * @property {Array<module:@wfcd/relics.TitaniaRelic>} relics Generated relic data
 * @property {Array<Partial<Item>>} i18n i18n data
 */

/**
 * Parse API data into a more clear or complete format.
 */
class Parser {
  /**
   * @typedef {Object} ParsedData
   * @property {Array<Item>} data
   * @property {Warnings} warnings
   */
  /**
   * Entrypoint for build process.
   * @param {RawItemData} data raw data to parse into {@link Item|Items}
   * @returns {ParsedData}
   */
  parse(data) {
    const blueprints = data.api.find((c) => c?.category === 'Recipes')?.data;
    const result = [];

    // Modify data from API to fit our schema. Note that we'll
    // skip 'Recipes' (Blueprints) as their data will be attached
    // to the parent item instead.
    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of data.api) {
      if (!chunk || chunk?.category === 'Recipes') continue;
      const parsedData = this.process(chunk.data, chunk.category, blueprints, data);
      result.push({
        category: chunk.category,
        data: parsedData,
      });
    }

    Object.keys(warnings).forEach((key) => {
      warnings[key].sort();
      warnings[key] = Array.from(new Set(warnings[key].filter((thing) => thing.length)));
    });

    return {
      data: result,
      warnings,
    };
  }

  /**
   * Go through every category on the API and adapt to our schema.
   * @param {Array<Partial<Item>>} items items to be processed
   * @param {string<module:warframe-items.Category>} category Category being parsed
   * @param {Array<Partial<Item>>} blueprints items known to be blueprints
   * @param {RawItemData} data context data dependencies
   * @returns {Array<Item>}
   */
  process(items, category, blueprints, data) {
    const result = [];

    const bar = new Progress(`Parsing ${category}`, items.length);
    if (!items.length) {
      bar?.interrupt?.(`No ${category}`);
      return [];
    }
    for (let index = 0; index < items.length; index += 1) {
      let item = items[index];
      // Skip Weapon Components as they'll be accessible
      // through their parent. Warframes' components are an exception,
      // since they are not items itself, but have components.
      if (item.uniqueName && item.uniqueName.includes('/Recipes')) continue;

      item = this.addComponents(item, category, blueprints, data);
      item = this.filter(item, category, data, items[index - 1]);
      result.push(item);
      bar.tick();
    }
    return result;
  }

  /**
   * Modify individual keys of API data.
   * @param {Partial<Item>} original item to be processed
   * @param {string<module:warframe-items.Category>} category Category being parsed
   * @param {RawItemData} data context data dependencies
   * @param {Partial<Item>} [previous] item previous to this in the list
   * @returns {Partial<Item>}
   */
  filter(original, category, data, previous) {
    const result = cloneDeep(original);

    if (result.rewardName) result.uniqueName = result.rewardName;
    this.addType(result);
    this.addDamage(result);
    this.sanitize(result);
    this.addImageName(result, data.manifest, previous);
    if (result.abilities) {
      result.abilities.forEach((a) => this.addImageName(a, data.manifest, previous));
    }

    this.addCategory(result, category);
    this.addTradable(result);
    this.addDucats(result, data.wikia.ducats);
    this.addDropRate(result, data.drops);
    this.addPatchlogs(result, data.patchlogs);
    this.addAdditionalWikiaData(result, category, data.wikia);
    this.addIsPrime(result);
    this.addVaultData(result, data.vaultData, category, data.wikia);
    this.addResistanceData(result, category);
    this.addRelics(result, data.relics);
    this.applyMasterable(result);
    this.applyOverrides(result);
    return result;
  }

  /**
   * Debug method for parsing the bare minimum of data to finish
   * the build process without errors. Useful when you don't want to
   * wait several minutes to test something. A quick version of {@link #filter}.
   * @param {Partial<Item>} original item to be processed
   * @param {module:warframe-items.Category} category Category being parsed
   * @param {RawItemData} data context data dependencies
   * @param {Partial<Item>} previous item previous to this in the list
   * @returns {Partial<Item>}
   */
  quickFilter(original, category, data, previous) {
    const result = cloneDeep(original);

    if (result.rewardName) result.uniqueName = result.rewardName;
    this.addType(result);
    this.sanitize(result);
    this.addImageName(result, data.manifest, previous);
    this.addCategory(result, category);

    this.addVaultData(result, data.vaultData, category, data.wikia);

    return result;
  }

  /**
   * Move components to the parent directly. This also means that we
   * won't store the blueprint as independent item as all its data is
   * attached to the parent.
   * @param {Partial<Item>} item item to be processed
   * @param {string<module:warframe-items.Category>} category Category being parsed
   * @param {Array<Partial<Item>>} blueprints items known to be blueprints
   * @param {RawItemData} data context data dependencies
   * @param {boolean} [secondPass] whether this is the second pass adding components, for nested component data
   * @returns {Partial<Item>}
   */
  addComponents(item, category, blueprints, data, secondPass) {
    const blueprint = blueprints.filter(filterBps).find((b) => b.resultType === item.uniqueName);
    if (!blueprint) return item; // Some items just don't have blueprints
    const components = [];
    const result = cloneDeep(item);

    // Look for original component entry in all categories
    // eslint-disable-next-line no-restricted-syntax
    for (const ingredient of blueprint.ingredients) {
      let component;

      // eslint-disable-next-line no-restricted-syntax
      for (const categoryData of data.api) {
        component = categoryData.data.find((i) => i.uniqueName === ingredient.ItemType);
        if (component) break;
      }

      if (!component) {
        warnings.missingComponents.push(ingredient.ItemType);
        continue;
      }

      component.itemCount = ingredient.ItemCount;
      components.push(component);
    }

    // Add Blueprint itself
    components.push({
      uniqueName: blueprint.uniqueName,
      name: 'Blueprint',
      description: item.description,
      itemCount: 1,
      primeSellingPrice: blueprint.primeSellingPrice,
    });

    // Attach relevant keys from blueprint to parent
    this.addBlueprintData(result, blueprint);
    this.sanitizeComponents(components, result, item, category, blueprints, data, secondPass);
    components.forEach(this.applyOverrides);
    return result;
  }

  /**
   * Attach blueprint data to the parent item where sensible.
   * @param {Item} item item to apply data to
   * @param {Partial<Item>} blueprint with partial data
   */
  addBlueprintData(item, blueprint) {
    item.buildPrice = blueprint.buildPrice;
    item.buildTime = blueprint.buildTime;
    item.skipBuildTimePrice = blueprint.skipBuildTimePrice;
    item.buildQuantity = blueprint.num;
    item.consumeOnBuild = blueprint.consumeOnUse;
  }

  /**
   * Sanitize components slightly differently from normal items. Note that
   * we also add a .parents key which will give the component as standalone
   * item a list of all its parents.
   * @param {Array<module:warframe-items.Component>} components to be sanitized
   * @param {Item} result item to sanitize components on
   * @param {Item} item item to compare to
   * @param {string<module:warframe-items.Category>} category that is being sanitized
   * @param {Array<Item>} blueprints to provide build information
   * @param {RawItemData} data raw context data
   * @param {boolean} secondPass whether this is the second pass being processed to clean up internal data
   */
  sanitizeComponents(components, result, item, category, blueprints, data, secondPass) {
    for (let i = 0; i < components.length; i += 1) {
      components[i].parent = title(item.name); // Direct parent for this pass
      // If a .parents key already exists from another item, add our
      // component additionally, otherwise create one. This mutates the
      // original component object.
      if (components[i].parents) {
        if (!components[i].parents.includes(title(item.name))) {
          components[i].parents.push(title(item.name));
          components[i].parents.sort((a, b) => a.localeCompare(b));
        }
      } else {
        components[i].parents = [title(item.name)];
      }
      const override = this.filter(components[i], category, data);
      delete components[i].parent;
      delete override.parent;
      delete override.parents;

      // Warframe/Weapon components should not include their parent's
      // name, so it's easier to work with them. This is especially critical
      // for parsing trade chat data.
      if (override.uniqueName.includes('/Recipes') || item.tradable) {
        override.name = override.name.replace(`${title(item.name).replace(/<Archwing> /, '')} `, '');
      }
      components[i] = override;

      // Add component's components one level deep. Disabled for now because of
      // too much duplicate data.
      if (process.env.SECOND_PASS === 'true' && !secondPass) {
        components[i] = this.addComponents(components[i], category, blueprints, data, true);
      }
    }

    // Sort to avoid "fake" updates due to order when data is rebuilt
    result.components = components.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   * @param {Partial<Item>} item to be sanitized
   */
  sanitize(item) {
    // Some items have no name, so we use the last bit of the
    // uniqueName instead.
    if (!item.name) {
      [item.name] = item.uniqueName.split('/').reverse();
    }

    // Capitalize properties which are usually all uppercase
    const props = ['type', 'trigger', 'noise', 'rarity', 'faction'];
    // eslint-disable-next-line no-restricted-syntax
    for (const prop of props) {
      if (item[prop]) item[prop] = title(item[prop]);
    }

    // Capitalize name for everything but requiem relics
    if (item.name && !item.name.toLowerCase().includes('requiem') && !item.name.toLowerCase().includes('relic')) {
      item.name = title(item.name);
    }

    // Remove <Archwing> from archwing names, add archwing key instead
    if (
      item.name &&
      (item.name.includes('<Archwing>') ||
        item.uniqueName.includes('Tenno/Archwing') ||
        item.uniqueName.includes('HeavyWeapons'))
    ) {
      item.name = item.name.replace(/<Archwing> /, '');
      item.isArchwing = true;
    }

    // Fix Mk1 weapons not matching wikia url
    if (item.name && item.name.includes('Mk1')) {
      item.name = item.name.replace('Mk1', 'MK1');
    }

    // Relics don't have their grade in the name for some reason
    if (item.type === 'Relic') {
      // eslint-disable-next-line no-restricted-syntax
      for (const grade of grades) {
        if (item.uniqueName.includes(grade.id)) {
          item.name = item.name.replace('Relic', grade.refinement);
        }
      }
    }

    // Use `name` key for abilities as well.
    if (item.abilities) {
      item.abilities = item.abilities.map((a) => {
        return {
          uniqueName: a.abilityUniqueName,
          name: title(a.abilityName),
          description: a.description,
        };
      });
    }

    // Make descriptions a string, not array
    if (item.description && item.description instanceof Array) item.description = item.description.join();

    // Use proper polarity names
    if (item.polarity) {
      const polarity = polarities.find((p) => p.id === item.polarity);
      if (polarity) {
        item.polarity = polarity.name;
      } else {
        warnings.polarity.push([item.name, item.polarity]);
      }
    }

    // Remove keys that only increase output size.
    delete item.codexSecret;
    if (item.type !== 'enemy') delete item.longDescription;
    delete item.parentName;
    delete item.relicRewards; // We'll fetch the official drop data for this
    delete item.subtype;
  }

  /**
   * Add item type. Stuff like warframe, archwing, polearm, dagger, etc.
   * Most types can be found in the uniqueName key. If present, just assign it
   * as the type. Note that whatever key is found first 'wins'. For example
   * Archwings are saved as /Lotus/Powersuits/Archwing/*, while Warframes are
   * saved as /Lotus/Powersuits/*, meaning that Archwing has to be looked for
   * first, otherwise it would be considered a Warframe.
   * @param {Partial<Item>} item to have type adjusted on
   */
  addType(item) {
    if (item.parent) return;
    // eslint-disable-next-line no-restricted-syntax
    for (const type of types) {
      const contains = type.regex ? new RegExp(type.id, 'ig').test(item.uniqueName) : item.uniqueName.includes(type.id);
      if (contains) {
        if (type.append) item.type = `${item.type}${type.name}`;
        else item.type = type.name;
        // if (item.type !== type.name) console.error(`${item.name} didn't update types`)
        break;
      }
    }

    // No type assigned? Add 'Misc'.
    if (!item.type) {
      if ((item.description || '').includes('This resource')) item.type = 'Resource';
      else if (item.faction) {
        item.type = item.faction;
        item.faction = undefined;
      } else if (item.productCategory) {
        item.type = item.productCategory;
      } else {
        if (!warnings.missingType.includes(title(item.name))) warnings.missingType.push(title(item.name));
        item.type = 'Misc';
      }
    }
  }

  /**
   * Parse out damage types from "damage per shot" array
   * @param {module:warframe-items.Item} item to have damage parsed onto
   */
  addDamage(item) {
    if (!item.damagePerShot) return;
    if (!item.damagePerShot.find((damageType) => damageType > 0)) return;
    const [
      impact,
      slash,
      puncture,
      heat,
      cold,
      electricity,
      toxin,
      blast,
      radiation,
      gas,
      magnetic,
      viral,
      corrosive,
      voidDamage,
      tau,
      cinematic,
      shieldDrain,
      healthDrain,
      energyDrain,
      trueType,
    ] = item.damagePerShot;
    item.damage = {
      total: item.totalDamage,
      impact,
      puncture,
      slash,
      heat,
      cold,
      electricity,
      toxin,
      blast,
      radiation,
      gas,
      magnetic,
      viral,
      corrosive,
      void: voidDamage,
      tau,
      cinematic,
      shieldDrain,
      healthDrain,
      energyDrain,
      true: trueType,
    };
  }

  /**
   * Add image name for images that will be fetched outside this scraper.
   * @param {Partial<Item>} item to have image name added
   * @param {ImageManifest.Manifest} manifest to look up image from
   * @param {Partial<Item>} [previous] item to look up comparatively
   */
  addImageName(item, manifest, previous) {
    const image = manifest.find((i) => i.uniqueName === item.uniqueName);
    if (!image) {
      if (!['Node'].includes(item.type)) warnings.missingImage.push(item.name);
      return;
    }
    // eslint-disable-next-line no-useless-escape
    const encode = (str) =>
      str
        .replace('/', '')
        .replace(/[ /*]/g, '-')
        .replace(/[:<>[\]?!"]/g, '')
        .toLowerCase();
    const imageStub = image.textureLocation;
    const ext = imageStub.split('.')[imageStub.split('.').length - 1].replace(/\?!.*/, '').replace(/!.*$/, ''); // .png, .jpg, etc

    // Turn any separators into dashes and remove characters that would break
    // the filesystem.
    item.imageName = encode(lastResourceName(item.uniqueName));

    // Components usually have the same generic images, so we should remove the
    // parent name here. Note that there's a difference between prime/non-prime
    // components, so we'll keep the prime in the name.
    if (item.parent) {
      item.imageName = item.imageName.replace(`${encode(item.parent)}-`, '');
      if (item.name.includes('Prime')) item.imageName = `prime-${item.imageName}`;
    }

    // Relics should use the same image based on type, as they all use the same.
    // The resulting format looks like `axi-intact`, `axi-radiant`
    if (item.type === 'Relic') {
      item.imageName = item.imageName.replace(/-(.*?)-/, '-'); // Remove second word (type)
    }

    // Some items have the same name - so add their uniqueName as an identifier
    if (previous && item.name === previous.name) {
      item.imageName += `-${encode(item.uniqueName)}`;
    }

    // Add original file extension
    item.imageName += `.${ext}`;
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   * @param {Item} item to have category massaged
   * @param {string<module:warframe-items.Category>} category to parse and apply into
   *    {@link module:warframe-items.Category|categories}
   */
  addCategory(item, category) {
    // Don't add categories for components when the parent already has one
    if (item.parent) return;

    switch (category) {
      case 'Customs':
        if (item.type === 'Sigil') item.category = 'Sigils';
        else item.category = 'Skins';
        break;

      case 'Drones':
        item.category = 'Misc';
        break;

      case 'Flavour':
        if (item.name.includes('Sigil')) item.category = 'Sigils';
        else if (item.name.includes('Glyph')) item.category = 'Glyphs';
        else item.category = 'Skins';
        break;

      case 'Gear':
        item.category = 'Gear';
        break;

      case 'Keys':
        if (item.name.includes('Derelict')) item.category = 'Relics';
        else item.category = 'Quests';
        break;

      case 'RelicArcane':
        if (item.type !== 'Relic') item.category = 'Arcanes';
        else item.category = 'Relics';
        break;

      case 'Sentinels':
        if (item.type === 'Sentinel') item.category = 'Sentinels';
        else item.category = 'Pets';
        break;

      case 'Upgrades':
        item.category = 'Mods';
        if (item.uniqueName.includes('AugmentCard')) item.isAugment = true;
        break;

      case 'Warframes':
        if (item.isArchwing) item.category = 'Archwing';
        else item.category = 'Warframes';
        item.isArchwing = undefined;
        break;

      case 'Weapons':
        if (item.isArchwing) {
          if (typeof item.slot === 'undefined') item.category = 'Archwing';
          else if (item.slot === 1) item.category = 'Arch-Gun';
          else if (item.slot === 5) item.category = 'Arch-Melee';
        } else if (item.type.includes('Pet') || item.type.includes('Moa')) item.category = 'Pets';
        else if (item.type.includes('K-Drive')) item.category = 'Misc';
        else if (item.type.includes('Zaw')) {
          item.category = 'Melee';
          item.slot = 5;
        } else if (item.slot === 5) item.category = 'Melee';
        else if (item.slot === 0) item.category = 'Secondary';
        else if (item.slot === 1) item.category = 'Primary';
        else if (item.type === 'Pets') item.category = 'Pets';
        else item.category = 'Misc';
        item.isArchwing = undefined;
        break;

      case 'Resources':
        if (item.type === 'Pets') item.category = 'Pets';
        else if (item.type === 'Specter') item.category = 'Gear';
        else if (item.type === 'Resource') item.category = 'Resources';
        else if (item.type === 'Fish') item.category = 'Fish';
        else if (item.type === 'Ship Decoration') item.category = 'Skins';
        else if (item.type === 'Gem') item.category = 'Resources';
        else if (item.type === 'Plant') item.category = 'Resources';
        else if (item.type === 'Relic') item.category = 'Relics';
        else item.category = 'Misc';
        break;

      case 'Enemies':
        item.category = 'Enemy';
        break;

      case 'Pets':
        item.category = 'Pet';
        break;

      default:
        item.category = 'Misc';
        if (item.systemName) item.category = 'Node';
        else if (item.type === 'Conservation Tag') item.category = 'Resources';
        break;
    }
  }

  /**
   * Limit items to tradable/untradable if specified.
   * @param {Item} item to have tradability applied
   */
  addTradable(item) {
    item.tradable = tradable(item);
  }

  /**
   * Add ducats for prime items. We'll need to get this data from the wikia.
   * @param {Item} item to have ducats applied
   * @param {Array<WikiaDucats>} ducats to apply
   */
  addDucats(item, ducats) {
    if (!item.name.includes('Prime') || !item.components) return;
    // eslint-disable-next-line no-restricted-syntax
    for (const component of item.components) {
      if (component.primeSellingPrice) component.ducats = component.primeSellingPrice;

      if (!component.tradable) continue;
      const wikiaItem = ducats.find((d) => d.name.includes(`${item.name} ${component.name}`));

      if (wikiaItem && wikiaItem.ducats) component.ducats = wikiaItem.ducats;
      else if (!component.ducats && !(item.name.includes('Prime') && component.name.includes('Prime')))
        warnings.missingDucats.push(`${item.name} ${component.name}`);
    }
  }

  /**
   * Add drop chances based on official drop tables
   * @param {Item} item to add droprate to
   * @param {Array<DropRate>} drops to find item drops from
   */
  addDropRate(item, drops) {
    // Take drops from previous build if the droptables didn't change
    if (!hashManager.hasChanged('DropChances')) {
      // Get drop rates for components if available...
      if (item.components) {
        // eslint-disable-next-line no-restricted-syntax
        for (const component of item.components) {
          const previous = previousBuild.find(
            (i) => i.name.toLowerCase() === item.name.toLowerCase() && item.category !== 'Node'
          );
          if (!previous || !previous.components) return;

          const saved = previous.components.find((c) => c.name.toLowerCase() === component.name.toLowerCase());
          if (saved && saved.drops) {
            // chances were written as strings, caused by previous bad data
            saved.drops.forEach((drop) => {
              drop.chance = Number.parseFloat(drop.chance);
            });
            component.drops = saved.drops;
          }
        }
      } else {
        // Otherwise attach to main item
        const saved = previousBuild.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
        if (saved?.drops) {
          // chances were written as strings, caused by previous bad data
          saved.drops.forEach((drop) => {
            drop.chance = Number.parseFloat(drop.chance);
          });
          item.drops = saved.drops;
        }
      }
    }

    // Don't look for drop rates on item itself if it has components.
    if (item.components) {
      // eslint-disable-next-line no-restricted-syntax
      for (const component of item.components) {
        const data =
          (component.uniqueName.includes('/Weapons/') &&
            !component.uniqueName.includes('/WeaponParts/') &&
            component.name !== 'Blueprint') ||
          /Collar\w+Component/.test(component.uniqueName)
            ? this.findDropLocations(component.name, drops, true)
            : this.findDropLocations(`${item.name} ${component.name}`, drops, true);
        component.drops = data.length ? data : [];
      }
    } else if (item.name !== 'Blueprint') {
      // Last word of relic is intact/rad, etc. instead of 'Relic'
      const name = item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name;
      const data = this.findDropLocations(name, drops);
      if (data.length) item.drops = data;
    }
  }

  /**
   * Find drop locations
   * @param {string} item to find chances for
   * @param {Array<DropRate>} dropChances drop chances
   * @returns {Iterable<Array<DropRate>>} but also deduped
   */
  findDropLocations(item, dropChances) {
    const variant = prefixed(item);
    const semiWrapped = new RegExp(`(?:^|\\s)+${item}(?:\\s|$)+`, 'i');

    const data = dedupe(
      dropChances
        .filter((drop) => {
          return (
            drop.item === item ||
            ((drop.item.toLowerCase().startsWith(item.toLowerCase()) ||
              drop.item.toLowerCase().endsWith(item.toLowerCase())) &&
              semiWrapped.test(drop.item.toLowerCase()) &&
              !variant.test(drop.item.toLowerCase()))
          );
        })
        .map(dropMap)
    );
    data.sort(dropComparator);
    return data;
  }

  /**
   * Get patchlogs from forums and attach when changes are found for item.
   * @param {Item} item to add patchlogs upon
   * @param {PatchlogWrap} patchlogs to look up for item
   */
  addPatchlogs(item, patchlogs) {
    // Don't add patchlogs for components
    if (item.parent) return;

    // This process takes a lot of cpu time, so we won't repeat it unless the
    // patchlog hash changed.
    if (!patchlogs.changed) {
      const previous = previousBuild.find((i) => i.name === item.name);
      if (previous && previous.patchlogs) item.patchlogs = previous.patchlogs;
      return;
    }

    const target = {
      name: item.type === 'Relic' ? item.name.replace(/\s(\w+)$/, ' Relic') : item.name,
      type: item.type,
    };

    const logs = patchlogs.patchlogs.getItemChanges(target);
    if (logs.length) item.patchlogs = logs;
  }

  /**
   * Detects whether the item is a prime item
   * @param {Item} item to check for prime status
   */
  addIsPrime(item) {
    const unameSegments = item.uniqueName.split('/');
    const lastUnameSegment = unameSegments[unameSegments.length - 1];
    switch (item.category) {
      case 'Mods':
        const isLegendary = item.rarity === 'Legendary';
        const isExpert = lastUnameSegment.includes('Expert') || unameSegments[unameSegments.length - 2] === 'Expert';
        item.isPrime = isLegendary && (isExpert || lastUnameSegment.includes('Primed'));
        break;
      case 'Warframes':
        item.isPrime = item.uniqueName.endsWith('Prime');
        break;
      case 'Primary':
      case 'Secondary':
      case 'Melee':
      case 'Arch-Gun':
      case 'Arch-Melee':
        item.isPrime = item.tags?.includes('Prime') || lastUnameSegment.includes('Prime');
        break;
      case 'Sentinels':
        item.isPrime = lastUnameSegment.startsWith('Prime');
        break;
      // there is only one archwing prime so far so we cant extrapolate much
      case 'Archwing':
        item.isPrime = item.uniqueName.includes('Prime');
        break;
      default:
        break;
    }
  }

  /**
   * Adds data scraped from the wiki to a particular item
   * @param {Item} item to have wikia data added to
   * @param {module:warframe-items.Category} category of the data
   * @param {WikiaData} wikiaData from wikia to apply
   */
  addAdditionalWikiaData(item, category, wikiaData) {
    if (!['weapons', 'warframes', 'mods', 'upgrades'].includes(category.toLowerCase())) return;

    const wikiaItem = wikiaData[category === 'Upgrades' ? 'mods' : category.toLowerCase()]
      .filter((i) => i)
      .find((i) => i.name === item.name);
    if (!wikiaItem) return;

    switch (category.toLowerCase()) {
      case 'warframes':
        this.addWarframeWikiaData(item, wikiaItem);
        break;
      case 'weapons':
        this.addWeaponWikiaData(item, wikiaItem);
        break;
      case 'upgrades':
        this.addModWikiaData(item, wikiaItem);
        break;
      default:
        break;
    }

    item.introduced = wikiaData.versions.find(
      (v) => v.aliases.includes(wikiaItem.introduced) || v.name === wikiaItem.introduced
    );
    if (item.introduced) item.releaseDate = item.introduced.date;
  }

  addWarframeWikiaData(item, wikiaItem) {
    item.aura = wikiaItem.auraPolarity;
    item.conclave = wikiaItem.conclave;
    item.color = wikiaItem.color;
    item.introduced = wikiaItem.introduced;
    item.marketCost = wikiaItem.marketCost;
    item.bpCost = wikiaItem.bpCost;
    item.masteryReq = item.masteryReq || wikiaItem.mr;
    item.polarities = wikiaItem.polarities;
    item.sex = wikiaItem.sex;
    item.sprint = wikiaItem.sprint;
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;

    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  addWeaponWikiaData(item, wikiaItem) {
    item.attacks = wikiaItem.attacks;
    item.ammo = wikiaItem.ammo;
    item.marketCost = typeof wikiaItem.marketCost === 'number' ? wikiaItem.marketCost : undefined;
    item.bpCost = wikiaItem.bpCost;
    item.masteryReq = item.masteryReq || wikiaItem.mr;
    item.polarities = wikiaItem.polarities;
    item.tags = wikiaItem.tags;
    item.stancePolarity = wikiaItem.stancePolarity;
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;
    this.introduced = wikiaItem.introduced;

    if (item.omegaAttenuation <= 0.75) {
      item.disposition = 1;
    } else if (item.omegaAttenuation <= 0.895) {
      item.disposition = 2;
    } else if (item.omegaAttenuation <= 1.105) {
      item.disposition = 3;
    } else if (item.omegaAttenuation <= 1.3) {
      item.disposition = 4;
    } else if (item.omegaAttenuation <= 1.6) {
      item.disposition = 5;
    }
    // Re-apply correct names to MK1-weapons
    if (item.name && item.name.includes('MK1')) {
      item.name = item.name.replace('MK1', 'Mk1');
    }
    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  /**
   * Add additional data for mods from the wiki
   * @param {Item} item mod to append wikia data to
   * @param {WikiaMod} wikiaItem to pull data from
   */
  addModWikiaData(item, wikiaItem) {
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;
    item.transmutable = wikiaItem.transmutable;
    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  /**
   * Normalize Ogg vault dates to be technically ISO-8601 dates
   * @param {OggDateStamp} vaultDate vault date to normalize
   * @returns {undefined|string}
   */
  normalizeOggDate(vaultDate) {
    if (!vaultDate) return undefined;
    const never = ['n/a', 'none', 'never'];
    const stripped = vaultDate.replace(/\s/gi, '-');
    if (never.includes(stripped)) return undefined;
    return stripped;
  }

  /**
   * Adds releaseDate, vaultDate and estimatedVaultDate to all primes using
   * data from "Ducats or Plat".
   * @param {Item} item data to append vault data to
   * @param {VaultData} vaultData to look up data for the {@param item}
   * @param {module:warframe-items.Category} category of the data
   * @param {WikiaData} wikiaData from wikia to apply
   */
  addVaultData(item, vaultData, category, wikiaData) {
    let vaultCategory = category;
    if (item.type === 'Archwing') vaultCategory = 'archwings';

    if (!item.name.endsWith('Prime')) return;
    if (!['weapons', 'warframes', 'archwings', 'sentinels'].includes(vaultCategory.toLowerCase())) return;

    if (vaultCategory === 'Sentinels') vaultCategory = 'companions';
    const wikiaItem = wikiaData[vaultCategory.toLowerCase()].filter((i) => i).find((i) => i.name === item.name);
    const target = vaultData.find((i) => i.Name.toLowerCase() === item.name.toLowerCase());

    if (!target && !wikiaItem) {
      const isManuallyExcluded = primeExcludeRegex.test(item.name);
      const isSkin = item.category === 'Skins';
      const isSentinelWeapon =
        (item.type === 'Sentinel' && ['Primary', 'Secondary', 'Melee'].includes(item.category)) ||
        item.productCategory === 'SentinelWeapons';
      const isExaltedWeapon = ['SpecialItems'].includes(item.productCategory);
      if (!(isManuallyExcluded || isSkin || isSentinelWeapon || isExaltedWeapon))
        warnings.missingVaultData.push(item.name);
      return;
    }

    if (target?.ReleaseDate) {
      item.releaseDate = this.normalizeOggDate(target.ReleaseDate);
    }
    if (target?.VaultedDate) {
      item.vaultDate = this.normalizeOggDate(target.VaultedDate);
    }
    if (target?.EstimatedVaultedDate) {
      item.estimatedVaultDate = this.normalizeOggDate(target.EstimatedVaultedDate);
    }

    item.vaulted = target?.Vaulted ?? wikiaItem.vaulted;
    if (item.vaulted === 'N/A') item.vaulted = true;
  }

  /**
   * Add:
   * - relic data
   * - vaulted data (probably use this over ogg)
   * - market data on relics (urlName, id)
   * @param {Item} item to have relics applied to
   * @param {Array<module:@wfcd/relics.TitaniaRelic>} relics relic array to search
   */
  addRelics(item, relics) {
    if (item.type !== 'Relic') return;

    // Item names are /(Lith|Meso|Neo|Axi|Requiem) (Relic|\w+ \w+)/
    const relicName = item.name.toLowerCase().split(' ').slice(0, 2).join(' ');

    // Relic names are /(Lith|Meso|Neo|Axi|Requiem) (\w+)/
    const related = relics.filter((relic) => relic.name.toLowerCase() === relicName);
    item.locations = Array.from(new Set(related.map((relic) => relic.locations).flat()));
    item.rewards = Array.from(new Set(related.map((relic) => relic.rewards).flat()));
    [item.marketInfo] = Array.from(new Set(related.map((relic) => relic.warframeMarket)));

    const [vaultInfo] = Array.from(new Set(related.map((relic) => relic.vaultInfo)));
    item.vaulted = vaultInfo?.vaulted;
    item.vaultDate = vaultInfo?.vaultDate;
  }

  applyOverrides(item) {
    // universal polarity casing override
    if (item.polarity) item.polarity = item.polarity.toLowerCase();
    const override = overrides[item.uniqueName];
    if (override) {
      Object.keys(override).forEach((key) => {
        item[key] = override[key];
      });
    }
  }

  /**
   * Checks whether the item is masterable.
   * @param {Item} item the item to add the attribute to
   */
  applyMasterable(item) {
    item.masterable = masterableCategories.includes(item.category);
  }

  addResistanceData(item, category) {
    if (category.toLowerCase() !== 'enemies') return;

    const quantities = {
      positive: [0.25, 0.5, 0.75],
      negative: [-0.25, -0.5, -0.75],
    };
    const parseAffectors = (affectors) => {
      return affectors.split(' ').map((element) => {
        if (element.includes('+')) {
          // positives
          const pSplit = (element || '').split('+');
          return {
            element: pSplit[0].length > 0 ? watson[pSplit[0]] || title(pSplit[0].split('_')[1]) : 'None',
            modifier: quantities.positive[pSplit.length - 1] || 0,
          };
        }
        if (element.includes('-')) {
          // positives
          const nSplit = (element || '').split('-');
          return {
            element: nSplit[0].length > 0 ? watson[nSplit[0]] || title(nSplit[0].split('_')[1]) : 'None',
            modifier: quantities.negative[nSplit.length - 1] || 0,
          };
        }
        return {
          element: 'None',
          modifier: 0,
        };
      });
    };
    const parseArmor = (enemy) => {
      return enemy.resistValues.map((resist, index) => ({
        amount: resist,
        type: title(enemy.resistPrefix[index]),
        affectors: parseAffectors(enemy.resistTexts[index].trim().replace(/\s\s/g, ' ')),
      }));
    };

    item.resistances = parseArmor(item);
    item.name = title(item.name);
    delete item.resistValues;
    delete item.resistPrefix;
    delete item.resistTexts;
  }

  /**
   * Apply i18n and parse data
   * @param {Object<string, Array<Item>>} data base data to apply i18n data to
   * @param {Object<string, Array<Item>>} i18n internationalization data
   * @returns {Object<string, Object<string, Object>>}
   */
  applyI18n(data, i18n) {
    const i18nAllowedKeys = [
      'name',
      'description',
      'passiveDescription',
      'abilities',
      'trigger',
      'systemName',
      'levelStats',
    ];
    const locales = Object.keys(i18n).filter((key) => key !== 'en');
    const resultArray = [];
    const i18nArr = {};
    Object.entries(data)
      .map(([, a]) => a)
      .forEach((sub) => resultArray.push(...sub));
    const bar = new Progress('Parsing i18n', resultArray.length);
    resultArray.forEach((entry) => {
      const id = entry.uniqueName;
      if (!i18nArr[id]) i18nArr[id] = {};
      locales.forEach((locale) => {
        if (!i18n[locale]?.[0]) return;
        i18n[locale].every(({ data: i18nData }) => {
          const match = i18nData.find((i18nItem) => i18nItem.uniqueName === id);
          if (match) {
            if (!i18nArr[id][locale]) i18nArr[id][locale] = {};
            i18nAllowedKeys.forEach((key) => {
              i18nArr[id][locale][key] = match[key];
            });
            return false;
          }
          return true;
        });
      });
      bar.tick();
    });
    return i18nArr;
  }
}

export default new Parser();
