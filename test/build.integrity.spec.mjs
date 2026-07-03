import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const all = require('../data/json/All.json');
const arcanes = require('../data/json/Arcanes.json');
const warnings = JSON.parse(readFileSync(new URL('../data/warnings.json', import.meta.url), 'utf8'));

/** Arcane names that exist in Module:Arcane and should always merge after a build. */
const knownWikiArcanes = [
  'Arcane Acceleration',
  'Arcane Aegis',
  'Arcane Energize',
  'Arcane Grace',
  'Magus Elevate',
  'Virtuos Fury',
];

/** Items with no standalone wiki Introduced entry or known InternalName gaps. */
const allowedMissingReleaseDates = [
  'Bad Baby',
  'Bhaira Hound',
  'Bonewidow',
  'Dark Split-Sword',
  'Dorma Hound',
  'Enkaus',
  'Feverspine',
  'Flatbelly',
  'Grimoire',
  'Hec Hound',
  'Imperator Vandal',
  'Kuva Ghoulsaw',
  'Lambeo Moa',
  'Mandonel',
  'Needlenose',
  'Nychus Moa',
  'Oloro Moa',
  'Para Moa',
  'Runway',
  'Voidrig',
];

/** Skip when committed JSON predates wiki merge fixes (run `npm run build -- --force` locally). */
const rebuiltWithWikiMerge = arcanes.some((arcane) => arcane.wikiAvailable);

(rebuiltWithWikiMerge ? describe : describe.skip)('build output wiki integrity', () => {
  it('known wiki arcanes should have merge data applied', () => {
    knownWikiArcanes.forEach((name) => {
      const arcane = arcanes.find((entry) => entry.name === name);
      assert(arcane, `${name} not found in Arcanes.json`);
      assert(arcane.wikiAvailable, `${name} missing wikiAvailable`);
      assert(arcane.releaseDate, `${name} missing releaseDate`);
      assert(arcane.rarity, `${name} missing rarity`);
    });
  });

  it('arcanes with wikiAvailable should have releaseDate and rarity', () => {
    arcanes
      .filter((arcane) => arcane.wikiAvailable)
      .forEach((arcane) => {
        assert(arcane.releaseDate, `${arcane.name} missing releaseDate`);
        assert(arcane.rarity, `${arcane.name} missing rarity`);
      });
  });

  it('masterable primes should have releaseDate', () => {
    const missing = all
      .filter((item) => item.masterable && item.name.endsWith(' Prime') && !item.releaseDate)
      .map((item) => item.name);

    assert.deepStrictEqual(missing, []);
  });

  it('missingReleaseDates warnings should only contain known gaps', () => {
    const unexpected = (warnings.missingReleaseDates ?? []).filter(
      (name) => !allowedMissingReleaseDates.includes(name)
    );
    assert.deepStrictEqual(
      unexpected,
      [],
      `Unexpected missingReleaseDates entries: ${unexpected.join(', ')}`
    );
  });

  it('ambiguousWikiMatch warnings should be empty', () => {
    assert.deepStrictEqual(warnings.ambiguousWikiMatch ?? [], []);
  });
});
