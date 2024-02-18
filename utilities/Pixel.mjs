import Items from 'warframe-items';

/**
 * Palette Coordinate representation
 * @typedef {Object} PaletteCoordinate
 * @property {number} row row in palette to which this coordinate corresponds
 * @property {number} col column in palette to which this coordinate corresponds
 */

/**
 * Determine row/column from an index
 * @param {number} [ind] array index of a coordinate
 * @returns {PaletteCoordinate}
 */
const position = (ind) => ({
  row: (ind % 18) + 1,
  col: Math.ceil(ind / 18),
});

/**
 * Generic palette descriptor
 * @typedef {Object} Palette
 * @property {string} name Palette name (as seen in-game)
 * @property {string} description Description of the palette
 */
/**
 * Palette Entry
 * @typedef {Object} PaletteEntry
 * @property {Palette} palette
 * @property {PaletteCoordinate} position
 */

export default class Pixel {
  static #colors;

  /** Raw hex value
   * @type string
   */
  #hex;
  /**
   * Matching palette entries
   * @type {Array<PaletteEntry>}
   */
  #matches = [];
  /**
   * Matched palette list of names
   * @type {Array<string>}
   */
  #palettes = [];
  /**
   * Whether this pixel is transparent
   * @type {boolean}
   */
  #isTransparent = false;

  /**
   * Generate a pixel descriptive object
   * @param {string} hex string-represented hex code
   * @constructor
   */
  constructor(hex) {
    if (!Pixel.#colors) {
      Pixel.#colors = new Items().filter((i) => i.hexColours);
    }

    this.#hex = hex;
    this.#isTransparent = hex === '0';

    if (!this.#isTransparent) {
      this.#isTransparent = undefined;
      Pixel.#colors.forEach(({ name, description, hexColours }) => {
        hexColours.forEach(({ value }, index) => {
          if (value.toLowerCase().includes(hex.toLowerCase())) {
            if (!this.#palettes.includes(name)) {
              this.#matches.push({
                palette: { name, description },
                position: position(index),
              });
              this.#palettes.push(name);
            }
          }
        });
      });
    }
  }

  /**
   * Palette within the
   * @returns {Array<string>}
   */
  get palettes() {
    return this.#palettes;
  }

  /**
   * Pixel Coordinate matches
   * @returns {Array<PaletteEntry>}
   */
  get matches() {
    return this.#matches;
  }

  /**
   * Whether this pixel is transparent
   * @returns {boolean}
   */
  get isTransparent() {
    return this.#isTransparent;
  }

  get hex() {
    return this.#hex;
  }

  toJSON() {
    return {
      matches: this.#matches,
      isTransparent: this.#isTransparent,
      hex: this.#hex,
    };
  }
}
