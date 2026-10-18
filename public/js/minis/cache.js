// One memory budget for every big canvas the miniature renderer keeps (grounds and baked
// tile composites): least recently used entries are dropped first.
const entries = new Map(); // key -> { value, bytes }
let total = 0;
let BUDGET = 72 * 1024 * 1024;
export function setBudget(bytes) { BUDGET = bytes; trim(); }
export function cacheGet(key) {
  const e = entries.get(key);
  if (!e) return null;
  entries.delete(key); entries.set(key, e); // most recent last
  return e.value;
}
export function cachePeek(key) { return entries.get(key)?.value || null; }
export function cachePut(key, value, bytes) {
  const old = entries.get(key);
  if (old) { total -= old.bytes; entries.delete(key); }
  entries.set(key, { value, bytes });
  total += bytes;
  trim(key);
}
function trim(keep = null) {
  for (const [k, e] of entries) {
    if (total <= BUDGET) break;
    if (k === keep) continue;
    entries.delete(k); total -= e.bytes;
    // free the pixels now (Safari is slow to collect canvases)
    if (e.value && e.value.width !== undefined && e.value.getContext) { e.value.width = 0; e.value.height = 0; }
  }
}
export function cacheBytes() { return total; }
export function cacheCount() { return entries.size; }
export function cacheClear() { for (const [, e] of entries) if (e.value?.getContext) { e.value.width = 0; e.value.height = 0; } entries.clear(); total = 0; }
