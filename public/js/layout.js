// Tile layouts: where cities, roads, rivers, buildings and symbols sit on each
// tile type (canonical orientation, unit square, y down). Most layouts are
// derived from the tile's features; unusual tiles get hints taken from the
// printed artwork descriptions in docs/expansions/*.json.
import { TILE_TYPES } from './tiles.js';

const lerp = (a, b, t) => a + (b - a) * t;
export function rotUnit(x, y, k) {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [x, y] = [1 - y, x];
  return [x, y];
}
export function bezierPoint(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
const quad = (a, c, b) => [a, [a[0] + (2 / 3) * (c[0] - a[0]), a[1] + (2 / 3) * (c[1] - a[1])], [b[0] + (2 / 3) * (c[0] - b[0]), b[1] + (2 / 3) * (c[1] - b[1])], b];
const line = (a, b) => [a, [lerp(a[0], b[0], 1 / 3), lerp(a[1], b[1], 1 / 3)], [lerp(a[0], b[0], 2 / 3), lerp(a[1], b[1], 2 / 3)], b];

// ---------- city shapes (canonical, parameterised) ----------
// Each returns { outline: [...cmds], walls: [bezier segs] } where outline
// commands are ['M',x,y] ['L',x,y] ['C',x1,y1,x2,y2,x,y] ['Z'].
const seg2cmd = (s) => ['C', s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]];
export const SHAPES = {
  // city along the north edge; depth = how far the wall dips at the middle
  cap({ depth = 0.24 } = {}) {
    const c = depth / 0.75;
    const w = [[1, 0], [0.79, c], [0.21, c], [0, 0]];
    return { outline: [['M', 0, 0], ['L', 1, 0], seg2cmd(w)], walls: [w] };
  },
  // north + west corner; bulge = x+y of the wall's midpoint (1 = straight diagonal)
  corner({ bulge = 1.045 } = {}) {
    const S = (bulge - 0.25) / 0.75;
    const a = S * 0.64, b = S * 0.36;
    const w = [[1, 0], [a, b], [b, a], [0, 1]];
    return { outline: [['M', 0, 0], ['L', 1, 0], seg2cmd(w), ['Z']], walls: [w] };
  },
  // north + west corner whose walls run down to the south-east corner; the
  // city fills the very corner so the two meadow strips stay apart
  cornerSpike({ pull = 0.56 } = {}) {
    const w1 = quad([1, 0], [pull, 0.5], [1, 0.92]);
    const w2 = quad([0.92, 1], [0.5, pull], [0, 1]);
    return { outline: [['M', 0, 0], ['L', 1, 0], seg2cmd(w1), ['L', 1, 1], ['L', 0.92, 1], seg2cmd(w2), ['Z']], walls: [w1, w2] };
  },
  // north cap whose two walls meet in the south-east corner (Inns & Cathedrals "C!")
  capSpike() {
    const w1 = quad([1, 0], [0.72, 0.5], [1, 0.92]);
    const w2 = line([0.92, 1], [0, 0]);
    return { outline: [['M', 0, 0], ['L', 1, 0], seg2cmd(w1), ['L', 1, 1], ['L', 0.92, 1], seg2cmd(w2)], walls: [w1, w2] };
  },
  // west-east band; top/bottom = y of the walls at the middle
  band({ top = 0.21, bottom = 0.79 } = {}) {
    const ct = top / 0.75, cb = (bottom - 0.25) / 0.75;
    const w1 = [[0, 0], [0.3, ct], [0.7, ct], [1, 0]];
    const w2 = [[1, 1], [0.7, cb], [0.3, cb], [0, 1]];
    return { outline: [['M', 0, 0], seg2cmd(w1), ['L', 1, 1], seg2cmd(w2), ['Z']], walls: [w1, w2] };
  },
  // north + east + west, open to the south; depth = y of the wall at the middle
  three({ depth = 0.7 } = {}) {
    const c = (depth - 0.25) / 0.75;
    const w = [[1, 1], [0.72, c], [0.28, c], [0, 1]];
    return { outline: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], seg2cmd(w), ['Z']], walls: [w] };
  },
  full() { return { outline: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']], walls: [] }; },
  // north cap that narrows into a band running down to the south-west corner,
  // leaving a meadow strip along the west edge (Princess & Dragon "CCc+")
  diagBand() {
    const w1 = [[1, 0], [0.62, 0.16], [0.2, 0.55], [0, 1]];
    const w2 = [[0, 0.92], [0.16, 0.66], [0.18, 0.3], [0, 0]];
    return { outline: [['M', 0, 0], ['L', 1, 0], seg2cmd(w1), ['L', 0, 0.92], seg2cmd(w2), ['Z']], walls: [w1, w2] };
  },
};

export function defaultCityShape(sides) {
  const set = new Set(sides);
  if (sides.length === 4) return { shape: 'full', rot: 0 };
  if (sides.length === 1) return { shape: 'cap', rot: sides[0] };
  if (sides.length === 3) {
    const open = [0, 1, 2, 3].find((s) => !set.has(s));
    return { shape: 'three', rot: (open - 2 + 4) % 4 };
  }
  const [a, b] = sides;
  if ((a + 2) % 4 === b) return { shape: 'band', rot: set.has(0) ? 1 : 0 };
  for (let k = 0; k < 4; k++) if (set.has(k % 4) && set.has((k + 3) % 4)) return { shape: 'corner', rot: k };
  throw new Error('bad city');
}

function rotateShape(shape, k) {
  const R = (x, y) => rotUnit(x, y, k);
  const outline = shape.outline.map((cmd) => {
    if (cmd[0] === 'Z') return cmd;
    const out = [cmd[0]];
    for (let i = 1; i < cmd.length; i += 2) out.push(...R(cmd[i], cmd[i + 1]));
    return out;
  });
  const walls = shape.walls.map((seg) => seg.map(([x, y]) => R(x, y)));
  return { outline, walls };
}

// ---------- roads & rivers ----------
const MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
const INWARD = [[0, 1], [-1, 0], [0, -1], [1, 0]];

export function pathBetween(sides, end = null) {
  if (sides.length === 1) {
    const [x, y] = MID[sides[0]];
    const [ix, iy] = INWARD[sides[0]];
    const [ex, ey] = end || [0.5, 0.5];
    return [[x, y], [x + ix * 0.22, y + iy * 0.22], [lerp(x + ix * 0.22, ex, 0.55), lerp(y + iy * 0.22, ey, 0.55)], [ex, ey]];
  }
  const [a, b] = sides;
  const [ax, ay] = MID[a], [bx, by] = MID[b];
  if ((a + 2) % 4 === b) return line([ax, ay], [bx, by]);
  const [aix, aiy] = INWARD[a], [bix, biy] = INWARD[b];
  return [[ax, ay], [ax + aix * 0.3, ay + aiy * 0.3], [bx + bix * 0.3, by + biy * 0.3], [bx, by]];
}

// ---------- per-tile hints ----------
// cities: { fi: { shape, rot?, ...params } }   roads/rivers: { fi: { end, c1, c2, bridge } }
// monastery: [x, y, scale]   garden: [x, y]   inns: [[x, y, lakeX, lakeY]]
// village: [x, y, r] (junction village)   trees: [x, y] (junction without village)
// stubs: [[x1, y1, x2, y2]] decorative road stubs that divide fields
// house: [x, y] small cottage at a road end   pennant: [x, y] preferred shield spot
// volcano / dragon / portal / princess: [x, y] where those are painted
// road end 'F' = the tower foundation; bridgedBy: road fi that crosses a city on a bridge
// gate: [x, y, angle] extra gatehouse; splitFields: a field may be drawn in pieces
// village: false = no hamlet where three or more roads end
const H = {
  // ---- The River ----
  'RI/s': { rivers: { 0: { end: [0.46, 0.5], spring: true } }, rock: [0.3, 0.5] },
  'RI.1/I.e': { rivers: { 0: { end: [0.4, 0.5] } }, lake: [0.63, 0.52, 0.26, 0.3] },
  'RI.1/CICI': { cities: { 0: { shape: 'cap', depth: 0.25 }, 1: { shape: 'cap', rot: 2, depth: 0.25 } } },
  'RI.1/CIRI': { cities: { 0: { shape: 'cap', depth: 0.26 } }, roads: { 1: { end: [0.55, 0.12], bridge: 'over', span: [0.26, 0.52] } }, rivers: { 2: { c1: [0.3, 0.62], c2: [0.7, 0.62] } } },
  'RI.1/LIRI': { monastery: [0.44, 0.27, 0.78], roads: { 0: { end: [0.47, 0.32], bridge: 'over', span: [0.24, 0.5] } }, rivers: { 1: { c1: [0.3, 0.66], c2: [0.7, 0.66] } } },
  'RI.1/RIrI': { roads: { 0: { bridge: 'over' } } },
  'RI.1/IIG': { garden: [0.7, 0.33] },
  // ---- 3rd-edition garden versions of base tiles ----
  'BA/CG': { garden: [0.35, 0.6] },
  'BA/CFCG': { garden: [0.46, 0.32] },
  'BA/CCG': { garden: [0.37, 0.66] },
  'BA/Cc+G': { garden: [0.76, 0.7] },
  'BA/CcG': { garden: [0.76, 0.68] },
  'BA/CccG': { garden: [0.49, 0.83] },
  'BA/RFrG': { garden: [0.27, 0.66] },
  'BA/RrG': { garden: [0.64, 0.24] },
  // ---- Inns & Cathedrals ----
  'IC/Cccc.c': { cathedral: [0.5, 0.5] },
  'IC/LRFR': { monastery: [0.5, 0.5, 1], roads: { 0: { end: [0.45, 0.5] }, 1: { end: [0.55, 0.5] } } },
  'IC/CCCCG': { cities: { 0: { depth: 0.22 }, 1: { depth: 0.22 }, 2: { depth: 0.22 }, 3: { depth: 0.22 } }, garden: [0.5, 0.5] },
  'IC/CCC': { cities: { 0: { depth: 0.2 }, 1: { depth: 0.2 }, 2: { depth: 0.2 } } },
  'IC/CRCR': { cities: { 0: { depth: 0.26 }, 1: { depth: 0.26 } }, roads: { 2: { end: [0.5, 0.5] }, 3: { end: [0.5, 0.5] } }, village: [0.5, 0.5, 0.13], stubs: [[0.5, 0.5, 0.5, 0.16], [0.5, 0.5, 0.5, 0.84]] },
  'IC/CCc+': { cities: { 1: { depth: 0.2 } } },
  'IC/C!': { cities: { 0: { shape: 'capSpike' } } },
  'IC/CFR': { cities: { 0: { depth: 0.24 } }, roads: { 1: { end: [0.5, 0.14], c1: [0.62, 0.72], c2: [0.4, 0.4] } } },
  'IC/CcR': { roads: { 1: { end: [0.42, 0.44] } } },
  'IC/CRcR+': { cities: { 0: { top: 0.36, bottom: 0.72 } }, roads: { 1: { end: [0.5, 0.42] }, 2: { end: [0.5, 0.66] } } },
  'IC/RCc.i': { roads: { 1: { end: [0.4, 0.5] } }, inns: [[0.66, 0.6, 0.66, 0.84]] },
  'IC/RrC.i': { cities: { 0: { depth: 0.3 } }, inns: [[0.56, 0.46, 0.76, 0.66]] },
  'IC/CcRr+.i': { inns: [[0.86, 0.74, 0.74, 0.9]] },
  'IC/RRR.i': { roads: { 0: { end: [0.5, 0.58] }, 1: { end: [0.5, 0.58] }, 2: { end: [0.5, 0.58] } }, trees: [0.5, 0.58], inns: [[0.66, 0.24, 0.4, 0.26]] },
  'IC/RFr.iG': { inns: [[0.32, 0.27, 0.55, 0.27]], garden: [0.64, 0.76] },
  'IC/Rr.i': { inns: [[0.62, 0.26, 0.8, 0.44]] },
  'IC/RrRr': { house: [0.5, 0.5] },
  // ---- Traders & Builders ----
  'TB/CCc.c': { cities: { 0: { top: 0.26, bottom: 0.6 }, 1: { depth: 0.13 } } },
  'TB/CCc.w': { cities: { 0: { top: 0.26, bottom: 0.6 }, 1: { depth: 0.13 } } },
  'TB/CcCC.c': { cities: { 1: { depth: 0.13 }, 2: { depth: 0.13 } } },
  'TB/CcRR!.c': { cities: { 0: { shape: 'cornerSpike' } }, roads: { 1: { end: [0.7, 0.5] }, 2: { end: [0.5, 0.7] } } },
  'TB/CcRR.wG': { roads: { 1: { end: [0.7, 0.24] }, 2: { end: [0.24, 0.7] } }, garden: [0.74, 0.74] },
  'TB/CcRC.c': { cities: { 1: { depth: 0.16 } }, roads: { 2: { end: [0.44, 0.44] } } },
  'TB/CcRC.g': { cities: { 1: { depth: 0.16 } }, roads: { 2: { end: [0.44, 0.44] } } },
  'TB/CcR.cG': { roads: { 1: { end: [0.44, 0.46] } }, garden: [0.72, 0.76] },
  'TB/CcR!.w': { cities: { 0: { shape: 'cornerSpike' } }, roads: { 1: { end: [0.7, 0.5] } } },
  'TB/CcCc.w': { cities: { 0: { bulge: 0.84 }, 1: { bulge: 0.84 } } },
  'TB/CR': { cities: { 0: { depth: 0.26 } }, roads: { 1: { end: [0.5, 0.14], c1: [0.6, 0.62], c2: [0.46, 0.6] } } },
  'TB/CRc.g': { cities: { 0: { top: 0.24, bottom: 0.66 } }, roads: { 1: { end: [0.5, 0.6] } } },
  'TB/CRc.w': { cities: { 0: { top: 0.24, bottom: 0.66 } }, roads: { 1: { end: [0.5, 0.6] } } },
  'TB/CRcR.w': { cities: { 0: { top: 0.34, bottom: 0.66 } }, roads: { 1: { end: [0.5, 0.4] }, 2: { end: [0.5, 0.6] } } },
  'TB/LRRR': { monastery: [0.5, 0.48, 1], roads: { 0: { end: [0.5, 0.5] }, 1: { end: [0.5, 0.5] }, 2: { end: [0.5, 0.5] } } },
  'TB/RCc.g': { roads: { 1: { end: [0.36, 0.56] } } },
  'TB/RCc!.g': { cities: { 0: { shape: 'cornerSpike' } }, roads: { 1: { end: [0.5, 0.7] } } },
  'TB/RRC': { cities: { 0: { depth: 0.24 } }, roads: { 1: { end: [0.5, 0.12] }, 2: { end: [0.66, 0.5], bridge: 'over' } }, house: [0.72, 0.5] },
  'TB/RRrr': { roads: { 1: { bridge: 'over' } } },
  // ---- The Princess & the Dragon ----
  'DG/F.v': { volcano: [0.44, 0.52], house: [0.8, 0.2] },
  'DG/R.v': { volcano: [0.5, 0.36], roads: { 0: { end: [0.5, 0.47] } } },
  'DG/C.v': { volcano: [0.5, 0.66] },
  'DG/Rr.v': { volcano: [0.6, 0.36] },
  'DG/RFr.v': { volcano: [0.5, 0.26], roads: { 0: { c1: [0.35, 0.62], c2: [0.65, 0.52] } } },
  'DG/CC.v': { volcano: [0.34, 0.66] },
  'DG/C.dG': { garden: [0.3, 0.62], dragon: [0.74, 0.76] },
  'DG/LRRR.d': { monastery: [0.5, 0.48, 1], roads: { 0: { end: [0.5, 0.5] }, 1: { end: [0.5, 0.5] }, 2: { end: [0.5, 0.5] } }, dragon: [0.82, 0.16] },
  'DG/RRR.d': { dragon: [0.2, 0.2] },
  'DG/LCcc.d': { cities: { 0: { depth: 0.72 } }, monastery: [0.36, 0.38, 0.78], dragon: [0.84, 0.86] },
  'DG/Rr.d': { dragon: [0.74, 0.28] },
  'DG/RFr.d': { roads: { 0: { c1: [0.35, 0.62], c2: [0.65, 0.52] } }, dragon: [0.24, 0.24] },
  'DG/Cc.d': { dragon: [0.76, 0.76] },
  'DG/CFc+.d': { cities: { 0: { top: 0.2, bottom: 0.8 } }, dragon: [0.22, 0.4] },
  'DG/CRcr.d': { cities: { 0: { top: 0.2, bottom: 0.8 } }, dragon: [0.2, 0.42], splitFields: true },
  'DG/RrC.d': { dragon: [0.78, 0.56] },
  'DG/CRr.d': { dragon: [0.22, 0.56] },
  'DG/RrRr.g': { portal: [0.74, 0.27] },
  'DG/RRR.g': { roads: { 0: { end: [0.5, 0.56] }, 1: { end: [0.5, 0.56] }, 2: { end: [0.5, 0.56] } }, trees: [0.5, 0.56], house: [0.22, 0.22], portal: [0.77, 0.23] },
  'DG/Ccc+.g': { cities: { 0: { depth: 0.62 } }, portal: [0.5, 0.86] },
  'DG/CcRr.g': { portal: [0.85, 0.84] },
  'DG/RrC.g': { portal: [0.77, 0.56] },
  'DG/CRr.g': { portal: [0.24, 0.58] },
  'DG/CRRR.p': { roads: { 1: { end: [0.5, 0.58] }, 2: { end: [0.5, 0.58] }, 3: { end: [0.5, 0.58] } }, trees: [0.5, 0.58], princess: [0.24, 0.11] },
  'DG/CCc+.p': { cities: { 0: { shape: 'diagBand' }, 1: { bulge: 0.85 } }, princess: [0.3, 0.13] },
  'DG/Ccc.p': { princess: [0.2, 0.2] },
  'DG/Cc!.p': { cities: { 0: { shape: 'cornerSpike', pull: 0.76 } }, princess: [0.2, 0.2] },
  'DG/Cc.pG': { garden: [0.72, 0.72], princess: [0.22, 0.2] },
  'DG/CcRr.p': { princess: [0.22, 0.2] },
  // ---- The Tower ----
  'TO/FG': { garden: [0.78, 0.17] },
  'TO/L': { monastery: [0.36, 0.62, 0.9] },
  'TO/RRG': { roads: { 0: { end: 'F' }, 1: { end: 'F' } }, garden: [0.78, 0.17] },
  'TO/RRR': { roads: { 0: { end: 'F' }, 1: { end: 'F' }, 2: { end: 'F' } } },
  'TO/RRRR.1': { roads: { 0: { end: 'F' }, 1: { end: 'F' }, 2: { end: 'F' }, 3: { end: 'F' } } },
  'TO/CRcr': { cities: { 0: { top: 0.14, bottom: 0.84, bridgedBy: 1 } }, roads: { 1: { bridge: 'over', span: [0.1, 0.9] } } },
  'TO/CFR': { cities: { 0: { depth: 0.34 } }, roads: { 1: { end: 'F' } } },
  'TO/RCr': { cities: { 0: { depth: 0.47 } }, roads: { 1: { c1: [0.33, 0.47], c2: [0.67, 0.47] } }, gate: [0.5, 0.435, -Math.PI / 2] },
  'TO/CcR!': { cities: { 0: { shape: 'cornerSpike' } }, roads: { 1: { end: [0.7, 0.5] } } },
  'TO/CccC+': { cities: { 0: { depth: 0.7 }, 1: { depth: 0.13 } }, pennant: [0.82, 0.15] },
};
export const LAYOUT_HINTS = H;

// ---------- layout ----------
const cache = new Map();
export function layoutOf(id) {
  if (cache.has(id)) return cache.get(id);
  const t = TILE_TYPES[id];
  const h = H[id] || {};
  const cities = [], roads = [], rivers = [];
  let monastery = null, garden = null;
  t.features.forEach((f, fi) => {
    if (f.type === 'city') {
      const def = defaultCityShape(f.sides);
      const hint = h.cities?.[fi] || {};
      const shape = hint.shape || def.shape;
      const rot = hint.rot ?? (shape === def.shape ? def.rot : (shape === 'cornerSpike' || shape === 'capSpike' ? def.rot : def.rot));
      const geom = rotateShape(SHAPES[shape](hint), rot);
      cities.push({ fi, shape, rot, ...geom, sides: f.sides, pennants: f.pennants || 0, goods: f.goods || null, princess: !!f.princess, cathedral: !!f.cathedral, bridgedBy: hint.bridgedBy ?? null });
    } else if (f.type === 'road' || f.type === 'river') {
      const hint = (f.type === 'road' ? h.roads : h.rivers)?.[fi] || {};
      let end = hint.end === 'F' ? t.foundation : hint.end || null;
      if (!end && f.sides.length === 1 && t.features.some((g) => g.type === 'monastery')) end = h.monastery ? [h.monastery[0], h.monastery[1]] : [0.5, 0.5];
      let seg = pathBetween(f.sides, end);
      if (hint.c1) seg = [seg[0], hint.c1, hint.c2 || seg[2], seg[3]];
      const item = { fi, sides: f.sides, seg, bridge: hint.bridge || null, span: hint.span || [0.3, 0.7], tunnel: !!f.tunnel, dead: f.sides.length === 1, spring: !!hint.spring, inn: !!f.inn };
      (f.type === 'road' ? roads : rivers).push(item);
    } else if (f.type === 'monastery') {
      const [x, y, s] = h.monastery || [0.5, 0.5, 1];
      monastery = { fi, x, y, s };
    } else if (f.type === 'garden') {
      garden = { fi, x: (h.garden || [])[0], y: (h.garden || [])[1], auto: !h.garden };
    }
  });
  const deadEnds = roads.filter((r) => r.dead).length;
  const tags = t.tags || [];
  let village = null, trees = null;
  if (h.village) village = { x: h.village[0], y: h.village[1], r: h.village[2] };
  else if (h.trees) trees = { x: h.trees[0], y: h.trees[1] };
  else if (h.village !== false && !monastery && !t.foundation && deadEnds >= 3) village = { x: 0.5, y: 0.5, r: 0.1, house: true };
  const lay = {
    id, cities, roads, rivers, monastery, garden, village, trees,
    stubs: h.stubs || [], inns: h.inns || [], house: h.house || null, cathedral: h.cathedral || null,
    rock: h.rock || null, lake: h.lake || null, tags,
    volcano: tags.includes('volcano') ? h.volcano || [0.5, 0.5] : null,
    dragon: tags.includes('dragon') ? h.dragon || [0.78, 0.22] : null,
    portal: tags.includes('portal') ? h.portal || [0.75, 0.25] : null,
    princess: cities.some((c) => c.princess) ? h.princess || [0.22, 0.2] : null,
    foundation: t.foundation || null,
    pennant: h.pennant || null, gate: h.gate || null, splitFields: !!h.splitFields,
  };
  cache.set(id, lay);
  return lay;
}
