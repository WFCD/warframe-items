'use strict'

const WikiaDataScraper = require('../WikiaDataScraper')
const transformMod = require('../transformers/transformMod')

class WarframeScraper extends WikiaDataScraper {
  constructor () {
    super('http://warframe.fandom.com/wiki/Module:Mods/data?action=edit', 'Mod', transformMod)
  }
}

module.exports = WarframeScraper
