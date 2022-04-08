'use strict';

const base = 'https://warframe.fandom.com/wiki/Module:Weapons/data';
const suffix = '?action=edit';
const subModules = ['archwing', 'companion', 'melee', 'misc', 'modular', 'primary', 'secondary', 'railjack'];

module.exports = class WeaponScraper extends require('../WikiaDataScraper') {
  constructor() {
    super(
      subModules.map((subModule) => `${base}/${subModule}${suffix}`),
      'Weapon',
      require('../transformers/transformWeapon')
    );
  }
};
