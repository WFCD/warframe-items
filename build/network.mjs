import fetch from 'node-fetch';
import getProxyAgent from './proxyAgent.mjs';

const prod = process.env.NODE_ENV === 'production';

const agent = getProxyAgent();

// eslint-disable-next-line no-control-regex
const sanitize = (str) => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, "'");

export const get = async (url, disableProxy = !prod, compress = false) => {
  const res = await fetch(url, {
    agent: disableProxy ? undefined : agent,
  });
  return compress === false ? Uint8Array.from(await res.buffer()) : res.text();
};

export const getJSON = async (url, disableProxy) => {
  return JSON.parse(sanitize(await get(url, disableProxy, true)));
};
