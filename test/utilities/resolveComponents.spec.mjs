import assert from 'node:assert';
import { createRequire } from 'module';
import { resolveComponents as resolveMjs, toCatalogMap as toMapMjs } from '../../utilities/resolveComponents.mjs';

const require = createRequire(import.meta.url);
const { resolveComponents: resolveCjs, toCatalogMap: toMapCjs } = require('../../utilities/resolveComponents.js');

const run = (label, resolveComponents, toCatalogMap) => {
  describe(label, () => {
    it('toCatalogMap accepts Map, array, and record', () => {
      const map = new Map([['a', { uniqueName: 'a', name: 'A' }]]);
      assert.strictEqual(toCatalogMap(map), map);

      const fromArr = toCatalogMap([{ uniqueName: 'b', name: 'B' }, { name: 'skip-me' }]);
      assert.strictEqual(fromArr.get('b').name, 'B');
      assert.strictEqual(fromArr.has('skip-me'), false);

      const fromRecord = toCatalogMap({
        c: { uniqueName: 'c', name: 'C' },
        d: { name: 'D' }
      });
      assert.strictEqual(fromRecord.get('c').name, 'C');
      assert.strictEqual(fromRecord.get('d').name, 'D');

      assert.strictEqual(toCatalogMap(null).size, 0);
      assert.strictEqual(toCatalogMap(undefined).size, 0);
    });

    it('resolveComponents expands refs and preserves already-resolved entries', () => {
      assert.strictEqual(resolveComponents(null, []), null);
      assert.deepStrictEqual(resolveComponents({}, []), {});

      const catalog = [
        {
          uniqueName: '/part',
          name: 'Part',
          imageName: 'part.png',
          parentUniqueNames: ['/parent']
        }
      ];

      const item = {
        components: [
          { uniqueName: '/part', itemCount: 3 },
          { uniqueName: '/missing' },
          { uniqueName: '/already', name: 'Already', itemCount: 2 },
          { itemCount: 1 },
          null
        ]
      };

      resolveComponents(item, catalog);
      assert.strictEqual(item.components[0].name, 'Part');
      assert.strictEqual(item.components[0].itemCount, 3);
      assert.strictEqual(item.components[0].parentUniqueNames, undefined);
      assert.deepStrictEqual(item.components[1], { uniqueName: '/missing' });
      assert.strictEqual(item.components[2].name, 'Already');
      assert.strictEqual(item.components[3].itemCount, 1);
      assert.strictEqual(item.components[4], null);

      const defaults = { components: [{ uniqueName: '/part' }] };
      resolveComponents(defaults, catalog);
      assert.strictEqual(defaults.components[0].itemCount, 1);

      const byDrops = { components: [{ uniqueName: '/x', drops: [] }] };
      resolveComponents(byDrops, catalog);
      assert.deepStrictEqual(byDrops.components[0], { uniqueName: '/x', drops: [] });

      const byImage = { components: [{ uniqueName: '/x', imageName: 'x.png' }] };
      resolveComponents(byImage, catalog);
      assert.strictEqual(byImage.components[0].imageName, 'x.png');
    });
  });
};

run('resolveComponents.js', resolveCjs, toMapCjs);
run('resolveComponents.mjs', resolveMjs, toMapMjs);
