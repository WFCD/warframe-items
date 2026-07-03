import assert from 'node:assert';

import parser from '../build/parser';
import transformArcanes from '../build/wikia/transformers/transformArcanes';
import { baseWikia, buildRaw } from './fixtures/wikia.fixture.mjs';

const findItem = (parsed, name) => parsed.data.flatMap((c) => c.data).find((i) => i.name === name);

describe('parser wiki merge', () => {
  it('merges RelicArcane items from the arcanes wiki bucket', () => {
    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'RelicArcane',
            data: [
              {
                name: 'Arcane Acceleration',
                uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneAcceleration',
                type: 'Arcane',
              },
            ],
          },
        ],
      })
    );

    const arcane = findItem(parsed, 'Arcane Acceleration');
    assert.strictEqual(arcane?.category, 'Arcanes');
    assert.strictEqual(arcane?.wikiAvailable, true);
    assert.strictEqual(arcane?.releaseDate, '2025-05-21');
    assert.strictEqual(arcane?.rarity, 'Uncommon');
  });

  it('falls back to an exact name match when uniqueName mismatches', () => {
    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Weapons',
            data: [
              {
                name: 'Quassus Prime',
                uniqueName: '/Lotus/Weapons/Tenno/Melee/Warfan/PrimeQuassus/PrimeQuassusWeapon',
                slot: 5,
                masteryReq: 14,
              },
            ],
          },
          {
            category: 'Sentinels',
            data: [
              {
                name: 'Wyrm Prime',
                uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeWyrmPowerSuit',
                type: 'Sentinel',
              },
            ],
          },
        ],
      })
    );

    assert.strictEqual(findItem(parsed, 'Quassus Prime')?.releaseDate, '2025-05-21');
    assert.strictEqual(findItem(parsed, 'Wyrm Prime')?.releaseDate, '2015-03-25');
  });

  it('does not auto-match ambiguous wiki names', () => {
    const wikia = baseWikia();
    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Weapons',
            data: [
              {
                name: 'Braton',
                uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton/BratonMk1',
                slot: 1,
              },
            ],
          },
        ],
        wikia,
      })
    );

    const braton = findItem(parsed, 'Braton');
    assert.strictEqual(braton?.wikiAvailable, undefined);
    assert(parsed.warnings.ambiguousWikiMatch.includes('Braton'));
  });

  it('preserves DE rarity when wiki rarity is absent', () => {
    const wikia = baseWikia();
    wikia.arcanes = [
      {
        name: 'Arcane Nullifier',
        uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneNullifier',
        url: 'https://wiki.warframe.com/w/Arcane_Nullifier',
        introduced: 'Update 38.6',
        type: 'Warframe',
      },
    ];

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'RelicArcane',
            data: [
              {
                name: 'Arcane Nullifier',
                uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneNullifier',
                type: 'Arcane',
                rarity: 'Rare',
              },
            ],
          },
        ],
        wikia,
      })
    );

    assert.strictEqual(findItem(parsed, 'Arcane Nullifier')?.rarity, 'Rare');
  });

  it('warns when a merged arcane is missing releaseDate', () => {
    const wikia = baseWikia();
    wikia.versions = [];

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'RelicArcane',
            data: [
              {
                name: 'Arcane Acceleration',
                uniqueName: '/Lotus/Upgrades/Cosmetic/Arcane/LotusArcaneAcceleration',
                type: 'Arcane',
              },
            ],
          },
        ],
        wikia,
      })
    );

    assert.strictEqual(findItem(parsed, 'Arcane Acceleration')?.wikiAvailable, true);
    assert(parsed.warnings.missingReleaseDates.includes('Arcane Acceleration'));
  });

  it('does not warn when an arcane is absent from wiki data', () => {
    const wikia = baseWikia();
    wikia.arcanes = [];

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'RelicArcane',
            data: [
              {
                name: 'Arcane Defense',
                uniqueName: '/Lotus/Upgrades/CosmeticEnhancers/Defensive/PunctureProcResist',
                type: 'Arcane',
              },
            ],
          },
        ],
        wikia,
      })
    );

    assert.strictEqual(findItem(parsed, 'Arcane Defense')?.wikiAvailable, undefined);
    assert(!parsed.warnings.missingReleaseDates.includes('Arcane Defense'));
  });
});

describe('transformArcanes', () => {
  it('titlecases wiki rarity values', () => {
    const arcane = transformArcanes({ Name: 'Arcane Test', Rarity: 'legendary' }, {});
    assert.strictEqual(arcane?.rarity, 'Legendary');
  });

  it('leaves rarity undefined when wiki omits it', () => {
    const arcane = transformArcanes({ Name: 'Arcane Test' }, {});
    assert.strictEqual(arcane?.rarity, undefined);
  });
});
