import WikiaDataScraper from '../WikiaDataScraper';
import transformMod from '../transformers/transformMod';
import type { WikiaMod } from '../../types/shared';

export default class ModScraper extends WikiaDataScraper<WikiaMod> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Mods/data?action=edit', 'Mod', transformMod);
  }
}
