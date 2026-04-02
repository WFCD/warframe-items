import fs from 'node:fs/promises';

const jsonCache = new Map<string, unknown>();

/**
 * @param jsonURL URL to json file
 * @returns Parsed JSON content
 */
export default async <T = unknown>(jsonURL: URL): Promise<T> => {
  const { pathname } = jsonURL;
  if (!jsonCache.has(pathname)) {
    jsonCache.set(pathname, JSON.parse(await fs.readFile(jsonURL, { encoding: 'utf-8' })));
  }

  return jsonCache.get(pathname) as T;
};
