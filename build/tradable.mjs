const builtUntradable = ['Warframe', 'Throwing', 'Shotgun', 'Rifle', 'Pistol', 'Melee', 'Sword And Shield'];
const tradableConditions = (item) => !(builtUntradable.includes(item.type) && item.name.match(/Prime/gi));

const tradableTypes = [
  'Arcane',
  'Arch-Melee Mod',
  'Archwing Mod',
  'Captura',
  'Companion Mod',
  'Cut Gem',
  'Fish',
  'Focus Lens',
  'K-Drive Mod',
  'Kavat Mod',
  'Kubrow Mod',
  'Melee Mod',
  'Necramech Mod',
  'Primary Mod',
  'Relic',
  'Secondary Mod',
  'Sentinel Mod',
  'Shotgun Mod',
  'Stance Mod',
  'Upgrades',
  'Warframe Mod',
];
const untradableTypes = [
  'Color Palette',
  'Exalted Weapon',
  'Extractor',
  'Fur Color',
  'Fur Pattern',
  'Glyph',
  'Key',
  'Medallion',
  'Node',
  'Pets',
  'Ship Decoration',
  'Sigil',
  'Skin',
  'Syandana',
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
