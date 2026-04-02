import fetch from 'node-fetch';

import getProxyAgent from './proxyAgent';

const prod = process.env.NODE_ENV === 'production';

const agent = getProxyAgent();

// eslint-disable-next-line no-control-regex
const sanitize = (str: string): string => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, "'");

export const get = async (url: string, disableProxy = !prod, compress = false): Promise<Uint8Array | string> => {
  const res = await fetch(url, {
    agent: disableProxy ? undefined : agent,
    headers: {
      'user-agent': 'node-fetch (warframe-items)',
    },
  });
  if (res.ok) {
    return !compress ? Uint8Array.from(await res.buffer()) : res.text();
  }
  throw new Error(`${String(res.status)} ${res.statusText}`);
};

export const getJSON = async <T = unknown>(url: string, disableProxy?: boolean): Promise<T> => {
  try {
    const text = await get(url, disableProxy, true);
    return JSON.parse(sanitize(text as string)) as T;
  } catch (err) {
    const error = err as Error;
    console.error(`failed to get json from ${url}: ${error.message}`);
    process.exit(1);
  }
};

export const retryAttempts = async <T>(numAttempts: number, workerFn: () => T | Promise<T>): Promise<T> => {
  let attempts = numAttempts;
  let lastError: unknown;
  while (attempts > 0) {
    try {
      return await workerFn();
    } catch (error) {
      lastError = error;
      attempts -= 1;
    }
  }
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw lastError ?? new Error('All retry attempts failed');
};
