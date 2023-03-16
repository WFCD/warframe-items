import getProxyAgent from './proxyAgent.mjs';
import fetch from 'node-fetch';

const prod = process.env.NODE_ENV === 'production';

const agent = getProxyAgent();

// eslint-disable-next-line no-control-regex
const sanitize = (str) => str.replace(/\\r|\r?\n|\x09/g, '').replace(/\\\\"/g, "'");

export async function get(url, disableProxy = !prod, compress = false) {
    const res = await fetch(url, {
        agent: disableProxy ? undefined : agent,
    });
    return compress === false ? Uint8Array.from(await res.buffer()) : res.text();
}

export async function getJSON (url, disableProxy){
    return JSON.parse(sanitize(await get(url, disableProxy, true)))
}