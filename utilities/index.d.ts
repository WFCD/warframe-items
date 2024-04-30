/// <reference types="../index.d.ts" />

declare module 'warframe-items/utilities' {
  import { RawColors, Item, ModResolveable, Arcane, ModUnion, Pixel, ColorMap } from "warframe-items";

  namespace find {
    function findItem(uname: string): Promise<Item | undefined>;
    function loadMods(upgrades?: Array<ModResolveable>): Promise<{
      arcane: Arcane[];
      mods: ModUnion[];
    }>;
  }
  namespace colors {
    function safeColor(color: string): Pixel | undefined;
    function mapColors(colors: RawColors): ColorMap | undefined;
  }
}
