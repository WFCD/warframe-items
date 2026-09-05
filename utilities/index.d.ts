/// <reference types="../index.d.ts" />

declare module '@wfcd/items/utilities' {
  import { RawColors, Item, ModResolveable, Arcane, ModUnion, Pixel, ColorMap, Component } from "@wfcd/items";

  namespace find {
    function findItem(uname: string): Item | undefined;
    function loadMods(upgrades?: ModResolveable[]): {
      arcanes: Arcane[];
      mods: ModUnion[];
    };
  }
  namespace colors {
    function safeColor(color: string): Pixel | undefined;
    function mapColors(colors: RawColors): ColorMap | undefined;
  }

  function resolveComponents(
    item: Item,
    catalog?: Component[] | Map<string, Component> | Record<string, Component>
  ): Item;
  function toCatalogMap(
    catalog: Component[] | Map<string, Component> | Record<string, Component>
  ): Map<string, Component>;
}
