export default async (oldMod, imageUrls) => {
  let newMod;
  if (!oldMod || !oldMod.Name) {
    return undefined;
  }

  try {
    const { Image, Name, Transmutable, Introduced, InternalName } = oldMod;

    newMod = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      transmutable: Transmutable,
      introduced: Introduced,
      thumbnail: imageUrls?.[Image],
    };
  } catch (error) {
    console.error(`Error parsing ${oldMod.Name}`);
    console.error(error);
  }
  return newMod;
};
