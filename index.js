class Items extends Array {
  constructor (options, ...items) {
    super(...items)

    // Merge provided options with defaults
    this.options = Object.assign({
      category: ['All']
    }, options)

    // Add items from options to array. Type equals the file name.
    // Tradable determines if we should use sub-folder or stay on root.
    for (let category of this.options.category) {
      const items = require(`./data/json/${category}.json`)

      for (let item of items) {
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
  }
}

module.exports = Items
