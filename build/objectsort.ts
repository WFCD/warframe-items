/**
 * Sorting objects by keys
 * https://www.w3docs.com/snippets/javascript/how-to-sort-javascript-object-by-key.html
 * @param obj object to be sorted
 * @returns same as obj but sorted keys
 */
export default <T extends Record<string, unknown>>(obj: T): T => {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key as keyof T] = obj[key as keyof T];
      return result;
    }, {} as T);
};
