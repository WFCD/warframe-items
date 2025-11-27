import fetch from 'node-fetch';

import getProxyAgent from './proxyAgent.mjs';

const prod = process.env.NODE_ENV === 'production';

const agent = getProxyAgent();

// eslint-disable-next-line no-control-regex
const sanitize = (str) => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, "'");

export const get = async (url, disableProxy = !prod, compress = false) => {
  const res = await fetch(url, {
    agent: disableProxy ? undefined : agent,
    headers: {
      'user-agent': 'node-fetch (warframe-items)',
    },
  });
  return compress === false ? Uint8Array.from(await res.buffer()) : res.text();
};

export const getJSON = async (url, disableProxy) => {
  try {
    return JSON.parse(sanitize(await get(url, disableProxy, true)));
  } catch (err) {
    console.error(`failed to get json from ${url}: ${err.message}`);
    process.exit(1);
  }
};

export const retryAttempts = async (numAttempts, workerFn) => {
  while (numAttempts > 0) {
    try {
      return workerFn();
    } catch (error) {
      if (numAttempts > 0) {
        numAttempts -= 1;
      } else {
        throw error;
      }
    }
  }
};
