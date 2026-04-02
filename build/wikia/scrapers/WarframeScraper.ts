import WikiaDataScraper from '../WikiaDataScraper';
import transformWarframe from '../transformers/transformWarframe';
import type { WikiaWarframe } from '../../types/shared';

export default class WarframeScraper extends WikiaDataScraper<WikiaWarframe> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Warframes/data?action=edit', 'Warframe', transformWarframe);
  }
}
