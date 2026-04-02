import WikiaDataScraper from '../WikiaDataScraper';
import transformWeapon from '../transformers/transformWeapon';
import type { WikiaWeapon } from '../../types/shared';

const base = 'https://wiki.warframe.com/w/Module:Weapons/data';
const suffix = '?action=edit';
const subModules = ['archwing', 'companion', 'melee', 'misc', 'modular', 'primary', 'secondary', 'railjack'];

export default class WeaponScraper extends WikiaDataScraper<WikiaWeapon> {
  constructor() {
    super(
      subModules.map((subModule) => `${base}/${subModule}${suffix}`),
      'Weapon',
      transformWeapon
    );
  }
}
