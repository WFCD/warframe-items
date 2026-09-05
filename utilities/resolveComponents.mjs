/**
 * Resolve component refs on an item using a catalog map or array.
 * @param {object} item Parent item with components refs or already-resolved components
 * @param {Map<string, object>|object[]|Record<string, object>} catalog Components catalog
 * @returns {object} Item with components expanded (mutates item.components)
 */
export function resolveComponents(item, catalog) {
  if (!item?.components?.length) return item;

  const map = toCatalogMap(catalog);
  item.components = item.components.map((ref) => {
    if (!ref?.uniqueName) return ref;
    // Already resolved (has name / imageName / etc.)
    if (ref.name || ref.imageName || ref.drops) {
      return ref;
    }
    const entry = map.get(ref.uniqueName);
    if (!entry) return ref;
    const rest = { ...entry };
    delete rest.parentUniqueNames;
    return {
      ...rest,
      itemCount: typeof ref.itemCount === 'number' ? ref.itemCount : 1,
    };
  });
  return item;
}

/**
 * @param {Map<string, object>|object[]|Record<string, object>} catalog
 * @returns {Map<string, object>}
 */
export function toCatalogMap(catalog) {
  if (catalog instanceof Map) return catalog;
  const map = new Map();
  if (Array.isArray(catalog)) {
    for (const entry of catalog) {
      if (entry?.uniqueName) map.set(entry.uniqueName, entry);
    }
    return map;
  }
  if (catalog && typeof catalog === 'object') {
    for (const [key, entry] of Object.entries(catalog)) {
      const uniqueName = entry?.uniqueName ?? key;
      map.set(uniqueName, entry);
    }
  }
  return map;
}

export default resolveComponents;
