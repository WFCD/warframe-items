import transformPolarity from './transformPolarity.mjs';

/**
 * Transform wikia lua archwings into usable standardized json
 * @param {Object} oldWings old archwing in lua format
 * @param {Record<string, unknown>} imageUrls name-url pairs
 * @returns {Promise<WikiaArchwing>}
 */
export default async (oldWings, imageUrls) => {
  let newWings;
  if (!oldWings || !oldWings.Name) {
    return undefined;
  }

  try {
    const { Image, Mastery, Polarities, Sprint, Introduced, Vaulted } = oldWings;
    const { Name } = oldWings;

    newWings = {
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(
        Name.replace(/\s/g, '_').replace('_Prime', '/Prime')
      )}`,
      mr: Mastery || 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      vaulted: Vaulted || undefined,
      thumbnail: imageUrls?.[Image],
    };
    newWings = transformPolarity(oldWings, newWings);
  } catch (error) {
    console.error(`Error parsing ${oldWings.Name}`);
    console.error(error);
  }
  return newWings;
};
