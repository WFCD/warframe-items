import WikiaDataScraper from '../WikiaDataScraper';
import transformArcanes from '../transformers/transformArcanes';
import type { WikiaArcane } from '../../types/shared';

export default class ArcaneScraper extends WikiaDataScraper<WikiaArcane> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Arcane/data?action=edit', 'Arcane', transformArcanes);
  }
}
