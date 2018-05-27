/**
 * Update all items locally by default. The entrypoint can then pick those up
 * immediately without fetching them. This storing process is automated by the
 * docker image.
 */
const scraper = require('./scraper.js')
const fs = require('fs')
const stringify = require('./stringify.js')

/* eslint no-redeclare: "off" */
class Update {
  async save () {
    const items = await scraper.fetchAll()
    this.write(items)
  }

  write (items) {
    let all = []

    Object.keys(items).forEach(key => {
      fs.writeFileSync(`${__dirname}/../data/json/${key}.json`, stringify(items[key]))
      all = all.concat(items[key])
    })
    fs.writeFileSync(`${__dirname}/../data/json/All.json`, stringify(all))
  }
}

const update = new Update()
update.save()
