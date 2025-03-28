import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformMod from '../transformers/transformMod.mjs';

export default class ModScraper extends WikiaDataScraper {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Mods/data?action=edit', 'Mod', transformMod);
  }
}
