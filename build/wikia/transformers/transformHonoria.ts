import { WikiaHonorium } from 'types/shared';

interface OldHonoria {
  InternalName: string;
  Name: string;
  Position: string;
}

export default (oldHonoria: OldHonoria): WikiaHonorium | undefined => {
  let newHonoria: WikiaHonorium | undefined;
  if (!oldHonoria.Name) return undefined;

  let position = oldHonoria.Position;
  // https://en.wikipedia.org/wiki/Expletive_infixation
  if (position == 'Suffix & Prefix') position = 'Expletive';

  try {
    newHonoria = {
      uniqueName: oldHonoria.InternalName,
      name: oldHonoria.Name,
      position: position,
      wikiaUrl: `https://wiki.warframe.com/w/Honoria#${oldHonoria.Name.replaceAll(' ', '_')}`,
    };
  } catch (error) {
    console.error(`Error parsing ${oldHonoria.Name}`);
    throw error;
  }

  return newHonoria;
};
