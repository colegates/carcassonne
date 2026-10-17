// Convert docs/expansions/<slug>.json (research format) into engine tile
// modules public/js/data/<exp>.js. Validates ports/field consistency.
import fs from 'fs';
const ROOT = new URL('..', import.meta.url).pathname;
const SIDES = { N: 0, E: 1, S: 2, W: 3 };
const HALF = { NL: 0, NR: 2, EL: 3, ER: 5, SL: 6, SR: 8, WL: 9, WR: 11 };
const MAP = { river: 'river', abbot: 'abbot', 'inns-cathedrals': 'inns', 'traders-builders': 'traders', 'princess-dragon': 'dragon', tower: 'tower' };

function convertTile(t, exp) {
  const feats = t.features.map((f) => ({ ...f }));
  const claimed = new Array(12).fill(-1);
  const claim = (p, i) => {
    if (claimed[p] !== -1 && claimed[p] !== i) throw new Error(`${t.id}: port ${p} claimed by ${claimed[p]} and ${i}`);
    claimed[p] = i;
  };
  const out = feats.map((f, i) => {
    const o = { type: f.type };
    if (f.type === 'city') {
      o.sides = f.sides.map((s) => SIDES[s]);
      o.ports = o.sides.flatMap((s) => [3 * s, 3 * s + 1, 3 * s + 2]);
      o.pennants = f.pennants || 0;
      if (f.cathedral) o.cathedral = true;
      if (f.goods) o.goods = f.goods;
      if (f.princess) o.princess = true;
    } else if (f.type === 'road' || f.type === 'river') {
      o.sides = f.sides.map((s) => SIDES[s]);
      o.ports = o.sides.map((s) => 3 * s + 1);
      if (f.inn) o.inn = true;
      if (f.tunnel) o.tunnel = true;
    } else if (f.type === 'field') {
      o.ports = (f.halves || []).map((h) => HALF[h]);
      o.cities = f.cities || [];
      if (f.inner) o.inner = true;
      if (f.pigHerd) o.pigHerd = true;
    } else {
      o.ports = [];
    }
    o.ports.forEach((p) => claim(p, i));
    return o;
  });
  // centre ports of sides that carry neither road/river nor city go to the field holding both halves
  for (let s = 0; s < 4; s++) {
    const c = 3 * s + 1;
    if (claimed[c] !== -1) continue;
    const a = claimed[3 * s], b = claimed[3 * s + 2];
    if (a === -1 || a !== b || out[a].type !== 'field') throw new Error(`${t.id}: side ${s} centre unresolved (halves in ${a}/${b})`);
    out[a].ports.push(c);
    claimed[c] = a;
  }
  if (claimed.includes(-1)) throw new Error(`${t.id}: unassigned port ${claimed.indexOf(-1)}`);
  // sanity: a side with a road/river must have its halves in different fields (unless dead end tile like spring)
  out.forEach((f, i) => {
    if (f.type === 'field') for (const ci of f.cities) if (out[ci]?.type !== 'city') throw new Error(`${t.id}: field ${i} lists non-city ${ci}`);
  });
  const def = { exp, count: t.count, name: t.name, features: out, tags: t.tags || [] };
  if (t.base_letter) { def.exp = 'base'; def.replaces = t.base_letter; } // 3rd-edition garden versions of base tiles
  if (t.tower_foundation) def.foundation = t.tower_foundation.anchor; // where the tower is built (art + piece placement)
  return def;
}

const only = process.argv.slice(2);
for (const [slug, exp] of Object.entries(MAP)) {
  if (only.length && !only.includes(slug)) continue;
  const file = `${ROOT}docs/expansions/${slug}.json`;
  if (!fs.existsSync(file)) { console.log('skip (missing)', slug); continue; }
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tiles = {};
  let total = 0;
  for (const t of d.tiles) {
    try {
      tiles[t.id] = convertTile(t, exp);
      total += t.count;
    } catch (e) { console.log('ERROR', slug, e.message); }
  }
  const body = `// Generated from docs/expansions/${slug}.json by dev/build-expansions.mjs — do not edit by hand.\nexport default {\n${Object.entries(tiles).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n};\n`;
  fs.writeFileSync(`${ROOT}public/js/data/${exp}.js`, body);
  console.log(`${slug}: ${Object.keys(tiles).length} tile types, ${total} tiles`);
}
