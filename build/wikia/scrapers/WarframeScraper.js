'use strict'

module.exports = class WarframeScraper extends require('../WikiaDataScraper') {
  constructor () {
    super('https://warframe.fandom.com/wiki/Module:Warframes/data?action=edit', 'Warframe', require('../transformers/transformWarframe'))
  }
}
