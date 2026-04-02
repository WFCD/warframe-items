// Shared type definitions for the build system

export interface CachedItem {
  uniqueName: string;
  hash: string;
  isComponent: boolean;
}

export interface ExportCacheItem {
  hash: string;
}

export type ExportCache = Record<string, ExportCacheItem>;

export interface ImageManifestItem {
  uniqueName: string;
  textureLocation: string;
  fileTime: string;
}

export type ImageManifest = ImageManifestItem[];

export interface Item {
  uniqueName: string;
  name: string;
  type: string;
  category: string;
  productCategory?: string;
  imageName: string;
  components?: Item[];
  abilities?: Ability[];
  isAugment?: boolean;
  tradable?: boolean;
  [key: string]: unknown;
}

export interface Ability {
  uniqueName: string;
  name: string;
  imageName: string;
  [key: string]: unknown;
}

export interface RawItemData {
  api: ApiCategory[];
  manifest: ImageManifest;
  drops: RawDrop[];
  patchlogs: PatchlogWrap;
  wikia: WikiaData;
  relics: TitaniaRelic[];
  i18n: Record<string, ApiCategory[]>;
}

export interface Patchlogs {
  posts: PatchlogPost[];
}

export interface PatchlogPost {
  name: string;
  url: string;
  date: string;
  [key: string]: unknown;
}

export interface ParsedData {
  data: CategoryData[];
  warnings: Warnings;
}

export interface CategoryData {
  category: string;
  data: Item[];
}

export interface Warnings {
  missingImage: string[];
  missingDucats: string[];
  missingComponents: string[];
  missingVaultData: string[];
  polarity: [string, string][];
  missingType: string[];
  failedImage: string[];
  missingWikiThumb: string[];
}

export type Locales = Record<string, Record<string, unknown>>;

// Wikia-related types
export interface WikiaData {
  weapons: WikiaWeapon[];
  warframes: WikiaWarframe[];
  mods: WikiaMod[];
  versions: WikiaVersion[];
  ducats: WikiaDucat[];
  arcanes: WikiaArcane[];
  archwings: WikiaArchwing[];
  companions: WikiaCompanion[];
  vaultData: VaultData[];
}

export interface WikiaWeapon {
  name: string;
  uniqueName?: string;
  url: string;
  mr?: number;
  type?: string;
  class?: string;
  slot?: number;
  attacks?: unknown[];
  ammo?: number;
  polarities?: string[];
  stancePolarity?: string;
  tags?: string[];
  thumbnail?: string;
  marketCost?: number;
  bpCost?: number;
  introduced?: string;
  vaulted?: boolean;
  [key: string]: unknown;
}

export interface WikiaWarframe {
  name: string;
  uniqueName?: string;
  url: string;
  auraPolarity?: string;
  conclave?: number;
  mr?: number;
  polarities?: string[];
  sprint?: number;
  introduced?: string;
  sex?: string;
  vaulted?: boolean;
  thumbnail?: string;
  color?: number;
  marketCost?: number;
  bpCost?: number;
  [key: string]: unknown;
}

export interface WikiaMod {
  name: string;
  uniqueName?: string;
  url: string;
  transmutable?: boolean;
  introduced?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface WikiaArcane {
  name: string;
  uniqueName?: string;
  url: string;
  transmutable?: boolean;
  introduced?: string;
  type?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface WikiaArchwing {
  name: string;
  uniqueName?: string;
  url: string;
  mr?: number;
  polarities?: string[];
  sprint?: number;
  introduced?: string;
  vaulted?: boolean;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface WikiaCompanion {
  name: string;
  uniqueName?: string;
  url: string;
  mr?: number;
  polarities?: string[];
  stamina?: number;
  introduced?: string;
  vaulted?: boolean;
  vaultDate?: string;
  estimatedVaultDate?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface WikiaVersion {
  name: string;
  url: string;
  aliases: string[];
  parent?: string;
  date?: string;
}

export interface WikiaDucat {
  name: string;
  ducats: number;
}

export interface VaultData {
  name: string;
  vaulted: boolean;
  vaultDate?: string;
  estimatedVaultDate?: string;
}

export interface Blueprint {
  MarketCost?: number | string;
  BPCost?: number | string;
  [key: string]: unknown;
}

export interface Drop {
  location: string;
  type: string;
  chance: number;
  rarity: string;
  rotation?: string;
  uniqueName?: string;
  rewards?: RelicReward[];
  marketInfo?: unknown;
  vaulted?: boolean;
  vaultDate?: string;
}

export interface RawDrop {
  place: string;
  item: string;
  chance: number | string;
  rarity: string;
}

export interface Component extends Item {
  itemCount?: number;
  parent?: string;
  parents?: string[];
  primeSellingPrice?: number;
  ducats?: number;
  drops?: Drop[];
}

export interface RelicReward {
  item?: {
    name: string;
  };
  chance?: number;
  [key: string]: unknown;
}

export interface TitaniaRelic {
  name: string;
  uniqueName: string;
  locations: string[];
  rewards: RelicReward[];
  warframeMarket?: unknown;
  vaultInfo?: {
    vaulted: boolean;
    vaultDate?: string;
  };
}

export interface PatchlogWrap {
  patchlogs: {
    getItemChanges: (target: { name: string; type: string }) => unknown[];
  };
  posts: PatchlogPost[];
  changed: boolean;
}

export interface VariantsConfig {
  prefixes: string[];
  suffixes: string[];
}

export interface Grade {
  id: string;
  refinement: string;
}

export interface Polarity {
  id: string;
  name: string;
}

export interface ItemType {
  id: string;
  name: string;
  regex?: boolean;
  append?: boolean;
}

export interface MasterableCategories {
  categories: string[];
  regex: string;
}

export interface ApiCategory {
  category?: string;
  data: Partial<Item>[];
}

// Enhanced Item interface with all possible properties
export interface ItemComplete extends Item {
  rewardName?: string;
  description?: string;
  passiveDescription?: string;
  damage?: Damage;
  damagePerShot?: number[];
  totalDamage?: number;
  buildPrice?: number;
  buildTime?: number;
  skipBuildTimePrice?: number;
  buildQuantity?: number;
  consumeOnBuild?: boolean;
  drops?: Drop[];
  patchlogs?: unknown[];
  isPrime?: boolean;
  vaulted?: boolean;
  vaultDate?: string;
  estimatedVaultDate?: string;
  releaseDate?: string;
  introduced?: WikiaVersion;
  wikiAvailable?: boolean;
  aura?: string;
  conclave?: number;
  color?: number;
  marketCost?: number;
  bpCost?: number;
  masteryReq?: number;
  polarities?: string[];
  sex?: string;
  sprint?: number;
  wikiaThumbnail?: string;
  wikiaUrl?: string;
  attacks?: unknown[];
  ammo?: number;
  tags?: string[];
  stancePolarity?: string;
  disposition?: number;
  omegaAttenuation?: number;
  transmutable?: boolean;
  systemName?: string;
  slot?: number;
  isArchwing?: boolean;
  faction?: string;
  polarity?: string;
  trigger?: string;
  noise?: string;
  rarity?: string;
  compatName?: string;
  masterable?: boolean;
  resistances?: Resistance[];
  resistValues?: number[];
  resistPrefix?: string[];
  resistTexts?: string[];
  locations?: string[];
  rewards?: RelicReward[];
  marketInfo?: unknown;
  abilityUniqueName?: string;
  abilityName?: string;
  resultType?: string;
  ingredients?: Ingredient[];
  primeSellingPrice?: number;
  num?: number;
  consumeOnUse?: boolean;
  levelStats?: unknown[];
  parent?: string;
  parents?: string[];
}

export interface Damage {
  total?: number;
  impact?: number;
  puncture?: number;
  slash?: number;
  heat?: number;
  cold?: number;
  electricity?: number;
  toxin?: number;
  blast?: number;
  radiation?: number;
  gas?: number;
  magnetic?: number;
  viral?: number;
  corrosive?: number;
  void?: number;
  tau?: number;
  cinematic?: number;
  shieldDrain?: number;
  healthDrain?: number;
  energyDrain?: number;
  true?: number;
}

export interface Ingredient {
  ItemType: string;
  ItemCount: number;
}

export interface Resistance {
  amount: number;
  type: string;
  affectors: Affector[];
}

export interface Affector {
  element: string;
  modifier: number;
}
