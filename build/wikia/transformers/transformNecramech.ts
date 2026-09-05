import transformPolarity from './transformPolarity';
import type { WikiaNecramech } from '../../types/shared';

interface OldNecramech {
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
 * Transform wikia lua necramechs into usable standardized json
 * @param oldMech - old necramech in lua format
 * @param imageUrls - name-url pairs
 * @returns transformed necramech data
 */
export default (
  oldMechs: OldNecramech,
  imageUrls: Record<string, string>,
  _blueprints?: Record<string, unknown>
): WikiaNecramech | undefined => {
  let newMechs: WikiaNecramech | undefined;
  if (!oldMechs.Name) {
    throw new Error('Missing necramech Name');
  }

  try {
    const { Image, Mastery, Polarities, Sprint, Introduced, Vaulted, InternalName, Name } = oldMechs;

    newMechs = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      mr: Mastery ?? 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      vaulted: Vaulted ?? undefined,
      thumbnail: imageUrls[Image ?? ''],
    };
    newMechs = transformPolarity(oldMechs, newMechs);
  } catch (error) {
    console.error(`Error parsing ${oldMechs.Name}`);
    throw error;
  }
  return newMechs;
};
