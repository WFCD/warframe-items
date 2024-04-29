/// <reference types="../index.d.ts" />

declare module 'warframe-items/utilities' {
  import { RawColors, Item, ModResolveable, Arcane, ModUnion, Pixel, ColorMap } from "warframe-items";

  interface find {
    findItem: (uname: string) => Promise<Item | undefined>;
    loadMods: (upgrades?: Array<ModResolveable>) => Promise<{
      arcane: Arcane[];
      mods: ModUnion[];
    }>
  }
  interface colors {
    safeColor: (color: string) => Pixel | undefined;
    mapColors: (colors: RawColors) => ColorMap | undefined;
  }
}
