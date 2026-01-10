import { find } from '@wfcd/items/utilities';
import { assert } from 'chai';

describe('title() should be replace correctly', () => {
  it('should replace letters after umlauts', () => {
    const undergroundSceneUName = '/Lotus/Types/Items/PhotoBooth/Vania/PhotoboothTileVaniaConMallEftwel';
    const undergroundScene = find.findItem(undergroundSceneUName);
    assert.equal(undergroundScene.name, 'Höllvanian Collapsed Underground Scene');
  });
  it('should replace grave accents and possessives correctly', () => {
    const archiveScene = find.findItem('/Lotus/Types/Items/PhotoBooth/Entrati/PhotoboothTileArchives');
    assert.equal(archiveScene.name, "Albrecht's Archive Scene");
  });
});
