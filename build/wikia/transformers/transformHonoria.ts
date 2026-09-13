import { WikiaHonorium } from 'types/shared';

interface OldHonoria {
  InternalName: string;
  Name: string;
  Description: string;
  Position: string;
  Price: object;
  Tags: string[];
}

const parseWikiSyntax = (text: string) => {
  const link = /\[{2}([^\]|]+)(?:\|([^\]]+))?\]{2}/g;
  const template = /\{{2}([^]+)\|([^]+)\}{2}/g;

  // {{cc|Credits_Number}} {{pc|Platinum_Number}} {{ec|Endo_Number}} {{sc|Standing_Number}} {{kc|Kuva_Number}} {{nc|Nightwave_Cred_Number}} {{ac|Aya_Number}}
  const currency = (type: string): string | undefined => {
    switch (type) {
      case 'cc':
        return 'Credits';
      case 'sc':
        return 'Standing';
      case 'pc':
        return 'Platinum';
      case 'ec':
        return 'Endo';
      case 'kc':
        return 'Kuva';
      case 'nc':
        return 'Nightwave credits';
      case 'ac':
        return 'Aya';
    }
  };

  let sanitized = text.replaceAll(
    link,
    (_, g1: string, g2: string) => g2 || g1
  );
  if (template.test(sanitized) && !sanitized.includes('||')) {
    sanitized = sanitized.replaceAll(
      template,
      (_, g1: string, g2: string) => `${g2} ${currency(g1) ?? ''}`
    );
  } else {
    const input1 = /[^]+\|{2}/;
    const input2 = /[^|]+=/;
    sanitized = sanitized.replaceAll(
      template,
      (_, g1: string, g2: string) =>
        `${g1.replace(input1, '')} ${g2.replace(input2, '')}`
    );
  }

  return sanitized.trim();
};

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
      description: oldHonoria.Description
        ? parseWikiSyntax(oldHonoria.Description)
        : undefined,
      position: position,
      price: oldHonoria.Price,
      wikiaUrl: `https://wiki.warframe.com/w/Honoria#${oldHonoria.Name.replaceAll(' ', '_')}`,
      wikiaTags: oldHonoria.Tags,
    };
  } catch (error) {
    console.error(`Error parsing ${oldHonoria.Name}`);
    throw error;
  }

  return newHonoria;
};
