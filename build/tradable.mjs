const builtUntradable = ['Warframe', 'Throwing', 'Shotgun', 'Rifle', 'Pistol', 'Melee', 'Sword And Shield'];
const tradableConditions = (item) => !(builtUntradable.includes(item.type) && item.name.match(/Prime/gi));

const tradableTypes = [
  'Upgrades',
  'Arcane',
  'Fish',
  'Focus Lens',
  'Relic',
  'Secondary Mod',
  'Shotgun Mod',
  'Warframe Mod',
  'Companion Mod',
  'Archwing Mod',
  'K-Drive Mod',
  'Melee Mod',
  'Arch-Melee Mod',
  'Necramech Mod',
  'Cut Gem',
  'Captura',
  'Primary Mod',
  'Sentinel Mod',
  'Kubrow Mod',
  'Kavat Mod',
];
const untradableTypes = [
  'Skin',
  'Medallion',
  'Key',
  'Extractor',
  'Pets',
  'Ship Decoration',
  'Glyph',
  'Sigil',
  'Fur Color',
  'Syandana',
  'Fur Pattern',
  'Color Palette',
  'Node',
  'Exalted Weapon',
];
const tradableRegex =
  /(Prime|Vandal|Wraith\w|\wWraith|Rakta|Synoid|Sancti|Vaykor|Telos|Secura|Ayatan|Prisma|DamagedMech)(?!Derelict)/i;
const untradableRegex =
  /(Glyph|Mandachord|Greater.*Lens|Sugatra|\[|SentinelWeapons|Toroid|Bait|([A-Za-z]+ (Relic)))|Umbral|Sacrificial/i;

/**
 * Check if an item is tradable
 * @param {module:warframe-items.Item} item Item to determine tradability
 * @returns {boolean}
 */
export default (item) => {
  const notFiltered =
    !untradableTypes.includes(item.type) &&
    !item.name.match(untradableRegex) &&
    !item.uniqueName.match(untradableRegex) &&
    (item.productCategory ? !item.productCategory.match(/(SpecialItems)/) : true);
  const tradableByType = !!(tradableTypes.includes(item.type) && notFiltered);
  const tradableByName = !!((item.uniqueName.match(tradableRegex) || item.name.match(tradableRegex)) && notFiltered);
  const tradableByProp = !!(item.isAugment && notFiltered);
  return (tradableByType || tradableByName || tradableByProp) && tradableConditions(item);
};
