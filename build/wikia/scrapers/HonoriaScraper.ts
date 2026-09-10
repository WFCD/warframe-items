import WikiaDataScraper from '../WikiaDataScraper';
import transformHonoria from '../transformers/transformHonoria';
import type { WikiaHonoria } from '../../types/shared';

export default class HonoriaScraper extends WikiaDataScraper<WikiaHonoria> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Honorias/data?action=edit', 'Honoria', transformHonoria);
  }
}
