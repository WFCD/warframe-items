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

/**
 * @typedef {object} WikiaAttack
 * @property {string} name - name of the attack
 * @property {number} [duration] - duration of the attack
 * @property {number} [radius] - radius of the attack
 * @property {number} [speed] - speed of the attack
 * @property {object} [pellet] - pellet stats
 * @property {string} [pellet.name] - name of the pellet
 * @property {number} [pellet.count] - number of pellets
 * @property {number} [crit_chance] - crit chance of the attack
 * @property {number} [crit_mult] - crit multiplier of the attack
 * @property {number} [status_chance] - status chance of the attack
 * @property {number} [charge_time] - charge time of the attack
 * @property {string} [shot_type] - type of shot
 * @property {number} [shot_speed] - speed of the shot
 * @property {number} [flight] - flight speed of the shot
 * @property {object} [falloff] - falloff stats
 * @property {number} [falloff.start] - start of the falloff
 * @property {number} [falloff.end] - end of the falloff
 * @property {number} [falloff.reduction] - reduction of the falloff
 * @property {Record<string, number>} damage - damage types and their values
 */

/**
 * Parse attack to clean attack stats
 * @param {Object} Attack - raw attack data
 * @returns {WikiaAttack}
 */
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

/**
 * @typedef {object} SlamAttack
 * @property {string} damage - slam damage
 * @property {object} radial - radial attack stats
 * @property {string} radial.damage - radial damage
 * @property {string} [radial.element] - element type
 * @property {string} [radial.proc] - proc type
 * @property {number} radial.radius - radius of the radial attack
 */

/**
 * Parse slam to clean slam stats
 * @param {string} SlamAttack - slam damage
 * @param {string} SlamRadialDmg  - radial damage
 * @param {string} SlamRadialElement - element type
 * @param {string} SlamRadialProc - proc type
 * @param {string} SlamRadius   - slam radius
 * @returns {SlamAttack}
 */
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

/**
 * @typedef {object} WikiaWeapon
 * @property {string} regex - regex to match the weapon name
 * @property {string} name - name of the weapon
 * @property {string} url - url to the weapon's wiki page
 * @property {number} mr - mastery rank required to use the weapon
 * @property {string} type - type of weapon
 * @property {number} riven_disposition - riven disposition of the weapon
 * @property {number} status_chance - status chance of the weapon
 * @property {number} ammo - max ammo of the weapon
 * @property {string[]} polarities - polarities of the weapon
 * @property {string[]} tags - tags of the weapon
 * @property {boolean} vaulted - whether the weapon is vaulted
 * @property {string} introduced - when the weapon was introduced
 * @property {string} marketCost - market cost of the weapon
 * @property {string} bpCost - blueprint cost of the weapon
 * @property {string} thumbnail - url to the weapon's thumbnail
 * @property {Array<WikiaAttack>} attacks - list of attacks the weapon has
 * @property {object} [attacks.slide] - slide attack stats
 * @property {object} [attacks.jump] - jump attack stats
 * @property {object} [attacks.wall]
 * @property {number} [attacks.channeling]
 * @property {SlamAttack} [attacks.slam]
 */

/**
 * @typedef {object} OldWeapon
 */

/**
 * @typedef {object} Blueprint
 * @property {string} MarketCost
 * @property {string} BPCost
 */

/**
 * Parse raw weapon data to a clean weapon object
 * @param {Object} oldWeapon - raw weapon data
 * @param {Record<string, string>} imageUrls - image urls
 * @param {Record<string, Blueprint>} blueprints - blueprint data
 * @returns {undefined|WikiaWeapon}
 */
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
