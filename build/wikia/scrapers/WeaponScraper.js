'use strict'

const WikiaDataScraper = require('../WikiaDataScraper')
const transformWeapon = require('../transformers/transformWeapon')

class WeaponScraper extends WikiaDataScraper {
  constructor () {
    super('http://warframe.wikia.com/wiki/Module:Weapons/data?action=edit', 'Weapon', transformWeapon)
  }
}

module.exports = WeaponScraper
