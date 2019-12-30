const ELEMENTS = {
  Electricity: 'electricity',
  Corrosive: 'corrosive',
  Toxin: 'toxin',
  Heat: 'heat',
  Blast: 'blast',
  Radiation: 'radiation',
  Cold: 'cold',
  Viral: 'viral',
  Magnetic: 'magnetic',
  Gas: 'gas',
  Void: 'void'
}

const POLARITIES = {
  Bar: 'Naramon',
  V: 'Madurai',
  D: 'Vazarin',
  U: 'Umbra',
  Ability: 'Zenurik',
  R: 'Unairu'
}

const transformPolarities = ({ Polarities, StancePolarity }, targetWeapon) => {
  const outputWeapon = { ...targetWeapon }
  if (StancePolarity) {
    outputWeapon.stancePolarity = POLARITIES[StancePolarity]
  }
  if (Polarities) {
    outputWeapon.polarities = Polarities.map(polarity => POLARITIES[polarity])
  } else {
    outputWeapon.polarities = []
  }
  return outputWeapon
}

const transformWeapon = (oldWeapon, imageUrls) => {
  let newWeapon
  if (!oldWeapon || !oldWeapon.Name) {
    return undefined
  }
  try {
    const {
      Mastery,
      Type,
      Class,
      Cost,
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
      AreaAttack
    } = oldWeapon

    const { Name } = oldWeapon

    newWeapon = {
      regex: `^${Name.toLowerCase().replace(/\s/g, '\\s')}$`,
      name: Name,
      url: `http://warframe.fandom.com/wiki/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      mr: Mastery || 0,
      type: Class,
      riven_disposition: Disposition,
      ...(ChargeAttack && ChargeAttack.StatusChance) &&
        { status_chance: Number((Number(ChargeAttack.StatusChance) * 100).toFixed(2)) },
      polarities: Polarities,
      thumbnail: imageUrls[Image],
      ...MaxAmmo && { ammo: MaxAmmo },
      ...(NormalAttack && NormalAttack.ShotType) &&
        { projectile: NormalAttack.ShotType.replace(/Hit-scan/ig, 'Hitscan') },
      ...(ChargeAttack && ChargeAttack.ShotType) &&
        { projectile: ChargeAttack.ShotType.replace(/Hit-scan/ig, 'Hitscan') },
      tags: Traits || [],
      vaulted: (Traits || []).includes('Vaulted'),
      marketCost: Cost && Cost.MarketCost,
      bpCost: Cost && Cost.BPCost,
      pellet: {
        name: NormalAttack && NormalAttack.PelletName && String(NormalAttack.PelletName),
        count: NormalAttack && ((NormalAttack.PelletCount && Number(NormalAttack.PelletCount)) ||
          (NormalAttack.AttackName === 'Single Pellet' && 1))
      },
      ...(NormalAttack && NormalAttack.Falloff) && {
        falloff: {
          start: NormalAttack.Falloff.StartRange && Number(NormalAttack.Falloff.StartRange),
          end: NormalAttack.Falloff.EndRange && Number(NormalAttack.Falloff.EndRange),
          reduction: NormalAttack.Falloff.Reduction && Number(NormalAttack.Falloff.Reduction)
        }
      }
    }

    if (NormalAttack) {
      newWeapon.damage = Object.keys(NormalAttack.Damage).reduce(
        (sum, damageType) => NormalAttack.Damage[damageType] + sum,
        0
      ).toFixed(2).replace(/(\.[\d]+)0/, '$1')
    } else if (ChargeAttack) {
      newWeapon.damage = Number(Object.keys(ChargeAttack.Damage).reduce(
        (sum, damageType) => ChargeAttack.Damage[damageType] + sum,
        0
      ).toFixed(2).replace(/(\.[\d]+)0/, '$1'))
    }

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
      'Void'
    ]
    if (NormalAttack && NormalAttack.Damage) {
      damageTypes.forEach((damageType) => {
        newWeapon[damageType.toLowerCase()] = NormalAttack.Damage[damageType] ? Number(NormalAttack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1')) : undefined
      })
      Object.keys(ELEMENTS).forEach((element) => {
        if (NormalAttack.Damage[element]) {
          newWeapon.damage = `${NormalAttack.Damage[element].toFixed(2).replace(/(\.[\d]+)0/, '$1')} ${ELEMENTS[element]}`
        }
      })
    } else if (ChargeAttack && ChargeAttack.Damage) {
      newWeapon.chargeTime = Number(Number(ChargeAttack.ChargeTime))
      damageTypes.forEach((damageType) => {
        newWeapon[damageType.toLowerCase()] = ChargeAttack.Damage[damageType] ? Number(ChargeAttack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1')) : undefined
      })
    }

    if (SecondaryAreaAttack) {
      newWeapon.secondaryArea = {
        name: SecondaryAreaAttack.AttackName,
        status_chance: SecondaryAreaAttack && SecondaryAreaAttack.StatusChance &&
          Number((Number(SecondaryAreaAttack.StatusChance) * 100).toFixed(2)),
        duration: SecondaryAreaAttack && SecondaryAreaAttack.Duration &&
          Number((Number(SecondaryAreaAttack.Duration) * 100).toFixed(2)),
        radius: SecondaryAreaAttack && SecondaryAreaAttack.Radius &&
          Number((Number(SecondaryAreaAttack.Radius) * 100).toFixed(2)),
        speed: SecondaryAreaAttack && SecondaryAreaAttack.FireRate
      }

      if (SecondaryAreaAttack.PelletName) {
        newWeapon.secondaryArea.pellet = {
          name: SecondaryAreaAttack.PelletName,
          count: SecondaryAreaAttack.PelletCount
        }
      }

      // Convert damage numbers and names
      if (SecondaryAreaAttack.Damage) {
        damageTypes.forEach((damageType) => {
          newWeapon.secondaryArea[damageType.toLowerCase()] = SecondaryAreaAttack.Damage[damageType] ? Number(SecondaryAreaAttack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1')) : undefined
        })
        Object.keys(ELEMENTS).forEach((element) => {
          if (SecondaryAreaAttack.Damage[element]) {
            newWeapon.secondaryArea.damage = `${SecondaryAreaAttack.Damage[element].toFixed(2).replace(/(\.[\d]+)0/, '$1')} ${ELEMENTS[element]}`
          }
        })
      }
    }

    if (SecondaryAttack) {
      newWeapon.secondary = {
        name: SecondaryAttack.AttackName,
        speed: SecondaryAttack.FireRate,
        crit_chance: SecondaryAttack.CritChance &&
          Number((Number(SecondaryAttack.CritChance) * 100).toFixed(2)),
        crit_mult: SecondaryAttack.CritMultiplier &&
          Number(Number(SecondaryAttack.CritMultiplier).toFixed(1)),
        status_chance: SecondaryAttack && SecondaryAttack.StatusChance &&
          Number(Number(SecondaryAttack.StatusChance).toFixed(1)),
        charge_time: SecondaryAttack.ChargeTime &&
          Number(Number(SecondaryAttack.ChargeTime).toFixed(1)),
        shot_type: SecondaryAttack.ShotType,
        shot_speed: SecondaryAttack.ShotSpeed &&
          Number(Number(SecondaryAttack.ShotSpeed).toFixed(1)),
        ...(SecondaryAttack.PelletCount || SecondaryAttack.PelletName) && {
          pellet: {
            count: SecondaryAttack.PelletCount && Number(SecondaryAttack.PelletCount),
            name: SecondaryAttack.PelletName
          }
        },
        ...ChargeAttack && (ChargeAttack.PelletCount || ChargeAttack.PelletName) && {
          pellet: {
            name: ChargeAttack.PelletName && String(ChargeAttack.PelletName),
            count: ChargeAttack.PelletCount && Number(ChargeAttack.PelletCount)
          }
        },
        ...SecondaryAttack.Falloff && {
          falloff: {
            start: SecondaryAttack.Falloff.StartRange &&
              Number(SecondaryAttack.Falloff.StartRange),
            end: SecondaryAttack.Falloff.EndRange &&
              Number(SecondaryAttack.Falloff.EndRange),
            reduction: SecondaryAttack.Falloff.Reduction &&
              Number(SecondaryAttack.Falloff.Reduction)
          }
        },
        ...ChargeAttack && ChargeAttack.Falloff && {
          falloff: {
            start: ChargeAttack.Falloff.StartRange &&
              Number(ChargeAttack.Falloff.StartRange),
            end: ChargeAttack.Falloff.EndRange &&
              Number(ChargeAttack.Falloff.EndRange),
            reduction: ChargeAttack.Falloff.Reduction &&
              Number(ChargeAttack.Falloff.Reduction)
          }
        }
      }

      // Convert damage numbers and names
      if (SecondaryAttack.Damage) {
        damageTypes.forEach((damageType) => {
          newWeapon.secondary[damageType.toLowerCase()] = SecondaryAttack.Damage[damageType] ? Number(SecondaryAttack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1')) : undefined
        })
        Object.keys(ELEMENTS).forEach((element) => {
          if (SecondaryAttack.Damage[element]) {
            newWeapon.secondary.damage = `${SecondaryAttack.Damage[element].toFixed(2).replace(/(\.[\d]+)0/, '$1')} ${ELEMENTS[element]}`
          }
        })
      }
    }

    if (AreaAttack) {
      newWeapon.areaAttack = {
        name: AreaAttack.AttackName,
        speed: AreaAttack.FireRate,
        crit_chance: AreaAttack.CritChance &&
          Number((Number(AreaAttack.CritChance) * 100).toFixed(2)),
        crit_mult: AreaAttack.CritMultiplier &&
          Number(Number(AreaAttack.CritMultiplier).toFixed(1)),
        status_chance: AreaAttack && AreaAttack.StatusChance &&
          Number(Number(AreaAttack.StatusChance).toFixed(1)),
        charge_time: AreaAttack.ChargeTime &&
          Number(Number(AreaAttack.ChargeTime).toFixed(1)),
        shot_type: AreaAttack.ShotType,
        shot_speed: AreaAttack.ShotSpeed &&
          Number(Number(AreaAttack.ShotSpeed).toFixed(1)),
        ...(AreaAttack.PelletCount || AreaAttack.PelletName) && {
          pellet: {
            name: AreaAttack.PelletName && String(AreaAttack.PelletName),
            count: AreaAttack.PelletCount && Number(AreaAttack.PelletCount)
          }
        },
        ...AreaAttack.Falloff && {
          falloff: {
            start: AreaAttack.Falloff.StartRange &&
              Number(AreaAttack.Falloff.StartRange),
            end: AreaAttack.Falloff.EndRange &&
              Number(AreaAttack.Falloff.EndRange),
            reduction: AreaAttack.Falloff.Reduction &&
              Number(AreaAttack.Falloff.Reduction)
          }
        }
      }

      // Convert damage numbers and names
      if (AreaAttack.Damage) {
        damageTypes.forEach((damageType) => {
          newWeapon.areaAttack[damageType.toLowerCase()] = AreaAttack.Damage[damageType]
            ? Number(AreaAttack.Damage[damageType].toFixed(2).replace(/(\.[\d]+)0/, '$1'))
            : undefined
        })
        Object.keys(ELEMENTS).forEach((element) => {
          if (AreaAttack.Damage[element]) {
            newWeapon.areaAttack.damage = `${AreaAttack.Damage[element].toFixed(2).replace(/(\.[\d]+)0/, '$1')} ${ELEMENTS[element]}`
          }
        })
      }
    }

    if ((Type === 'Primary' || Type === 'Secondary') && NormalAttack) {
      newWeapon = {
        ...newWeapon,
        ...NormalAttack.ShotSpeed && {
          flight: Number(NormalAttack.ShotSpeed) || '???'
        }
      }
    } else if (Type === 'Melee') {
      newWeapon = {
        ...newWeapon,
        slide: `${SlideAttack}${SlideElement ? ELEMENTS[SlideElement] : ''}`,
        jump: `${JumpAttack}${JumpElement ? ELEMENTS[JumpElement] : ''}`,
        wall: `${WallAttack}${WallElement ? ELEMENTS[WallElement] : ''}`,
        channeling: ChannelMult || 1.5
      }
    }

    newWeapon = transformPolarities(oldWeapon, newWeapon)
  } catch (error) {
    console.error(`Error parsing ${oldWeapon.Name}`)
    console.error(error)
  }

  return newWeapon
}

module.exports = transformWeapon
