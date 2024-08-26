// Project: warframe-items
declare module 'warframe-items' {
    export interface ColorMap {
        primary?: Pixel;
        secondary?: Pixel;
        tertiary?: Pixel;
        accents?: Pixel;
        emissive?: Pixel[];
        energy?: Pixel[];
    }

    export interface RawColors {
        t0?: string;
        t1?: string;
        t2?: string;
        t3?: string;
        m0?: string;
        m1?: string;
        en?: string;
        en1?: string;
    }

    export default class Items extends Array<Item>{
        constructor(options?: ItemsOptions, ...items: Item[]);
        options: ItemsOptions;
        i18n: BundleofI18nBundle<Locale>;
    }

    interface ModResolveable {
        uniqueName: string;
        rank?: number;
    }

    interface Palette {
        /** Palette name (as seen in-game */
        name: string;
        /** Palette description */
        description: string;
    }

    interface PaletteEntry {
        palette: Palette;
        position: {
            /** Row position */
            row: number;
            /** Column position */
            col: number;
        };
    }

    class Pixel {
        constructor(hex: string);
        toJSON(): {
            hex: string;
            matches: PaletteEntry[];
            isTransparent: boolean;
        };
        get pallets(): string[];
        get matches(): PaletteEntry[];
        /** whether the pixel is transparent */
        get isTransparent(): boolean;
        get hex(): string;
    }

    interface ItemsOptions {
        category: Array<Category | 'SentinelWeapons'>;
        ignoreEnemies?: boolean;
        i18n?: boolean|string[];
        i18nOnObject?: boolean;
    }

    type Item =
        Extractor |
        Melee |
        Gun |
        SentinelWeapon |
        Warframe |
        Mod |
        SingleLevelMod |
        RivenMod |
        StanceMod |
        PrimeMod |
        RailjackMod |
        ModularPetPart |
        SolNode |
        Skin |
        Relic |
        EmptyRelic |
        Weapon |
        ExaltedWeapon |
        Resource |
        Arcane |
        Misc |
        MinimalItem |
        ModSet |
        FocusWay;

    type ModUnion = Mod | SingleLevelMod | RivenMod | StanceMod | PrimeMod | RailjackMod;

    type UniqueName = string;
    type DateString = string;

    interface MinimalItem {
        uniqueName: UniqueName;
        name: string;
        i18n?: I18nBundle<UniqueName>;
        type?: Type;
        category?: Category;
        tradable: boolean;
        patchlogs?: PatchLog[];
        imageName?: string;
        description?: string;
        releaseDate?: string;
        excludeFromCodex?: boolean;
        masterable: boolean;
    }
    interface BaseItem extends MinimalItem, Droppable {
        showInInventory?: boolean;
        conclave?: boolean;
        productCategory?: ProductCategory;
        rewardName?: string;
        tier?: number;
        primeOmegaAttenuation?: number;
        primeSellingPrice?: number;
        isPrime?: boolean;
        vaulted?: boolean;
        vaultDate?: DateString;
        estimatedVaultDate?: DateString;
        sentinel?: boolean;
        parents?: string[];
        color?: number;
        excludeFromCodex?: boolean;
    }
    interface Equippable {
        hexColours?: Colour[];
        polarities?: Polarity[];
        slot?: number;
    }
    interface Buildable {
        masteryReq?: number;
        buildPrice?: number;
        buildQuantity?: number;
        buildTime?: number;
        skipBuildTimePrice?: number;
        consumeOnBuild?: boolean;
        components?: Component[];
        marketCost?: number;
        bpCost?: number | '';
        itemCount?: number;
    }
    interface WikiaItem {
        wikiaThumbnail?: string;
        wikiaUrl?: string;
        tags?: Tag[];
        introduced?: Update;
    }
    interface Droppable {
        rarity?: Rarity;
        probability?: number;
        drops?: Drop[];
        tradable: boolean;
    }
    interface Attackable {
        totalDamage?: number;
        fireRate?: number;
        slot?: number;
        procChance?: number;
        omegaAttenuation?: number;
        accuracy?: number;
        criticalChance?: number;
        criticalMultiplier?: number;
        noise?: Noise;
        ammo?: number | null;
        damage?: DamageTypes;
        attacks?: Attack[];
        damagePerShot?: number[];
        disposition?: Disposition;
    }
    interface Resource extends MinimalItem {
        fusionPoints: number;
    }

    interface Misc extends Equippable, Buildable, WikiaItem, Droppable, Attackable, BaseItem {}
    interface Melee extends Weapon {
        category: 'Melee' | 'Arch-Melee';
        stancePolarity?: Polarity;
        spinAttack?: number;
        leapAttack?: number;
        wallAttack?: number;
        channeling?: number;
        blockingAngle?: number;
        comboDuration?: number;
        followThrough?: number;
        range?: number;
        slamAttack?: number;
        slamRadialDamage?: number;
        slamRadius?: number;
        slideAttack?: number;
        heavyAttackDamage?: number;
        heavySlamAttack?: number;
        heavySlamRadialDamage?: number;
        heavySlamRadius?: number;
        windUp?: number;
        channelingDrain?: number;
        channelingDamageMultiplier?: number;
        chargeAttack?: number;
        chargeTime?: number;
    }
    interface Gun extends Weapon {
        category: 'Primary' | 'Secondary' | 'Arch-Gun';
        magazineSize?: number;
        reloadTime?: number;
        projectile?: Projectile;
        flight?: number | '???';
    }
    interface SentinelWeapon extends Omit<Melee, 'category'> {
        sentinel: true;
        productCategory: 'SentinelWeapons';
        category: 'Primary';
    }
    interface ExaltedWeapon extends Omit<Gun, 'category'>, Omit<Melee, 'category'>, Omit<Weapon, 'category'> {
        category: 'Misc';
        type: 'Exalted Weapon';
    }
    interface Weapon extends Equippable, Buildable, Attackable, WikiaItem, BaseItem {
        category: Gun['category'] | Melee['category'];
        fusionLimit?: number;
        secondsPerShot?: number;
        damagePerSecond?: number;
        trigger?: Trigger;
        damageTypes?: DamageTypes;
        areaAttack?: AreaAttack;
        secondary?: Secondary;
        secondaryArea?: SecondaryArea;
        statusChance?: number;
        multishot?: number;
        attacks?: Attack[];
        maxLevelCap?: number;
    }
    interface Arcane extends Buildable, Partial<Omit<Mod, 'category' | 'type'>> {
        category: 'Arcanes';
        type: 'Arcane';
        drops?: Drop[];
        levelStats?: LevelStat[];
    }
    interface StanceMod extends Omit<Mod, 'levelStats'> {
        type: 'Stance Mod';
    }
    interface RailjackMod extends Omit<Mod, 'levelStats'> {
        upgradeEntries?: UpgradeEntry[];
        category: 'Mods';
        type: 'Railjack Mod';
    }
    interface RivenMod extends Omit<Mod, 'levelStats' | 'type' | 'category' | 'polarity'> {
        category: 'Mods' | 'Misc';
        type: 'Riven Mod' | `${WeaponType} Riven Mod`;
        availableChallenges?: AvailableChallenge[];
        upgradeEntries?: UpgradeEntry[];
        polarity?: Polarity;
    }
    interface SingleLevelMod extends Omit<Mod, 'levelStats'> {}
    interface FocusWay extends Omit<Mod, 'type'> {
        type: 'Focus Way'
    }
    interface ModSet extends MinimalItem, Droppable {
        category: 'Mods';
        stats: string[];
        numUpgradesInSet: number;
        buffSet?: true;
        type: 'Mod Set Mod';
        isPrime: false;
    }
    type ModType =
        'Railjack' |
        'Necramech' |
        'Warframe' |
        'Secondary' |
        'Melee' |
        'Companion' |
        'Primary' |
        'K-Drive' |
        'Riven' |
        'Archwing' |
        'Arch-Melee' |
        'Arch-Gun' |
        'Shotgun' |
        'Creature' |
        'Stance' |
        'Parazon' |
        'Transmutation' |
        'Peculiar' |
        'Plexus';
    interface Mod extends MinimalItem, WikiaItem, Droppable {
        baseDrain: number;
        category: 'Mods';
        compatName?: string;
        fusionLimit: number;
        isAugment?: boolean;
        isPrime: false;
        levelStats?: LevelStat[];
        polarity: Polarity;
        transmutable?: boolean;
        /** @deprecated probably replaced by Mod#isExilus */
        isUtility?: boolean;
        modSet?: UniqueName;
        isExilus?: boolean;
        modSetValues?: number[];
        type: `${ModType} Mod`;
    }
    interface PrimeMod extends Omit<Mod, 'isPrime'> { isPrime: true; }
    interface Warframe extends Equippable, Buildable, WikiaItem, BaseItem {
        category: 'Warframes' | 'Archwing' | 'Pets' | 'Sentinels';
        health: number;
        shield: number;
        armor: number;
        stamina: number;
        power: number;
        sprintSpeed?: number;
        abilities?: Ability[];
        aura?: Polarity;
        sex?: Sex;
        sprint?: number;
        passiveDescription?: string;
        maxLevelCap?: number;
        exalted?: Array<UniqueName>;
    }
    interface SolNode extends MinimalItem {
        category: 'Node';
        systemIndex: number;
        systemName: SystemName;
        nodeType: number;
        missionIndex: number;
        factionIndex?: number;
        minEnemyLevel: number;
        maxEnemyLevel: number;
        masteryReq: number;
        tradable: false;
        type: 'Node';
        drops?: Drop[];
    }
    interface Extractor extends MinimalItem, Buildable {
        category: 'Misc';
        binCount: number;
        binCapacity: number;
        fillRate: number;
        durability: number;
        repairRate: number;
        capacityMultiplier?: number[];
        specialities: string[];
    }
    interface Skin extends MinimalItem, Equippable {
        category: 'Skins';
        excludeFromCodex: true;
    }
    interface Relic extends MinimalItem {
        category: 'Relics';
        type: 'Relic';
        locations: Array<TitaniaRelicLocation>;
        rewards: Array<TitaniaRelicReward>;
        vaulted?: boolean;
        vaultDate?: string;
        marketInfo?: TitaniaWFMInfo | null;
        tradable: true;
        drops?: Drop[];
    }
    interface EmptyRelic extends Omit<Relic, 'marketInfo' | 'tradable' | 'vaultDate' | 'vaulted'> {
        tradable: false;
        locations: [];
        rewards: [];
        excludeFromCodex: true;
    }
    interface ModularPetPart extends MinimalItem, Droppable, Attackable, Equippable {
        category: 'Pets';
    }
    interface Component extends MinimalItem {
        itemCount: number;
        imageName: string;
        tradable: boolean;
        drops?: Drop[];
        secondsPerShot?: number;
        damagePerShot?: number[];
        magazineSize?: number;
        reloadTime?: number;
        totalDamage?: number;
        damagePerSecond?: number;
        trigger?: Trigger;
        accuracy?: number;
        criticalChance?: number;
        criticalMultiplier?: number;
        procChance?: number;
        fireRate?: number;
        chargeAttack?: number;
        spinAttack?: number;
        leapAttack?: number;
        wallAttack?: number;
        slot?: number;
        noise?: Noise;
        sentinel?: boolean;
        masteryReq?: number;
        omegaAttenuation?: number;
        ammo?: number | null;
        chargeTime?: number;
        damage?: DamageTypes;
        damageTypes?: DamageTypes;
        flight?: number;
        marketCost?: number;
        bpCost?: number | '';
        polarities?: Polarity[];
        stancePolarity?: Polarity;
        projectile?: Projectile;
        tags?: Tag[];
        type?: Type;
        vaulted?: boolean;
        wikiaThumbnail?: string;
        wikiaUrl?: string;
        disposition?: Disposition;
        ducats?: number;
        channeling?: number;
        channelingDrain?: number;
        channelingDamageMultiplier?: number;
        statusChance?: number;
        estimatedVaultDate?: string;
        vaultDate?: string;
        releaseDate?: string;
        excludeFromCodex?: boolean;
        productCategory?: ProductCategory;
        multishot?: number;
        primeSellingPrice?: number;
        blockingAngle?: number;
        comboDuration?: number;
        followThrough?: number;
        range?: number;
        slamAttack?: number;
        slamRadialDamage?: number;
        slamRadius?: number;
        slideAttack?: number;
        heavyAttackDamage?: number;
        heavySlamAttack?: number;
        heavySlamRadialDamage?: number;
        heavySlamRadius?: number;
        windUp?: number;
        introduced?: Update;
        attacks?: Attack[];
    }
    interface Secondary {
        name?: string;
        crit_chance?: number;
        crit_mult?: number;
        status_chance?: number;
        shot_type?: ShotType;
        shot_speed?: number | null;
        impact?: number;
        slash?: number;
        puncture?: number;
        speed?: number;
        charge_time?: number;
        pellet?: Pellet;
        toxin?: number;
        electricity?: number;
        damage?: DamageTypes;
        blast?: number;
        corrosive?: number;
        radiation?: number;
    }
    interface Attack {
        name: string;
        duration?: number;
        radius?: number;
        speed?: number;
        pellet?: Pellet;
        crit_chance?: number;
        crit_mult?: number;
        status_chance?: number;
        charge_time?: number;
        shot_type?: string;
        shot_speed?: number | null;
        flight?: number | string;
        falloff?: Falloff;
        damage: DamageTypes;
        slide?: string;
        jump?: string;
        wall?: string;
        channeling?: number;
        slam?: SlamAttack;
    }
    interface SlamAttack {
        damage: number | string;
        radial: RadialDamage;
    }
    interface RadialDamage {
        damage: number | string;
        element?: Element;
        proc?: Element;
        radius: number;
    }
    interface AreaAttack {
        name: string;
        status_chance?: number;
        radius?: number;
        blast?: number;
        heat?: number;
        radiation?: number;
        damage: string;
        pellet?: Pellet;
        duration?: number;
        speed?: number;
        falloff?: Falloff;
    }
    interface Falloff {
        start: number;
        end: number;
        reduction?: number;
    }
    interface SecondaryArea {
        name: string;
        status_chance?: number;
        radius?: number;
        blast?: number;
        heat?: number;
        radiation?: number;
        damage: string;
        pellet?: Pellet;
        duration?: number;
        speed?: number;
    }
    interface Ability {
        uniqueName: string;
        name: string;
        description: string;
        imageName: string;
    }
    interface AvailableChallenge {
        fullName: string;
        description: string;
        complications: Complication[];
    }
    interface Colour {
        value: string;
    }
    interface LevelStat {
        stats: string[];
    }
    interface Complication {
        fullName: string;
        description: string;
        overrideTag?: string;
    }
    interface DamageTypes {
        impact?: number;
        puncture?: number;
        slash?: number;
        toxin?: number;
        electricity?: number;
        blast?: number;
        radiation?: number;
        magnetic?: number;
        corrosive?: number;
        heat?: number;
        cold?: number;
        viral?: number;
        gas?: number;
        void?: number;
        tau?: number;
        true?: number;
        cinematic?: number;
        shieldDrain?: number;
        healthDrain?: number;
        energyDrain?: number;
        total?: number;
    }
    interface Drop {
        location: string;
        type: string;
        rarity?: Rarity;
        chance: number | null;
        rotation?: Rotation;
    }
    interface PatchLog {
        name: string;
        date: DateString;
        url: string;
        imgUrl?: string;
        additions: string;
        changes: string;
        fixes: string;
    }
    interface Pellet {
        name: string;
        count: number;
    }
    interface Update {
        name: string;
        url: string;
        aliases: string[];
        parent: string;
        date: DateString;
    }
    interface UpgradeEntry {
        tag: string;
        prefixTag: string;
        suffixTag: string;
        upgradeValues: UpgradeValue[];
    }
    interface UpgradeValue {
        value: number;
        locTag?: string;
        reverseValueSymbol?: boolean;
    }
    interface ItemI18n {
        name: string;
        description: string;
        passiveDescription?: string;
        abilities?: Ability[];
        trigger?: string;
        systemName?: string;
        levelStats: LevelStat[];
    }

    interface TitaniaRelicLocation {
        location: string;
        rarity: Rarity;
        chance: number;
    }
    interface TitaniaRelicReward {
        rarity: Rarity;
        chance: number;
        item: TitaniaRelicRewardItem;
    }
    interface TitaniaRelicRewardItem {
        uniqueName: string;
        name: string;
        warframeMarket?: TitaniaWFMInfo;
    }
    interface TitaniaWFMInfo {
        id: string;
        urlName: string
    }

    type I18nBundle<Locale> = {
        [Property in keyof Locale]: ItemI18n;
    };

    type BundleofI18nBundle<UniqueName> = {
        [Property in keyof UniqueName]: I18nBundle<Locale>;
    }

    type Locale =
        'de' |
        'fr' |
        'it' |
        'ko' |
        'es' |
        'zh' |
        'ru' |
        'ja' |
        'pl' |
        'pt' |
        'tc' |
        'th' |
        'tr' |
        'uk'

    type ProductCategory =
        'KubrowPets' |
        'LongGuns' |
        'MechSuits' |
        'Melee' |
        'OperatorAmps' |
        'Pistols' |
        'SentinelWeapons' |
        'Sentinels' |
        'SpaceGuns' |
        'SpaceMelee' |
        'SpaceSuits' |
        'SpecialItems' |
        'Suits'

    type Category =
        'All' |
        'Arcanes' |
        'Archwing' |
        'Fish' |
        'Gear' |
        'Glyphs' |
        'Misc' |
        'Mods' |
        'Node' |
        'Pets' |
        'Quests' |
        'Relics' |
        'Resources' |
        'Sentinels' |
        'Sigils' |
        'Skins' |
        'Warframes' |
        Weapon['category']

    /**
     * Riven disposition, a multiplier & range for omegaAttenuation
     */
    type Disposition = 1 | 2 | 3 | 4 | 5

    type Noise =
        'Alarming' |
        'Silent'

    type Polarity =
        'aura' |
        'madurai' |
        'naramon' |
        'penjaga' |
        'umbra' |
        'unairu' |
        'universal' |
        'vazarin' |
        'zenurik'

    type Projectile =
        'Discharge' |
        'Hitscan' |
        'Projectile' |
        'Thrown'

    type Rarity =
        'Common' |
        'Uncommon' |
        'Rare' |
        'Legendary'

    type Rotation =
        '(Extra)' |
        'A' |
        'Annihilation' |
        'Assassinate' |
        'B' |
        'C' |
        'Capture' |
        'Defense' |
        'Onslaught' |
        'rewards' |
        'Sabotage' |
        'Survival'

    type Sex = 'Male' | 'Female' | 'Androgynous' | 'Non-binary (Pluriform)';

    type ShotType =
        'Continuous' |
        'Hit-Scan' |
        'Projectile'

    type Tag =
        'Arbiters of Hexis' |
        'Baro' |
        'Cephalon' |
        'Cephalon Simaris' |
        'Cephalon Suda' |
        'Corpus' |
        'Dagath' |
        'Dax' |
        'Duviri' |
        'Entrati' |
        'Founder' |
        'Grineer' |
        'Incarnon' |
        'Infested' |
        'Invasion Reward' |
        'Kuva Lich' |
        'Lua' |
        'Never Vaulted' |
        'New Loka' |
        'Orokin' |
        'Perrin Sequence' |
        'The Perrin Sequence' |
        'Prime' |
        'Prisma' |
        'Red Veil' |
        'Sentient' |
        'Stalker' |
        'Steel Meridian' |
        'Syndicate' |
        'Tenet' |
        'Tenno' |
        'Tutorial' |
        'Voruna' |
        'Vandal' |
        'Vaulted' |
        'Wraith' |
        'Zariman'

    type Trigger =
        'Active' |
        'Auto' |
        'Auto Burst' |
        'Burst' |
        'Charge' |
        'Duplex' |
        'Held' |
        'Melee' |
        'Semi' |
        ''

    type Type =
        'Alloy' |
        'Arcade Minigame Unlock' |
        'Arcane' |
        'Archwing' |
        'Arm Cannon' |
        'Assault Saw' |
        'Aura' |
        'Ayatan Sculpture' |
        'Ayatan Star' |
        'Boosters' |
        'Bow' |
        'Captura' |
        'Cetus Bounty Rewards' |
        'Color Palette' |
        'Companion Weapon' |
        'Conservation Tag' |
        'Conservation Prey' |
        'Crossbow' |
        'Currency' |
        'Cut Gem' |
        'Dual Pistols' |
        'Dual Shotguns' |
        'Eidolon Shard' |
        'Emotes' |
        'Enemy Blueprint Tables' |
        'Enemy Mod Tables' |
        'Exalted Weapon' |
        'Extractor' |
        'Equipment Adapter' |
        'Fish' |
        'Fish Bait' |
        'Fish Part' |
        'Focus Lens' |
        'Fur Color' |
        'Fur Pattern' |
        'Gear' |
        'Gem' |
        'Glyph' |
        'Gunblade' |
        'Helminth Charger' |
        'K-Drive Component' |
        'Kavat' |
        'Key' |
        'Key Rewards' |
        'Kitgun Component' |
        'Kubrow' |
        'Launcher' |
        'Medallion' |
        'Misc' |
        'Mission Rewards' |
        'Mod Locations' |
        'Mod Set Mod' |
        'Node' |
        'Note Packs' |
        'Orbiter' |
        'Parazon' |
        'Pet Collar' |
        'Pet Resource' |
        'Pet Parts' |
        'Pets' |
        'Pistol' |
        'Plant' |
        'Primary' |
        'Relic' |
        'Relics' |
        'Resource' |
        'Rifle' |
        'Secondary' |
        'Sentinel' |
        'Ship Decoration' |
        'Ship Segment' |
        'Shotgun' |
        'Shotgun Sidearm' |
        'Sigil' |
        'Simulacrum' |
        'Skin' |
        'Skins' |
        'Sniper Rifle' |
        'Solaris Bounty Rewards' |
        'Sortie Rewards' |
        'Speargun' |
        'Specter' |
        'Syandana' |
        'Theme Background' |
        'Theme Sound' |
        'Themes' |
        'Thrown' |
        'Throwing' |
        'Transient Rewards' |
        'Transmutation Mod' |
        'Unique' |
        'Warframe' |
        'Zaw Component' |
        '---' | Mod['type'] | RivenMod['type'] | WeaponType | MeleeType;

    type MeleeType =
      'Blade And Whip' |
      'Blade and Whip' |
      'Claws' |
      'Dagger' |
      'Dual Daggers' |
      'Dual Swords' |
      'Fist' |
      'Glaive' |
      'Hammer' |
      'Heavy Blade' |
      'Machete' |
      'Melee' |
      'Nikana' |
      'Nunchaku' |
      'Polearm' |
      'Rapier' |
      'Scythe' |
      'Sparring' |
      'Staff' |
      'Sword' |
      'Sword And Shield' |
      'Sword and Shield' |
      'Tonfa' |
      'Two-Handed Nikana' |
      'Warfan' |
      'Whip' |
      'Zaw Dagger / Staff' |
      'Zaw Machete / Hammer' |
      'Zaw Machete / Polearm' |
      'Zaw Nikana / Staff' |
      'Zaw Rapier / Polearm' |
      'Zaw Scythe / Heavy Blade' |
      'Zaw Scythe / Staff' |
      'Zaw Sword / Polearm' |
      'Zaw Sword / Staff';

    type WeaponType =
        'Amp' |
        'Arch-Gun' |
        'Arch-Melee' |
        'Rifle' |
        'Pistol' |
        'Melee' |
        'Orb' |
        'Shotgun' |
        'Kitgun' |
        'Companion Weapon' |
        'Zaw';

    type SystemName = 'Mercury' |
        'Venus' |
        'Earth' |
        'Lua' |
        'Mars' |
        'Deimos' |
        'Phobos' |
        'Ceres' |
        'Jupiter' |
        'Europa' |
        'Saturn' |
        'Uranus' |
        'Neptune' |
        'Pluto' |
        'Sedna' |
        'Eris' |
        'Kuva Fortress' |
        'Zariman' |
        'Void'|
        'Duviri';

    type Element = Capitalize<keyof DamageTypes>;
}
