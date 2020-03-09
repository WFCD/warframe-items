/**
 * Configuration options for warframe-items
 * @typedef {Object} Options
 *
 * @property {string[]} category List of allowed categories to be pulled in.
 *                        Default ['All'].
 *                        Allows any of:
 *                         - All
 *                         - Arcanes
 *                         - Archwing
 *                         - Arch-Gun
 *                         - Arch-Melee
 *                         - Corpus
 *                         - Enemy
 *                         - Fish
 *                         - Gear
 *                         - Glyphs
 *                         - Melee
 *                         - Misc
 *                         - Mods
 *                         - Pets
 *                         - Primary
 *                         - Quests
 *                         - Relics
 *                         - Resources
 *                         - Secondary
 *                         - Sentinels
 *                         - Skins
 *                         - Warframes
 * @property {boolean} ignoreEnemies If true, don't load any enemy categories
 */

const versions = require('./data/cache/.export.json')

const defaultOptions = { category: ['All'] }

class Items extends Array {
  constructor (options, ...items) {
    super(...items)

    // Merge provided options with defaults
    this.options = {
      ...defaultOptions,
      ...options
    }

    // Add items from options to array. Type equals the file name.
    // Tradable determines if we should use sub-folder or stay on root.
    for (let category of this.options.category) {
      // Ignores the enemy category.
      if (this.options.ignoreEnemies && category === 'Enemy') continue
      const items = require(`./data/json/${category}.json`)

      for (let item of items) {
        // need this because all will include enemies
        if (this.options.ignoreEnemies && item.category === 'Enemy') continue
        this.push(item)
      }
    }

    // Output won't be sorted if separate categories are chosen
    this.sort((a, b) => {
      const res = a.name.localeCompare(b.name)
      if (res === 0) {
        return a.uniqueName.localeCompare(b.uniqueName)
      } else {
        return res
      }
    })

    this.versions = versions
  }

  /**
   * Override Array.prototype.filter
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
  filter (fn) {
    const A = []

    for (const el of this) {
      if (fn(el)) A.push(el)
    }
    return A
  }
}

module.exports = Items
