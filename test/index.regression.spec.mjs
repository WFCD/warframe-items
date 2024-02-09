import assert from 'node:assert';

import dedupe from '../build/dedupe.mjs';

const grab = async (path) => {
  return fetch(`https://api.warframestat.us/${path}/?language=en`).then((d) => d.json());
};

const data = {
  items: undefined,
  weapons: undefined,
  warframes: undefined,
  mods: undefined,
};

const namedExclusions = ['Excalibur Prime'];

data.items = await grab('items');
data.weapons = await grab('weapons');
data.warframes = await grab('warframes');
data.mods = await grab('mods');

describe('Regression: Using live API data', function () {
  this.timeout(10000);
  it('weapons should only have 1 result for Mausolon', () => {
    const matches = data.weapons
      .filter((i) => i.name === 'Mausolon')
      .map((i) => {
        delete i.patchlogs;
        return i;
      });
    const dd = dedupe(matches);
    assert.strictEqual(dd.length, matches.length, 'Before and after dedupe should match');
    assert.strictEqual(matches.length, 1, 'There can be only One');
  });
  it('warframes should only have 1 result for Octavia Prime', () => {
    const matches = data.warframes
      .filter((i) => i.name === 'Octavia Prime')
      .map((i) => {
        delete i.patchlogs;
        return i;
      });
    const dd = dedupe(matches);
    assert.strictEqual(dd.length, matches.length, 'Before and after dedupe should match');
    assert.strictEqual(matches.length, 1, 'There can be only One');
  });
  it('items should only have 1 result for Octavia Prime', () => {
    const matches = data.items
      .filter((i) => i.name === 'Octavia Prime')
      .map((i) => {
        delete i.patchlogs;
        return i;
      });
    const dd = dedupe(matches);
    assert.strictEqual(dd.length, matches.length, 'Before and after dedupe should match');
    assert.strictEqual(matches.length, 1, 'There can be only One');
    assert(Object.keys(matches[0]).includes('components'));
  });
  data.warframes
    .filter((w) => !namedExclusions.includes(w.name))
    .forEach((warframe) => {
      it(`${warframe.name} should have components`, () => {
        assert(warframe?.components?.length > 0);
      });
    });
});
