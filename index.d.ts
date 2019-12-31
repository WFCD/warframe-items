declare module 'warframe-items' {
    export default class Items extends Array<Item>{
        constructor(options: ItemsOptions, ...items: Item[]);
    }

    interface ItemsOptions {
        category: Category[]
    }

    interface Item {
        uniqueName: string;
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
        imageName: string;
        category: Category;
        tradable: boolean;
        drops?: Drop[];
        patchlogs?: PatchLog[];
        channeling?: number;
        ammo?: number;
        damage?: number | string;
        damageTypes?: DamageTypes;
        marketCost?: number | '';
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
        vaultDate?: string;
        estimatedVaultDate?: string;
        aura?: Aura;
        conclave?: boolean;
        color?: number;
        introduced?: string;
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
        ammo?: number;
        chargeTime?: number;
        damage?: number | string;
        damageTypes?: DamageTypes;
        flight?: number;
        marketCost?: number;
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
        damage?: string;
        blast?: number;
        corrosive?: number;
        radiation?: number;
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
    }

    interface Drop {
        location: string;
        type: Type;
        rarity?: Rarity;
        chance: number | null;
        rotation?: Rotation;
    }

    interface PatchLog {
        name: string;
        date: string;
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

    interface UpgradeEntry {
        tag: string;
        prefixTag: string;
        suffixTag: string;
        upgradeValues: UpgradeValue[];
    }

    interface UpgradeValue {
        value: number;
        locTag?: string;
    }

    type Aura =
        'madurai' |
        'naramon' |
        'vazarin'

    type Category =
        'All' |
        'Arcanes' |
        'Archwing' |
        'Fish' |
        'Gear' |
        'Glyphs' |
        'Melee' |
        'Misc' |
        'Mods' |
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
        'Madurai' |
        'madurai' |
        'Naramon' |
        'naramon' |
        'Penjaga' |
        'Umbra' |
        'umbra' |
        'Unairu' |
        'Universal' |
        'Vazarin' |
        'vazarin' |
        'Zenurik'

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
        'Female'

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
        'Founder' |
        'Grineer' |
        'Infested' |
        'Invasion Reward' |
        'Never Vaulted' |
        'New Loka' |
        'Orokin' |
        'Perrin Sequence' |
        'The Perrin Sequence' |
        'Prime' |
        'Prisma' |
        'Red Veil' |
        'Sentient' |
        'Steel Meridian' |
        'Syndicate' |
        'Tenno' |
        'Tutorial' |
        'Vandal' |
        'Vaulted' |
        'Wraith'

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
        'Amp' |
        'Archwing' |
        'Aura' |
        'Blade and Whip' |
        'Bow' |
        'Cetus Bounty Rewards' |
        'Claws' |
        'Crossbow' |
        'Dagger' |
        'Dual Daggers' |
        'Dual Pistols' |
        'Dual Shotguns' |
        'Dual Swords' |
        'Eidolon Shard' |
        'Enemy Blueprint Tables' |
        'Enemy Mod Tables' |
        'Extractor' |
        'Fish' |
        'Fish Part' |
        'Fist' |
        'Focus Lens' |
        'Gear' |
        'Gem' |
        'Glaive' |
        'Glyph' |
        'Gunblade' |
        'Hammer' |
        'Heavy Blade' |
        'Kavat' |
        'Key' |
        'Key Rewards' |
        'Kitgun Component' |
        'Kubrow' |
        'Launcher' |
        'Machete' |
        'Medallion' |
        'Melee' |
        'Misc' |
        'Mission Rewards' |
        'Mod Locations' |
        'Nikana' |
        'Nunchaku' |
        'Orbiter' |
        'Pets' |
        'Pistol' |
        'Plant' |
        'Polearm' |
        'Primary' |
        'Rapier' |
        'Relic' |
        'Relics' |
        'Resource' |
        'Rifle' |
        'Scythe' |
        'Secondary' |
        'Sentinel' |
        'Ship Decoration' |
        'Ship Segment' |
        'Shotgun' |
        'Shotgun Sidearm' |
        'Sigil' |
        'Skin' |
        'Sniper Rifle' |
        'Solaris Bounty Rewards' |
        'Sortie Rewards' |
        'Sparring' |
        'Speargun' |
        'Specter' |
        'Staff' |
        'Stance' |
        'Sword' |
        'Sword and Shield' |
        'Thrown' |
        'Tonfa' |
        'Transient Rewards' |
        'Two-Handed Nikana' |
        'Warfan' |
        'Warframe' |
        'Whip' |
        '---'
}
