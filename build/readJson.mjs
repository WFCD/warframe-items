import fs from 'node:fs/promises';

const jsonCache = new Map();

/**
 * @param {URL} jsonURL URL to json file
 * @returns {Promise<Record<string, *> | Array<*>>}
 */
export default async (jsonURL) => {
  const { pathname } = jsonURL;
  if (jsonCache.has(pathname)) {
    return jsonCache.get(pathname);
  }

  return JSON.parse(await fs.readFile(jsonURL, { encoding: 'utf-8' }));
};
