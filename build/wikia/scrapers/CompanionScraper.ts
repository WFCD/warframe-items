import WikiaDataScraper from '../WikiaDataScraper';
import transformCompanion from '../transformers/transformCompanion';
import type { WikiaCompanion } from '../../types/shared';

export default class CompanionScraper extends WikiaDataScraper<WikiaCompanion> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Companions/data?action=edit', 'Companion', transformCompanion);
  }
}
