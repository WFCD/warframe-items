/// <reference types="../index.d.ts" />

declare module '@wfcd/items/utilities' {
  import { RawColors, Item, ModResolveable, Arcane, ModUnion, Pixel, ColorMap } from "@wfcd/items";

  namespace find {
    function findItem(uname: string): Item | undefined;
    function loadMods(upgrades?: Array<ModResolveable>): {
      arcane: Arcane[];
      mods: ModUnion[];
    };
  }
  namespace colors {
    function safeColor(color: string): Pixel | undefined;
    function mapColors(colors: RawColors): ColorMap | undefined;
  }
}
