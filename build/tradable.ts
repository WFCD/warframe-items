import type {
  Drop,
} from './types/shared';

interface Item {
  type: string;
  name: string;
  uniqueName: string;
  productCategory?: string;
  drops?: Drop[];
  isAugment?: boolean;
}

const builtUntradable = [
  'Warframe',
  'Sentinel',
  'Archwing',
  'Arch-Gun',
  'Arch-Melee',
  'Pets',
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
  'Arch-Gun Mod',
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
const tradableRegex
  = /(Prime|Vandal|Wraith\w|\wWraith|Rakta|Synoid|Sancti|Vaykor|Telos|Secura|Ayatan|Prisma|DamagedMech)(?!Derelict)/i;
const untradableRegex
  = /(Glyph|Mandachord|Greater.*Lens|Sugatra|\[|SentinelWeapons|Toroid|Bait|([A-Za-z]+ (Relic)))|Umbral|Sacrificial/i;

/**
 * Gate built Prime items (Warframes, weapons) from being marked tradable.
 * Built Prime items are not directly tradable -- only their individual
 * components/parts are (e.g. Loki Prime Blueprint). Components get their
 * own tradable flag set independently during parsing.
 *
 * To determine if a Prime set is tradable, check item.components for
 * parts with tradable: true.
 *
 * Item-specific tradability overrides live in config/overrides.json
 * (keyed by uniqueName) and are applied by parser.mjs applyOverrides()
 * after this check runs.
 *
 * @param item Item to check
 * @returns
 */
const tradableConditions = (item: Item): boolean => {
  const primeItem = item.name.match(/Prime/gi);
  if (builtUntradable.includes(item.type) && primeItem) {
    return false;
  }
  // calling this defensively on only prime things
  // in case it might break something else, since we only
  // care about prime things at the moment. Also for the few
  // things that are prime and getting caught accidentally the
  // original behavior should be preserved with this tm
  const primeFromUnique = item.uniqueName.match(/Prime/gi);
  if ((primeFromUnique || primeItem) && !(tradableTypes.includes(item.type))) {
    const result = !item.drops || item.drops.every((drop) => /Relic/gi.test(drop.location));
    return result;
  }
  return true;
};

/**
 * Check if an item is tradable
 * @param item Item to determine tradability
 * @returns
 */
export default (item: Item): boolean => {
  const notFiltered
    = !untradableTypes.includes(item.type)
      && !untradableRegex.exec(item.name)
      && !untradableRegex.exec(item.uniqueName)
      && (item.productCategory ? !/(SpecialItems)/.exec(item.productCategory) : true);
  const tradableByType = (tradableTypes.includes(item.type) && notFiltered) satisfies boolean;
  const tradableByName = Boolean((tradableRegex.exec(item.uniqueName) ?? tradableRegex.exec(item.name)) && notFiltered);
  const tradableByProp = Boolean(item.isAugment && notFiltered);
  return (tradableByType || tradableByName || tradableByProp) && tradableConditions(item);
};
