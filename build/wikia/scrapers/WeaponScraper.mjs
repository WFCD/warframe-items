import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformWeapon from '../transformers/transformWeapon.mjs';

const base = 'https://wiki.warframe.com/w/Module:Weapons/data';
const suffix = '?action=edit';
const subModules = ['archwing', 'companion', 'melee', 'misc', 'modular', 'primary', 'secondary', 'railjack'];

export default class WeaponScraper extends WikiaDataScraper {
  constructor() {
    super(
      subModules.map((subModule) => `${base}/${subModule}${suffix}`),
      'Weapon',
      transformWeapon
    );
  }
}
