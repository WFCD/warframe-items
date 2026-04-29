import cloneDeep from 'lodash.clonedeep';
import sanitize from 'sanitize-filename';

import readJson from './readJson';
import tradable from './tradable';
import Progress from './progress';
import hashManager from './hashManager';
import dedupe from './dedupe';

import type {
  RawItemData,
  ParsedData,
  Warnings,
  ItemComplete,
  Item,
  Drop,
  RawDrop,
  Component,
  ImageManifest,
  WikiaData,
  WikiaDucat,
  WikiaWeapon,
  WikiaWarframe,
  WikiaMod,
  WikiaArcane,
  TitaniaRelic,
  PatchlogWrap,
  VariantsConfig,
  Grade,
  Polarity,
  ItemType,
  MasterableCategories,
  Affector,
  Resistance,
  ApiCategory,
} from './types/shared';

const previousBuild = await readJson<ItemComplete[]>(new URL('../data/json/All.json', import.meta.url));
const watson = await readJson<Record<string, string>>(new URL('../config/dt_map.json', import.meta.url));
const bpConflicts = await readJson<string[]>(new URL('../config/bpConflicts.json', import.meta.url));
const variants = await readJson<VariantsConfig>(new URL('../config/variants.json', import.meta.url));
const grades = await readJson<Grade[]>(new URL('../config/relicGrades.json', import.meta.url));
const polarities = await readJson<Polarity[]>(new URL('../config/polarities.json', import.meta.url));
const types = await readJson<ItemType[]>(new URL('../config/itemTypes.json', import.meta.url));
const overrides = await readJson<Record<string, Partial<ItemComplete>>>(
  new URL('../config/overrides.json', import.meta.url)
);
const masterableCategories = await readJson<MasterableCategories>(
  new URL('../config/masterableCategories.json', import.meta.url)
);

const { prefixes, suffixes } = variants;

/**
 * Titlecase a string
 * @param str string to be titlecased
 * @returns titlecased string
 */
const title = (str = ''): string =>
  str
    .toLowerCase()
    .replace(/(?<![öéā*])\b\w/g, (l) => l.toUpperCase())
    .replace(/`/gi, "'")
    .replace(/’/gi, "'")
    .replace(/'S /gi, "'s ")
    .replace(/'S$/gi, "'s");

const warnings: Warnings = {
  missingImage: [],
  missingDucats: [],
  missingComponents: [],
  missingVaultData: [],
  polarity: [],
  missingType: [],
  failedImage: [],
  missingWikiThumb: [],
};

const filterBps = (blueprint: Partial<ItemComplete>): boolean => !bpConflicts.includes(blueprint.uniqueName ?? '');
const primeExcludeRegex = /(^Noggle .*|Extractor .*|^[A-Z] Prime$|^Excalibur .*|^Lato .*|^Skana .*)/i;
const prefixed = (name: string): RegExp =>
  new RegExp(`(((?:${prefixes.join('|')})\\s?${name}.*)|(?:${name}\\s?(?:${suffixes.join('|')})\\s?.*))+`, 'i');

/**
 * Drop comparator
 * Compares drop locations for items lexicographically by chance + location + rotation + rarity
 * @param dropA first drop to compare
 * @param dropB second drop to compare
 * @returns comparison result
 */
const dropComparator = (dropA: Drop, dropB: Drop): number => {
  const keyA = `${String(dropA.chance)}:${dropA.location}:${dropA.rotation ?? ''}:${dropA.rarity}`.toUpperCase();
  const keyB = `${String(dropB.chance)}:${dropB.location}:${dropB.rotation ?? ''}:${dropB.rarity}`.toUpperCase();
  return keyA.localeCompare(keyB);
};

/**
 * Map raw drops to minimal drops
 * @param drop raw drop info to map
 * @returns formatted drop
 */
const dropMap = (drop: RawDrop): Drop => {
  return {
    location: drop.place.replace('<b>', '').replace('</b>', ''),
    type: drop.item,
    chance: Number.parseFloat(Number(drop.chance).toFixed(5)),
    rarity: drop.rarity,
  };
};

/**
 * Parse API data into a more clear or complete format.
 */
class Parser {
  /**
   * Entrypoint for build process.
   * @param data raw data to parse into Items
   * @returns parsed data with warnings
   */
  parse(data: RawItemData): ParsedData {
    const blueprints = data.api.find((c) => c?.category === 'Recipes')?.data;
    const result: ParsedData['data'] = [];

    // Modify data from API to fit our schema. Note that we'll
    // skip 'Recipes' (Blueprints) as their data will be attached
    // to the parent item instead.
    for (const chunk of data.api) {
      if (!chunk || chunk?.category === 'Recipes') continue;
      const parsedData = this.process(chunk.data, chunk.category ?? 'Unknown', blueprints ?? [], data);
      result.push({
        category: chunk.category ?? 'Unknown',
        data: parsedData,
      });
    }

    Object.keys(warnings).forEach((key) => {
      const warningKey = key as keyof Warnings;
      warnings[warningKey].sort();
      warnings[warningKey] = Array.from(
        new Set(warnings[warningKey].filter((thing) => (thing as string | string[] | undefined)?.length))
      ) as never[];
    });

    return {
      data: result,
      warnings,
    };
  }

  /**
   * Go through every category on the API and adapt to our schema.
   * @param items items to be processed
   * @param category Category being parsed
   * @param blueprints items known to be blueprints
   * @param data context data dependencies
   * @returns processed items
   */
  process(items: Partial<Item>[], category: string, blueprints: Partial<Item>[], data: RawItemData): Item[] {
    const result: Item[] = [];

    const bar = new Progress(`Parsing ${category}`, items.length);

    if (!items.length) {
      bar?.interrupt?.(`No ${category}`);
      return [];
    }
    for (let item of items) {
      if (!item) continue;
      // Skip Weapon Components as they'll be accessible
      // through their parent. Warframes' components are an exception,
      // since they are not items itself, but have components.
      if (item.uniqueName?.includes('/Recipes')) continue;

      item = this.addComponents(item, category, blueprints, data);
      item = this.filter(item, category, data);
      result.push(item as Item);
      bar.tick();
    }
    return result;
  }

  /**
   * Modify individual keys of API data.
   * @param original item to be processed
   * @param category Category being parsed
   * @param data context data dependencies
   * @returns processed item
   */
  filter(original: Partial<Item>, category: string, data: RawItemData): Partial<ItemComplete> {
    const result = cloneDeep(original) as ItemComplete;

    if (result.rewardName) result.uniqueName = result.rewardName;
    this.addType(result, data);
    this.addDamage(result);
    this.sanitize(result);
    this.addImageName(result, data.manifest);
    if (result.abilities) {
      result.abilities.forEach((a) => {
        this.addImageName(a as ItemComplete, data.manifest);
      });
    }

    this.addCategory(result, category);
    this.addTradable(result);
    this.addDucats(result, data.wikia.ducats);
    this.addDropRate(result, data.drops);
    this.addPatchlogs(result, data.patchlogs);
    this.addAdditionalWikiaData(result, category, data.wikia);
    this.addIsPrime(result);
    this.addVaultData(result, category, data.wikia);
    this.addResistanceData(result, category);
    this.addRelics(result, data.relics, data.drops);
    this.applyMasterable(result);
    this.applyOverrides(result);
    return result;
  }

  /**
   * Debug method for parsing the bare minimum of data to finish
   * the build process without errors. Useful when you don't want to
   * wait several minutes to test something. A quick version of filter.
   * @param original item to be processed
   * @param category Category being parsed
   * @param data context data dependencies
   * @returns processed item
   */
  quickFilter(original: Partial<Item>, category: string, data: RawItemData): Partial<ItemComplete> {
    const result = cloneDeep(original) as ItemComplete;

    if (result.rewardName) result.uniqueName = result.rewardName;
    this.addType(result, data);
    this.sanitize(result);
    this.addImageName(result, data.manifest);
    this.addCategory(result, category);
    this.addVaultData(result, category, data.wikia);

    return result;
  }

  /**
   * Move components to the parent directly. This also means that we
   * won't store the blueprint as independent item as all its data is
   * attached to the parent.
   * @param item item to be processed
   * @param category Category being parsed
   * @param blueprints items known to be blueprints
   * @param data context data dependencies
   * @param secondPass whether this is the second pass adding components, for nested component data
   * @returns item with components
   */
  addComponents(
    item: Partial<Item>,
    category: string,
    blueprints: Partial<Item>[],
    data: RawItemData,
    secondPass?: boolean
  ): Partial<ItemComplete> {
    const result = item as ItemComplete;
    const blueprint = blueprints.filter(filterBps).find((b) => (b as ItemComplete).resultType === item.uniqueName);
    if (!blueprint) return result; // Some items just don't have blueprints
    const components: Component[] = [];

    // Look for original component entry in all categories
    for (const ingredient of (blueprint as ItemComplete).ingredients ?? []) {
      let component: Partial<Item> | undefined;

      for (const categoryData of data.api) {
        component = categoryData.data.find((i) => i.uniqueName === ingredient.ItemType);
        if (component) break;
      }

      if (!component) {
        warnings.missingComponents.push(ingredient.ItemType);
        continue;
      }

      const comp = component as Component;
      comp.itemCount = ingredient.ItemCount;
      components.push(comp);
    }

    // Add Blueprint itself
    components.push({
      uniqueName: (blueprint as ItemComplete).uniqueName || '',
      name: 'Blueprint',
      description: item.description,
      itemCount: 1,
      primeSellingPrice: (blueprint as ItemComplete).primeSellingPrice,
    } as unknown as Component);

    // Attach relevant keys from blueprint to parent
    this.addBlueprintData(result, blueprint as ItemComplete);
    this.sanitizeComponents(components, result, item as ItemComplete, category, blueprints, data, secondPass);
    components.forEach((c) => {
      this.applyOverrides(c);
    });
    return result;
  }

  /**
   * Attach blueprint data to the parent item where sensible.
   * @param item item to apply data to
   * @param blueprint with partial data
   */
  addBlueprintData(item: ItemComplete, blueprint: ItemComplete): void {
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
   * @param components to be sanitized
   * @param result item to sanitize components on
   * @param item item to compare to
   * @param category that is being sanitized
   * @param blueprints to provide build information
   * @param data raw context data
   * @param secondPass whether this is the second pass being processed to clean up internal data
   */
  sanitizeComponents(
    components: Component[],
    result: ItemComplete,
    item: ItemComplete,
    category: string,
    blueprints: Partial<Item>[],
    data: RawItemData,
    secondPass?: boolean
  ): void {
    for (let i = 0; i < components.length; i += 1) {
      const component = components[i];
      if (!component) continue;

      component.parent = title(item.name); // Direct parent for this pass
      // If a .parents key already exists from another item, add our
      // component additionally, otherwise create one. This mutates the
      // original component object.
      if (component.parents) {
        if (!component.parents.includes(title(item.name))) {
          component.parents.push(title(item.name));
          component.parents.sort((a, b) => a.localeCompare(b));
        }
      } else {
        component.parents = [title(item.name)];
      }
      const override = this.filter(component, category, data) as Component;
      delete component.parent;
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
        components[i] = this.addComponents(component, category, blueprints, data, true) as Component;
      }
    }

    // Sort to avoid "fake" updates due to order when data is rebuilt
    result.components = components.sort((a, b) => a.name.localeCompare(b.name)) as Item[];
  }

  /**
   * Remove unnecessary values, use consistent string casing, clarify some
   * obscure conventions.
   * @param item to be sanitized
   */
  sanitize(item: ItemComplete): void {
    // Some items have no name, so we use the last bit of the
    // uniqueName instead.
    if (!item.name) {
      const parts = item.uniqueName.split('/').reverse();
      item.name = parts[0] ?? '';
    }

    // Capitalize properties which are usually all uppercase
    const props: (keyof ItemComplete)[] = ['type', 'trigger', 'noise', 'rarity', 'faction'];
    for (const prop of props) {
      if (item[prop]) item[prop] = title(String(item[prop])) as never;
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
    if (item.name.includes('Mk1')) {
      item.name = item.name.replace('Mk1', 'MK1');
    }

    // Relics don't have their grade in the name for some reason
    if (item.type === 'Relic') {
      for (const grade of grades) {
        if (item.uniqueName.includes(grade.id)) {
          item.name = item.name.replace('Relic', grade.refinement);
        }
      }
    }

    // Use `name` key for abilities as well.
    if (item.abilities) {
      item.abilities = item.abilities.map((a) => {
        const ability = a as unknown as ItemComplete;
        return {
          uniqueName: ability.abilityUniqueName ?? ability.uniqueName,
          name: title(ability.abilityName ?? ability.name),
          description: ability.description,
          imageName: ability.imageName || '',
        };
      }) as never;
    }

    // Make descriptions a string, not array
    if (item.description && Array.isArray(item.description)) item.description = item.description.join();

    // Use proper polarity names
    if (item.polarity) {
      const polarity = polarities.find((p) => p.id === item.polarity);
      if (polarity) {
        item.polarity = polarity.name;
      } else {
        warnings.polarity.push([item.name, item.polarity] as never);
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
   * @param item to have type adjusted on
   * @param data raw context data
   */
  addType(item: ItemComplete, data: RawItemData): void {
    if (item.parent) return;
    const arcane = data.wikia.arcanes.find((entry) => entry.name === item.name);
    if (arcane) {
      item.type = `${arcane.type ?? ''} Arcane`;
    } else {
      for (const type of types) {
        const contains = type.regex
          ? new RegExp(type.id, 'ig').test(item.uniqueName)
          : item.uniqueName.includes(type.id);
        if (contains) {
          if (type.append) item.type = `${item.type}${type.name}`;
          else item.type = type.name;
          break;
        }
      }
    }

    // No type assigned? Add 'Misc'.
    if (!item.type) {
      if ((item.description ?? '').includes('This resource')) item.type = 'Resource';
      else if (item.faction) {
        item.type = item.faction;
        item.faction = undefined;
      } else if (item.productCategory) {
        item.type = item.productCategory;
      } else if (item.systemName) {
        item.type = 'Node';
      } else {
        if (!warnings.missingType.includes(title(item.name))) warnings.missingType.push(title(item.name));
        item.type = 'Misc';
      }
    }
  }

  /**
   * Parse out damage types from "damage per shot" array
   * @param item to have damage parsed onto
   */
  addDamage(item: ItemComplete): void {
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
   * @param item to have image name added
   * @param manifest to look up image from
   */
  addImageName(item: ItemComplete, manifest: ImageManifest): void {
    // Enforce arcane and blueprint image name
    if (item.name === 'Arcane') {
      item.imageName = `arcane.png`;
      return;
    }
    if (item.name === 'Blueprint') {
      item.imageName = `blueprint.png`;
      return;
    }

    const image = manifest.find((i) => i.uniqueName === item.uniqueName);
    if (!image) {
      if (!['Node'].includes(item.type)) warnings.missingImage.push(item.name);
      return;
    }

    const textureLocation = image.textureLocation.split('!')[0];
    const filename = textureLocation?.split('/').reverse()[0];
    if (filename === undefined) {
      warnings.missingImage.push(item.name);
      return;
    }

    // For the most part DE's texture locations are path safe but make sure it is on NTFS
    item.imageName = sanitize(filename);
  }

  /**
   * Add more meaningful item categories. These will be used to determine the
   * output file name.
   * @param item to have category massaged
   * @param category to parse and apply into categories
   */
  addCategory(item: ItemComplete, category: string): void {
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
        if (item.compatName !== 'Warframe' && item.type === 'Warframe Mod') item.isAugment = true;
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
        else if (item.slot === 14) item.category = 'Railjack';
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
   * @param item to have tradability applied
   */
  addTradable(item: ItemComplete): void {
    item.tradable = tradable(item);
  }

  /**
   * Add ducats for prime items. We'll need to get this data from the wikia.
   * @param item to have ducats applied
   * @param ducats to apply
   */
  addDucats(item: ItemComplete, ducats: WikiaDucat[]): void {
    if (!item.name.includes('Prime') || !item.components) return;
    for (const component of item.components as Component[]) {
      if (component.primeSellingPrice) component.ducats = component.primeSellingPrice;

      if (!component.tradable) continue;
      const wikiaItem = ducats.find((d) => d.name.includes(`${item.name} ${component.name}`));

      if (wikiaItem?.ducats) component.ducats = wikiaItem.ducats;
      else if (!component.ducats && !(item.name.includes('Prime') && component.name.includes('Prime')))
        warnings.missingDucats.push(`${item.name} ${component.name}`);
    }
  }

  /**
   * Add drop chances based on official drop tables
   * @param item to add droprate to
   * @param drops to find item drops from
   */
  addDropRate(item: ItemComplete, drops: RawDrop[]): void {
    if (item.type === 'Nightwave Challenge') return;

    // Take drops from previous build if the droptables didn't change
    if (!hashManager.hasChanged('DropChances')) {
      // Get drop rates for components if available...
      if (item.components) {
        for (const component of item.components as Component[]) {
          const previous = previousBuild.find(
            (i) => i.name.toLowerCase() === item.name.toLowerCase() && item.category !== 'Node'
          );
          if (!previous?.components) return;

          const saved = (previous.components as Component[]).find(
            (c) => c.name.toLowerCase() === component.name.toLowerCase()
          );
          if (saved?.drops) {
            // chances were written as strings, caused by previous bad data
            saved.drops.forEach((drop) => {
              drop.chance = Number.parseFloat(String(drop.chance));
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
            drop.chance = Number.parseFloat(String(drop.chance));
          });
          item.drops = saved.drops;
        }
      }
    }

    // Don't look for drop rates on item itself if it has components.
    if (item.components) {
      for (const component of item.components as Component[]) {
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
   * @param item to find chances for
   * @param dropChances drop chances
   * @param _unused unused parameter for backwards compat
   * @returns deduped drop locations
   */
  findDropLocations(item: string, dropChances: RawDrop[], _unused?: boolean): Drop[] {
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
    ) as Drop[];
    data.sort(dropComparator);
    return data;
  }

  /**
   * Get patchlogs from forums and attach when changes are found for item.
   * @param item to add patchlogs upon
   * @param patchlogs to look up for item
   */
  addPatchlogs(item: ItemComplete, patchlogs: PatchlogWrap): void {
    // Don't add patchlogs for components or nightwave challenges
    if (item.parent || item.type === 'Nightwave Challenge') return;

    // This process takes a lot of cpu time, so we won't repeat it unless the
    // patchlog hash changed.
    if (!patchlogs.changed) {
      const previous = previousBuild.find((i) => i.name === item.name);
      if (previous?.patchlogs) item.patchlogs = previous.patchlogs;
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
   * @param item to check for prime status
   */
  addIsPrime(item: ItemComplete): void {
    const allowedPrimes = [
      'Warframes',
      'Primary',
      'Secondary',
      'Melee',
      'Sentinels',
      'Pets',
      'Archwing',
      'Arch-Gun',
      'Arch-Melee',
      'Mods',
    ];

    if (!allowedPrimes.includes(item.category)) return;

    const unameSegments = item.uniqueName.split('/');
    const lastUnameSegment = unameSegments[unameSegments.length - 1] ?? '';

    item.isPrime = lastUnameSegment.includes('Prime');

    if (item.category === 'Mods') {
      const isLegendary = item.rarity === 'Legendary';
      const isExpert =
        lastUnameSegment.includes('Expert') || (unameSegments[unameSegments.length - 2] ?? '') === 'Expert';
      item.isPrime = isLegendary && (isExpert || lastUnameSegment.includes('Primed'));
    }

    return;
  }

  /**
   * Adds data scraped from the wiki to a particular item
   * @param item to have wikia data added to
   * @param category of the data
   * @param wikiaData from wikia to apply
   */
  addAdditionalWikiaData(item: ItemComplete, category: string, wikiaData: WikiaData): void {
    if (!['weapons', 'warframes', 'mods', 'upgrades', 'sentinels'].includes(category.toLowerCase())) return;

    const slots: string[][] = [
      ['Secondary'], // 0
      ['Primary', 'Hound', 'Beast', 'Archgun', 'Robotic', 'Archgun (Atmosphere)', 'Amp'], // 1
      [], // 2
      [], // 3
      ['Archgun'], // 4
      ['Melee', 'Archmelee'], // 5
      [], // 6
      ['Archgun (Atmosphere)', 'Exalted', 'Secondary', 'Primary', 'Melee', 'Archgun', 'Archmelee'], // 7
      [],
      [],
      [],
      [],
      [],
      [],
      ['Railjack Turret'], // 14
    ];

    let wikiCategory = category.toLowerCase();
    if (category === 'Upgrades') wikiCategory = 'mods';
    if (item.category === 'Archwing') wikiCategory = 'archwings';
    if (category === 'Sentinels') wikiCategory = 'companions';

    const wikiaItem = (wikiaData[wikiCategory as keyof WikiaData] as WikiaWeapon[]).find((i) => {
      const uMatch = i.uniqueName === item.uniqueName;
      let nMatch = true;
      if (category.toLowerCase() === 'weapons' && typeof item.slot !== 'undefined') {
        nMatch = slots[item.slot]?.includes(i.slot?.toString() ?? '') ?? false;
      }
      return uMatch && nMatch;
    });
    if (!wikiaItem) return;
    item.wikiAvailable = true;

    switch (category.toLowerCase()) {
      case 'sentinels':
      case 'warframes':
        this.addWarframeWikiaData(item, wikiaItem as WikiaWarframe);
        break;
      case 'weapons':
        this.addWeaponWikiaData(item, wikiaItem);
        break;
      case 'upgrades':
        this.addModWikiaData(item, wikiaItem as WikiaMod);
        break;
      case 'arcanes':
        this.addArcaneWikiaData(item, wikiaItem as WikiaArcane);
        break;
      default:
        break;
    }

    item.introduced = wikiaData.versions.find(
      (v) => v.aliases.includes(wikiaItem.introduced ?? '') || v.name === wikiaItem.introduced
    );
    if (item.introduced) item.releaseDate = item.introduced.date;
  }

  addWarframeWikiaData(item: ItemComplete, wikiaItem: WikiaWarframe): void {
    item.aura = wikiaItem.auraPolarity;
    item.conclave = wikiaItem.conclave;
    item.color = wikiaItem.color;
    item.exilusPolarity = wikiaItem.exilusPolarity;
    item.introduced = wikiaItem.introduced as never;
    item.marketCost = wikiaItem.marketCost;
    item.bpCost = wikiaItem.bpCost;
    item.masteryReq = item.masteryReq ?? wikiaItem.mr;
    item.polarities = wikiaItem.polarities;
    item.sex = wikiaItem.sex;
    item.sprint = wikiaItem.sprint;
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;

    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  addWeaponWikiaData(item: ItemComplete, wikiaItem: WikiaWeapon): void {
    item.attacks = wikiaItem.attacks;
    item.ammo = wikiaItem.ammo;
    item.marketCost = typeof wikiaItem.marketCost === 'number' ? wikiaItem.marketCost : undefined;
    item.bpCost = wikiaItem.bpCost;
    item.masteryReq = item.masteryReq ?? wikiaItem.mr;
    item.polarities = wikiaItem.polarities;
    item.tags = wikiaItem.tags?.filter((t) => Boolean(t.trim()));
    item.exilusPolarity = wikiaItem.exilusPolarity;
    item.stancePolarity = wikiaItem.stancePolarity;
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;
    item.introduced = wikiaItem.introduced as never;

    if (item.omegaAttenuation && item.omegaAttenuation <= 0.75) {
      item.disposition = 1;
    } else if (item.omegaAttenuation && item.omegaAttenuation <= 0.895) {
      item.disposition = 2;
    } else if (item.omegaAttenuation && item.omegaAttenuation <= 1.105) {
      item.disposition = 3;
    } else if (item.omegaAttenuation && item.omegaAttenuation <= 1.3) {
      item.disposition = 4;
    } else if (item.omegaAttenuation && item.omegaAttenuation <= 1.6) {
      item.disposition = 5;
    }
    // Re-apply correct names to MK1-weapons
    if (item.name.includes('MK1')) {
      item.name = item.name.replace('MK1', 'Mk1');
    }
    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  /**
   * Add additional data for mods from the wiki
   * @param item mod to append wikia data to
   * @param wikiaItem to pull data from
   */
  addModWikiaData(item: ItemComplete, wikiaItem: WikiaMod): void {
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;
    item.transmutable = wikiaItem.transmutable;
    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  /**
   * Add additional data for mods from the wiki
   * @param item mod to append wikia data to
   * @param wikiaItem to pull data from
   */
  addArcaneWikiaData(item: ItemComplete, wikiaItem: WikiaArcane): void {
    item.wikiaThumbnail = wikiaItem.thumbnail;
    item.wikiaUrl = wikiaItem.url;
    item.transmutable = wikiaItem.transmutable;
    item.type = wikiaItem.type ?? item.type;
    if (!wikiaItem.thumbnail) warnings.missingWikiThumb.push(item.name);
  }

  /**
   * Adds releaseDate, vaultDate and estimatedVaultDate to all primes using
   * data from "Ducats or Plat".
   * @param item data to append vault data to
   * @param category of the data
   * @param wikiaData from wikia to apply
   */
  addVaultData(item: ItemComplete, category: string, wikiaData: WikiaData): void {
    let vaultCategory = category;
    if (item.type === 'Archwing') vaultCategory = 'archwings';

    if (!item.name.endsWith('Prime')) return;
    if (!['weapons', 'warframes', 'archwings', 'sentinels'].includes(vaultCategory.toLowerCase())) return;

    if (vaultCategory === 'Sentinels') vaultCategory = 'companions';
    const wikiaItem = (wikiaData[vaultCategory.toLowerCase() as keyof WikiaData] as WikiaWeapon[]).find(
      (i) => i.name === item.name
    );
    const target = wikiaData.vaultData.find((i) => i.name.toLowerCase() === item.name.toLowerCase());

    if (!target && !wikiaItem) {
      const isManuallyExcluded = primeExcludeRegex.test(item.name);
      const isSkin = item.category === 'Skins';
      const isSentinelWeapon =
        (item.type === 'Sentinel' && ['Primary', 'Secondary', 'Melee'].includes(item.category)) ||
        item.productCategory === 'SentinelWeapons';
      const isExaltedWeapon = ['SpecialItems'].includes(item.productCategory ?? '');
      if (!(isManuallyExcluded || isSkin || isSentinelWeapon || isExaltedWeapon))
        warnings.missingVaultData.push(item.name);
      return;
    }

    item.vaulted = target?.vaulted ?? wikiaItem?.vaulted;
    if (target?.vaultDate) {
      item.vaultDate = target.vaultDate;
    }
    if (target?.estimatedVaultDate) {
      item.estimatedVaultDate = target.estimatedVaultDate;
    } else if (item.releaseDate) {
      const date = new Date(item.releaseDate);
      date.setMonth(date.getMonth() + 21);
      item.estimatedVaultDate = date.toISOString().split('T').at(0);
    }
  }

  /**
   * Add:
   * - relic data
   * - vaulted data (probably use this over ogg)
   * - market data on relics (urlName, id)
   * @param item to have relics applied to
   * @param relics relic array to search
   * @param drops drop rate data for refinement-specific chances
   */
  addRelics(item: ItemComplete, relics: TitaniaRelic[], drops: RawDrop[]): void {
    const hasRelicDrop = (item.components as Component[] | undefined)?.some((c) =>
      c.drops?.some((d) => d.location.includes('Relic'))
    );
    if (item.type !== 'Relic' && !hasRelicDrop) return;

    const addRelic = (relicItem: ItemComplete | Drop, name: string, link = false): void => {
      // Item names are /(Lith|Meso|Neo|Axi|Requiem) (Relic|\w+ \w+)/
      const relicName = name.toLowerCase().split(' ').slice(0, 2).join(' ');

      // Relic names are /(Lith|Meso|Neo|Axi|Requiem) (\w+)/
      const related = relics.filter((relic) => relic.name.toLowerCase() === relicName);

      if (link) {
        const drop = relicItem as Drop;
        [drop.uniqueName] = Array.from(new Set(related.map((relic) => relic.uniqueName).flat()));
      } else {
        const relic = relicItem as ItemComplete;
        relic.locations = Array.from(new Set(related.map((relic) => relic.locations).flat()));

        // Get base rewards structure from relics package (has item metadata)
        const baseRewards = Array.from(new Set(related.map((relic) => relic.rewards).flat()));

        // Build the correct "place" name for drops API lookup
        const dropPlaceName = name.endsWith('Intact')
          ? name.replace(/\sIntact$/, ' Relic')
          : name.replace(/\s(\w+)$/, ' Relic ($1)');

        // Find drops that match this relic refinement level
        const dropsForRelic: RawDrop[] = [];
        const filtered = (drops as RawDrop[] | undefined)?.filter((d) => d.place === dropPlaceName);
        if (filtered?.length) {
          dropsForRelic.push(...filtered);
        }

        // Update reward chances from drops data (keep other metadata from relics)
        // Track used drops by index to handle duplicate item names correctly
        const usedDropIndices = new Set<number>();
        relic.rewards = baseRewards.map((reward) => {
          if (!reward.item?.name) return reward;

          // Find first unused drop matching this item name
          const dropIndex = dropsForRelic.findIndex(
            (d, idx) => d.item === reward.item?.name && !usedDropIndices.has(idx)
          );

          if (dropIndex !== -1) {
            const dropItem = dropsForRelic[dropIndex];
            if (!dropItem) return reward;
            usedDropIndices.add(dropIndex);
            return { ...reward, chance: Number(dropItem.chance) };
          }
          return reward;
        });

        [relic.marketInfo] = Array.from(new Set(related.map((relic) => relic.warframeMarket)));

        const [vaultInfo] = Array.from(new Set(related.map((relic) => relic.vaultInfo)));
        relic.vaulted = vaultInfo?.vaulted;
        relic.vaultDate = vaultInfo?.vaultDate;
      }
    };

    if (hasRelicDrop) {
      (item.components as Component[]).forEach((component) =>
        component.drops?.forEach((drop) => {
          addRelic(drop, drop.location, true);
        })
      );
    } else {
      addRelic(item, item.name);
    }
  }

  applyOverrides(item: ItemComplete | Component): void {
    // universal polarity casing override
    if (item.polarity && typeof item.polarity === 'string') item.polarity = item.polarity.toLowerCase();
    const override = overrides[item.uniqueName];
    if (override) {
      Object.keys(override).forEach((key) => {
        (item as never)[key] = override[key] as never;
      });
    }
  }

  /**
   * Checks whether the item is masterable.
   * @param item the item to add the attribute to
   */
  applyMasterable(item: ItemComplete): void {
    item.masterable = masterableCategories.categories.includes(item.category);

    if ((item.type as string | undefined)?.includes('Component') || item.category === 'Pets') {
      const regex = new RegExp(masterableCategories.regex);
      item.masterable = regex.test(item.uniqueName);
    }
  }

  addResistanceData(item: ItemComplete, category: string): void {
    if (category.toLowerCase() !== 'enemies') return;

    const quantities = {
      positive: [0.25, 0.5, 0.75],
      negative: [-0.25, -0.5, -0.75],
    };
    const parseAffectors = (affectors: string): Affector[] => {
      return affectors.split(' ').map((element) => {
        if (element.includes('+')) {
          // positives
          const pSplit = (element || '').split('+');
          const firstPart = pSplit[0] ?? '';
          const parts = firstPart.split('_');
          return {
            element: firstPart.length > 0 ? (watson[firstPart] ?? title(parts[1] ?? '')) : 'None',
            modifier: quantities.positive[pSplit.length - 2] ?? 0,
          };
        }
        if (element.includes('-')) {
          // negatives
          const nSplit = (element || '').split('-');
          const firstPart = nSplit[0] ?? '';
          const parts = firstPart.split('_');
          return {
            element: firstPart.length > 0 ? (watson[firstPart] ?? title(parts[1] ?? '')) : 'None',
            modifier: quantities.negative[nSplit.length - 2] ?? 0,
          };
        }
        return {
          element: 'None',
          modifier: 0,
        };
      });
    };
    const parseArmor = (enemy: ItemComplete): Resistance[] => {
      return (enemy.resistValues ?? []).map((resist, index) => ({
        amount: resist,
        type: title((enemy.resistPrefix ?? [])[index]),
        affectors: parseAffectors(((enemy.resistTexts ?? [])[index] ?? '').trim().replace(/\s\s/g, ' ')),
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
   * @param data base data to apply i18n data to
   * @param i18n internationalization data
   * @returns internationalized data
   */
  applyI18n(
    data: Record<string, Item[]>,
    i18n: Record<string, ApiCategory[]>
  ): Record<string, Record<string, Partial<Item>>> {
    const i18nAllowedKeys: (keyof ItemComplete)[] = [
      'name',
      'description',
      'passiveDescription',
      'abilities',
      'trigger',
      'systemName',
      'levelStats',
    ];
    const locales = Object.keys(i18n).filter((key) => key !== 'en');
    const resultArray: Item[] = [];
    const i18nArr: Record<string, Record<string, Partial<Item>>> = {};
    Object.entries(data)
      .map(([, a]) => a)
      .forEach((sub) => resultArray.push(...sub));
    const bar = new Progress('Parsing i18n', resultArray.length);
    resultArray.forEach((entry) => {
      const id = entry.uniqueName;
      i18nArr[id] ??= {};
      locales.forEach((locale) => {
        const localeData = i18n[locale];
        if (!localeData?.[0]) return;
        localeData.every(({ data: i18nData }) => {
          const match = i18nData.find((i18nItem: Partial<Item>) => i18nItem.uniqueName === id);
          if (match) {
            const localeObj = i18nArr[id];
            const localeEntry = localeObj?.[locale];
            if (!localeEntry) {
              if (localeObj) localeObj[locale] = {};
            }
            i18nAllowedKeys.forEach((key) => {
              const target = i18nArr[id]?.[locale];
              if (target) {
                (target as never)[key] = (match as never)[key];
              }
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
