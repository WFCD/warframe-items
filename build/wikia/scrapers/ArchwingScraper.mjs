import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformWarframe from '../transformers/transformWarframe.mjs';

export default class ArchwingScraper extends WikiaDataScraper {
  constructor() {
    super('https://warframe.fandom.com/wiki/Module:Warframes/data?action=edit', 'Archwing', transformWarframe);
  }
}
