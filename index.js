const scraper = require('./src/scraper.js')

class Items extends Array {
  constructor (options, ...items) {
    super(...items)

    // Merge provided options with defaults
    this.options = Object.assign({
      type: 'All',
      tradable: null
    }, options)

    // Add items from options to array. Type equals the file name.
    // Tradable determines if we should use sub-folder or stay on root.
    const tradable = this.options.tradable ? 'tradable/' : (this.options.tradable === false ? 'non-tradable/' : '')
    const generated = require(`./data/json/${tradable}/${this.options.type}.json`)
    for (let item of generated) {
      this.push(item)
    }
  }

  /**
   * Update the item list with options set in constructor
   */
  async update () {
    let updated

    // Fetch single type or all
    if (this.options.type === 'All') {
      updated = scraper.fetchAll(this.options.tradable)
    } else {
      updated = scraper.fetch(this.options.type, this.options.tradable)
    }

    // Clear current array and add new items
    this.splice(0, this.length)
    this.concat(updated)
  }
}

module.exports = Items
