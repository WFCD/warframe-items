import ELEMENTS from './elements.mjs';
import transformPolarity from './transformPolarity.mjs';

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

const parseAttack = (Attack) => {
  const attack = {
    name: Attack.AttackName,
    duration: Attack && Attack.Duration && Number((Number(Attack.Duration) * 100).toFixed(2)),
    radius: Attack && Attack.Radius && Number((Number(Attack.Radius) * 100).toFixed(2)),
    speed: (Attack && Attack.FireRate) || undefined,
    pellet: Attack.PelletName && {
      name: Attack.PelletName,
      count: Attack.PelletCount,
    },
    crit_chance: Attack.CritChance && Number((Number(Attack.CritChance) * 100).toFixed(2)),
    crit_mult: Attack.CritMultiplier && Number(Number(Attack.CritMultiplier).toFixed(1)),
    status_chance: Attack && Attack.StatusChance && Number((Number(Attack.StatusChance) * 100).toFixed(2)),
    charge_time: Attack.ChargeTime && Number(Number(Attack.ChargeTime).toFixed(1)),
    shot_type: Attack.ShotType,
    shot_speed: Attack.ShotSpeed && Number(Number(Attack.ShotSpeed).toFixed(1)),
    ...(Attack.ShotSpeed && {
      flight: Number(Attack.ShotSpeed) || '???',
    }),
    ...(Attack.Falloff && {
      falloff: {
        start: Attack.Falloff.StartRange && Number(Attack.Falloff.StartRange),
        end: Attack.Falloff.EndRange && Number(Attack.Falloff.EndRange),
        reduction: Attack.Falloff.Reduction && Number(Attack.Falloff.Reduction),
      },
    }),
    damage: {},
  };

  if (!Number.isFinite(attack.speed)) attack.speed = undefined;

  // Convert damage numbers and names
  if (Attack.Damage) {
    damageTypes.forEach((damageType) => {
      attack.damage[damageType.toLowerCase()] = Attack.Damage[damageType]
        ? Number(Attack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1'))
        : undefined;
    });
  }
  return attack;
};

const parseSlam = ({ SlamAttack, SlamRadialDmg, SlamRadialElement, SlamRadialProc, SlamRadius }) => {
  return {
    damage: Number(SlamAttack || 0).toFixed(2),
    radial: {
      damage: Number(SlamRadialDmg || 0).toFixed(2),
      element: SlamRadialElement && String(SlamRadialElement),
      proc: SlamRadialProc && String(SlamRadialProc),
      radius: Number(SlamRadius),
    },
  };
};

export default (oldWeapon, imageUrls, blueprints) => {
  let newWeapon;
  if (!oldWeapon || !oldWeapon.Name) {
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
    } = oldWeapon;

    newWeapon = {
      regex: `^${Name.toLowerCase().replace(/\s/g, '\\s')}$`,
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      mr: Mastery || 0,
      type: Class || Type,
      riven_disposition: Disposition,
      ...(ChargeAttack &&
        ChargeAttack.StatusChance && { status_chance: Number((Number(ChargeAttack.StatusChance) * 100).toFixed(2)) }),
      polarities: Polarities,
      ...(MaxAmmo && { ammo: MaxAmmo }),
      tags: Traits || [],
      vaulted: (Traits || []).includes('Vaulted'),
      introduced: Introduced,
      marketCost: blueprints[Name] && blueprints[Name].MarketCost,
      bpCost: blueprints[Name] && blueprints[Name].BPCost,
      thumbnail: imageUrls[Image] || imageUrls[Image.replace(/_/g, ' ')],
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
        .concat(Attacks.map(parseAttack))
        .filter((a) => a),
    };

    if (newWeapon.attacks[0]) {
      newWeapon.attacks[0] = {
        ...newWeapon.attacks[0],
        slide: SlideAttack && `${SlideAttack}${SlideElement ? ELEMENTS[SlideElement] : ''}`,
        jump: JumpAttack && `${JumpAttack}${JumpElement ? ELEMENTS[JumpElement] : ''}`,
        wall: WallAttack && `${WallAttack}${WallElement ? ELEMENTS[WallElement] : ''}`,
        channeling: SlideAttack && JumpAttack && WallAttack && Number(ChannelMult || 1.5),
        slam: SlamAttack && parseSlam(oldWeapon),
      };
    }

    newWeapon = transformPolarity(oldWeapon, newWeapon);
  } catch (error) {
    console.error(`Error parsing ${oldWeapon.Name}`);
    console.error(error);
  }

  return newWeapon;
};
