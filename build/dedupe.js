/**
 * Simple deduplication leveraging reduce (and equality based on stringification)
 * @param  {*} iter Should be an iterable object, but function will check first.
 * @return {*}      type will be whatever was originally passed in
 */
module.exports = (iter) => {
  return Array.isArray(iter)
    ? iter
      .reduce((acc, curr) => ((!acc.includes(JSON.stringify(curr)) && acc.push(JSON.stringify(curr)) && acc) || acc), [])
      .map(o => JSON.parse(o))
    : iter
}
