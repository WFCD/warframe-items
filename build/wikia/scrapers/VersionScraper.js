'use strict';

module.exports = class VersionScraper extends require('../WikiaDataScraper') {
  constructor() {
    super(
      'https://warframe.fandom.com/wiki/Module:Version/data?action=edit',
      'Version',
      require('../transformers/transformVersion')
    );
  }
};
