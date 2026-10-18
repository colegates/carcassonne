// The static miniatures standing on a tile: houses packed inside the walls, towers along them,
// gatehouses where roads enter, landmarks, trees, vines and reeds. Built per tile type,
// rotation and a small variant number, in screen-oriented unit coordinates (the tile's
// canonical layout turned with rotUnit). Sprites never turn: only their positions do.
import { rotUnit, bezierPoint } from '../layout.js';
import * as A from './assets.js';
import { CAT, sizeOf, GROUPS, ALT } from './catalog.js';
import { getPlan, sampleSeg, riverCrossing } from './plan.js';
import { RIVER_W } from './ground.js';

export const WALL_H = 0.072; // wall height on screen (tile units)
export const WALL_W = 0.07;

// The id to use for a wanted sprite: itself, else a listed stand-in, else null.
export function avail(id) {
  if (A.hasSprite(id)) return id;
  for (const alt of ALT[id] || []) if (A.hasSprite(alt)) return alt;
  return null;
}
const availAll = (ids) => ids.filter((id) => A.hasSprite(id));

// Whether the miniature look can be used at all: the meadow and a few buildings exist.
export function minisUsable() {
  if (A.manifestStatus() !== 'ready' || !A.hasTexture('meadow')) return false;
  const buildings = availAll([...GROUPS.houses, 'cottage_small', 'village_house_tall', 'tower_roman_round', 'tower_round_hoarding', 'turret_small']);
  return buildings.length >= 2;
}

// Landmarks drawn as one big miniature; a missing one keeps its painted look on the ground.
export function landmarkFallbacks(id) {
  const plan = getPlan(id);
  const { lay } = plan;
  const out = [];
  if (lay.monastery && !avail('monastery_complex')) { const m = lay.monastery; out.push({ ellipse: [m.x, m.y - 0.02 * m.s, 0.27 * m.s, 0.3 * m.s] }); }
  if (lay.cathedral && !avail('cathedral')) out.push({ ellipse: [lay.cathedral[0], lay.cathedral[1], 0.3, 0.22] });
  for (const [x, y] of lay.inns) if (!avail('inn')) out.push({ ellipse: [x, y, 0.1, 0.085] });
  if (lay.bazaar && !availAll(GROUPS.stalls).length) out.push({ ellipse: [lay.bazaar[0], lay.bazaar[1], lay.bazaar[2] + 0.02, lay.bazaar[2] * 0.85] });
  if (lay.volcano && !A.hasSprite('volcano')) out.push({ ellipse: [lay.volcano[0], lay.volcano[1] - 0.02, 0.2, 0.19] });
  if (lay.garden && !lay.garden.auto && !avail('herb_garden')) out.push({ box: [lay.garden.x - 0.15, lay.garden.y - 0.105, 0.3, 0.21] });
  if (lay.farmhouse && !avail('farmhouse')) out.push({ ellipse: [lay.farmhouse[0], lay.farmhouse[1], 0.15, 0.12] });
  if (lay.highwaymen && !A.hasSprite('highwaymen')) out.push({ ellipse: [lay.highwaymen[0], lay.highwaymen[1], 0.07, 0.06] });
  return out;
}
// the printed symbols the ground keeps (a portal is shown by its dolmen when there is one)
// (pennants, goods, the princess and the dragon stand upright over the miniatures instead)
export function groundSymbols() {
  return A.hasSprite('dolmen_portal') ? [] : ['portal'];
}
export const UPRIGHT_SYMBOLS = ['shield', 'goods', 'princess', 'dragon'];

const cache = new Map();
export function getScene(id, rot, variant = 0) {
  const key = `${id}|${rot}|${variant}`;
  let s = cache.get(key);
  if (!s) { s = buildScene(id, rot, variant); cache.set(key, s); }
  return s;
}
export function clearScenes() { cache.clear(); }

function buildScene(id, rot, variant) {
  const plan = getPlan(id);
  const { lay } = plan;
  const R = (x, y) => rotUnit(x, y, rot);
  const inv = (x, y) => rotUnit(x, y, (4 - rot) % 4);
  const typeAt = (x, y) => (x < 0 || y < 0 || x >= 1 || y >= 1 ? 'out' : plan.typeAt(...inv(x, y)));
  const labelAt = (x, y) => (x < 0 || y < 0 || x >= 1 || y >= 1 ? -9 : plan.labelAt(...inv(x, y)));
  const fieldClear = (x, y) => plan.fieldClear(...inv(x, y));
  const cityClear = (fi, x, y) => plan.cityClear(fi, ...inv(x, y));
  const rseg = (seg) => seg.map(([x, y]) => R(x, y));
  const rnd = A.rng(A.hash('scene', id, rot, variant));
  const statics = [];
  const keep = plan.keep.map((k) => { const [x, y] = R(k.x, k.y); return { ...k, x, y }; });

  // ---- rotated geometry for the actors
  const roads = lay.roads.map((r) => ({ fi: r.fi, seg: rseg(r.seg), dead: r.dead, bridge: r.bridge, span: r.span, tunnel: r.tunnel }));
  const rivers = lay.rivers.map((r) => ({ fi: r.fi, seg: rseg(r.seg), dead: r.dead, spring: r.spring }));
  const roadPts = roads.map((r) => sampleSeg(r.seg, 30));
  const riverPts = rivers.map((r) => sampleSeg(r.seg, 30));
  const nearAny = (ptsList, x, y, d) => ptsList.some((pts) => pts.some((p) => Math.abs(p.x - x) < d && Math.abs(p.y - y) < d && Math.hypot(p.x - x, p.y - y) < d));

  const make = (sid, x, y, o = {}) => {
    const info = A.spriteInfo(sid);
    const [w, h] = sizeOf(sid, info, o.scale || 1);
    return { t: 's', id: sid, x, y, w, h, flip: !!o.flip, lift: o.lift || 0, shadow: o.shadow !== false, tag: o.tag || null, sort: o.sort ?? 0 };
  };
  const rectHitsKeep = (x, y, w, h, pad = 0, square = false) => keep.some((k) => {
    if (square && k.square) return false;
    const cx = Math.max(x - w / 2, Math.min(k.x, x + w / 2)), cy = Math.max(y - h, Math.min(k.y, y));
    return Math.hypot(cx - k.x, cy - k.y) < k.r + pad;
  });
  const placed = []; // {x, y, w, d} footprints of buildings and trees
  const clashes = (x, y, w, dmin = 0.04, k = 0.72) => placed.some((p) => Math.abs(p.x - x) < ((p.w + w) / 2) * k && Math.abs(p.y - y) < Math.max(dmin, p.d));
  const put = (o, d = 0.04) => { statics.push(o); placed.push({ x: o.x, y: o.y, w: o.w, d }); return o; };

  // ---- gates
  const gates = plan.gates.map((gt) => {
    const [x, y] = R(gt.x, gt.y);
    const [x2, y2] = R(gt.x + gt.dx * 0.01, gt.y + gt.dy * 0.01);
    const dx = (x2 - x) / 0.01, dy = (y2 - y) / 0.01; // into the city
    return { x, y, dx, dy };
  });
  for (const gt of gates) {
    let want;
    if (Math.abs(gt.dy) >= Math.abs(gt.dx)) want = gt.dy < 0 ? 'gatehouse_outer' : 'gatehouse_inner';
    else want = 'gatehouse_side';
    const sid = avail(want);
    if (!sid) continue;
    const o = make(sid, gt.x, gt.y + 0.022, { flip: want === 'gatehouse_side' && gt.dx < 0, tag: 'gate' });
    put(o, 0.06);
  }

  // ---- walls: short pieces drawn in screen space (sorted with everything else), towers along them
  const walls = [];
  const towers = [];
  for (const cty of lay.cities) {
    for (const w0 of cty.walls) {
      const seg = rseg(w0);
      const pts = sampleSeg(seg, 40);
      const mid = pts[20];
      // +1 when the normal points out of the town
      const side = typeAt(mid.x + mid.nx * 0.06, mid.y + mid.ny * 0.06) === 'city' ? -1 : 1;
      walls.push({ seg, pts, side, fi: cty.fi });
      for (let i = 0; i < 40; i += 4) {
        const piece = pts.slice(i, i + 5);
        const c = piece[2];
        if (gates.some((gt) => Math.hypot(gt.x - c.x, gt.y - c.y) < 0.07)) continue;
        statics.push({ t: 'wall', pts: piece, side, x: c.x, y: Math.max(...piece.map((p) => p.y)), shadow: false, first: i === 0 });
      }
      // where the wall runs off the tile it meets its neighbour's wall, often at an angle: a
      // round turret stands on the joint, the same one on both tiles (same sprite, size and
      // spot), so the walls join cleanly whatever the neighbour does
      const jt = avail('turret_small');
      for (const p of [pts[0], pts[pts.length - 1]]) {
        const onEdge = p.x < 0.012 || p.x > 0.988 || p.y < 0.012 || p.y > 0.988;
        if (!jt || !onEdge || gates.some((gt) => Math.hypot(gt.x - p.x, gt.y - p.y) < 0.1)) continue;
        const ex = p.x < 0.012 ? 0 : p.x > 0.988 ? 1 : p.x, ey = p.y < 0.012 ? 0 : p.y > 0.988 ? 1 : p.y;
        const o = make(jt, ex, ey + 0.016, { tag: 'joint', scale: 0.82 });
        statics.push(o); placed.push({ x: o.x, y: o.y, w: o.w, d: 0.04 });
        towers.push(o);
      }
      // towers: at intervals, never at the tile edge (the neighbour carries on the wall)
      const L = pts[pts.length - 1].s;
      for (let s = 0.12 + rnd() * 0.06; s < L - 0.1; s += 0.24 + rnd() * 0.07) {
        const p = pts.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));
        if (gates.some((gt) => Math.hypot(gt.x - p.x, gt.y - p.y) < 0.12)) continue;
        const pick = GROUPS.towers[Math.floor(rnd() * GROUPS.towers.length)];
        const sid = avail(pick);
        if (!sid) continue;
        const o = make(sid, p.x, p.y + 0.02, { flip: rnd() < 0.5, tag: 'tower', scale: 0.92 + rnd() * 0.16 });
        if (rectHitsKeep(o.x, o.y, o.w * 0.8, o.h * 0.8)) continue;
        put(o, 0.05);
        towers.push(o);
      }
    }
  }

  // ---- stone bridges where a road crosses the river
  for (const r of roads) {
    if (r.bridge !== 'over' || !A.hasSprite('bridge_lr') || lay.cities.some((cc) => cc.bridgedBy === r.fi)) continue;
    const cross = riverCrossing(r.seg, rivers, RIVER_W);
    if (!cross) continue;
    r.span = cross;
    const a = bezierPoint(r.seg, cross[0]), b = bezierPoint(r.seg, cross[1]);
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (dx >= dy) {
      statics.push(make('bridge_lr', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.05, { scale: (dx * 1.45) / CAT.bridge_lr.w, tag: 'bridge' }));
    } else {
      const sid = A.hasSprite('bridge_front') ? 'bridge_front' : 'bridge_lr';
      const info = A.spriteInfo(sid);
      const asp = info.h / info.w;
      const o = make(sid, (a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 0.03, { scale: (dy * 1.35) / (CAT[sid].w * asp), tag: 'bridge' });
      statics.push(o);
    }
  }

  // ---- vignettes that need room: a trebuchet drill inside a big town, shooting at a straw
  // target outside its wall; crossbow butts in a meadow
  const vign = {};
  {
    let best = null;
    for (const w of walls) {
      const L = w.pts[w.pts.length - 1].s;
      if (L < 0.45) continue;
      for (const i of [20, 14, 26]) {
        const m = w.pts[i];
        if (gates.some((gt) => Math.hypot(gt.x - m.x, gt.y - m.y) < 0.16)) continue;
        const ix = m.x - m.nx * w.side * 0.15, iy = m.y - m.ny * w.side * 0.15;
        if (labelAt(ix, iy) !== w.fi || cityClear(w.fi, ix, iy) < 0.06 || ix < 0.1 || ix > 0.9 || iy < 0.12 || iy > 0.92) continue;
        if (keep.some((k) => Math.hypot(k.x - ix, k.y - iy) < k.r + 0.08)) continue;
        const ox = m.x + m.nx * w.side * 0.15, oy = m.y + m.ny * w.side * 0.15;
        const out = typeAt(ox, oy) === 'field' && fieldClear(ox, oy) > 0.035 && ox > 0.06 && ox < 0.94 && oy > 0.08 && oy < 0.96 && !keep.some((k) => Math.hypot(k.x - ox, k.y - oy) < k.r + 0.03);
        const score = (out ? 2 : 0) + rnd();
        if (!best || score > best.score) best = { score, x: ix, y: iy, tx: out ? ox : m.x + m.nx * w.side * 0.6, ty: out ? oy : m.y + m.ny * w.side * 0.6, inTile: out };
        break;
      }
    }
    const frame = best && (rnd() < 0.8 || variant === 0) ? avail('pierriere_frame') || avail('trabuquet_frame') : null;
    if (frame) {
      const o = make(frame, best.x, best.y + 0.02, { tag: 'pierriere', flip: best.tx > best.x });
      put(o, 0.05);
      keep.push({ x: best.x, y: best.y, r: 0.075 }, { x: best.x + 0.05, y: best.y + 0.02, r: 0.04 });
      vign.treb = { ...best, frame: o };
      if (best.inTile) {
        const tgt = avail('straw_target');
        if (tgt) { put(make(tgt, best.tx, best.ty, { tag: 'target' }), 0.02); keep.push({ x: best.tx, y: best.ty, r: 0.045 }); }
      }
    }
  }
  if (!vign.treb && plan.fieldArea > 0.3 && rnd() < 0.45) {
    for (let i = 0; i < 40; i++) {
      const ax = 0.15 + rnd() * 0.5, ay = 0.22 + rnd() * 0.66, bx = ax + 0.17, by = ay;
      const ok = [[ax, ay], [bx, by], [(ax + bx) / 2, ay]].every(([x, y]) => typeAt(x, y) === 'field' && fieldClear(x, y) > 0.045 && !keep.some((k) => Math.hypot(k.x - x, k.y - y) < k.r + 0.05));
      if (!ok) continue;
      const tgt = avail('straw_target');
      if (tgt) put(make(tgt, bx, by, { tag: 'target' }), 0.02);
      keep.push({ x: ax, y: ay, r: 0.05 }, { x: bx, y: by, r: 0.04 }, { x: (ax + bx) / 2, y: ay, r: 0.04 });
      vign.butts = { ax, ay, bx, by };
      break;
    }
  }

  // a bazaar inside a town keeps its square clear of houses
  if (lay.bazaar) { const [x, y] = R(lay.bazaar[0], lay.bazaar[1]); keep.push({ x, y: y + 0.03, r: lay.bazaar[2] * 0.9, square: true }); }

  // ---- city interiors
  const cityFree = new Map();
  for (const cty of lay.cities) {
    const fi = cty.fi;
    const inside = (x, y, m) => labelAt(x, y) === fi && cityClear(fi, x, y) >= m;
    const lane = (x, y) => nearAny(roadPts, x, y, 0.05);
    const nearGate = (x, y) => gates.some((gt) => Math.hypot(gt.x - x, gt.y - y) < 0.1);
    let area = 0; const cand = [];
    for (let y = 0.02; y < 1; y += 0.02) for (let x = 0.02; x < 1; x += 0.02) {
      if (labelAt(x, y) !== fi) continue;
      area += 0.0004;
      cand.push([x + (rnd() - 0.5) * 0.012, y + (rnd() - 0.5) * 0.012]);
    }
    // landmarks first
    const big = (cty.shape === 'three' || cty.shape === 'full') && !cty.cathedral && !lay.monastery;
    if (cty.cathedral) {
      const sid = avail('cathedral');
      if (sid) { const [x, y] = R(...(lay.cathedral || [0.5, 0.5])); put(make(sid, x, y + 0.14, { tag: 'cathedral', scale: sid === 'cathedral' ? 1 : 1.4 }), 0.2); }
    } else if (big) {
      const [cx, cy] = R(...(cty.shape === 'full' ? [0.5, 0.5] : rotUnit(0.5, 0.3, cty.rot)));
      const sid = avail('parish_church');
      if (sid) {
        const o = make(sid, cx, cy + 0.08, { tag: 'church', flip: rnd() < 0.5 });
        if (!rectHitsKeep(o.x, o.y, o.w * 0.85, o.h * 0.85)) put(o, 0.1);
      }
    }
    // special houses: one bakehouse, one smithy in bigger towns
    const specials = [];
    if (area > 0.2 && A.hasSprite('bakehouse')) specials.push('bakehouse');
    if (area > 0.32 && A.hasSprite('smithy')) specials.push('smithy');
    if (area > 0.45 && A.hasSprite('tower_square_watch') && !cty.cathedral) specials.push('tower_square_watch');
    // shuffle candidates
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const houses = availAll(GROUPS.houses);
    const pool = houses.length ? houses : availAll(GROUPS.smallHouses);
    const free = [];
    let n = 0;
    for (const [x, y] of cand) {
      if (y > 0.985 || x < 0.03 || x > 0.97) continue;
      const sid = specials.length ? specials[0] : pool[Math.floor(rnd() * pool.length)];
      if (!sid) break;
      const o = make(sid, x, y, { flip: rnd() < 0.5, scale: 0.9 + rnd() * 0.2, tag: sid === 'smithy' ? 'smithy' : sid === 'bakehouse' ? 'bakehouse' : 'house' });
      // inside the walls: the house's foot and its sides clear of the walls
      const m = 0.045;
      if (!inside(x, y, m) || !inside(x - o.w * 0.35, y, m * 0.6) || !inside(x + o.w * 0.35, y, m * 0.6)) { free.push([x, y]); continue; }
      if (lane(x, y) || nearGate(x, y)) { free.push([x, y]); continue; }
      if (rectHitsKeep(x, y, o.w * 0.9, o.h * 0.92, 0.01)) { free.push([x, y]); continue; }
      if (clashes(x, y, o.w)) continue;
      put(o, 0.04);
      if (specials.length && specials[0] === sid) specials.shift();
      if (++n > 34) break;
    }
    // free lane spots for the townsfolk (not under a house)
    const lanePts = free.filter(([x, y]) => inside(x, y, 0.03) && !placed.some((p) => Math.abs(p.x - x) < p.w * 0.42 && y < p.y + 0.008 && y > p.y - p.w * 0.45));
    cityFree.set(fi, lanePts);
  }

  // ---- landmarks in the country
  const marks = {};
  const landmark = (want, x, y, dy, opts = {}) => {
    const sid = avail(want);
    if (!sid) return null;
    const o = make(sid, x, y + dy, opts);
    put(o, opts.d ?? 0.08);
    return o;
  };
  if (lay.monastery) {
    const m = lay.monastery;
    const [x, y] = R(m.x, m.y);
    marks.monastery = landmark('monastery_complex', x, y, 0.13 * m.s, { scale: m.s * (A.hasSprite('monastery_complex') ? 0.95 : 1.1), tag: 'monastery', d: 0.2 });
    marks.monasteryAt = [x, y, m.s];
  }
  if (lay.garden && !lay.garden.auto) {
    const [x, y] = R(lay.garden.x, lay.garden.y);
    marks.garden = landmark('herb_garden', x, y, 0.07, { tag: 'garden', d: 0.1 });
    marks.gardenAt = [x, y];
  }
  for (const [ix, iy] of lay.inns) {
    const [x, y] = R(ix, iy);
    (marks.inns ||= []).push(landmark('inn', x, y, 0.065, { tag: 'inn', flip: rnd() < 0.5, d: 0.08 }) || { x, y: y + 0.06, w: 0.18, h: 0.12 });
  }
  if (lay.farmhouse) { const [x, y] = R(...lay.farmhouse); marks.farmhouse = landmark('farmhouse', x, y, 0.06, { tag: 'farmhouse', flip: rnd() < 0.5 }) || { x, y: y + 0.06, w: 0.2, h: 0.1 }; }
  if (lay.house) {
    const [x, y] = R(...lay.house);
    marks.house = landmark('cottage_small', x, y, 0.04, { tag: 'cottage', flip: rnd() < 0.5 });
  }
  if (lay.village) {
    const v = lay.village;
    const [cx, cy] = R(v.x, v.y);
    marks.village = [cx, cy, v.r];
    const well = avail('village_well');
    if (well && !v.house) landmark(well, cx, cy, 0.012, { d: 0.02 });
    const vil = availAll(GROUPS.village);
    const n = v.house ? 2 : 5;
    for (let i = 0; i < n && vil.length; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5 + (v.house ? 0.6 : 0);
      const d = v.house ? 0.035 : v.r * 0.82;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8 + 0.03;
      const o = make(vil[Math.floor(rnd() * vil.length)], x, y, { flip: rnd() < 0.5, scale: v.house ? 1.05 : 0.88, tag: 'cottage' });
      if (rectHitsKeep(x, y, o.w * 0.8, o.h * 0.8)) continue;
      put(o, 0.03);
    }
  }
  if (lay.trees) {
    const [cx, cy] = R(lay.trees.x, lay.trees.y);
    const cross = avail('wayside_cross');
    if (cross) landmark(cross, cx, cy, 0.01, { d: 0.02 });
    const tr = availAll(GROUPS.trees);
    for (let i = 0; i < 3 && tr.length; i++) {
      const a = rnd() * 6.28, x = cx + Math.cos(a) * 0.05, y = cy + Math.sin(a) * 0.04 + 0.02;
      const o = make(tr[Math.floor(rnd() * tr.length)], x, y, { flip: rnd() < 0.5, scale: 0.75 });
      if (!rectHitsKeep(x, y, o.w * 0.6, o.h * 0.7)) put(o, 0.03);
    }
  }
  if (lay.bazaar) {
    const [bx, by, br] = lay.bazaar;
    const [cx, cy] = R(bx, by);
    marks.bazaar = [cx, cy, br];
    const stalls = availAll(GROUPS.stalls);
    const spots = [[-0.55, -0.42], [0.08, -0.62], [0.6, -0.25], [-0.65, 0.12], [0.62, 0.32], [-0.18, 0.52], [0.25, 0.6]];
    spots.forEach(([ux, uy], i) => {
      if (!stalls.length) return;
      const x = cx + ux * br * 0.95, y = cy + uy * br * 0.8 + 0.02;
      const o = make(stalls[(i + variant) % stalls.length], x, y, { flip: ux > 0, tag: 'stall', scale: 1.15 });
      if (rectHitsKeep(x, y, o.w * 0.8, o.h * 0.8, 0, true)) return;
      put(o, 0.02);
    });
  }
  if (lay.highwaymen) { const [x, y] = R(...lay.highwaymen); marks.highwaymen = landmark('highwaymen', x, y, 0.03, { tag: 'highwaymen', d: 0.04 }) || { x, y }; }
  if (lay.shrub) { const [x, y] = R(...lay.shrub); const sid = A.hasSprite('broom') ? 'broom' : avail('garrigue_clump'); if (sid) landmark(sid, x, y, 0.02, { d: 0.02 }); }
  if (lay.volcano) { const [x, y] = R(...lay.volcano); marks.volcano = landmark('volcano', x, y, 0.1, { tag: 'volcano', d: 0.15 }); marks.volcanoAt = [x, y]; }
  if (lay.rock) { const [x, y] = R(...lay.rock); const sid = avail('garrigue_clump'); if (sid) landmark(sid, x + 0.03, y - 0.08, 0.0, { d: 0.02 }); }
  const portalSym = plan.symbols.find((s) => s.kind === 'portal');
  if (portalSym && A.hasSprite('dolmen_portal')) { const [x, y] = R(portalSym.x, portalSym.y); marks.portal = landmark('dolmen_portal', x, y, 0.045, { tag: 'portal', d: 0.05 }); }
  if (lay.foundation) {
    const [x, y] = R(...lay.foundation);
    marks.foundation = [x, y];
    const sid = avail('treadwheel_crane');
    if (sid) {
      for (const [dx, dy] of [[0.15, 0.08], [-0.15, 0.08], [0.15, -0.05], [-0.15, -0.05]]) {
        const o = make(sid, x + dx, y + dy, { flip: dx < 0, tag: 'crane' });
        if (o.x < 0.06 || o.x > 0.94 || o.y > 0.98 || typeAt(o.x, o.y - 0.01) !== 'field' || rectHitsKeep(o.x, o.y, o.w * 0.7, o.h * 0.7)) continue;
        put(o, 0.04); break;
      }
    }
  }

  // ---- small set pieces beside the landmarks: beehives by the gardens, washing on the line
  const besideField = (sid, x, y, tag, opts = {}) => {
    if (!A.hasSprite(sid)) return null;
    const o = make(sid, x, y, { tag, flip: rnd() < 0.5, ...opts });
    if (x < 0.06 || x > 0.94 || y < 0.1 || y > 0.97 || typeAt(x, y) !== 'field' || fieldClear(x, y) < 0.03) return null;
    if (rectHitsKeep(o.x, o.y, o.w * 0.8, o.h * 0.8) || clashes(o.x, o.y, o.w, 0.03)) return null;
    return put(o, 0.03);
  };
  if (marks.gardenAt) {
    const [gx, gy] = marks.gardenAt;
    for (const [dx, dy] of [[0.17, 0.03], [-0.17, 0.03], [0.12, 0.12], [-0.12, 0.12]]) if (besideField('bee_bench', gx + dx, gy + dy, 'bees')) { marks.bees = [gx + dx, gy + dy]; break; }
  }
  if (marks.monasteryAt && !marks.bees) {
    const [mx, my, ms] = marks.monasteryAt;
    for (const [dx, dy] of [[0.27, 0.14], [-0.27, 0.14], [0.25, -0.05], [-0.25, -0.05]]) if (besideField('bee_bench', mx + dx * ms, my + dy * ms, 'bees')) { marks.bees = [mx + dx * ms, my + dy * ms]; break; }
  }
  for (const o of statics.filter((q) => q.tag === 'cottage' || q.tag === 'farmhouse' || q.tag === 'inn')) {
    if (rnd() < 0.45) for (const dx of [0.11, -0.11]) if (besideField('laundry_drying', o.x + dx, o.y + 0.015, 'laundry', { scale: 0.8 })) break;
  }

  // ---- country: vineyards, trees, hedgerow bushes and reeds
  const patches = plan.patches.map((p) => {
    const poly = p.poly.map(([x, y]) => R(x, y));
    const [cx, cy] = R(p.cx, p.cy);
    // axis of the plot after turning (for the ploughman)
    const [ax, ay] = R(p.cx + Math.cos(p.ang) * p.hw, p.cy + Math.sin(p.ang) * p.hw);
    return { ...p, poly, cx, cy, ex: ax - cx, ey: ay - cy };
  });
  const inPoly = (poly, x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const vine = A.hasSprite('goblet_vine') ? 'goblet_vine' : null;
  for (const p of plan.patches) {
    if (p.kind !== 'vineyard' || !vine) continue;
    const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    const r2 = A.rng(p.seed);
    for (let a = -p.hw + 0.025; a <= p.hw - 0.02; a += 0.034) {
      for (let b = -p.hh + 0.02; b <= p.hh - 0.012; b += 0.03) {
        const u = p.cx + a * ca - b * sa + (r2() - 0.5) * 0.006, v = p.cy + a * sa + b * ca + (r2() - 0.5) * 0.006;
        const [x, y] = R(u, v);
        if (rectHitsKeep(x, y, 0.02, 0.03, -0.02)) continue;
        statics.push(make(vine, x, y, { flip: r2() < 0.5, scale: 0.85 + r2() * 0.3 }));
      }
    }
  }
  const trees = availAll(GROUPS.trees), riverTrees = availAll(GROUPS.riverTrees), bushes = availAll(GROUPS.bushes);
  const fieldFree = [];
  if (trees.length || bushes.length) {
    const fieldShare = plan.fieldArea;
    const want = Math.round(fieldShare * (10 + rnd() * 6));
    let got = 0;
    for (let i = 0; i < 260 && got < want; i++) {
      let x = 0.05 + rnd() * 0.9, y = 0.1 + rnd() * 0.86;
      if (rnd() < 0.6) { if (rnd() < 0.5) x = rnd() < 0.5 ? 0.05 + rnd() * 0.08 : 0.87 + rnd() * 0.08; else y = rnd() < 0.5 ? 0.1 + rnd() * 0.07 : 0.88 + rnd() * 0.08; }
      if (typeAt(x, y) !== 'field' || fieldClear(x, y) < 0.045) continue;
      if (patches.some((p) => inPoly(p.poly, x, y) || inPoly(p.poly, x, y - 0.03))) continue;
      const nearRiver = nearAny(riverPts, x, y, RIVER_W * 1.4);
      const list = nearRiver && riverTrees.length ? riverTrees : rnd() < 0.22 && bushes.length ? bushes : trees.length ? trees : bushes;
      const sid = list[Math.floor(rnd() * list.length)];
      const o = make(sid, x, y, { flip: rnd() < 0.5, scale: 0.8 + rnd() * 0.35, tag: 'tree' });
      if (rectHitsKeep(x, y, o.w * 0.75, o.h * 0.85, 0.005)) continue;
      if (clashes(x, y, o.w, 0.035, 0.6)) continue;
      put(o, 0.035);
      got++;
    }
  }
  // free meadow spots for shepherds, flocks and strollers
  for (let i = 0; i < 160 && fieldFree.length < 40; i++) {
    const x = 0.08 + rnd() * 0.84, y = 0.1 + rnd() * 0.84;
    if (typeAt(x, y) !== 'field' || fieldClear(x, y) < 0.05) continue;
    if (patches.some((p) => inPoly(p.poly, x, y))) continue;
    if (keep.some((k) => Math.hypot(k.x - x, k.y - y) < 0.08)) continue;
    fieldFree.push([x, y]);
  }
  // a water mill on some river banks (its wheel turns in the actors)
  if (A.hasSprite('mill_house') && rivers.length && rnd() < 0.55) {
    for (const pts of riverPts) {
      for (const i of [15, 10, 20]) {
        const p = pts[i];
        let done = false;
        for (const side of rnd() < 0.5 ? [1, -1] : [-1, 1]) {
          const wx = p.x + p.nx * side * RIVER_W * 0.5, wy = p.y + p.ny * side * RIVER_W * 0.5;
          const hx = p.x + p.nx * side * (RIVER_W * 0.5 + 0.08), hy = p.y + p.ny * side * (RIVER_W * 0.5 + 0.08);
          const o = make('mill_house', hx, hy + 0.04, { tag: 'mill', flip: p.nx * side < 0 });
          if (hx < 0.12 || hx > 0.88 || hy < 0.15 || hy > 0.9) continue;
          if (typeAt(hx, hy) !== 'field' || fieldClear(hx, hy) < 0.05 || rectHitsKeep(o.x, o.y, o.w * 0.8, o.h * 0.8) || clashes(o.x, o.y, o.w)) continue;
          put(o, 0.06);
          marks.mill = { x: wx, y: wy, tx: p.tx, ty: p.ty, house: o };
          done = true; break;
        }
        if (done) break;
      }
      if (marks.mill) break;
    }
  }
  // reeds and the odd willow along the banks
  const reed = A.hasSprite('reed_clump') ? 'reed_clump' : null;
  if (reed) {
    for (const pts of riverPts) {
      for (let i = 2; i < pts.length - 2; i += 3) {
        const p = pts[i];
        const side = (i / 3) % 2 ? 1 : -1;
        const x = p.x + p.nx * side * RIVER_W * (0.55 + rnd() * 0.12), y = p.y + p.ny * side * RIVER_W * (0.55 + rnd() * 0.12);
        if (x < 0.04 || x > 0.96 || y < 0.06 || y > 0.97 || rnd() < 0.35) continue;
        if (typeAt(x, y) !== 'field') continue;
        const o = make(reed, x, y, { flip: rnd() < 0.5, scale: 0.7 + rnd() * 0.4 });
        if (rectHitsKeep(x, y, o.w * 0.7, o.h * 0.8, -0.01)) continue;
        statics.push(o);
      }
    }
    if (lay.lake) {
      const [lx, ly, rx, ry] = lay.lake;
      for (let a = 0; a < 6.28; a += 0.7 + rnd() * 0.4) {
        const [x, y] = R(lx + Math.cos(a) * (rx + 0.015), ly + Math.sin(a) * (ry + 0.015));
        if (x < 0.04 || x > 0.96 || y < 0.06 || y > 0.97) continue;
        const o = make(reed, x, y, { flip: rnd() < 0.5, scale: 0.7 + rnd() * 0.4 });
        if (!rectHitsKeep(x, y, o.w * 0.7, o.h * 0.8, -0.01)) statics.push(o);
      }
    }
  }

  statics.sort((a, b) => a.y - b.y);
  const lakes = [];
  if (lay.lake) { const [x, y] = R(lay.lake[0], lay.lake[1]); lakes.push({ x, y, rx: rot % 2 ? lay.lake[3] : lay.lake[2], ry: rot % 2 ? lay.lake[2] : lay.lake[3] }); }
  for (const [, , lx, ly] of lay.inns) { const [x, y] = R(lx, ly); lakes.push({ x, y, rx: 0.07, ry: 0.045, pond: true }); }
  return {
    id, rot, variant, statics, keep, vign,
    roads, rivers, walls, towers, gates, patches, lakes, marks,
    symbols: plan.symbols.filter((sy) => UPRIGHT_SYMBOLS.includes(sy.kind)).map((sy) => { const [x, y] = R(sy.x, sy.y); return { sym: sy, x, y }; }),
    cityFree, fieldFree, cities: lay.cities.map((c) => ({ fi: c.fi, shape: c.shape, cathedral: c.cathedral, pennants: c.pennants, princess: c.princess })),
    typeAt, labelAt,
  };
}
