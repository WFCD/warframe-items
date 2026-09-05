import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import parser from '../build/parser.ts';

const directory = dirname(fileURLToPath(import.meta.url));

describe('parser component catalog helpers', () => {
  it('stripParentFromComponentName handles space and colon forms', () => {
    assert.strictEqual(parser.stripParentFromComponentName('Wyrm Prime Cerebrum', 'Wyrm Prime'), 'Cerebrum');
    assert.strictEqual(parser.stripParentFromComponentName('Wyrm Prime: Cerebrum', 'Wyrm Prime'), 'Cerebrum');
    assert.strictEqual(parser.stripParentFromComponentName('Ash: Chassis', 'Ash'), 'Chassis');
    assert.strictEqual(parser.stripParentFromComponentName('Chassis', 'Ash'), 'Chassis');
  });

  it('extractComponentCatalog replaces parent components with refs', () => {
    const data = {
      Warframes: [
        {
          uniqueName: '/Lotus/Powersuits/Ninja/Ninja',
          name: 'Ash',
          category: 'Warframes',
          imageName: 'ash.png',
          type: 'Warframe',
          components: [
            {
              uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/AshChassisComponent',
              name: 'Chassis',
              imageName: 'chassis.png',
              itemCount: 1,
              description: 'Chassis component of the Ash Warframe.',
            },
          ],
        },
      ],
    };
    parser.extractComponentCatalog(data);
    assert.strictEqual(data.Warframes[0].components.length, 1);
    assert.deepStrictEqual(data.Warframes[0].components[0], {
      uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/AshChassisComponent',
      itemCount: 1,
    });
    assert.strictEqual(data.Components.length, 1);
    assert.strictEqual(data.Components[0].name, 'Chassis');
    assert.deepStrictEqual(data.Components[0].parentUniqueNames, ['/Lotus/Powersuits/Ninja/Ninja']);
    assert.strictEqual(data.Components[0].itemCount, undefined);
  });

  it('extractComponentCatalog keeps standalone ingredients in their own category', () => {
    const data = {
      Melee: [
        {
          uniqueName: '/Lotus/Weapons/Tenno/Melee/Staff/GrnStaff',
          name: 'Amphis',
          category: 'Melee',
          type: 'Melee',
          imageName: 'amphis.png',
        },
      ],
      Warframes: [
        {
          uniqueName: '/Lotus/Powersuits/Dummy/Dummy',
          name: 'Dummy',
          category: 'Warframes',
          imageName: 'dummy.png',
          type: 'Warframe',
          components: [
            {
              uniqueName: '/Lotus/Weapons/Tenno/Melee/Staff/GrnStaff',
              name: 'Amphis',
              imageName: 'amphis.png',
              itemCount: 1,
            },
          ],
        },
      ],
    };
    parser.extractComponentCatalog(data);
    assert.strictEqual(data.Components?.length ?? 0, 0);
    assert.deepStrictEqual(data.Warframes[0].components[0], {
      uniqueName: '/Lotus/Weapons/Tenno/Melee/Staff/GrnStaff',
      itemCount: 1,
    });
    assert.deepStrictEqual(data.Melee[0].parentUniqueNames, ['/Lotus/Powersuits/Dummy/Dummy']);
  });

  it('applyI18n strips component locale names after catalog extract', () => {
    const chassisId = '/Lotus/Types/Recipes/WarframeRecipes/AshChassisComponent';
    const ashId = '/Lotus/Powersuits/Ninja/Ninja';
    const data = {
      Warframes: [
        {
          uniqueName: ashId,
          name: 'Ash',
          category: 'Warframes',
          imageName: 'ash.png',
          type: 'Warframe',
          components: [
            {
              uniqueName: chassisId,
              name: 'Chassis',
              imageName: 'chassis.png',
              itemCount: 1,
            },
          ],
        },
      ],
    };
    parser.extractComponentCatalog(data);

    const i18n = parser.applyI18n(data, {
      en: [],
      de: [
        {
          category: 'Resources',
          data: [
            { uniqueName: ashId, name: 'Ash' },
            { uniqueName: chassisId, name: 'Ash: Chassis', description: 'Chassis-Komponente.' },
          ],
        },
      ],
    });

    assert.strictEqual(i18n[chassisId].de.name, 'Chassis');
    assert.ok(i18n[chassisId].de.description);
  });
});

describe('on-disk component refs', () => {
  it('Warframes.json stores refs only', () => {
    const warframes = JSON.parse(
      readFileSync(resolve(directory, '../data/json/Warframes.json'), 'utf-8')
    );
    const ash = warframes.find((i) => i.name === 'Ash');
    assert.ok(ash?.components?.length);
    for (const ref of ash.components) {
      assert.ok(ref.uniqueName);
      assert.ok(typeof ref.itemCount === 'number');
      assert.strictEqual(ref.name, undefined);
      assert.strictEqual(Object.keys(ref).sort().join(','), 'itemCount,uniqueName');
    }
  });
});
