import assert from 'node:assert';

import parser from '../build/parser';
import { buildRaw } from './fixtures/wikia.fixture.mjs';

const findItem = (parsed, name) => parsed.data.flatMap((c) => c.data).find((i) => i.name === name);

/**
 * Public Export `damagePerShot` values, taken from WFCD/warframe-items#973.
 * Physical indices are Impact, Puncture, Slash.
 */
const weapons = [
  {
    name: 'Miter',
    uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Miter/Miter',
    damagePerShot: [12.5, 12.5, 225],
    dominant: 'slash',
  },
  {
    name: 'Dread',
    uniqueName: '/Lotus/Weapons/Tenno/Bows/DreadBow/DreadBow',
    damagePerShot: [16.800001, 16.800001, 302.39999],
    dominant: 'slash',
  },
  {
    name: 'Paris Prime',
    uniqueName: '/Lotus/Weapons/Tenno/Bows/PrimeParisBow/PrimeParisBow',
    damagePerShot: [9, 288, 63.000004],
    dominant: 'puncture',
  },
  {
    name: 'Boltor',
    uniqueName: '/Lotus/Weapons/Tenno/Rifle/BoltoRifle/BoltoRifle',
    damagePerShot: [2.5, 20, 2.499999],
    dominant: 'puncture',
  },
];

const parseWeapon = ({ name, uniqueName, damagePerShot }) => {
  const parsed = parser.parse(
    buildRaw({
      api: [
        {
          category: 'Weapons',
          data: [
            {
              name,
              uniqueName,
              slot: 1,
              damagePerShot,
              totalDamage: damagePerShot.reduce((sum, value) => sum + value, 0),
            },
          ],
        },
      ],
    })
  );

  return findItem(parsed, name)?.damage;
};

describe('addDamage', () => {
  weapons.forEach((weapon) => {
    it(`should map ${weapon.name} damage as primarily ${weapon.dominant}`, () => {
      const damage = parseWeapon(weapon);
      assert(damage, `${weapon.name} should have damage`);

      const [impact, puncture, slash] = weapon.damagePerShot;
      assert.strictEqual(damage.impact, impact);
      assert.strictEqual(damage.puncture, puncture);
      assert.strictEqual(damage.slash, slash);

      const highest = ['impact', 'puncture', 'slash'].reduce((a, b) => (damage[a] > damage[b] ? a : b));
      assert.strictEqual(highest, weapon.dominant, `${weapon.name} should be primarily ${weapon.dominant}`);
    });
  });

  it('should map elemental damage after the physical types', () => {
    const damage = parseWeapon({
      name: 'Ignis',
      uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Flamethrower/Flamethrower',
      damagePerShot: [0, 0, 0, 35],
    });

    assert.strictEqual(damage.heat, 35);
    assert.strictEqual(damage.cold, undefined);
  });

  it('should not add damage when every type is zero', () => {
    const damage = parseWeapon({
      name: 'Zero Weapon',
      uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Zero/Zero',
      damagePerShot: [0, 0, 0],
    });

    assert.strictEqual(damage, undefined);
  });
});
