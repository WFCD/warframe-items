/**
 * Pretty print JSON as it should be.
 * https://gist.github.com/nrkn/c7a89bb7039182314415
 */
const isPrimitive = obj => obj === null || [ 'string', 'number', 'boolean' ].includes(typeof obj)
const isArrayOfPrimitive = obj => Array.isArray(obj) && obj.every(isPrimitive)
const format = arr => `^^^[ ${arr.map(val => JSON.stringify(val)).join(', ')} ]`
const replacer = (key, value) => isArrayOfPrimitive(value) ? format(value) : value
const expand = str => str.replace(/(?:"\^\^\^)(\[ .* \])(?:")/g, (match, a) => a.replace(/\\"/g, '"'))
const stringify = obj => expand(JSON.stringify(obj, replacer, 2))

module.exports = stringify
