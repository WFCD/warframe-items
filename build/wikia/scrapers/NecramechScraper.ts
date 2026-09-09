import WikiaDataScraper from '../WikiaDataScraper';
import transformNecramech from '../transformers/transformNecramech';
import type { WikiaNecramech } from '../../types/shared';

export default class NecramechScraper extends WikiaDataScraper<WikiaNecramech> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Warframes/data?action=edit', 'Necramech', transformNecramech);
  }
}
