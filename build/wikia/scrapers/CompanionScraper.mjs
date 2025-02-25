import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformCompanion from '../transformers/transformCompanion.mjs';

export default class CompanionScraper extends WikiaDataScraper {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Companions/data?action=edit', 'Companion', transformCompanion);
  }
}
