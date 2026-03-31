import transformPolarity from './transformPolarity';
import type { WikiaArchwing } from '../../types/shared';

interface OldArchwing {
  Name?: string;
  Image?: string;
  Mastery?: number;
  Polarities?: string[];
  Sprint?: number;
  Introduced?: string;
  Vaulted?: boolean;
  InternalName?: string;
  [key: string]: unknown;
}

/**
 * Transform wikia lua archwings into usable standardized json
 * @param oldWings - old archwing in lua format
 * @param imageUrls - name-url pairs
 * @returns transformed archwing data
 */
export default (
  oldWings: OldArchwing,
  imageUrls: Record<string, string>,
  _blueprints?: Record<string, unknown>
): WikiaArchwing | undefined => {
  let newWings: WikiaArchwing | undefined;
  if (!oldWings.Name) {
    throw new Error('Missing archwing Name');
  }

  try {
    const { Image, Mastery, Polarities, Sprint, Introduced, Vaulted, InternalName, Name } = oldWings;

    newWings = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_').replace('_Prime', '/Prime'))}`,
      mr: Mastery ?? 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      vaulted: Vaulted ?? undefined,
      thumbnail: imageUrls[Image ?? ''],
    };
    newWings = transformPolarity(oldWings, newWings);
  } catch (error) {
    console.error(`Error parsing ${oldWings.Name}`);
    throw error;
  }
  return newWings;
};
