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

  it('does not merge relic entries from RelicArcane into the arcanes wiki bucket', () => {
    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'RelicArcane',
            data: [
              {
                name: 'Lith A1 Relic',
                uniqueName: '/Lotus/Types/Keys/Projections/LithA1Relic',
                type: 'Relic',
              },
            ],
          },
        ],
      })
    );

    const relic = findItem(parsed, 'Lith A1 Relic');
    assert.strictEqual(relic?.category, 'Relics');
    assert.strictEqual(relic?.wikiAvailable, undefined);
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

describe('companion and kitgun wiki release dates', () => {
  it('merges Introduced for Pets from the companions wiki bucket', () => {
    const wikia = baseWikia();
    wikia.companions.push({
      name: 'Adarza Kavat',
      uniqueName: '/Lotus/Types/Game/CatbrowPet/MirrorCatbrowPetPowerSuit',
      url: 'https://wiki.warframe.com/w/Adarza_Kavat',
      introduced: 'Update 38.6',
    });

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Sentinels',
            data: [
              {
                name: 'Adarza Kavat',
                uniqueName: '/Lotus/Types/Game/CatbrowPet/MirrorCatbrowPetPowerSuit',
                productCategory: 'KubrowPets',
                type: 'Pets',
              },
            ],
          },
        ],
        wikia,
      })
    );

    const pet = findItem(parsed, 'Adarza Kavat');
    assert.strictEqual(pet?.category, 'Pets');
    assert.strictEqual(pet?.wikiAvailable, true);
    assert.strictEqual(pet?.releaseDate, '2025-05-21');
    assert(!parsed.warnings.missingReleaseDates.includes('Adarza Kavat'));
  });

  it('merges Introduced for Kitgun Components from the weapons wiki bucket', () => {
    const wikia = baseWikia();
    wikia.weapons.push({
      name: 'Catchmoon (Secondary)',
      uniqueName:
        '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/SUModularSecondaryBarrelAPart',
      url: 'https://wiki.warframe.com/w/Catchmoon',
      introduced: 'Update 38.6',
      slot: 'Secondary',
    });

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Weapons',
            data: [
              {
                name: 'Catchmoon',
                uniqueName:
                  '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/SUModularSecondaryBarrelAPart',
                productCategory: 'Pistols',
                type: 'Kitgun Component',
              },
            ],
          },
        ],
        wikia,
      })
    );

    const kitgun = findItem(parsed, 'Catchmoon');
    assert.strictEqual(kitgun?.category, 'Misc');
    assert.strictEqual(kitgun?.wikiAvailable, true);
    assert.strictEqual(kitgun?.releaseDate, '2025-05-21');
    assert(!parsed.warnings.missingReleaseDates.includes('Catchmoon'));
  });
});

describe('exaltedSlot from wiki', () => {
  it('maps wiki Slot onto exaltedSlot for exalted weapons', () => {
    const wikia = baseWikia();
    wikia.weapons.push(
      {
        name: 'Dex Pixia',
        uniqueName: '/Lotus/Powersuits/Fairy/FlightPistols',
        url: 'https://wiki.warframe.com/w/Dex_Pixia',
        introduced: 'Update 38.6',
        slot: 'Secondary',
      },
      {
        name: 'Arquebex',
        uniqueName: '/Lotus/Types/Enemies/Orokin/Entrati/EntratiTech/NechroTech/ExaltedArtilleryWeapon',
        url: 'https://wiki.warframe.com/w/Arquebex',
        introduced: 'Update 38.6',
        slot: 'Archgun (Atmosphere)',
      },
      {
        name: 'Ironbride',
        uniqueName: '/Lotus/Types/Enemies/Orokin/Entrati/EntratiTech/NechroTech/AbilitySword/NechroTechSwordWeapon',
        url: 'https://wiki.warframe.com/w/Ironbride',
        introduced: 'Update 38.6',
        slot: 'Archmelee',
      }
    );

    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Weapons',
            data: [
              {
                name: 'Dex Pixia',
                uniqueName: '/Lotus/Powersuits/Fairy/FlightPistols',
                productCategory: 'SpecialItems',
                slot: 7,
                type: 'Exalted Weapon',
              },
              {
                name: 'Arquebex',
                uniqueName:
                  '/Lotus/Types/Enemies/Orokin/Entrati/EntratiTech/NechroTech/ExaltedArtilleryWeapon',
                productCategory: 'SpecialItems',
                slot: 7,
                type: 'Exalted Weapon',
              },
              {
                name: 'Ironbride',
                uniqueName:
                  '/Lotus/Types/Enemies/Orokin/Entrati/EntratiTech/NechroTech/AbilitySword/NechroTechSwordWeapon',
                productCategory: 'SpecialItems',
                slot: 7,
                type: 'Exalted Weapon',
                blockingAngle: 90,
              },
            ],
          },
        ],
        wikia,
      })
    );

    assert.strictEqual(findItem(parsed, 'Dex Pixia')?.exaltedSlot, 'Secondary');
    assert.strictEqual(findItem(parsed, 'Arquebex')?.exaltedSlot, 'Arch-Gun');
    assert.strictEqual(findItem(parsed, 'Ironbride')?.exaltedSlot, 'Arch-Melee');
    assert.deepStrictEqual(parsed.warnings.missingExaltedSlot, []);
  });

  it('falls back to Melee from combat stats when wiki Slot is absent', () => {
    const parsed = parser.parse(
      buildRaw({
        api: [
          {
            category: 'Weapons',
            data: [
              {
                name: 'Desert Wind',
                uniqueName: '/Lotus/Powersuits/Pacifist/PacifistFist',
                productCategory: 'SpecialItems',
                slot: 7,
                type: 'Exalted Weapon',
                blockingAngle: 90,
                comboDuration: 5,
              },
            ],
          },
        ],
      })
    );

    assert.strictEqual(findItem(parsed, 'Desert Wind')?.exaltedSlot, 'Melee');
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
