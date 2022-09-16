declare module 'warframe-items' {
    export default class Items extends Array<Item>{
        constructor(options: ItemsOptions, ...items: Item[]);
        options: ItemsOptions;
        i18n: BundleofI18nBundle<Locale>;
    }

    interface ItemsOptions {
        category: Array<Category | 'SentinelWeapons'>;
        ignoreEnemies?: boolean;
        i18n?: boolean|string[];
        i18nOnObject?: boolean;
    }

    type UniqueName = string;
    type DateString = string;

    interface Item {
        uniqueName: UniqueName;
        name: string;
        polarity?: Polarity;
        rarity?: Rarity;
        baseDrain?: number;
        fusionLimit?: number;
        upgradeEntries?: UpgradeEntry[];
        availableChallenges?: AvailableChallenge[];
        secondsPerShot?: number;
        damagePerShot?: number[];
        magazineSize?: number;
        reloadTime?: number;
        totalDamage?: number;
        damagePerSecond?: number;
        trigger?: Trigger;
        description?: string;
        hexColours?: Colour[];
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
        channelingDrain?: number;
        channelingDamageMultiplier?: number;
        buildPrice?: number;
        buildTime?: number;
        skipBuildTimePrice?: number;
        buildQuantity?: number;
        consumeOnBuild?: boolean;
        components?: Component[];
        type?: Type;
        imageName?: string;
        category: Category;
        tradable: boolean;
        drops?: Drop[];
        patchlogs?: PatchLog[];
        channeling?: number;
        ammo?: number | null;
        damage?: number | string;
        damageTypes?: DamageTypes;
        marketCost?: number | '';
        bpCost?: number | '';
        flight?: number | '???';
        polarities?: Polarity[];
        projectile?: Projectile;
        stancePolarity?: Polarity;
        tags?: Tag[];
        vaulted?: boolean | 'N/A';
        wikiaThumbnail?: string;
        wikiaUrl?: string;
        disposition?: Disposition;
        health?: number;
        shield?: number;
        armor?: number;
        stamina?: number;
        power?: number;
        sprintSpeed?: number;
        abilities?: Ability[];
        itemCount?: number;
        parents?: string[];
        releaseDate?: string;
        vaultDate?: DateString;
        estimatedVaultDate?: DateString;
        aura?: Polarity;
        conclave?: boolean;
        color?: number;
        sex?: Sex;
        sprint?: number;
        passiveDescription?: string;
        areaAttack?: AreaAttack;
        secondary?: Secondary;
        secondaryArea?: SecondaryArea;
        statusChance?: number;
        binCount?: number;
        binCapacity?: number;
        fillRate?: number;
        durability?: number;
        repairRate?: number;
        capacityMultiplier?: number[];
        specialities?: string[];
        showInInventory?: boolean;
        systemIndex?: number;
        systemName?: string;
        nodeType?: number;
        missionIndex?: number;
        factionIndex?: number;
        minEnemyLevel?: number;
        maxEnemyLevel?: number;
        compatName?: string;
        isAugment?: boolean;
        transmutable?: boolean;
        productCategory?: ProductCategory;
        multishot?: number;
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
        isUtility?: boolean;
        modSet?: string;
        rewardName?: string;
        tier?: number;
        probability?: number;
        isExilus?: boolean;
        fusionPoints?: number;
        chargeTime?: number;
        exalted?: string[];
        primeOmegaAttenuation?: number;
        primeSellingPrice?: number;
        maxLevelCap?: number;
        modSetValues?: number[];
        excludeFromCodex?: boolean;
        levelStats?: LevelStat[];
        introduced?: Update;
        attacks?: Attack[];
        i18n?: I18nBundle<UniqueName>;
        isPrime?: boolean;
    }

    interface Component {
        uniqueName: string;
        name: string;
        description?: string;
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
        damage?: number | string;
        damageTypes?: DamageTypes;
        flight?: number;
        marketCost?: number | '';
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
        name: string;
        description: string;
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
        void?: number
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
        'Arch-Gun' |
        'Arch-Melee' |
        'Archwing' |
        'Fish' |
        'Gear' |
        'Glyphs' |
        'Melee' |
        'Misc' |
        'Mods' |
        'Node' |
        'Pets' |
        'Primary' |
        'Quests' |
        'Relics' |
        'Resources' |
        'Secondary' |
        'Sentinels' |
        'Sigils' |
        'Skins' |
        'Warframes'

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

    type Sex =
        'Male' |
        'Female' |
        'Androgynous'

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
        'Duviri' |
        'Entrati' |
        'Founder' |
        'Grineer' |
        'Incarnon' |
        'Infested' |
        'Invasion Reward' |
        'Kuva Lich' |
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
        'Amp' |
        'Arcade Minigame Unlock' |
        'Arcane' |
        'Arch-Gun' |
        'Arch-Melee' |
        'Arch-Melee Mod' |
        'Archwing' |
        'Archwing Mod' |
        'Arm Cannon' |
        'Assault Saw' |
        'Aura' |
        'Ayatan Sculpture' |
        'Ayatan Star' |
        'Blade And Whip' |
        'Blade and Whip' |
        'Bow' |
        'Captura' |
        'Cetus Bounty Rewards' |
        'Claws' |
        'Color Palette' |
        'Companion Mod' |
        'Companion Weapon' |
        'Conservation Tag' |
        'Creature Mod' |
        'Crossbow' |
        'Currency' |
        'Cut Gem' |
        'Dagger' |
        'Dual Daggers' |
        'Dual Pistols' |
        'Dual Shotguns' |
        'Dual Swords' |
        'Eidolon Shard' |
        'Emotes' |
        'Enemy Blueprint Tables' |
        'Enemy Mod Tables' |
        'Exalted Weapon' |
        'Extractor' |
        'Fish' |
        'Fish Bait' |
        'Fish Part' |
        'Fist' |
        'Focus Lens' |
        'Fur Color' |
        'Fur Pattern' |
        'Gear' |
        'Gem' |
        'Glaive' |
        'Glyph' |
        'Gunblade' |
        'Hammer' |
        'Heavy Blade' |
        'Helminth Charger' |
        'K-Drive Component' |
        'K-Drive Mod' |
        'Kavat' |
        'Kavat Mod' |
        'Key' |
        'Key Rewards' |
        'Kitgun Component' |
        'Kubrow' |
        'Kubrow Mod' |
        'Launcher' |
        'Machete' |
        'Medallion' |
        'Melee' |
        'Melee Mod' |
        'Misc' |
        'Mission Rewards' |
        'Mod Locations' |
        'Necramech Mod' |
        'Nikana' |
        'Node' |
        'Note Packs' |
        'Nunchaku' |
        'Orbiter' |
        'Parazon' |
        'Pet Collar' |
        'Pet Resource' |
        'Pet Parts' |
        'Pets' |
        'Pistol' |
        'Plant' |
        'Polearm' |
        'Primary' |
        'Primary Mod' |
        'Railjack Mod' |
        'Rapier' |
        'Relic' |
        'Relics' |
        'Resource' |
        'Rifle' |
        'Riven Mod' |
        'Scythe' |
        'Secondary' |
        'Secondary Mod' |
        'Sentinel' |
        'Sentinel Mod' |
        'Ship Decoration' |
        'Ship Segment' |
        'Shotgun' |
        'Shotgun Mod' |
        'Shotgun Sidearm' |
        'Sigil' |
        'Simulacrum' |
        'Skin' |
        'Skins' |
        'Sniper Rifle' |
        'Solaris Bounty Rewards' |
        'Sortie Rewards' |
        'Sparring' |
        'Speargun' |
        'Specter' |
        'Staff' |
        'Stance' |
        'Sword' |
        'Sword And Shield' |
        'Sword and Shield' |
        'Syandana' |
        'Theme Background' |
        'Theme Sound' |
        'Themes' |
        'Thrown' |
        'Throwing' |
        'Tonfa' |
        'Transient Rewards' |
        'Two-Handed Nikana' |
        'Unique' |
        'Warfan' |
        'Warframe' |
        'Warframe Mod' |
        'Whip' |
        'Zaw Component' |
        'Zaw Dagger / Staff' |
        'Zaw Machete / Hammer' |
        'Zaw Machete / Polearm' |
        'Zaw Nikana / Staff' |
        'Zaw Rapier / Polearm' |
        'Zaw Scythe / Heavy Blade' |
        'Zaw Scythe / Staff' |
        'Zaw Sword / Polearm' |
        'Zaw Sword / Staff' |
        '---'

    type Element = Capitalize<keyof DamageTypes>;
}
