import { find } from '@wfcd/items/utilities';
import { assert } from 'chai';

describe('title() should be replace correctly', () => {
  it('should replace letters after umlauts', () => {
    const undergroundSceneUName = '/Lotus/Types/Items/PhotoBooth/Vania/PhotoboothTileVaniaConMallEftwel';
    const undergroundScene = find.findItem(undergroundSceneUName);
    assert.equal(undergroundScene.name, 'Höllvanian Collapsed Underground Scene');

    const glyphUName = '/Lotus/Types/StoreItems/AvatarImages/FanChannel/AvatarImageGamingBitches';
    const glyph = find.findItem(glyphUName);
    assert.equal(glyph.name, 'Gaming B*tches Glyph');

    const cathedraleSceneUName = '/Lotus/Types/Items/PhotoBooth/TauOldPeace/PhotoboothTileTauOldPeaceCathedral1799ProtoframeRoom';
    const cathedraleScene = find.findItem(cathedraleSceneUName);
    assert.equal(cathedraleScene.name, 'La Cathédrale Scene');
  });
  it('should replace grave accents and possessives correctly', () => {
    const archiveScene = find.findItem('/Lotus/Types/Items/PhotoBooth/Entrati/PhotoboothTileArchives');
    assert.equal(archiveScene.name, "Albrecht's Archive Scene");
  });
});
