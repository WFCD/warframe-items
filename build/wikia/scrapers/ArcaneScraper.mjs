import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformArcanes from '../transformers/transformArcanes.mjs';

export default class ArcaneScraper extends WikiaDataScraper {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Arcane/data?action=edit', 'Arcane', transformArcanes);
  }
}
