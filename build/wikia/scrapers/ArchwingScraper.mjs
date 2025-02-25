import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformWarframe from '../transformers/transformWarframe.mjs';

export default class ArchwingScraper extends WikiaDataScraper {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Warframes/data?action=edit', 'Archwing', transformWarframe);
  }
}
