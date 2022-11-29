export default async (oldVersion) => {
  let newVersion;

  if (!oldVersion || !oldVersion.Name) {
    return undefined;
  }

  try {
    const { Name, Link, Date, Parent, Aliases } = oldVersion;

    newVersion = {
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(Link.replace(/\s/g, '_'))}`,
      aliases: Aliases,
      parent: Parent,
      date: Date,
    };
  } catch (error) {
    console.error(`Error parsing ${oldVersion.Name}`);
    console.error(error);
  }
  return newVersion;
};
