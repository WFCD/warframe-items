import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { load } from 'cheerio';
import cmd from 'node-cmd';
import fetch from 'node-fetch';

const run = promisify(cmd.run);

const blueprintUrl = 'https://wiki.warframe.com/w/Module:Blueprints/data?action=edit';

const getLuaData = async (url: string): Promise<string> => {
  try {
    const $ = load(await fetch(url).then((data) => data.text()));
    return $('#wpTextbox1').text();
  } catch (err) {
    console.error('Failed to fetch latest Lua data:', err);
    throw err;
  }
};

const convertLuaDataToJson = async (luaData: string, luaDataName: string): Promise<Record<string, unknown>> => {
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
    return JSON.parse(dataRaw) as Record<string, unknown>;
  } catch (err) {
    console.error(`Failed to execute modified lua script:\n${String(err)}`);
    throw err;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
};

const getImageUrls = async (things: Record<string, { Image?: string }>): Promise<Record<string, string>> => {
  const titles: string[] = [];
  Object.keys(things).forEach((thingName) => {
    const thing = things[thingName];
    if (thing?.Image) {
      titles.push(`File:${thing.Image}`);
    }
  });

  // Split titles into batches of 50, the max allowed by the wikimedia API
  const titleBatches: string[][] = [];
  while (titles.length > 0) {
    titleBatches.push(titles.splice(0, 50));
  }

  const urlRequests = titleBatches.map(async (titleBatch) => {
    const params = ['action=query', `titles=${titleBatch.join('|')}`, 'prop=imageinfo', 'iiprop=url', 'format=json'];
    const request = new fetch.Request(`https://wiki.warframe.com/api.php?${params.join('&')}`);
    const d = await fetch(request);
    if (!d.ok) {
      throw new Error(`Image URL fetch failed: ${String(d.status)} ${d.statusText}`);
    }
    return await d.json();
  });

  try {
    return await Promise.all(urlRequests)
      .then((res) => {
        const urls: Record<string, string> = {};
        res.forEach((data: any) => {
          const pages = data?.query?.pages;
          if (pages) {
            Object.keys(pages).forEach((id) => {
              if (parseInt(id, 10) > -1) {
                const page = pages[id];
                const title = page?.title?.replace('File:', '');
                const imageInfo = page?.imageinfo?.[0];
                if (title && imageInfo?.url) {
                  urls[title] = imageInfo.url;
                }
              }
            });
          }
        });
        return urls;
      })
      .catch((err: unknown) => {
        console.error(err);
        return {};
      });
  } catch (err) {
    console.error('Failed to fetch image URLs:');
    console.error(err);
    return {};
  }
};

const defaultTransform = async (): Promise<undefined> => Promise.resolve(undefined);

const nameCompare = <T extends { name: string }>(first: T, second: T): number => {
  if (first.name < second.name) {
    return -1;
  }
  if (first.name > second.name) {
    return 1;
  }
  return 0;
};

type TransformFunction<T> = (
  data: Record<string, unknown>,
  imageUrls: Record<string, string>,
  blueprints: Record<string, unknown>
) => T | undefined | Promise<T | undefined>;

const blueprintsPromise: Promise<Record<string, unknown>> = (async () => {
  const data = await convertLuaDataToJson(await getLuaData(blueprintUrl), 'BlueprintsData');
  const typedData = data as { Blueprints?: Record<string, unknown>; Suits?: Record<string, unknown> };
  const { Blueprints = {}, Suits = {} } = typedData;
  return { ...Blueprints, ...Suits };
})().catch((err: unknown) => {
  console.error('Failed to load blueprints:', err);
  return {};
});

/**
 * Scrape Wikia data from data modules
 */
export default class WikiaDataScraper<T extends { name: string }> {
  private readonly url?: string;
  private urls?: string[];
  private readonly luaObjectName: string;
  private readonly transformFunction: TransformFunction<T>;

  constructor(url: string | string[], luaObjectName: string, transformFunction?: TransformFunction<T>) {
    if (Array.isArray(url)) {
      this.urls = url;
    } else {
      this.url = url;
    }
    this.luaObjectName = luaObjectName;
    this.transformFunction = transformFunction ?? (defaultTransform as TransformFunction<T>);
  }

  async scrape(): Promise<T[]> {
    const jsonData: Record<string, Record<string, unknown>> = {};
    jsonData[`${this.luaObjectName}s`] = {};
    if (this.url) {
      const luaData = await getLuaData(this.url);
      const jTemp = await convertLuaDataToJson(luaData, this.luaObjectName);
      Object.keys(jTemp).forEach((key) => {
        const item = jTemp[key] as Record<string, unknown>;
        if (!item.name) {
          jsonData[`${this.luaObjectName}s`] = {
            ...jsonData[`${this.luaObjectName}s`],
            ...jTemp,
          };
        }
      });
    } else if (this.urls?.length) {
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
    const luaObjectsData = jsonData[`${this.luaObjectName}s`];
    if (luaObjectsData?.[`${this.luaObjectName}s`]) {
      const nestedData = luaObjectsData[`${this.luaObjectName}s`];
      if (nestedData) {
        jsonData[`${this.luaObjectName}s`] = nestedData as Record<string, unknown>;
      }
    }

    if (!Object.keys(jsonData[`${this.luaObjectName}s`] ?? {}).length) {
      throw new Error('No json data');
    }
    const imageUrls = await getImageUrls(jsonData[`${this.luaObjectName}s`] as Record<string, { Image?: string }>);

    const blueprintData = await blueprintsPromise;
    const things: T[] = [];

    try {
      const luaObjData = jsonData[`${this.luaObjectName}s`];
      if (luaObjData) {
        await Promise.all(
          Object.keys(luaObjData).map(async (thingName) => {
            const thingToTransform = luaObjData[thingName] as Record<string, unknown>;
            thingToTransform.Name ??= thingName;
            const transformedThing = await this.transformFunction(thingToTransform, imageUrls, blueprintData);
            if (transformedThing) {
              things.push(transformedThing);
            }
          })
        );
      }
      things.sort(nameCompare);
    } catch (e) {
      const error = e as Error;
      console.error(error.stack);
    }
    if (!things.length) console.error(`scraped no ${this.luaObjectName}`);
    return things;
  }
}
