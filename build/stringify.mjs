import dedupe from './dedupe.mjs';

/**
 * Pretty print JSON as it should be.
 * https://gist.github.com/nrkn/c7a89bb7039182314415
 * @param {*} obj value to primitivity
 * @returns {boolean} whether the object is a primitive (true) or an object value (false)
 */
const isPrimitive = (obj) => !obj || ['string', 'number', 'boolean'].includes(typeof obj);
const isArrayOfPrimitive = (obj) => Array.isArray(obj) && obj.every(isPrimitive);
const format = (arr) => `^^^[ ${arr.map((val) => JSON.stringify(val)).join(', ')} ]`;
const replacer = (key, value) => (isArrayOfPrimitive(value) ? format(value) : value);
const expand = (str) => str.replace(/"\^\^\^(\[ .* ])"/g, (match, a) => a.replace(/\\"/g, '"')).replace(/\\\\"/g, "'");
const stringify = (obj) => expand(JSON.stringify(Array.isArray(obj) ? dedupe(obj) : obj, replacer, 2));

export default stringify;
