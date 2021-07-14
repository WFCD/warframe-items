'use strict'

module.exports = class WeaponScraper extends require('../WikiaDataScraper') {
  constructor () {
    super('https://warframe.fandom.com/wiki/Module:Weapons/data?action=edit', 'Weapon', require('../transformers/transformWeapon'))
  }
}
