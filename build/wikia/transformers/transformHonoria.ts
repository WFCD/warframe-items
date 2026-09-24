import type { WikiaHonorium } from '../../types/shared';

enum CurrencyType {
  cc = 'Credits',
  sc = 'Standing',
  pc = 'Platinum',
  ec = 'Endo',
  kc = 'Kuva',
  nc = 'Nightwave Credits',
  ac = 'Aya'
}

interface OldHonoria {
  InternalName: string;
  Name: string;
  Description: string;
  Position: string;
  Price: object;
  Tags: string[];
  [key: string]: unknown;
}

const parseWikiSyntax = (text: string) => {
  const link = /\[{2}([^\]|]+)(?:\|([^\]]+))?\]{2}/g;
  const template = /\{{2}([^]+)\|([^]+)\}{2}/g;

  let sanitized = text.replaceAll(
    link,
    (_, g1: string, g2: string) => g2 || g1
  );
  if (template.test(sanitized) && !sanitized.includes('||')) {
    sanitized = sanitized.replaceAll(
      template,
      (_, g1: string, g2: string) =>
        `${g2} ${CurrencyType[g1 as keyof typeof CurrencyType] ?? ''}`
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

export default (data: Record<string, unknown>): WikiaHonorium | undefined => {
  const oldHonoria = data as unknown as OldHonoria;
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
      wikiaTags: oldHonoria.Tags
    };
  } catch (error) {
    console.error(`Error parsing ${oldHonoria.Name}`);
    throw error;
  }

  return newHonoria;
};
