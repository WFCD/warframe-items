import type { WikiaMod } from '../../types/shared';

interface OldMod {
  Name?: string;
  Image?: string;
  Transmutable?: boolean;
  Introduced?: string;
  InternalName?: string;
  [key: string]: unknown;
}

export default (oldMod: OldMod, imageUrls: Record<string, string>): WikiaMod | undefined => {
  let newMod: WikiaMod | undefined;
  if (!oldMod.Name) {
    throw new Error('Mod record missing required Name field');
  }

  try {
    const { Image, Name, Transmutable, Introduced, InternalName } = oldMod;

    newMod = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      transmutable: Transmutable,
      introduced: Introduced,
      thumbnail: imageUrls[Image ?? ''],
    };
  } catch (error) {
    console.error(`Error parsing ${oldMod.Name}`);
    console.error(error);
  }
  return newMod;
};
