import type { WikiaVersion } from '../../types/shared';

interface OldVersion {
  Name?: string;
  Link?: string;
  Date?: string;
  Parent?: string;
  Aliases?: string[];
  [key: string]: unknown;
}

export default (oldVersion: OldVersion): WikiaVersion | undefined => {
  let newVersion: WikiaVersion | undefined;

  if (!oldVersion.Name) {
    return undefined;
  }

  try {
    const { Name, Link, Date, Parent, Aliases } = oldVersion;
    const linkTarget = Link?.trim() ?? Name;
    newVersion = {
      name: Name,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(linkTarget.replace(/\s/g, '_'))}`,
      aliases: Aliases ?? [],
      parent: Parent,
      date: Date,
    };
  } catch (error) {
    console.error(`Error parsing ${oldVersion.Name}`);
    console.error(error);
  }
  return newVersion;
};
