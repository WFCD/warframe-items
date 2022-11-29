import WikiaDataScraper from '../WikiaDataScraper.mjs';
import transformVersion from '../transformers/transformVersion.mjs';

export default class VersionScraper extends WikiaDataScraper {
  constructor() {
    super('https://warframe.fandom.com/wiki/Module:Version/data?action=edit', 'Version', transformVersion);
  }
}
