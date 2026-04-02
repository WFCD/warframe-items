import getColors from 'get-image-colors';
import { image as downloadImage } from 'image-downloader';

import transformPolarity from './transformPolarity';
import type { WikiaWarframe, Blueprint } from '../../types/shared';

interface OldWarframe {
  Name?: string;
  AuraPolarity?: string;
  Conclave?: number;
  Image?: string;
  Mastery?: number;
  Polarities?: string[];
  Sprint?: number;
  Introduced?: string;
  Sex?: string;
  Vaulted?: boolean;
  InternalName?: string;
  [key: string]: unknown;
}

const mapColors = async (oldFrame: OldWarframe, imageUrl?: string): Promise<number> => {
  if (!imageUrl) return 0;

  try {
    const options = {
      url: imageUrl,
      dest: `tmp/tmp-${oldFrame.Name ?? 'unknown'}.png`,
    };
    const result = await downloadImage(options);
    const colors = await getColors(result.image, 'image/png');
    return colors.length > 0 && colors[0] ? parseInt(colors[0].hex().replace('#', '0x'), 16) : 0xff0000;
  } catch (e) {
    if (process.env.DEBUG) console.error(e);
    return 0;
  }
};

/**
 * Transform wikia lua weapons into usable standardized json
 * @param oldFrame - old warframe in lua format
 * @param imageUrls - name-url pairs
 * @param blueprints - blueprint objects
 * @returns transformed warframe data
 */
export default async (
  oldFrame: OldWarframe,
  imageUrls: Record<string, string>,
  blueprints: Record<string, unknown>
): Promise<WikiaWarframe | undefined> => {
  let newFrame: WikiaWarframe | undefined;
  if (!oldFrame.Name) {
    throw new Error('Missing warframe Name');
  }

  try {
    const { AuraPolarity, Conclave, Image, Mastery, Polarities, Sprint, Introduced, Sex, Vaulted, InternalName } =
      oldFrame;
    const { Name } = oldFrame;

    newFrame = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_').replace('_Prime', '/Prime'))}`,
      auraPolarity: AuraPolarity,
      conclave: Conclave,
      mr: Mastery ?? 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      sex: Sex,
      vaulted: Vaulted ?? undefined,
      thumbnail: imageUrls[Image ?? ''],
      color: await mapColors(oldFrame, imageUrls[Image ?? '']),
      marketCost:
        blueprints[Name] && typeof (blueprints[Name] as Blueprint).MarketCost === 'number'
          ? ((blueprints[Name] as Blueprint).MarketCost as number)
          : undefined,
      bpCost:
        blueprints[Name] && typeof (blueprints[Name] as Blueprint).BPCost === 'number'
          ? ((blueprints[Name] as Blueprint).BPCost as number)
          : undefined,
    };
    newFrame = transformPolarity(oldFrame, newFrame);
  } catch (error) {
    console.error(`Error parsing ${oldFrame.Name}`);
    throw error;
  }
  return newFrame;
};
