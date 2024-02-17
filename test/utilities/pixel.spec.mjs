import { assert } from 'chai';

import Pixel from '../../utilities/Pixel.mjs';

describe('Pixel', () => {
  describe('#constructor', () => {
    it('should parse and match hex codes', () => {
      const sampleCodes = ['2E203D', '9078EA', 'D6A3EC', '49667C', 'E6B0FE', 'E6B0FE', '2E203D'];
      sampleCodes.forEach((hex) => {
        const pixel = new Pixel(hex);
        assert.equal(pixel.hex, hex, 'Hex mismatch');
        assert.isNotEmpty(pixel.matches, 'No matches resolved');
        assert.isNotEmpty(pixel.palettes, 'Real pixels should give palettes');
        assert.isNotOk(pixel.isTransparent, 'not transparent!');
      });
    });

    it('should handle being passed an unknown hex', () => {
      const fakeHex = '023nva';
      const fakePixel = new Pixel(fakeHex);

      assert.isOk(fakePixel);
      assert.equal(fakePixel.hex, fakeHex, 'Hex mismatch');
      assert.isEmpty(fakePixel.matches, 'Match list mismatch');
      assert.isEmpty(fakePixel.palettes, 'Fake hex should not have palettes');
    });
  });
});
