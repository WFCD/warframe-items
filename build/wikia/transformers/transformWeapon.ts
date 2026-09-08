import ELEMENTS from './elements';
import transformPolarity from './transformPolarity';
import type { WikiaWeapon, Blueprint } from '../../types/shared';

const damageTypes = [
  'Impact',
  'Slash',
  'Puncture',
  'Heat',
  'Cold',
  'Electricity',
  'Toxin',
  'Viral',
  'Corrosive',
  'Radiation',
  'Blast',
  'Magnetic',
  'Gas',
  'Void',
];

interface WikiaAttack {
  name?: string;
  duration?: number;
  radius?: number;
  speed?: number;
  pellet?: {
    name: string;
    count: number;
  };
  crit_chance?: number;
  crit_mult?: number;
  status_chance?: number;
  charge_time?: number;
  shot_type?: string;
  shot_speed?: number;
  flight?: number | string;
  falloff?: {
    start?: number;
    end?: number;
    reduction?: number;
  };
  damage: Record<string, number | undefined>;
  slide?: string;
  jump?: string;
  wall?: string;
  channeling?: number;
  slam?: SlamAttack;
}

interface SlamAttack {
  damage: string;
  radial: {
    damage: string;
    element?: string;
    proc?: string;
    radius: number;
  };
}

interface AttackData {
  AttackName?: string;
  Duration?: number;
  Radius?: number;
  FireRate?: number;
  PelletName?: string;
  PelletCount?: number;
  CritChance?: number;
  CritMultiplier?: number;
  StatusChance?: number;
  ChargeTime?: number;
  ShotType?: string;
  ShotSpeed?: number;
  Falloff?: {
    StartRange?: number;
    EndRange?: number;
    Reduction?: number;
  };
  Damage?: Record<string, number>;
}

interface OldWeapon {
  Name?: string;
  Mastery?: number;
  Type?: string;
  Class?: string;
  NormalAttack?: AttackData;
  MaxAmmo?: number;
  Disposition?: number;
  SlideAttack?: string;
  SlideElement?: string;
  JumpAttack?: string;
  JumpElement?: string;
  WallAttack?: string;
  WallElement?: string;
  Polarities?: string[];
  ChannelMult?: number;
  Image?: string;
  ChargeAttack?: AttackData;
  SecondaryAttack?: AttackData;
  SecondaryAreaAttack?: AttackData;
  Traits?: string[];
  AreaAttack?: AttackData;
  Introduced?: string;
  SlamAttack?: string;
  SlamRadialDmg?: string;
  SlamRadialElement?: string;
  SlamRadialProc?: string;
  SlamRadius?: string;
  Attack1?: AttackData;
  Attack2?: AttackData;
  Attack3?: AttackData;
  Attack4?: AttackData;
  Attack5?: AttackData;
  Attack6?: AttackData;
  Attack7?: AttackData;
  Attack8?: AttackData;
  Attack9?: AttackData;
  Attack10?: AttackData;
  Attacks?: AttackData[];
  InternalName?: string;
  Slot?: number;
  [key: string]: unknown;
}

/**
 * Parse attack to clean attack stats
 * @param Attack - raw attack data
 * @returns clean attack object
 */
const parseAttack = (Attack: AttackData): WikiaAttack => {
  const attack: WikiaAttack = {
    name: Attack.AttackName,
    duration: Attack.Duration ? Number((Attack.Duration * 100).toFixed(2)) : undefined,
    radius: Attack.Radius ? Number((Attack.Radius * 100).toFixed(2)) : undefined,
    speed: Attack.FireRate ?? undefined,
    pellet:
      Attack.PelletName && Attack.PelletCount
        ? {
            name: Attack.PelletName,
            count: Attack.PelletCount,
          }
        : undefined,
    crit_chance: Attack.CritChance != null ? Number((Attack.CritChance * 100).toFixed(2)) : undefined,
    crit_mult: Attack.CritMultiplier != null ? Number(Attack.CritMultiplier.toFixed(1)) : undefined,
    status_chance: Attack.StatusChance != null ? Number((Attack.StatusChance * 100).toFixed(2)) : undefined,
    charge_time: Attack.ChargeTime != null ? Number(Attack.ChargeTime.toFixed(1)) : undefined,
    shot_type: Attack.ShotType,
    shot_speed: Attack.ShotSpeed && Number(Attack.ShotSpeed.toFixed(1)),
    ...(Attack.ShotSpeed && {
      flight: Attack.ShotSpeed,
    }),
    ...(Attack.Falloff && {
      falloff: {
        start: Attack.Falloff.StartRange,
        end: Attack.Falloff.EndRange,
        reduction: Attack.Falloff.Reduction,
      },
    }),
    damage: {},
  };

  if (!Number.isFinite(attack.speed)) attack.speed = undefined;

  // Convert damage numbers and names
  if (Attack.Damage) {
    damageTypes.forEach((damageType) => {
      attack.damage[damageType.toLowerCase()] = Attack.Damage?.[damageType]
        ? Number(Attack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1'))
        : undefined;
    });
  }
  return attack;
};

/**
 * Parse slam to clean slam stats
 * @param slamData - slam attack data
 * @returns clean slam object
 */
const parseSlam = ({
  SlamAttack,
  SlamRadialDmg,
  SlamRadialElement,
  SlamRadialProc,
  SlamRadius,
}: OldWeapon): SlamAttack => {
  return {
    damage: Number(SlamAttack ?? 0).toFixed(2),
    radial: {
      damage: Number(SlamRadialDmg ?? 0).toFixed(2),
      element: SlamRadialElement,
      proc: SlamRadialProc,
      radius: Number(SlamRadius),
    },
  };
};

/**
 * Parse raw weapon data to a clean weapon object
 * @param oldWeapon - raw weapon data
 * @param imageUrls - image urls
 * @param blueprints - blueprint data
 * @returns clean weapon object
 */
export default async (
  oldWeapon: OldWeapon,
  imageUrls: Record<string, string>,
  blueprints: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WikiaWeapon | undefined> => {
  let newWeapon: WikiaWeapon | undefined;
  if (!oldWeapon.Name) {
    return undefined;
  }
  try {
    const {
      Mastery,
      Type,
      Class,
      NormalAttack,
      MaxAmmo,
      Disposition,
      SlideAttack,
      SlideElement,
      JumpAttack,
      JumpElement,
      WallAttack,
      WallElement,
      Polarities,
      ChannelMult,
      Image,
      ChargeAttack,
      SecondaryAttack,
      SecondaryAreaAttack,
      Traits,
      AreaAttack,
      Introduced,
      Name,
      SlamAttack,
      Attack1,
      Attack2,
      Attack3,
      Attack4,
      Attack5,
      Attack6,
      Attack7,
      Attack8,
      Attack9,
      Attack10,
      Attacks,
      InternalName,
      Slot,
    } = oldWeapon;

    newWeapon = {
      regex: `^${Name.toLowerCase().replace(/\s/g, '\\s')}$`,
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      mr: Mastery ?? 0,
      type: Class ?? Type,
      class: Class,
      riven_disposition: Disposition,
      ...(ChargeAttack?.StatusChance && {
        status_chance: Number((ChargeAttack.StatusChance * 100).toFixed(2)),
      }),
      polarities: Polarities,
      ...(MaxAmmo && { ammo: MaxAmmo }),
      tags: Traits ?? [],
      vaulted: (Traits ?? []).includes('Vaulted'),
      introduced: Introduced,
      marketCost:
        blueprints[Name] && typeof (blueprints[Name] as Blueprint).MarketCost === 'number'
          ? ((blueprints[Name] as Blueprint).MarketCost as number)
          : undefined,
      bpCost:
        blueprints[Name] && typeof (blueprints[Name] as Blueprint).BPCost === 'number'
          ? ((blueprints[Name] as Blueprint).BPCost as number)
          : undefined,
      thumbnail: imageUrls[Image ?? ''] ?? imageUrls[(Image ?? '').replace(/_/g, ' ')],
      slot: Slot,
      attacks: [
        NormalAttack && parseAttack(NormalAttack),
        Attack1 && parseAttack(Attack1),
        Attack2 && parseAttack(Attack2),
        Attack3 && parseAttack(Attack3),
        Attack4 && parseAttack(Attack4),
        Attack5 && parseAttack(Attack5),
        Attack6 && parseAttack(Attack6),
        Attack7 && parseAttack(Attack7),
        Attack8 && parseAttack(Attack8),
        Attack9 && parseAttack(Attack9),
        Attack10 && parseAttack(Attack10),
        SecondaryAreaAttack && parseAttack(SecondaryAreaAttack),
        SecondaryAttack && parseAttack(SecondaryAttack),
        ChargeAttack && parseAttack(ChargeAttack),
        AreaAttack && parseAttack(AreaAttack),
      ]
        .concat((Attacks ?? []).map(parseAttack))
        .filter((a): a is WikiaAttack => Boolean(a)),
    };

    if (newWeapon.attacks?.[0]) {
      newWeapon.attacks[0] = {
        ...newWeapon.attacks[0],
        slide: SlideAttack ? `${SlideAttack}${SlideElement ? (ELEMENTS[SlideElement] ?? '') : ''}` : undefined,
        jump: JumpAttack ? `${JumpAttack}${JumpElement ? (ELEMENTS[JumpElement] ?? '') : ''}` : undefined,
        wall: WallAttack ? `${WallAttack}${WallElement ? (ELEMENTS[WallElement] ?? '') : ''}` : undefined,
        channeling: SlideAttack && JumpAttack && WallAttack ? (ChannelMult ?? 1.5) : undefined,
        slam: SlamAttack ? parseSlam(oldWeapon) : undefined,
      };
    }

    newWeapon = transformPolarity(oldWeapon, newWeapon);
  } catch (error) {
    console.error(`Error parsing ${oldWeapon.Name}`);
    console.error(error);
  }

  return newWeapon;
};
