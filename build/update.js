/**
 * Update all items locally by default. The entrypoint can then pick those up
 * immediately without fetching them. This storing process is automated by the
 * docker image.
 */
const scraper = require('../src/scraper.js')
const fs = require('fs')
const stringify = require('./stringify.js')

/* eslint no-redeclare: "off" */
class Update {
  async save () {
    var { all, tradable, untradable } = await this.fetch('All')
    this.write(all)
    this.write(tradable, 'tradable/')
    this.write(untradable, 'untradable/')
  }

  async fetch (name, hash) {
    const all = await scraper.fetchAll(null, hash)
    const tradable = await scraper.fetchAll(true, hash)
    const untradable = await scraper.fetchAll(false, hash)
    return { all, tradable, untradable }
  }

  write (items, prefix = '') {
    let all = []

    Object.keys(items).forEach(key => {
      fs.writeFileSync(`${__dirname}/../data/json/${prefix}${key}.json`, stringify(items[key]))
      all = all.concat(items[key])
    })
    fs.writeFileSync(`${__dirname}/../data/json/${prefix}All.json`, stringify(all))
  }
}

const update = new Update()
update.save()
