'use strict'
// Sorting objects by keys
// https://www.w3docs.com/snippets/javascript/how-to-sort-javascript-object-by-key.html
// eslint-disable-next-line no-return-assign, no-sequences
module.exports = (obj) => {
  return Object.keys(obj).sort().reduce(function (result, key) {
    result[key] = obj[key]
    return result
  }, {})
}
