class Items extends Array {
  constructor (options, ...items) {
    super(...items)

    // Merge provided options with defaults
    this.options = Object.assign({
      category: 'All',
      tradable: null
    }, options)

    // Add items from options to array. Type equals the file name.
    // Tradable determines if we should use sub-folder or stay on root.
    const tradable = this.options.tradable ? 'tradable/' : (this.options.tradable === false ? 'non-tradable/' : '')
    const generated = require(`./data/json/${tradable}/${this.options.category}.json`)
    for (let item of generated) {
      this.push(item)
    }
  }
}

module.exports = Items
