// The canonical (unrotated) plan of a tile type that both the ground painter and the scene
// builder use: label lookups, distance fields, farm plots, gates and keep-clear spots.
// Everything is deterministic per tile type.
import { layoutOf, bezierPoint } from '../layout.js';
import { getTileArt, LABEL_RES } from '../art.js';
import { TILE_TYPES } from '../tiles.js';
import { rng, hash } from './assets.js';

const H = LABEL_RES;
const cache = new Map();

// chamfer distance (in label pixels) from each pixel to the nearest pixel where in() is false
function distField(inside) {
  const INF = 1e6;
  const d = new Float32Array(H * H);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= H || y >= H ? INF : d[y * H + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < H; x++) {
    const i = y * H + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = H - 1; x >= 0; x--) {
    const i = y * H + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
  return d;
}

export function getPlan(id) {
  if (cache.has(id)) return cache.get(id);
  const lay = layoutOf(id);
  const art = getTileArt(id);
  const { label, anchors, symbols } = art;
  const feats = TILE_TYPES[id].features;
  const idx = (u, v) => Math.max(0, Math.min(H - 1, Math.floor(v * H))) * H + Math.max(0, Math.min(H - 1, Math.floor(u * H)));
  const labelAt = (u, v) => label[idx(u, v)];
  const typeAt = (u, v) => { const l = labelAt(u, v); return l >= 0 ? feats[l].type : 'block'; };
  const isField = new Uint8Array(H * H);
  for (let i = 0; i < label.length; i++) isField[i] = label[i] >= 0 && feats[label[i]].type === 'field' ? 1 : 0;
  const fieldDist = distField(isField);
  const cityDist = new Map();
  for (const c of lay.cities) {
    const ins = new Uint8Array(H * H);
    for (let i = 0; i < label.length; i++) ins[i] = label[i] === c.fi ? 1 : 0;
    cityDist.set(c.fi, distField(ins));
  }
  // in tile units
  const fieldClear = (u, v) => (u < 0 || v < 0 || u >= 1 || v >= 1 ? 0 : fieldDist[idx(u, v)] / H);
  const cityClear = (fi, u, v) => (u < 0 || v < 0 || u >= 1 || v >= 1 ? 0 : cityDist.get(fi)[idx(u, v)] / H);

  const rnd = rng(hash('plan', id));
  // spots kept clear: meeple spots and printed symbols
  const keep = anchors.map(([x, y], fi) => ({ x, y, r: feats[fi].type === 'field' ? 0.07 : 0.075, fi }));
  for (const s of symbols) keep.push({ x: s.x, y: s.y, r: 0.075, sym: s.kind });

  // ---- farm plots (well inside the meadows, never touching a tile edge)
  const patches = [];
  const fieldArea = isField.reduce((a, b) => a + b, 0) / (H * H);
  const want = fieldArea > 0.55 ? 2 + (rnd() < 0.4 ? 1 : 0) : fieldArea > 0.3 ? 1 + (rnd() < 0.45 ? 1 : 0) : fieldArea > 0.16 ? (rnd() < 0.6 ? 1 : 0) : 0;
  // things standing in the meadow that a plot must not cover
  const avoid = [];
  if (lay.rock) avoid.push([lay.rock[0], lay.rock[1], 0.16]);
  if (lay.lake) avoid.push([lay.lake[0], lay.lake[1], Math.max(lay.lake[2], lay.lake[3]) + 0.04]);
  for (const p of [lay.house, lay.farmhouse, lay.highwaymen, lay.shrub, lay.volcano, lay.portal, lay.dragon]) if (p) avoid.push([p[0], p[1], 0.14]);
  if (lay.village) avoid.push([lay.village.x, lay.village.y, lay.village.r + 0.08]);
  if (lay.trees) avoid.push([lay.trees.x, lay.trees.y, 0.14]);
  if (lay.bazaar) avoid.push([lay.bazaar[0], lay.bazaar[1], lay.bazaar[2] + 0.06]);
  for (const [x, y, lx, ly] of lay.inns) avoid.push([x, y, 0.14], [lx, ly, 0.1]);
  if (lay.garden) avoid.push([lay.garden.x ?? 0.5, lay.garden.y ?? 0.5, 0.18]);
  if (lay.monastery) avoid.push([lay.monastery.x, lay.monastery.y, 0.28 * lay.monastery.s]);
  if (lay.foundation) avoid.push([lay.foundation[0], lay.foundation[1], 0.2]);
  const KINDS = ['wheat_ripe', 'wheat_ripe', 'ploughed', 'vineyard', 'vineyard', 'ploughed', 'stubble', 'flax'];
  for (let tries = 0; tries < 140 && patches.length < want; tries++) {
    const cx = 0.2 + rnd() * 0.6, cy = 0.2 + rnd() * 0.6;
    const hw = 0.07 + rnd() * 0.07, hh = 0.05 + rnd() * 0.05;
    const ang = (rnd() - 0.5) * 0.9 + (rnd() < 0.5 ? 0 : Math.PI / 2);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (a, b) => [cx + a * ca - b * sa, cy + a * sa + b * ca];
    const corners = [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)];
    const probe = [...corners, P(0, -hh), P(hw, 0), P(0, hh), P(-hw, 0), [cx, cy]];
    if (!probe.every(([u, v]) => u > 0.1 && v > 0.1 && u < 0.9 && v < 0.9 && fieldClear(u, v) > 0.03)) continue;
    if (patches.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < p.hw + hw + 0.04)) continue;
    if (avoid.some(([x, y, r]) => Math.hypot(x - cx, y - cy) < r + Math.max(hw, hh))) continue;
    // a little irregular, like a real plot
    const poly = corners.map(([u, v]) => [u + (rnd() - 0.5) * 0.02, v + (rnd() - 0.5) * 0.02]);
    patches.push({ cx, cy, hw, hh, ang, poly, kind: KINDS[Math.floor(rnd() * KINDS.length)], seed: Math.floor(rnd() * 1e9) });
  }

  // ---- gates: where a road crosses a city wall (and the extra gate of a hint)
  const gates = [];
  for (const r of lay.roads) {
    if (r.bridge === 'over' && lay.cities.some((cc) => cc.bridgedBy === r.fi)) continue;
    let prev = null;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const [x, y] = bezierPoint(r.seg, t);
      const inCity = typeAt(x, y) === 'city';
      if (prev !== null && inCity !== prev) {
        const [x2, y2] = bezierPoint(r.seg, Math.min(1, t + 0.02));
        const [x0, y0] = bezierPoint(r.seg, Math.max(0, t - 0.02));
        // dir points from the meadow into the city
        let dx = x2 - x0, dy = y2 - y0; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        if (!inCity) { dx = -dx; dy = -dy; }
        gates.push({ x, y, dx, dy, road: r.fi });
      }
      prev = inCity;
    }
  }
  if (lay.gate) {
    const [x, y, a] = lay.gate;
    gates.push({ x, y, dx: Math.cos(a), dy: Math.sin(a), road: null });
  }
  const plan = { id, lay, art, label, anchors, symbols, feats, labelAt, typeAt, fieldClear, cityClear, keep, patches, gates, fieldArea };
  cache.set(id, plan);
  return plan;
}

// Where a road crosses the river: [t0, t1] along the road (null if it does not)
export function riverCrossing(seg, rivers, width = 0.13) {
  let t0 = null, t1 = null;
  const rp = rivers.map((r) => sampleSeg(r.seg, 40));
  for (let i = 0; i <= 80; i++) {
    const t = i / 80; const [x, y] = bezierPoint(seg, t);
    if (rp.some((pts) => pts.some((p) => Math.hypot(p.x - x, p.y - y) < width * 0.62))) { if (t0 === null) t0 = t; t1 = t; }
  }
  return t0 === null ? null : [Math.max(0, t0 - 0.06), Math.min(1, t1 + 0.06)];
}

// Sample points along a bezier spaced by arc length; returns [{x, y, nx, ny, s}] with unit normals.
export function sampleSeg(seg, n = 24) {
  const pts = [];
  let s = 0, px = null, py = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = bezierPoint(seg, t);
    const [x2, y2] = bezierPoint(seg, Math.min(1, t + 0.01));
    const [x0, y0] = bezierPoint(seg, Math.max(0, t - 0.01));
    const dx = x2 - x0, dy = y2 - y0, l = Math.hypot(dx, dy) || 1;
    if (px !== null) s += Math.hypot(x - px, y - py);
    pts.push({ x, y, tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l, s, t });
    px = x; py = y;
  }
  return pts;
}
