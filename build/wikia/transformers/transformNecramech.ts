import transformPolarity from './transformPolarity';
import type { WikiaNecramech, Blueprint } from '../../types/shared';

interface OldNecramech {
  Name?: string;
  Image?: string;
  Conclave?: number;
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
 * @param blueprints - blueprint objects
 * @returns transformed necramech data
 */
export default (
  oldMech: OldNecramech,
  imageUrls: Record<string, string>,
  blueprints: Record<string, unknown>
): WikiaNecramech | undefined => {
  let newMech: WikiaNecramech | undefined;
  if (!oldMech.Name) {
    throw new Error('Missing necramech Name');
  }

  try {
    const { Name, Conclave, Image, Mastery, Polarities, Sprint, Introduced, Vaulted, InternalName }
      = oldMech;

    newMech = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      conclave: Conclave,
      mr: Mastery ?? 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      vaulted: Vaulted ?? undefined,
      thumbnail: imageUrls[Image ?? ''],
      marketCost:
        blueprints[Name] && typeof (blueprints[Name] as Blueprint).MarketCost === 'number'
          ? ((blueprints[Name] as Blueprint).MarketCost as number)
          : undefined,
    };
    newMech = transformPolarity(oldMech, newMech);
  } catch (error) {
    console.error(`Error parsing ${oldMech.Name}`);
    throw error;
  }
  return newMech;
};
