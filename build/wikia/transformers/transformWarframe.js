'use strict';

const getColors = require('get-image-colors');
const imageDownloader = require('image-downloader');
const transformPolarity = require('./transformPolarity');

const mapColors = async (oldFrame, imageUrl) => {
  if (!imageUrl) return 0;

  try {
    const options = {
      url: imageUrl,
      dest: `tmp/tmp-${oldFrame.Name}.png`,
    };
    const { image } = await imageDownloader.image(options);
    const colors = await getColors(image, 'image/png');
    return typeof colors !== 'undefined' ? colors[0].hex().replace('#', '0x') : 0xff0000;
  } catch (e) {
    if (process.env.DEBUG) console.error(e);
    return 0;
  }
};

/**
 * Transform wikia lua weapons into usable standardized json
 * @param {Object} oldFrame old warframe in lua format
 * @param {Record<string, unknown>} imageUrls name-url pairs
 * @param {Record<string, Object>} blueprints blueprint objects
 * @returns {Promise<WikiaWarframe>}
 */
module.exports = async (oldFrame, imageUrls, blueprints) => {
  let newFrame;
  if (!oldFrame || !oldFrame.Name) {
    return undefined;
  }

  try {
    const { AuraPolarity, Conclave, Image, Mastery, Polarities, Sprint, Introduced, Sex, Vaulted } = oldFrame;
    const { Name } = oldFrame;

    newFrame = {
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(
        Name.replace(/\s/g, '_').replace('_Prime', '/Prime')
      )}`,
      auraPolarity: AuraPolarity,
      conclave: Conclave,
      mr: Mastery || 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      sex: Sex,
      vaulted: Vaulted || undefined,
      thumbnail: imageUrls?.[Image],
      color: parseInt(await mapColors(oldFrame, imageUrls?.[Image]), 16),
      marketCost: blueprints[Name] && blueprints[Name].MarketCost,
      bpCost: blueprints[Name] && blueprints[Name].BPCost,
    };
    newFrame = transformPolarity(oldFrame, newFrame);
  } catch (error) {
    console.error(`Error parsing ${oldFrame.Name}`);
    console.error(error);
  }
  return newFrame;
};
