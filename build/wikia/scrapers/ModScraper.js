module.exports = class ModScraper extends require('../WikiaDataScraper') {
  constructor() {
    super(
      'https://warframe.fandom.com/wiki/Module:Mods/data?action=edit',
      'Mod',
      require('../transformers/transformMod')
    );
  }
};
