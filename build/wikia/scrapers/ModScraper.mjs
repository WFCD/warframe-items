import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformMod from '../transformers/transformMod.mjs';

export default class ModScraper extends WikiaDataScraper {
  constructor() {
    super('https://warframe.fandom.com/wiki/Module:Mods/data?action=edit', 'Mod', transformMod);
  }
}
