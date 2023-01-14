import fs from 'node:fs/promises';

const jsonCache = new Map();

/**
 * @param {URL} jsonURL URL to json file
 * @returns {Promise<Record<string, *> | Array<*>>}
 */
export default async (jsonURL) => {
  const { pathname } = jsonURL;
  if (!jsonCache.has(pathname)) {
    jsonCache.set(pathname, JSON.parse(await fs.readFile(jsonURL, { encoding: 'utf-8' })));
  }

  return jsonCache.get(pathname);
};
