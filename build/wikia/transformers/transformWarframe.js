'use strict'

const getColors = require('get-image-colors')
const imageDownloader = require('image-downloader')
const POLARITIES = require('./polarities')

const transformPolarities = ({ Polarities, AuraPolarity }, targetWeapon) => {
  const outputFrame = { ...targetWeapon }
  if (AuraPolarity) {
    outputFrame.auraPolarity = (POLARITIES[AuraPolarity] || AuraPolarity || '').toLowerCase()
    if (outputFrame.auraPolarity && !outputFrame.auraPolarity.length) outputFrame.auraPolarity = undefined
    if (outputFrame.auraPolarity === 'none') outputFrame.auraPolarity = undefined
  }
  if (Polarities) {
    outputFrame.polarities = Polarities.map(polarity => {
      let out
      out = (POLARITIES[polarity] || polarity || '').toLowerCase()
      if (out && !out.length) out = undefined
      return out
    }).filter(p => p)
  } else {
    outputFrame.polarities = []
  }
  return outputFrame
}

const mapColors = async (oldFrame, imageUrl) => {
  if (!imageUrl) return 0

  try {
    const options = {
      url: imageUrl,
      dest: `tmp/tmp-${oldFrame.Name}.png`
    }
    const { image } = await imageDownloader.image(options)
    const colors = await getColors(image, 'image/png')
    return typeof colors !== 'undefined' ? colors[0].hex().replace('#', '0x') : 0xff0000
  } catch (e) {
    if (process.env.DEBUG) console.error(e)
    return 0
  }
}

module.exports = async (oldFrame, imageUrls) => {
  let newFrame
  if (!oldFrame || !oldFrame.Name) {
    return undefined
  }

  try {
    const {
      AuraPolarity,
      Conclave,
      Image,
      Mastery,
      Polarities,
      Sprint,
      Introduced,
      Sex,
      Vaulted
    } = oldFrame
    const { Name } = oldFrame

    newFrame = {
      name: Name,
      url: `https://warframe.fandom.com/wiki/${encodeURIComponent(Name.replace(/\s/g, '_').replace('_Prime', '/Prime'))}`,
      thumbnail: imageUrls[Image],
      auraPolarity: AuraPolarity,
      conclave: Conclave,
      mr: Mastery || 0,
      polarities: Polarities,
      sprint: Sprint,
      introduced: Introduced,
      sex: Sex,
      color: parseInt(await mapColors(oldFrame, imageUrls[Image]), 16),
      vaulted: Vaulted || undefined
    }
    newFrame = transformPolarities(oldFrame, newFrame)
  } catch (error) {
    console.error(`Error parsing ${oldFrame.Name}`)
    console.error(error)
  }
  return newFrame
}
