import WikiaDataScraper from '../WikiaDataScraper';
import transformWarframe from '../transformers/transformWarframe';
import type { WikiaArchwing } from '../../types/shared';

export default class ArchwingScraper extends WikiaDataScraper<WikiaArchwing> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Warframes/data?action=edit', 'Archwing', transformWarframe);
  }
}
