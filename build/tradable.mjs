const builtUntradable = [
  'Warframe',
  'Throwing',
  'Shotgun',
  'Rifle',
  'Pistol',
  'Melee',
  'Sword And Shield',
  'Bow',
  'Launcher',
  'Sniper',
];
// Explicit tradability overrides for built Prime items that the component check gets wrong.
// true = tradable despite no components (e.g. Baro Ki'teer weapons)
// false = untradable despite having components (e.g. quest-locked weapons)
const builtPrimeOverrides = {
  'Gotva Prime': true,
  'Galariak Prime': false,
  'Sagek Prime': false,
};

/**
 * Check if a built Prime item (Warframe, weapon) is tradable.
 * Built Prime items can't be traded directly, but are considered tradable
 * if their components (parts) can be traded as a set.
 * @param {module:warframe-items.Item} item Item to check
 * @returns {boolean}
 */
const tradableConditions = (item) => {
  if (!builtUntradable.includes(item.type) || !item.name.match(/Prime/gi)) {
    return true;
  }
  if (item.name in builtPrimeOverrides) {
    return builtPrimeOverrides[item.name];
  }
  // Default: tradable if item has tradable components (relic-farmed parts)
  return !!item.components?.some((c) => c.tradable);
};

const tradableArcanes = [
  'Arcane',
  'Primary Arcane',
  'Secondary Arcane',
  'Melee Arcane',
  'Amp Arcane',
  'Zaw Arcane',
  'Kitgun Arcane',
  'Shotgun Arcane',
  'Sniper Arcane',
  'Operator Arcane',
  'Bow Arcane',
  'Warframe Arcane',
];

const tradableMods = [
  'Arch-Melee Mod',
  'Archwing Mod',
  'Companion Mod',
  'K-Drive Mod',
  'Kavat Mod',
  'Kubrow Mod',
  'Melee Mod',
  'Necramech Mod',
  'Primary Mod',
  'Secondary Mod',
  'Sentinel Mod',
  'Shotgun Mod',
  'Stance Mod',
  'Warframe Mod',
];
const tradableTypes = [
  'Captura',
  'Cut Gem',
  'Fish',
  'Focus Lens',
  'Relic',
  'Upgrades',
  ...tradableArcanes,
  ...tradableMods,
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
