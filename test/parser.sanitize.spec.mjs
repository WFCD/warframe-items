import assert from 'node:assert';

import parser from '../build/parser.ts';

const tagged = [
  { name: '<SHARD_YELLOW_SIMPLE> Amber Archon Shard', expected: 'Amber Archon Shard' },
  { name: 'Kinemantik<RETRO_TM> Speaker', expected: 'Kinemantik Speaker' },
  { name: 'NIGHTWAVE <REPUTATION_SMALL> STANDING', expected: 'Nightwave Standing' }
];

describe('sanitize', () => {
  tagged.forEach(({ name, expected }) => {
    it(`should strip the glyph tag from ${name}`, () => {
      const item = { uniqueName: '/Lotus/Types/Items/MiscItems/Item', name };
      parser.sanitize(item);
      assert.strictEqual(item.name, expected);
    });
  });

  it('should still mark archwings', () => {
    const item = {
      uniqueName: '/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack',
      name: '<ARCHWING> Odonata'
    };
    parser.sanitize(item);
    assert.strictEqual(item.name, 'Odonata');
    assert.strictEqual(item.isArchwing, true);
  });

  it('should also strip the glyph from localized names', () => {
    const shardId = '/Lotus/Types/Gameplay/NarmerSorties/ArchonCrystalNira';
    const data = { Misc: [{ uniqueName: shardId, name: 'Amber Archon Shard', category: 'Misc' }] };
    const i18n = parser.applyI18n(data, {
      en: [],
      de: [
        {
          category: 'Misc',
          data: [{ uniqueName: shardId, name: '<SHARD_YELLOW_SIMPLE> Safrangelbe Archon Scherbe' }]
        }
      ]
    });
    assert.strictEqual(i18n[shardId].de.name, 'Safrangelbe Archon Scherbe');
  });
});
