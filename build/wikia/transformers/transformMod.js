'use strict'

module.exports = async (oldMod, imageUrls) => {
  let newMod
  if (!oldMod || !oldMod.Name) {
    return undefined
  }

  try {
    const {
      Image,
      Name,
      Transmutable,
      Introduced
    } = oldMod

    newMod = {
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      thumbnail: imageUrls[Image],
      transmutable: Transmutable,
      introduced: Introduced
    }
  } catch (error) {
    console.error(`Error parsing ${oldMod.Name}`)
    console.error(error)
  }
  return newMod
}
