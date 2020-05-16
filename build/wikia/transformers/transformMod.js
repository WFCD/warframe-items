'use strict'

const transformMod = async (oldMod, imageUrls) => {
  let newMod
  if (!oldMod || !oldMod.Name) {
    return undefined
  }

  try {
    const {
      Image,
      Name,
      Transmutable
    } = oldMod

    newMod = {
      name: Name,
      url: `http://warframe.fandom.com/wiki/${encodeURIComponent(Name.replace(/\s/g, '_'))}`,
      thumbnail: imageUrls[Image],
      transmutable: Transmutable
    }
  } catch (error) {
    console.error(`Error parsing ${oldMod.Name}`)
    console.error(error)
  }
  return newMod
}

module.exports = transformMod
