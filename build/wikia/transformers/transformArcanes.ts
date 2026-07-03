import type { WikiaArcane } from '../../types/shared';

interface OldArcane {
  Name?: string;
  Image?: string;
  Transmutable?: boolean;
  Introduced?: string;
  Type?: string;
  Rarity?: string;
  InternalName?: string;
  [key: string]: unknown;
}

export default (oldArcane: OldArcane, imageUrls: Record<string, string>): WikiaArcane | undefined => {
  let newArcane: WikiaArcane | undefined;
  if (!oldArcane.Name) {
    return undefined;
  }

  try {
    const { Image, Name, Transmutable, Introduced, Type, Rarity, InternalName } = oldArcane;

    newArcane = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      transmutable: Transmutable,
      introduced: Introduced,
      type: Type,
      rarity: Rarity ? Rarity.charAt(0).toUpperCase() + Rarity.slice(1).toLowerCase() : undefined,
      thumbnail: imageUrls[Image ?? ''],
    };
  } catch (error) {
    console.error(`Error parsing ${oldArcane.Name}`);
    console.error(error);
  }
  return newArcane;
};
