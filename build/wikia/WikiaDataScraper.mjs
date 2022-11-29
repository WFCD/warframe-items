import cheerio from 'cheerio';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import cmd from 'node-cmd';
import fetch from 'node-fetch';

const run = promisify(cmd.get);

const blueprintUrl = 'https://warframe.fandom.com/wiki/Module:Blueprints/data?action=edit';

const getLuaData = async (url) => {
  try {
    const $ = cheerio.load(await fetch(url).then((data) => data.text()));
    return $('#wpTextbox1').text();
  } catch (err) {
    console.error('Failed to fetch latest Lua data:');
    console.error(err);
    return '';
  }
};

const convertLuaDataToJson = async (luaData, luaDataName) => {
  const objReturn = `return ${luaDataName}Data`;
  const hasObjReturn = luaData.includes(objReturn);

  const modifiedScript = hasObjReturn
    ? luaData.replace(objReturn, '')
    : luaData.replace('return {', `local ${luaDataName}Data = {`);

  // Add JSON conversion
  const luaToJsonScript = `JSON = (loadfile "build/wikia/JSON.lua")()
${modifiedScript}
print(JSON:encode(${luaDataName}Data))
`;

  // Run updated JSON lua script
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-'));
  const lua = path.join(temp, 'dataraw.lua');
  const json = path.join(temp, 'dataraw.json');
  await fs.writeFile(path.join(temp, 'dataraw.lua'), luaToJsonScript, {
    encoding: 'utf8',
    flag: 'w',
  });

  try {
    await run(`lua ${lua} > ${json}`);
    const dataRaw = await fs.readFile(json, { encoding: 'utf8' });
    return JSON.parse(dataRaw);
  } catch (err) {
    console.error(`Failed to execute modified lua script:\n${err}`);
    console.error(err);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
};

const getImageUrls = async (things) => {
  const titles = [];
  Object.keys(things).forEach((thingName) => {
    titles.push(`File:${things[thingName].Image}`);
  });

  // Split titles into batches of 50, the max allowed by the wikimedia API
  const titleBatches = [];
  while (titles.length > 0) {
    titleBatches.push(titles.splice(0, 50));
  }

  const urlRequests = titleBatches.map((titleBatch) => {
    const params = ['action=query', `titles=${titleBatch.join('|')}`, 'prop=imageinfo', 'iiprop=url', 'format=json'];
    const request = new fetch.Request(`https://warframe.fandom.com/api.php?${params.join('&')}`);
    return fetch(request).then((d) => d.json());
  });

  try {
    return Promise.all(urlRequests)
      .then((res) => {
        const urls = {};
        res.forEach((data) => {
          Object.keys(data.query.pages).forEach((id) => {
            if (id > -1) {
              const title = data.query.pages[id].title.replace('File:', '');
              const { url } = data.query.pages[id].imageinfo[0];
              urls[title] = url;
            }
          });
        });
        return urls;
      })
      .catch(console.error);
  } catch (err) {
    console.error('Failed to fetch image URLs:');
    console.error(err);
    return {};
  }
};

const defaultTransform = async () => false;

const nameCompare = (first, second) => {
  if (first.name < second.name) {
    return -1;
  }
  if (first.name > second.name) {
    return 1;
  }
  return 0;
};

let blueprints;

(async () => {
  const { Blueprints, Suits } = await convertLuaDataToJson(await getLuaData(blueprintUrl), 'BlueprintsData');
  blueprints = { ...Blueprints, ...Suits };
})();

/**
 * Scrape Wikia data from data modules
 */
export default class WikiaDataScraper {
  constructor(url, luaObjectName, transformFunction) {
    if (Array.isArray(url)) {
      this.urls = url;
    } else {
      this.url = url;
    }
    this.luaObjectName = luaObjectName;
    this.transformFunction = transformFunction;
    if (typeof transformFunction === 'undefined') {
      this.transformFunction = defaultTransform;
    }
  }

  async scrape() {
    const jsonData = {};
    jsonData[`${this.luaObjectName}s`] = {};
    if (this.url) {
      const luaData = await getLuaData(this.url);
      const jTemp = await convertLuaDataToJson(luaData, this.luaObjectName);
      Object.keys(jTemp).forEach((key) => {
        if (!jTemp[key].name) {
          jsonData[`${this.luaObjectName}s`] = {
            ...jsonData[`${this.luaObjectName}s`],
            ...jTemp,
          };
        }
      });
    } else if (this.urls.length) {
      await Promise.all(
        this.urls.map(async (url) => {
          const luaData = await getLuaData(url);
          const jTemp = await convertLuaDataToJson(luaData, this.luaObjectName);
          jsonData[`${this.luaObjectName}s`] = {
            ...jsonData[`${this.luaObjectName}s`],
            ...jTemp,
          };
        })
      );
    }
    if (jsonData[`${this.luaObjectName}s`][`${this.luaObjectName}s`]) {
      jsonData[`${this.luaObjectName}s`] = jsonData[`${this.luaObjectName}s`][`${this.luaObjectName}s`];
    }

    if (!Object.keys(jsonData).length) {
      throw new Error('No json data');
    }
    const imageUrls = await getImageUrls(jsonData[`${this.luaObjectName}s`]);

    const things = [];

    try {
      await Promise.all(
        Object.keys(jsonData[`${this.luaObjectName}s`]).map(async (thingName) => {
          const thingToTransform = jsonData[`${this.luaObjectName}s`][thingName];
          if (thingToTransform && !thingToTransform.Name) thingToTransform.Name = thingName;
          const transformedThing = await this.transformFunction(thingToTransform, imageUrls, blueprints);
          things.push(transformedThing);
        })
      );

      things.sort(nameCompare);
    } catch (e) {
      console.error(e.stack);
    }
    if (!things.length) console.error(`scraped no ${this.luaObjectName}`);
    return things;
  }
}
