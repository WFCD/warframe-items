import objectsort from './objectsort.mjs';

/**
 * Simple deduplication leveraging reduce (and equality based on stringification)
 * @param  {Iterable<*>} iter Should be an iterable object, but function will check first.
 * @returns {Iterable<*>}      type will be whatever was originally passed in
 */
export default (iter) => {
  return Array.isArray(iter)
    ? iter
        .reduce(
          (acc, curr) =>
            (!acc.includes(JSON.stringify(objectsort(curr))) && acc.push(JSON.stringify(objectsort(curr))) && acc) ||
            acc,
          []
        )
        .map((o) => JSON.parse(o))
    : iter;
};
