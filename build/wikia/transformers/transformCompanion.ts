import transformPolarity from './transformPolarity';
import type { WikiaCompanion } from '../../types/shared';

interface OldCompanion {
  Name?: string;
  Image?: string;
  Mastery?: number;
  Polarities?: string[];
  Stamina?: number;
  Introduced?: string;
  Vaulted?: boolean;
  VaultDate?: string;
  EstimatedVaultDate?: string;
  InternalName?: string;
  [key: string]: unknown;
}

/**
 * Transform wikia lua companions into usable standardized json
 * @param oldCompanion - old companion in lua format
 * @param imageUrls - name-url pairs
 * @returns transformed companion data
 */
export default (
  oldCompanion: OldCompanion,
  imageUrls: Record<string, string>,
  _blueprints?: Record<string, unknown>
): WikiaCompanion | undefined => {
  let newCompanion: WikiaCompanion | undefined;
  if (!oldCompanion.Name) {
    throw new Error('Companion record missing required Name field');
  }

  try {
    const { Image, Mastery, Polarities, Stamina, Introduced, Vaulted, VaultDate, EstimatedVaultDate, InternalName } =
      oldCompanion;
    const { Name } = oldCompanion;

    newCompanion = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_').replace('_Prime', '/Prime'))}`,
      mr: Mastery ?? 0,
      polarities: Polarities,
      stamina: Stamina,
      introduced: Introduced,
      vaulted: Vaulted ?? undefined,
      vaultDate: VaultDate,
      estimatedVaultDate: EstimatedVaultDate,
      thumbnail: imageUrls[Image ?? ''],
    };
    newCompanion = transformPolarity(oldCompanion, newCompanion);
  } catch (error) {
    console.error(`Error parsing ${oldCompanion.Name}`);
    throw error;
  }
  return newCompanion;
};
