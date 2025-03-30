export default async (oldArcane, imageUrls) => {
  let newArcane;
  if (!oldArcane || !oldArcane.Name) {
    return undefined;
  }

  try {
    const { Image, Name, Transmutable, Introduced, Type, InternalName } = oldArcane;

    newArcane = {
      name: Name,
      uniqueName: InternalName,
      url: `https://wiki.warframe.com/w/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      transmutable: Transmutable,
      introduced: Introduced,
      type: Type,
      thumbnail: imageUrls?.[Image],
    };
  } catch (error) {
    console.error(`Error parsing ${oldArcane.Name}`);
    console.error(error);
  }
  return newArcane;
};
