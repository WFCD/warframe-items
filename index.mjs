/**
 * Configuration options for @wfcd/items
 * @typedef {Object} Options
 * @property {string[]} category List of allowed categories to be pulled in.
 *     Default ['All'].
 *     Allows any of:
 *      - All
 *      - Arcanes
 *      - Archwing
 *      - Arch-Gun
 *      - Arch-Melee
 *      - Components
 *      - Corpus
 *      - Enemy
 *      - Fish
 *      - Gear
 *      - Glyphs
 *      - Melee
 *      - Misc
 *      - Mods
 *      - Pets
 *      - Primary
 *      - Quests
 *      - Relics
 *      - Resources
 *      - Secondary
 *      - Sentinels
 *      - Skins
 *      - Warframes
 * @property {boolean} ignoreEnemies If true, don't load any enemy categories
 * @property {boolean|Array<string>} i18n Whether or not to include i18n, or a list of allowed locales
 * @property {boolean} i18nOnObject Whether or not to include i18n on the object itself and not on the "array"
 * @property {boolean} resolveComponents When true (default), expand component refs on items at construction using the Components catalog
 */

import { resolve, dirname } from 'node:path';
import { readFileSync, readdirSync, accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'url';
import { resolveComponents, toCatalogMap } from './utilities/resolveComponents.mjs';

const directory = dirname(fileURLToPath(import.meta.url));

const canAccess = (path) => {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch (_e) {
    return false;
  }
};

const cache = {};
const requireJson = (filePath) => {
  if (cache[filePath]) return cache[filePath];

  const resolved = resolve(directory, filePath);
  if (canAccess(resolved)) {
    const parsed = JSON.parse(readFileSync(resolved, 'utf-8'));
    cache[filePath] = parsed;
    return parsed;
  }
  return [];
};

const versions = requireJson('./data/cache/.export.json');

let i18n = {};
try {
  i18n = requireJson('./data/json/i18n.json');
} catch (_ignored) {
  // can only happen in really weird stuff, and we're already defaulting, so it's ok
}

const ignored = ['All', 'i18n'];
const defaultCategories = readdirSync(resolve(directory, './data/json/'))
  .filter((f) => f.includes('.json'))
  .map((f) => f.replace('.json', ''))
  .filter((f) => !ignored.includes(f));

const defaultOptions = {
  category: defaultCategories,
  i18n: false,
  i18nOnObject: false,
  resolveComponents: true,
};

/**
 * Shallow-clone item so cached JSON stays as on-disk refs.
 * @param {object} raw
 * @returns {object}
 */
const cloneItem = (raw) => {
  const item = { ...raw };
  if (Array.isArray(raw.components)) {
    item.components = raw.components.map((c) => ({ ...c }));
  }
  return item;
};

/**
 * Map for resolve: crafting Components catalog + every other category file
 * so standalone ingredients (Resources, Melee, …) resolve without living in Components.
 * @param {(path: string) => object[]} readJsonFn
 * @param {string[]} categories
 * @returns {Map<string, object>}
 */
const buildResolveMap = (readJsonFn, categories) => {
  const map = toCatalogMap(readJsonFn('./data/json/Components.json'));
  for (const category of categories) {
    if (category === 'Components') continue;
    const items = readJsonFn(`./data/json/${category}.json`);
    for (const item of items) {
      if (item?.uniqueName && !map.has(item.uniqueName)) {
        map.set(item.uniqueName, item);
      }
    }
  }
  return map;
};

export default class Items extends Array {
  constructor(options, ...existingItems) {
    super(...existingItems);

    // Merge provided options with defaults
    this.options = {
      ...defaultOptions,
      ...options,
    };

    if (typeof this.options.category === 'string') {
      this.options.category = [this.options.category];
    }
    if (!Array.isArray(this.options.category)) {
      this.options.category = [...defaultCategories];
    }

    const containedAll = this.options.category.includes('All');
    if (containedAll) {
      this.options.category = Array.from(
        new Set(this.options.category.filter((c) => c !== 'All').concat(defaultCategories))
      );
    }

    this.i18n = {};

    const shouldResolve = this.options.resolveComponents !== false;
    const catalogMap = shouldResolve ? buildResolveMap(requireJson, defaultCategories) : null;
    const seenUniqueNames = new Set();
    const pendingResolve = [];

    // Load non-Components first so real items win over catalog duplicates
    const categories = [
      ...this.options.category.filter((c) => c !== 'Components'),
      ...(this.options.category.includes('Components') ? ['Components'] : []),
    ];

    // Add items from options to array. Type equals the file name.
    for (const category of categories) {
      // Ignores the enemy category.
      if (this.options.ignoreEnemies && category === 'Enemy') continue;
      const items = requireJson(`./data/json/${category}.json`);
      for (const raw of items) {
        if (category === 'Components' && seenUniqueNames.has(raw.uniqueName)) continue;
        if (raw.uniqueName) seenUniqueNames.add(raw.uniqueName);

        const item = cloneItem(raw);
        if (this.options.i18n) {
          // only insert i18n for the objects we're inserting so we don't bloat memory
          if (Array.isArray(this.options.i18n)) {
            const itemI18n = i18n[item.uniqueName];
            const rawI18n = itemI18n ? { ...itemI18n } : undefined;
            // only process if passed language is a supported i18n value
            if (rawI18n) {
              Object.keys(rawI18n).forEach((locale) => {
                if (!this.options.i18n.includes(locale)) {
                  delete rawI18n[locale];
                }
              });
            }
            this.i18n[item.uniqueName] = rawI18n;
          } else {
            this.i18n[item.uniqueName] = i18n[item.uniqueName];
          }
        }
        if (this.options.i18n && this.options.i18nOnObject) {
          item.i18n = this.i18n[item.uniqueName];
          // keep data just on the object so no bloat in extra this.i18n
          delete this.i18n[item.uniqueName];
        }
        if (shouldResolve) pendingResolve.push(item);
        this.push(item);
      }
    }

    // Resolve after load; overlay in-memory items so loaded standalone ingredients win
    if (shouldResolve && catalogMap) {
      for (const item of this) {
        if (item.uniqueName) catalogMap.set(item.uniqueName, item);
      }
      for (const item of pendingResolve) {
        resolveComponents(item, catalogMap);
      }
    }
    if (!this.options.i18n || (this.options.i18n && this.options.i18nOnObject)) {
      this.i18n = undefined;
    }

    // Output won't be sorted if separate categories are chosen
    this.sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName);
      }
      return res;
    });

    this.versions = versions;
  }

  /**
   * Expand component refs on an item using the Components catalog (or a provided catalog).
   * @param {object} item
   * @param {Map|object[]|Record<string, object>} [catalog]
   * @returns {object}
   */
  static resolveComponents(item, catalog) {
    return resolveComponents(item, catalog ?? buildResolveMap(requireJson, defaultCategories));
  }

  /**
   * @Override Array.prototype.filter
   *
   * This roughly implements Mozilla's builtin for `Array.prototype.filter`[1].
   * V8 passes the prototype of the original Array into `ArraySpeciesCreate`[2][3],
   * which is the Array that gets returned from `filter()`. However, they don't
   * pass the arguments passed to the constructor of the original Array (this Class),
   * which means that it will always return a new Array with ALL items, even when
   * different categories are specified.[4]
   *
   * [1] https://hg.mozilla.org/mozilla-central/file/tip/js/src/builtin/Array.js#l320
   * [2] https://github.com/v8/v8/blob/master/src/builtins/array-filter.tq#L193
   * [3] https://www.ecma-international.org/ecma-262/7.0/#sec-arrayspeciescreate
   * [4] https://runkit.com/kaptard/5c9daf33090ab900120465fe
   */
  filter(fn) {
    const A = [];
    const filteredNames = this.i18n ? new Set() : null;

    for (const el of this) {
      if (fn(el)) {
        A.push(el);
        if (filteredNames) filteredNames.add(el.uniqueName);
      }
    }

    if (filteredNames) {
      const filteredI18n = {};
      for (const uniqueName of filteredNames) {
        if (Object.prototype.hasOwnProperty.call(this.i18n, uniqueName)) {
          filteredI18n[uniqueName] = this.i18n[uniqueName];
        }
      }
      A.i18n = filteredI18n;
    }

    A.versions = this.versions;
    return A;
  }

  /**
   * @Override Array.prototype.map
   *
   * See filter override
   */
  map(fn) {
    const a = [];
    for (const el of this) a.push(fn(el));

    return a;
  }
}

export { resolveComponents, toCatalogMap };
