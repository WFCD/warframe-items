/**
 * Sorting objects by keys
 * https://www.w3docs.com/snippets/javascript/how-to-sort-javascript-object-by-key.html
 * @param {Record<string, *>} obj object to be sorted
 * @returns {Record<string, *>} same as {@param obj} but sorted keys
 */
export default (obj) => {
  return Object.keys(obj)
    .sort()
    .reduce(function (result, key) {
      result[key] = obj[key];
      return result;
    }, {});
};
