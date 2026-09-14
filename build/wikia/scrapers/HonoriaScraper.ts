import WikiaDataScraper from '../WikiaDataScraper';
import transformHonoria from '../transformers/transformHonoria';
import type { WikiaHonorium } from '../../types/shared';

export default class HonoriumScraper extends WikiaDataScraper<WikiaHonorium> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Honorias/data?action=edit', 'Honoria', transformHonoria);
  }
}
