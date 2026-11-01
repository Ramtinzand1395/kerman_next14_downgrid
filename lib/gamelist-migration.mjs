const fields = new Set(['name', 'imageUrl', 'imageAlt', 'imagePublicId']);

/** Uses item identity and original values, never replaces the items array. */
export function buildGameListUpdate(doc, entries, rollback = false) {
  const filter = { platform: doc.platform, $expr: { $eq: [{ $size: '$items' }, doc.items.length] } };
  const $set = {}, $unset = {};
  for (const entry of entries) {
    const index = doc.items.findIndex(item => String(item._id?.$oid || item._id) === entry.id);
    if (index < 0) throw new Error(`Missing game ${entry.id}`);
    filter[`items.${index}._id`] = doc.items[index]._id;
    for (const [field, next] of Object.entries(entry.after)) {
      if (!fields.has(field)) throw new Error(`Forbidden migration field: ${field}`);
      const before = entry.before[field];
      const expected = rollback ? next : before;
      const current = doc.items[index][field];
      if (current !== expected) throw new Error(`Concurrent change: ${entry.id}.${field}`);
      filter[`items.${index}.${field}`] = expected === undefined ? { $exists: false } : expected;
      const value = rollback ? before : next;
      const path = `items.${index}.${field}`;
      if (value === undefined) $unset[path] = ''; else $set[path] = value;
    }
  }
  return { filter, update: { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) } };
}
