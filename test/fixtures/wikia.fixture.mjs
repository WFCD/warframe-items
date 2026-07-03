/** @typedef {import('../../build/types/shared').RawItemData} RawItemData */
/** @typedef {import('../../build/types/shared').WikiaData} WikiaData */

/** @type {import('../../build/types/shared').WikiaVersion[]} */
export const versions = [
  { name: 'Update 38.6', aliases: ['Update 38.6'], date: '2025-05-21' },
  { name: 'Update 16.1', aliases: ['Update 16.1'], date: '2015-03-25' },
];

/** @returns {WikiaData} */
export const baseWikia = () => ({
  weapons: [
    {
      name: 'Quassus Prime',
      uniqueName: '/Lotus/Weapons/Tenno/Melee/Warfan/TnBrokenFrameWarfan/TnBrokenFramePrimeWarfanWeapon',
      url: 'https://wiki.warframe.com/w/Quassus_Prime',
      introduced: 'Update 38.6',
      slot: 'Melee',
    },
    {
      name: 'Braton',
      uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton/Braton',
      url: 'https://wiki.warframe.com/w/Braton',
      introduced: 'Update 38.6',
      slot: 'Primary',
    },
    {
      name: 'Braton',
      uniqueName: '/Lotus/Weapons/Tenno/Pistols/Braton/BratonPistol',
      url: 'https://wiki.warframe.com/w/Braton',
      introduced: 'Update 38.6',
      slot: 'Secondary',
    },
  ],
  warframes: [],
  mods: [],
  versions,
  ducats: [],
  arcanes: [
    {
      name: 'Arcane Acceleration',
      uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneAcceleration',
      url: 'https://wiki.warframe.com/w/Arcane_Acceleration',
      introduced: 'Update 38.6',
      type: 'Warframe',
      rarity: 'Uncommon',
    },
    {
      name: 'Arcane Aegis',
      uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneAegis',
      url: 'https://wiki.warframe.com/w/Arcane_Aegis',
      introduced: 'Update 38.6',
      type: 'Warframe',
      rarity: 'Rare',
    },
  ],
  archwings: [],
  companions: [
    {
      name: 'Wyrm Prime',
      uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/WyrmPrimePowerSuit',
      url: 'https://wiki.warframe.com/w/Wyrm_Prime',
      introduced: 'Update 16.1',
    },
  ],
  vaultData: [],
});

/**
 * @param {Partial<RawItemData>} overrides
 * @returns {RawItemData}
 */
export const buildRaw = (overrides = {}) => ({
  api: [],
  manifest: [],
  drops: [],
  patchlogs: { changed: false, posts: [], patchlogs: { getItemChanges: () => [] } },
  wikia: baseWikia(),
  relics: [],
  i18n: { en: [] },
  ...overrides,
});

/** @param {import('../../build/types/shared').CategoryData[]} categories */
export const withApi = (categories) => buildRaw({ api: categories });
