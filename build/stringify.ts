import dedupe from './dedupe';

/**
 * Pretty print JSON as it should be.
 * https://gist.github.com/nrkn/c7a89bb7039182314415
 * @param obj value to primitivity
 * @returns whether the object is a primitive (true) or an object value (false)
 */
const isPrimitive = (obj: unknown): boolean => !obj || ['string', 'number', 'boolean'].includes(typeof obj);
const isArrayOfPrimitive = (obj: unknown): boolean => Array.isArray(obj) && obj.every(isPrimitive);
const format = (arr: unknown[]): string => `^^^[ ${arr.map((val) => JSON.stringify(val)).join(', ')} ]`;
const replacer = (_key: string, value: unknown): unknown =>
  isArrayOfPrimitive(value) ? format(value as unknown[]) : value;
const expand = (str: string): string =>
  str.replace(/"\^\^\^(\[ .* ])"/g, (_match, a: string) => a.replace(/\\"/g, '"')).replace(/\\\\"/g, "'");
const stringify = (obj: unknown): string => expand(JSON.stringify(Array.isArray(obj) ? dedupe(obj) : obj, replacer, 2));

export default stringify;
