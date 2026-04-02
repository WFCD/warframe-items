import objectsort from './objectsort';

/**
 * Simple deduplication leveraging reduce (and equality based on stringification)
 * @param iter Should be an iterable object, but function will check first.
 * @returns type will be whatever was originally passed in
 */
export default <T>(iter: T[] | T): T[] | T => {
  if (!Array.isArray(iter)) return iter;
  const seen = new Set<string>();
  const result: T[] = [];
  for (const curr of iter) {
    const normalized = typeof curr === 'object' && curr !== null ? objectsort(curr as Record<string, unknown>) : curr;
    const key = JSON.stringify(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(curr);
    }
  }
  return result;
};
