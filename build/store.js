/**
 * Store all items locally by default. The entrypoint can then pick those up
 * immediately without fetching them. This storing process is automated by the
 * docker image.
 */
const scraper = require('../src/scraper.js')
const fs = require('fs')

/* eslint no-redeclare: "off" */
class Store {
  async save () {
    // Get individual items
    for (let endpoint of scraper.endpoints) {
      const filename = endpoint.split('/').slice(-1)[0].replace('Export', '')
      const name = filename.replace('.json', '')

      // Non-hash data
      var { all, tradable, untradable } = await this.fetch(name)
      this.write(filename, all, tradable, untradable)

      // Hashed data
      var { all, tradable, untradable } = await this.fetch(name, true)
      this.write(`.${name}.json`, all, tradable, untradable)
    }

    // Get all.json
    var { all, tradable, untradable } = await this.fetch('All')
    this.write('All.json', all, tradable, untradable)
    var { all, tradable, untradable } = await this.fetch('All', true)
    this.write('.All.json', all, tradable, untradable)
  }

  async fetch (name, hash) {
    if (name === 'All') {
      const all = await scraper.fetchAll(null, hash)
      const tradable = await scraper.fetchAll(true, hash)
      const untradable = await scraper.fetchAll(false, hash)
      return { all, tradable, untradable }
    } else {
      const all = await scraper.fetch(name, null, hash)
      const tradable = await scraper.fetch(name, true, hash)
      const untradable = await scraper.fetch(name, false, hash)
      return { all, tradable, untradable }
    }
  }

  write (filename, all, tradable, untradable) {
    fs.writeFileSync(`${__dirname}/../data/json/${filename}`, JSON.stringify(all))
    fs.writeFileSync(`${__dirname}/../data/json/tradable/${filename}`, JSON.stringify(tradable))
    fs.writeFileSync(`${__dirname}/../data/json/untradable/${filename}`, JSON.stringify(untradable))
  }
}

const store = new Store()
store.save()
