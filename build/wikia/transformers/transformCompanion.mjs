import transformPolarity from './transformPolarity.mjs';

/**
 * Transform wikia lua companions into usable standardized json
 * @param {Object} oldCompanion old companion in lua format
 * @param {Record<string, unknown>} imageUrls name-url pairs
 * @returns {Promise<WikiaCompanion>}
 */
export default async (oldCompanion, imageUrls) => {
  let newCompanion;
  if (!oldCompanion || !oldCompanion.Name) {
    return undefined;
  }

  try {
    const { Image, Mastery, Polarities, Stamina, Introduced, Vaulted, VaultDate, EstimatedVaultDate, InternalName } =
      oldCompanion;
    const { Name } = oldCompanion;

    newCompanion = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_').replace('_Prime', '/Prime'))}`,
      mr: Mastery || 0,
      polarities: Polarities,
      stamina: Stamina,
      introduced: Introduced,
      vaulted: Vaulted || undefined,
      vaultDate: VaultDate,
      estimatedVaultDate: EstimatedVaultDate,
      thumbnail: imageUrls?.[Image],
    };
    newCompanion = transformPolarity(oldCompanion, newCompanion);
  } catch (error) {
    console.error(`Error parsing ${oldCompanion.Name}`);
    console.error(error);
  }
  return newCompanion;
};
