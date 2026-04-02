import WikiaDataScraper from '../WikiaDataScraper';
import transformVersion from '../transformers/transformVersion';
import type { WikiaVersion } from '../../types/shared';

export default class VersionScraper extends WikiaDataScraper<WikiaVersion> {
  constructor() {
    super('https://wiki.warframe.com/w/Module:Version/data?action=edit', 'Version', transformVersion);
  }
}
