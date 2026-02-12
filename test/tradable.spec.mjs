import { assert } from 'chai';

import tradable from '../build/tradable.mjs';

/**
 * Helper to create a mock item with sensible defaults
 * @param {Partial<import('warframe-items').Item>} overrides
 * @returns {import('warframe-items').Item}
 */
const mockItem = (overrides) => ({
  name: 'Test Item',
  uniqueName: '/Lotus/Types/Test/TestItem',
  type: 'Rifle',
  ...overrides,
});

/**
 * Helper to create a mock item with tradable components (simulates a relic-farmed Prime)
 * @param {string} name
 * @param {string} type
 * @returns {import('warframe-items').Item}
 */
const mockPrimeWithComponents = (name, type) =>
  mockItem({
    name,
    type,
    uniqueName: `/Lotus/Types/Test/${name.replace(/\s/g, '')}`,
    components: [
      { name: 'Blueprint', tradable: true },
      { name: 'Barrel', tradable: true },
      { name: 'Receiver', tradable: true },
      { name: 'Orokin Cell', tradable: false },
    ],
  });

describe('tradable', () => {
  describe('standard relic-farmed Prime items', () => {
    it('should mark Prime warframes with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Ash Prime', 'Warframe');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime rifles with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Acceltra Prime', 'Rifle');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime pistols with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Akjagara Prime', 'Pistol');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime melee with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Nikana Prime', 'Melee');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime shotguns with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Corinth Prime', 'Shotgun');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime bows with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Cernos Prime', 'Bow');
      assert.isTrue(tradable(item));
    });
    it('should mark Prime snipers with tradable components as tradable', () => {
      const item = mockPrimeWithComponents('Rubico Prime', 'Sniper');
      assert.isTrue(tradable(item));
    });
  });

  describe('Founders-exclusive items (no components)', () => {
    it('should mark Excalibur Prime as not tradable', () => {
      const item = mockItem({ name: 'Excalibur Prime', type: 'Warframe' });
      assert.isFalse(tradable(item));
    });
    it('should mark Lato Prime as not tradable', () => {
      const item = mockItem({ name: 'Lato Prime', type: 'Pistol' });
      assert.isFalse(tradable(item));
    });
    it('should mark Skana Prime as not tradable', () => {
      const item = mockItem({ name: 'Skana Prime', type: 'Melee' });
      assert.isFalse(tradable(item));
    });
  });

  describe('explicit override lists', () => {
    it('should mark Gotva Prime as tradable (Baro weapon, no components)', () => {
      const item = mockItem({ name: 'Gotva Prime', type: 'Rifle' });
      assert.isTrue(tradable(item));
    });
    it('should mark Galariak Prime as not tradable (quest-locked)', () => {
      const item = mockPrimeWithComponents('Galariak Prime', 'Melee');
      assert.isFalse(tradable(item));
    });
    it('should mark Sagek Prime as not tradable (quest-locked)', () => {
      const item = mockPrimeWithComponents('Sagek Prime', 'Pistol');
      assert.isFalse(tradable(item));
    });
  });

  describe('Prime items with types NOT in builtUntradable', () => {
    it('should mark Dual Pistol primes as tradable', () => {
      const item = mockItem({
        name: 'Akbronco Prime',
        type: 'Dual Pistols',
        uniqueName: '/Lotus/Types/Test/AkbroncoPrime',
      });
      assert.isTrue(tradable(item));
    });
    it('should mark Sentinel primes as tradable', () => {
      const item = mockItem({
        name: 'Carrier Prime',
        type: 'Sentinel',
        uniqueName: '/Lotus/Types/Test/CarrierPrime',
      });
      assert.isTrue(tradable(item));
    });
  });

  describe('non-Prime items', () => {
    it('should not block non-Prime weapons in builtUntradable types', () => {
      const item = mockItem({
        name: 'Braton',
        type: 'Rifle',
        uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton',
      });
      // Braton doesn't match tradableRegex (no Prime/Vandal/etc.) and type is not in tradableTypes,
      // so it should be not tradable
      assert.isFalse(tradable(item));
    });
    it('should mark Vandal weapons as tradable', () => {
      const item = mockItem({
        name: 'Braton Vandal',
        type: 'Rifle',
        uniqueName: '/Lotus/Weapons/Tenno/LongGuns/BratonVandal',
      });
      assert.isTrue(tradable(item));
    });
    it('should mark Wraith weapons as tradable by name', () => {
      const item = mockItem({
        name: 'Strun Wraith',
        type: 'Shotgun',
        uniqueName: '/Lotus/Weapons/Tenno/Shotgun/ShotgunVandal',
      });
      assert.isTrue(tradable(item));
    });
    it('should mark Prisma weapons as tradable', () => {
      const item = mockItem({
        name: 'Prisma Gorgon',
        type: 'Rifle',
        uniqueName: '/Lotus/Weapons/Tenno/LongGuns/PrismaGorgon',
      });
      assert.isTrue(tradable(item));
    });
  });

  describe('tradable by type', () => {
    it('should mark mods as tradable', () => {
      const item = mockItem({
        name: 'Serration',
        type: 'Primary Mod',
        uniqueName: '/Lotus/Upgrades/Mods/Rifle/DamageUp',
      });
      assert.isTrue(tradable(item));
    });
    it('should mark arcanes as tradable', () => {
      const item = mockItem({
        name: 'Arcane Energize',
        type: 'Arcane',
        uniqueName: '/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneRadialEnergyOnEnergyPickup',
      });
      assert.isTrue(tradable(item));
    });
    it('should mark relics as tradable', () => {
      const item = mockItem({
        name: 'Lith A1 Intact',
        type: 'Relic',
        uniqueName: '/Lotus/Types/Test/LithA1',
      });
      assert.isTrue(tradable(item));
    });
  });

  describe('untradable items', () => {
    it('should mark Glyphs as not tradable', () => {
      const item = mockItem({
        name: 'Ash Prime Glyph',
        type: 'Glyph',
        uniqueName: '/Lotus/Types/Test/AshPrimeGlyph',
      });
      assert.isFalse(tradable(item));
    });
    it('should mark Skins as not tradable', () => {
      const item = mockItem({
        name: 'Acanthus Prime Chest Plate',
        type: 'Skin',
        uniqueName: '/Lotus/Types/Test/AcanthusPrimeChest',
      });
      assert.isFalse(tradable(item));
    });
    it('should mark Exalted Weapons as not tradable', () => {
      const item = mockItem({
        name: 'Exalted Blade Prime',
        type: 'Exalted Weapon',
        uniqueName: '/Lotus/Types/Test/ExaltedBladePrime',
      });
      assert.isFalse(tradable(item));
    });
  });
});
