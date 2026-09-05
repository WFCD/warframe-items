import { assert } from 'chai';
import Items from '@wfcd/items';
import { find } from '@wfcd/items/utilities';

import { marshall } from './utils.mjs';

const { loadMods } = find;

describe('#loadMods', () => {
  const items = new Items();

  it('Should parse an arcane correctly', () => {
    /** @type {ModResolveable} */
    const sampleArcane = {
      uniqueName: '/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneRadialEnergyOnEnergyPickup',
      rank: 5,
    };

    const arcaneEnergize = loadMods([sampleArcane]);
    const expected = items.find((i) => i.name === 'Arcane Energize');
    assert.ok(expected, 'Arcane Energize should exist');

    const normalized = marshall({
      ...expected,
      rank: 5,
      levelStats: expected.levelStats?.[5] ?? expected.levelStats,
    });
    delete normalized.drops;
    delete normalized.patchlogs;
    delete normalized.tradable;

    assert.deepEqual(marshall(arcaneEnergize.arcanes[0]), normalized, 'Arcane energize invalid');
  });
  it('Should parse a mod correctly', () => {
    const sampleMod = {
      uniqueName: '/Lotus/Upgrades/Mods/Sets/Hunter/CompanionHunterCommandMod',
      rank: 5,
    };

    const hunterCommand = loadMods([sampleMod]);
    const expected = items.find(
      (i) => i.uniqueName === '/Lotus/Upgrades/Mods/Sets/Hunter/CompanionHunterCommandMod'
    );
    assert.ok(expected, 'Hunter Command should exist');

    // loadMods clones/mutates: sets rank, collapses levelStats, strips drops/tradable/transmutable
    const normalized = marshall({
      ...expected,
      rank: 5,
      levelStats: expected.levelStats?.[5] ?? expected.levelStats,
    });
    delete normalized.drops;
    delete normalized.patchlogs;
    delete normalized.tradable;
    delete normalized.transmutable;

    assert.deepEqual(marshall(hunterCommand.mods[0]), normalized, 'Mod mismatch');
  });
  it('Should parse a riven mod correctly', () => {
    const sampleRiven = {
      uniqueName: '/Lotus/Upgrades/Mods/Randomized/LotusRifleRandomModRare',
      rank: 8,
      buffs: [
        { tag: 'WeaponCritDamageMod', val: 0.3296302411049886 },
        { tag: 'WeaponCritChanceMod', val: 0.4403982743997111 },
      ],
      curses: [{ tag: 'WeaponAmmoMaxMod', val: 0.5835381164993515 }],
      compat: '/Lotus/Weapons/Grineer/LongGuns/GrineerM16Homage/GrineerM16Rifle',
      lvlReq: 15,
      pol: 'AP_DEFENSE',
    };

    const rivenMod = loadMods([sampleRiven]);

    const expectedRiven = {
      uniqueName: '/Lotus/Upgrades/Mods/Randomized/LotusRifleRandomModRare',
      polarity: 'Vazarin',
      rarity: 'Common',
      imageName: 'OmegaMod.png',
      category: 'Mods',
      buffs: [
        { tag: 'WeaponCritDamageMod', val: 0.3296302411049886 },
        { tag: 'WeaponCritChanceMod', val: 0.4403982743997111 },
      ],
      curses: [{ tag: 'WeaponAmmoMaxMod', val: 0.5835381164993515 }],
      masteryReq: 15,
      wikiaThumbnail: undefined,
      wikiaUrl: undefined,
    };

    // ignore some fields
    delete rivenMod.mods[0].baseDrain;
    delete rivenMod.mods[0].fusionLimit;

    assert.deepEqual(marshall(rivenMod.mods[0]), marshall(expectedRiven), 'Riven parsing failed');
  });
  it('should ignore mods that are unknown', () => {
    assert.deepEqual(
      loadMods([{ uniqueName: 'MyFakeModName' }]),
      { arcanes: [], mods: [] },
      'Nonexistant mods not ignored'
    );
  });
  it('should handle being passed an undefined value', () => {
    assert.deepEqual(loadMods(undefined), { arcanes: [], mods: [] }, 'Failed with no input');
  });
  it('should handle being passed a mod that should not have a rank assigned', () => {
    const sampleParazonMod = {
      uniqueName: '/Lotus/Upgrades/Mods/DataSpike/Cipher/AutoHackMod',
    };
    const parazonMod = loadMods([sampleParazonMod]);
    assert.deepEqual(
      parazonMod.mods[0].levelStats[0],
      { stats: ['+30% chance to auto complete Hacking'] },
      'Mod not correctly found'
    );
  });
});
