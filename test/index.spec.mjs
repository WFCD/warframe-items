import assert from 'node:assert';
import { resolve } from 'node:path';
import { createRequire } from 'module';

import gc from 'expose-gc/function.js';
import { expect } from 'chai';

import dedupe from '../build/dedupe.mjs';

const require = createRequire(import.meta.url);
const masterableCategories = require('../config/masterableCategories.json');

let itemPath;
let Items;
let data;
const inits = [];

/**
 * Use for fresh imports
 * @param {string} path to import
 * @param {string?} discriminator extra query param to force cache bust
 * @returns {Promise<module>}
 */
const importFresh = async (path, discriminator) => {
  return (await import(`${path}?discriminator=${discriminator}`)).default;
};
const wrapConstr = async (opts) => {
  const before = Date.now();
  const items = new Items(opts);
  const after = Date.now();
  inits.push(after - before);
  return items;
};

const namedExclusions = ['Excalibur Prime', 'Helminth'];

const setupItems = async () => {
  Items = await importFresh(itemPath);
  data = Object.freeze({
    items: await wrapConstr(),
    warframes: await wrapConstr({ category: ['Warframes', 'Archwing'], i18n: 'en', i18nOnObject: true }),
    weapons: await wrapConstr({
      category: ['Primary', 'Secondary', 'Melee', 'Arch-Melee', 'Arch-Gun'],
      i18n: 'en',
      i18nOnObject: true,
    }),
  });
};

const test = (base) => {
  describe(base, () => {
    before(async () => {
      itemPath = resolve(`./${base}`);
      await setupItems();
    });
    beforeEach(async () => {
      gc();
      await setupItems();
    });
    afterEach(async () => {
      delete require.cache[itemPath];
      Items = undefined;
      data = undefined;
      gc();
    });
    it('should contain items when initializing.', async () => {
      const items = await wrapConstr();
      assert(items.length);
    });
    it('should ignore enemies when configured.', async () => {
      let items = (await wrapConstr({ ignoreEnemies: true })).filter((i) => i.category === 'Enemy');
      assert(!items.length);

      items = (await wrapConstr({ category: ['Enemy', 'Primary'], ignoreEnemies: true })).filter(
        (i) => i.category === 'Enemy'
      );
      assert(!items.length);
    });
    it('should construct successfully with all & primary', async () => {
      const items = await wrapConstr({ category: ['Primary', 'All'] });
      assert(items.length > 0);
    });
    it('should not error current worldstate-data supported locales', async () => {
      try {
        await wrapConstr({
          i18n: ['de', 'es', 'fr', 'it', 'ko', 'pl', 'pt', 'ru', 'zh', 'cs', 'sr'],
          i18nOnObject: true,
        });
      } catch (e) {
        assert(typeof e === 'undefined');
      }
    });
    it('does not fail on invalid categories', () => {
      assert.doesNotThrow(() => {
        new Items({ category: 'Warframe' });
      });
    });
    it('should apply custom categories are specified', async () => {
      const items = await wrapConstr({ category: ['Primary'] });
      const primes = items.filter((i) => i.name.includes('Prime'));
      assert(primes.length < items.length);
    });
    describe('i18n', () => {
      beforeEach(gc);
      it('should populate with a truthy boolean', async () => {
        Items = await importFresh(itemPath, Date.now());
        const items = await wrapConstr({ category: ['Mods'], i18n: ['es', 'tr'] });
        assert(!!items.i18n[items[0].uniqueName].tr);
        assert(!!items.i18n[items[0].uniqueName].es);
      });
      it('should not exist by default', async () => {
        const items = await wrapConstr();
        assert(!items.i18n);
      });
      it('should only contain requested locales', async () => {
        const items = await wrapConstr({ category: ['Mods'], i18n: ['es'] });
        assert(!items.i18n[items[0].uniqueName].tr);
        assert(!!items.i18n[items[0].uniqueName].es);
      });
      it('should respect itemOnObject', async () => {
        const items = await wrapConstr({ category: ['Mods'], i18n: ['es'], i18nOnObject: true });
        assert(!items[0].i18n.tr);
        assert(!!items[0].i18n.es);
        assert(!items.i18n);
      });
    });
    describe('drops', () => {
      beforeEach(gc);
      it('should not have drops for hikou', async () => {
        const items = await wrapConstr({ category: ['Secondary'] });
        const hikouMatches = items.filter((i) => i.name === 'Hikou');
        assert(hikouMatches.length === 1);
        const { drops } = hikouMatches[0];
        assert(typeof drops === 'undefined');
      });
      it('should only have non-prime drops for Gorgon', async () => {
        const items = await wrapConstr({ category: ['Primary'] });
        const matches = items.filter((i) => i.name === 'Gorgon');
        assert(matches.length === 1);
        const { drops } = matches[0];
        assert(typeof drops === 'undefined');

        const bp = matches[0].components.filter((component) => component.name === 'Blueprint')[0];
        assert(typeof bp !== 'undefined');
        assert(bp.drops.length !== 0);

        const primeBpDrops = bp.drops.filter((n) => n.type.includes('Prime'));
        assert(primeBpDrops.length === 0);
      });
      it('should have variant drops when requested', async () => {
        const items = await wrapConstr({ category: ['Primary'] });
        const matches = items.filter((i) => i.name === 'Gorgon Wraith');
        assert(matches.length === 1);
        const { drops } = matches[0];
        assert(typeof drops === 'undefined');

        const bp = matches[0].components.filter((component) => component.name === 'Blueprint')[0];
        assert(typeof bp !== 'undefined');
        assert(bp.drops.length !== 0);

        const variantDrops = bp.drops.filter((n) => n.type.includes('Wraith'));
        assert(variantDrops.length === 1);
      });
      it('should only have 1 result for Mausolon', async () => {
        const items = await wrapConstr({ category: ['Arch-Gun'] });
        const matches = items
          .filter((i) => i.name === 'Mausolon')
          .map((i) => {
            delete i.patchlogs;
            return i;
          });
        const dd = dedupe(matches);
        assert.strictEqual(dd.length, matches.length, 'Before and after dedupe should match');
        assert.strictEqual(matches.length, 1, 'There can be only One');
      });
    });
    describe('integrity', async () => {
      beforeEach(gc);
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
      it('should reflect melee types', () => {
        data.items
          .filter((i) => ['Amphis', 'Cadus', 'Cassowar', 'Caustacyst', 'Sigma & Octantis'].includes(i.name))
          .forEach((item) => {
            assert.equal(item.type, 'Melee', `${item.name} should be melee!`);
          });
      });
      it('should reflect warframe components', () => {
        data.warframes
          .filter((w) => !namedExclusions.includes(w.name))
          .forEach((warframe) => {
            assert(warframe?.components?.length > 0, `${warframe.name} should have components`);
          });
      });
      it('marketCost should be a number ', () => {
        data.items.forEach((item) => {
          assert(
            ['number', 'undefined'].includes(typeof item.marketCost),
            `${item.name} marketCost should be a number if present`
          );
        });
      });
      it('items should be marked masterable correctly ', async () => {
        const items = await wrapConstr({ ignoreEnemies: true });
        items.forEach((item) => {
          const masterable = (category, type, uniqueName) => {
            if (type?.includes('Component') || category === 'Pets') {
              const regex = new RegExp(masterableCategories.regex);
              return regex.test(uniqueName);
            }

            return masterableCategories.categories.includes(category);
          };

          if (item.name === 'Helminth') return;

          assert.equal(
            item.masterable,
            masterable(item.category, item.type, item.uniqueName),
            `${item.name} should be marked as ${!masterable ? 'not ' : ''}masterable`
          );
        });
      });
      it('resources should be resources', () => {
        [
          'Nano Spores',
          'Alloy Plate',
          'Salvage',
          'Rubedo',
          'Plastids',
          'Circuits',
          'Orokin Cell',
          'Argon Crystal',
          'Control Module',
          'Mutalist Alad V Nav Coordinate',
          'Cryptographic ALU',
          'Omega Isotope',
          'Riven Sliver',
          'Kuva',
          'Steel Essence',
          'Morphics',
          'Cryotic',
          'Hexenon',
          'Neural Sensors',
          'Oxium',
          'Polymer Bundle',
          'Tellurium',
          'Spectral Debris',
          'Aya',
          'Somatic Fibers',
          'Nav Coordinate',
          'Judgement Points',
          'Synthula',
          'Javlok Capacitor',
          'Vitus Essence',
          'Void Traces',
          'Gallium',
          'Antiserum Injector Fragment',
        ].forEach((iName) => {
          const results = data.items.filter(
            (i) => iName.toLowerCase() === i.name.toLowerCase() && !i.uniqueName.includes('/Enemies')
          );
          assert(results?.length > 0, `${iName} should have results`);
          results.forEach((res) =>
            assert.strictEqual(res.type, 'Resource', `${res.name} should be a Resource type... ${res.type}`)
          );
        });
      });
    });
    it('should not change size when using filter', async () => {
      const items = await wrapConstr({ category: ['Arch-Gun'] });
      const realLength = items.length;
      assert(realLength === items.filter(() => true).length);
    });
    it('should not change size when using map', async () => {
      const items = await wrapConstr({ category: ['Arch-Gun'] });
      const realLength = items.length;
      assert(realLength === items.map((x) => x).length);
    });
    describe('helminth', async () => {
      it('should only have drops', async () => {
        const items = await wrapConstr({ category: ['Warframes'] });
        const helminth = items.find((i) => i.name === 'Helminth');
        assert(typeof helminth.component, undefined);
        assert(typeof helminth.drops, Array);
      });
      it('should have more than 4 abilities', async () => {
        const items = await wrapConstr({ category: ['Warframes'] });
        const helminth = items.find((i) => i.name === 'Helminth');
        expect(helminth.abilities.length).above(4);
        // There are 13 abilties in all but room was added in case DE added a few between here and now
        expect(helminth.abilities.length).lessThan(20);
      });
      it('should not be masterable', async () => {
        const items = await wrapConstr({ category: ['Warframes'] });
        const helminth = items.find((i) => i.name === 'Helminth');
        expect(helminth.masterable).to.eq(false);
      });
    });
  });
};

['index.js', 'index.mjs'].forEach(test);
