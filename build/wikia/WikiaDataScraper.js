'use strict'

const cheerio = require('cheerio')
const axios = require('axios')
const fs = require('fs-extra')
const cmd = require('node-cmd')

const getLuaData = async (url) => {
  try {
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)
    return $('#wpTextbox1').text()
  } catch (err) {
    console.error('Failed to fetch latest Lua data:')
    console.error(err)
    return ''
  }
}

const convertLuaDataToJson = async (luaWeapondata, luaDataName) => {
  const scriptlines = luaWeapondata.split('\n')

  // Remove return statement
  const modifiedScript = scriptlines
    .slice(0, scriptlines.length - 2)
    .join('\n')

  // Add JSON conversion
  const luaToJsonScript = `
    JSON = (loadfile "build/wikia/JSON.lua")()\n
    ${modifiedScript}\n
    print(JSON:encode(${luaDataName}Data))
  `

  // Run updated JSON lua script
  if (!await fs.exists('./tmp')) {
    await fs.mkdir('./tmp')
  }
  await fs.writeFile('./tmp/dataraw.lua', luaToJsonScript, {
    encoding: 'utf8',
    flag: 'w'
  })

  try {
    await new Promise((resolve, reject) => cmd.get('lua ./tmp/dataraw.lua > ./tmp/dataraw.json', (err) => {
      if (!err) {
        resolve()
      } else {
        reject(err)
        throw (new Error(err))
      }
    }))
  } catch (err) {
    console.error(`Failed to execute modified lua script:\n${err}`)
    console.error(err)
  }
  const dataRaw = await fs.readFile('./tmp/dataraw.json', 'UTF-8')
  return JSON.parse(dataRaw)
}

const getImageUrls = async (things) => {
  const titles = []
  Object.keys(things).forEach((thingName) => {
    titles.push(`File:${things[thingName].Image}`)
  })

  // Split titles into batches of 50, the max allowed by the wikimedia API
  const titleBatches = []
  while (titles.length > 0) {
    titleBatches.push(titles.splice(0, 50))
  }

  const urlRequests = titleBatches.map(titleBatch =>
    axios.get('http://warframe.wikia.com/api.php', {
      params: {
        action: 'query',
        titles: titleBatch.join('|'),
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json'
      }
    }))

  try {
    const fetchedImageUrls = await Promise.all(urlRequests).then((res) => {
      const urls = {}
      res.forEach(({ data }) => {
        Object.keys(data.query.pages).forEach((id) => {
          if (id > -1) {
            const title = data.query.pages[id].title.replace('File:', '')
            const { url } = data.query.pages[id].imageinfo[0]
            urls[title] = url
          }
        })
      })
      return urls
    })

    return fetchedImageUrls
  } catch (err) {
    console.error('Failed to fetch image URLs:')
    console.error(err)
    return []
  }
}

const defaultTransform = async (things, imageUrls) => {
  return false
}

const nameCompare = (first, second) => {
  if (first.name < second.name)
  { return -1 }
  if (first.name > second.name)
  { return 1 }
  return 0
}

class WikiaDataScraper {
  constructor (url, luaObjectName, transformFunction) {
    this.url = url
    this.luaObjectName = luaObjectName
    this.transformFunction = transformFunction
    if (typeof transformFunction === 'undefined') {
      this.transformFunction = defaultTransform
    }
  }

  async scrape () {
    const luaData = await getLuaData(this.url)
    const jsonData = await convertLuaDataToJson(luaData, this.luaObjectName)
    if (jsonData.length === 0) {
      throw new Error('No json data')
    }

    if (!await fs.exists('./build')) {
      await fs.mkdir('./build')
    }
    const imageUrls = await getImageUrls(jsonData[`${this.luaObjectName}s`])

    let things = []

    try {
      const keys = Object.keys(jsonData[`${this.luaObjectName}s`])

      await Promise.all(await keys.map(async thingName => {
        const thingToTransform = jsonData[`${this.luaObjectName}s`][thingName]
        const transformedThing = await this.transformFunction(thingToTransform, imageUrls)
        things.push(transformedThing)
      }))
      things.sort(nameCompare)
    } catch (e) {
      console.error(e.stack)
    }
    return things
  }
}

module.exports = WikiaDataScraper
