// Procedural, hand-painted-style artwork for Carcassonne tiles and meeples.
// Every tile type is painted once into an offscreen canvas (in its unrotated
// orientation) and then blitted/rotated by the board renderer.
import { TILE_TYPES } from './tiles.js';

export const ART_SIZE = 576; // px per tile in the cached artwork
const HIT = 96; // resolution of the feature hit-map

// ---------- small utils ----------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Rotate a unit-square point clockwise by k quarter turns about the centre.
export function rotUnit(x, y, k) {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [x, y] = [1 - y, x];
  return [x, y];
}

function bezierPoint(seg, t) {
  const [p0, p1, p2, p3] = seg;
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

// ---------- canonical geometry ----------
// Each city configuration is described in a canonical orientation and
// rotated into place. Outline = closed list of segments (lines or cubic
// beziers); walls = the bezier segments that face fields.
const CITY_SHAPES = {
  cap: { // canonical: north edge
    outline: [['M', 0, 0], ['L', 1, 0], ['C', 0.79, 0.31, 0.21, 0.31, 0, 0]],
    walls: [[[1, 0], [0.79, 0.31], [0.21, 0.31], [0, 0]]],
  },
  corner: { // canonical: north + west
    outline: [['M', 0, 0], ['L', 1, 0], ['C', 0.68, 0.38, 0.38, 0.68, 0, 1], ['Z']],
    walls: [[[1, 0], [0.68, 0.38], [0.38, 0.68], [0, 1]]],
  },
  band: { // canonical: west + east
    outline: [['M', 0, 0], ['C', 0.3, 0.28, 0.7, 0.28, 1, 0], ['L', 1, 1], ['C', 0.7, 0.72, 0.3, 0.72, 0, 1], ['Z']],
    walls: [[[0, 0], [0.3, 0.28], [0.7, 0.28], [1, 0]], [[1, 1], [0.7, 0.72], [0.3, 0.72], [0, 1]]],
  },
  three: { // canonical: north + east + west (open south)
    outline: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['C', 0.72, 0.6, 0.28, 0.6, 0, 1], ['Z']],
    walls: [[[1, 1], [0.72, 0.6], [0.28, 0.6], [0, 1]]],
  },
  full: { outline: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']], walls: [] },
};

function cityConfig(sides) {
  const set = new Set(sides);
  if (sides.length === 4) return { shape: 'full', rot: 0 };
  if (sides.length === 1) return { shape: 'cap', rot: sides[0] };
  if (sides.length === 3) {
    const open = [0, 1, 2, 3].find((s) => !set.has(s));
    return { shape: 'three', rot: (open - 2 + 4) % 4 };
  }
  const [a, b] = sides;
  if ((a + 2) % 4 === b || (b + 2) % 4 === a) return { shape: 'band', rot: set.has(0) ? 1 : 0 };
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

function outlinePath(outline, S, ctx = new Path2D()) {
  for (const c of outline) {
    if (c[0] === 'M') ctx.moveTo(c[1] * S, c[2] * S);
    else if (c[0] === 'L') ctx.lineTo(c[1] * S, c[2] * S);
    else if (c[0] === 'C') ctx.bezierCurveTo(c[1] * S, c[2] * S, c[3] * S, c[4] * S, c[5] * S, c[6] * S);
    else ctx.closePath();
  }
  return ctx;
}

const MID = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
const INWARD = [[0, 1], [-1, 0], [0, -1], [1, 0]];

function roadSegment(sides) {
  if (sides.length === 1) {
    const [x, y] = MID[sides[0]];
    const [ix, iy] = INWARD[sides[0]];
    return [[x, y], [x + ix * 0.2, y + iy * 0.2], [0.5 - ix * 0.15, 0.5 - iy * 0.15], [0.5, 0.5]];
  }
  const [a, b] = sides;
  const [ax, ay] = MID[a], [bx, by] = MID[b];
  if ((a + 2) % 4 === b) {
    return [[ax, ay], [lerp(ax, bx, 0.33), lerp(ay, by, 0.33)], [lerp(ax, bx, 0.66), lerp(ay, by, 0.66)], [bx, by]];
  }
  const [aix, aiy] = INWARD[a], [bix, biy] = INWARD[b];
  return [[ax, ay], [ax + aix * 0.3, ay + aiy * 0.3], [bx + bix * 0.3, by + biy * 0.3], [bx, by]];
}

function segPath(seg, S, p = new Path2D()) {
  p.moveTo(seg[0][0] * S, seg[0][1] * S);
  p.bezierCurveTo(seg[1][0] * S, seg[1][1] * S, seg[2][0] * S, seg[2][1] * S, seg[3][0] * S, seg[3][1] * S);
  return p;
}

function geometry(id) {
  const t = TILE_TYPES[id];
  const cities = [], roads = [];
  let monastery = -1;
  t.features.forEach((f, fi) => {
    if (f.type === 'city') {
      const cfg = cityConfig(f.sides);
      cities.push({ fi, cfg, ...rotateShape(CITY_SHAPES[cfg.shape], cfg.rot), pennant: f.pennant });
    } else if (f.type === 'road') {
      roads.push({ fi, sides: f.sides, seg: roadSegment(f.sides) });
    } else if (f.type === 'monastery') monastery = fi;
  });
  const deadEnds = roads.filter((r) => r.sides.length === 1).length;
  const junction = monastery < 0 && deadEnds >= 3;
  // gate where a lone road runs into a city (tiles S/T)
  let gate = null;
  if (deadEnds === 1 && monastery < 0 && cities.length) {
    const r = roads.find((rr) => rr.sides.length === 1);
    const c = cities.find((cc) => cc.cfg.shape === 'three');
    if (c) { const w = c.walls[0]; gate = { at: bezierPoint(w, 0.5), side: r.sides[0] }; }
  }
  return { cities, roads, monastery, junction, gate };
}

// ---------- hit map: which pixel belongs to which feature ----------
const ROAD_W = 0.11;
function buildHitMap(id, geo) {
  const t = TILE_TYPES[id];
  const c = canvas(HIT);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const label = new Int16Array(HIT * HIT).fill(-1); // -1 = grass, -2 = blocker
  const stamp = (draw, val) => {
    ctx.clearRect(0, 0, HIT, HIT);
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    draw(ctx);
    const d = ctx.getImageData(0, 0, HIT, HIT).data;
    for (let i = 0; i < label.length; i++) if (d[i * 4 + 3] > 110) label[i] = val;
  };
  for (const r of geo.roads) stamp((g) => { g.lineWidth = ROAD_W * HIT; g.lineCap = 'butt'; g.stroke(segPath(r.seg, HIT)); }, r.fi);
  for (const cty of geo.cities) stamp((g) => g.fill(outlinePath(cty.outline, HIT)), cty.fi);
  if (geo.monastery >= 0) stamp((g) => g.fillRect(0.3 * HIT, 0.28 * HIT, 0.4 * HIT, 0.44 * HIT), geo.monastery);
  if (geo.junction) stamp((g) => { g.beginPath(); g.arc(HIT / 2, HIT / 2, 0.1 * HIT, 0, 7); g.fill(); }, -2);

  // grass components
  const comp = new Int16Array(HIT * HIT).fill(-1);
  let nComp = 0;
  for (let i = 0; i < label.length; i++) {
    if (label[i] !== -1 || comp[i] !== -1) continue;
    const st = [i]; comp[i] = nComp;
    while (st.length) {
      const j = st.pop(); const x = j % HIT, y = (j / HIT) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= HIT || ny >= HIT) continue;
        const nj = ny * HIT + nx;
        if (label[nj] === -1 && comp[nj] === -1) { comp[nj] = nComp; st.push(nj); }
      }
    }
    nComp++;
  }
  // map components to field features using edge port sample points
  const portPt = (p) => {
    const s = Math.floor(p / 3), i = p % 3;
    const u = [0.13, 0.5, 0.87][i], v = 0.025;
    return [[u, v], [1 - v, u], [1 - u, 1 - v], [v, 1 - u]][s];
  };
  const compToField = new Map();
  const problems = [];
  t.features.forEach((f, fi) => {
    if (f.type !== 'field') return;
    for (const p of f.ports) {
      const [u, v] = portPt(p);
      const j = Math.min(HIT - 1, (v * HIT) | 0) * HIT + Math.min(HIT - 1, (u * HIT) | 0);
      const cc = comp[j];
      if (cc < 0) { problems.push(`${id}: field ${fi} port ${p} not grass`); continue; }
      if (compToField.has(cc) && compToField.get(cc) !== fi) problems.push(`${id}: component shared by fields ${compToField.get(cc)} & ${fi}`);
      compToField.set(cc, fi);
    }
  });
  for (let i = 0; i < label.length; i++) {
    if (label[i] === -1) label[i] = compToField.has(comp[i]) ? compToField.get(comp[i]) : -2;
  }
  if (problems.length) console.warn(problems.join('\n'));
  return { label, problems };
}

// distance (in px) from each pixel to the nearest pixel of another label
function distanceMap(label, want) {
  const INF = 1e9;
  const d = new Float32Array(HIT * HIT);
  for (let i = 0; i < d.length; i++) d[i] = label[i] === want ? INF : 0;
  // treat outside the tile as "same" so anchors may sit near tile edges but not on them
  const at = (x, y) => (x < 0 || y < 0 || x >= HIT || y >= HIT ? 3 : d[y * HIT + x]);
  for (let y = 0; y < HIT; y++) for (let x = 0; x < HIT; x++) {
    const i = y * HIT + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
  }
  for (let y = HIT - 1; y >= 0; y--) for (let x = HIT - 1; x >= 0; x--) {
    const i = y * HIT + x; if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  }
  return d;
}

function computeAnchors(id, geo, label) {
  const t = TILE_TYPES[id];
  return t.features.map((f, fi) => {
    if (f.type === 'monastery') return [0.5, 0.56];
    if (f.type === 'road') {
      const r = geo.roads.find((rr) => rr.fi === fi);
      if (r.sides.length === 1) {
        const [x, y] = MID[r.sides[0]]; const [ix, iy] = INWARD[r.sides[0]];
        return [x + ix * 0.22, y + iy * 0.22];
      }
      return bezierPoint(r.seg, 0.5);
    }
    const d = distanceMap(label, fi);
    let best = -1, bx = 0.5, by = 0.5;
    for (let i = 0; i < d.length; i++) {
      if (label[i] !== fi) continue;
      const x = (i % HIT + 0.5) / HIT, y = (((i / HIT) | 0) + 0.5) / HIT;
      // prefer roomy spots, slightly toward the tile centre
      const score = Math.min(d[i], f.type === 'field' ? 14 : 20) - Math.hypot(x - 0.5, y - 0.5) * 6;
      if (score > best) { best = score; bx = x; by = y; }
    }
    const lo = f.type === 'city' ? 0.13 : 0.15;
    return [Math.max(lo, Math.min(1 - lo, bx)), Math.max(lo, Math.min(1 - lo, by))];
  });
}

// ---------- painting ----------
// Painterly, muted style in the spirit of the board game's illustrations:
// soft watercolour meadows, pale sandy paths, dense muted-red rooftops behind
// grey-brown stone walls, soft shadows and no hard outlines.
const GREENS = ['#86a04a', '#8fa851', '#7c9645', '#94ac57', '#9db35c', '#78913f'];
const GRASS_BASE = '#89a24d';

function noiseCanvas(cells, rnd, color = null) {
  const c = canvas(cells); const ctx = c.getContext('2d');
  const img = ctx.createImageData(cells, cells);
  const [r, g, b] = color ? hexRgb(color) : [0, 0, 0];
  for (let i = 0; i < cells * cells; i++) {
    const v = rnd();
    if (color) { img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = v * 255; }
    else { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v * 255; img.data[i * 4 + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function drawSmooth(ctx, src, S, alpha, op = 'source-over') {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // overscan so the bilinear blobs don't show hard tile-edge artefacts
  ctx.drawImage(src, -S * 0.06, -S * 0.06, S * 1.12, S * 1.12);
  ctx.restore();
}

function paintGrass(ctx, S, rnd) {
  const k = S / 384;
  ctx.fillStyle = GRASS_BASE; ctx.fillRect(0, 0, S, S);
  // tonal variation, several octaves of soft noise
  drawSmooth(ctx, noiseCanvas(4, rnd, '#a9b964'), S, 0.16);
  drawSmooth(ctx, noiseCanvas(5, rnd, '#5f7a3c'), S, 0.13);
  drawSmooth(ctx, noiseCanvas(12, rnd, '#6d8a40'), S, 0.08);
  drawSmooth(ctx, noiseCanvas(70, rnd), S, 0.05, 'overlay');
  // broad directional brushwork, like a watercolour wash
  ctx.lineCap = 'round';
  for (let i = 0; i < 250; i++) {
    const x = rnd() * S * 1.2 - S * 0.1, y = rnd() * S * 1.2 - S * 0.1, len = (20 + rnd() * 25) * k, a = -0.61 + (rnd() - 0.5) * 0.2;
    ctx.strokeStyle = rnd() < 0.5 ? '#9cb35e' : '#7a944a'; ctx.globalAlpha = 0.045;
    ctx.lineWidth = (6 + rnd() * 4) * k;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // dabs of paint: short soft strokes with a consistent hand direction
  ctx.lineCap = 'round';
  for (let i = 0; i < 600; i++) {
    const x = rnd() * S, y = rnd() * S, len = (12 + rnd() * 18) * k, a = -0.75 + (rnd() - 0.5) * 0.4;
    ctx.strokeStyle = pick(rnd, GREENS); ctx.globalAlpha = 0.025 + rnd() * 0.035;
    ctx.lineWidth = (2 + rnd() * 3.5) * k;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // fine grass texture
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * S, y = rnd() * S;
    ctx.strokeStyle = rnd() < 0.5 ? '#4e6a30' : '#a9bb72'; ctx.globalAlpha = 0.03 + rnd() * 0.03;
    ctx.lineWidth = 0.8 * k;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 2 * k, y - (2 + rnd() * 3) * k); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // feather the tile margins towards a shared base tone so tiles join seamlessly
  const band = 0.12 * S;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, band, 0, 0, S, band], [0, S, 0, S - band, 0, S - band, S, band], [0, 0, band, 0, 0, 0, band, S], [S, 0, S - band, 0, S - band, 0, band, S]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(137,162,77,0.6)'); g.addColorStop(1, 'rgba(137,162,77,0)');
    ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
  }
}

// Patchwork farmland (plowed or ripening strips), as on the printed tiles.
function paintFarmPatches(ctx, S, rnd, label, id) {
  const k = S / 384;
  const t = TILE_TYPES[id];
  const isField = (u, v) => {
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
    const l = label[Math.floor(v * HIT) * HIT + Math.floor(u * HIT)];
    return l >= 0 && t.features[l].type === 'field';
  };
  const n = rnd() < 0.55 ? 1 : rnd() < 0.5 ? 2 : 0;
  for (let p = 0; p < n; p++) {
    for (let tries = 0; tries < 30; tries++) {
      const u = 0.15 + rnd() * 0.7, v = 0.15 + rnd() * 0.7, r = 0.08 + rnd() * 0.05;
      const ok = [[0, 0], [r * 1.25, 0], [-r * 1.25, 0], [0, r * 0.5], [0, -r * 0.5], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7]].every(([a, b]) => isField(u + a, v + b));
      if (!ok) continue;
      const ang = rnd() * Math.PI;
      const col = pick(rnd, [['#a19a5a', '#8b844a'], ['#8f9a4e', '#7a8743'], ['#9c8a5c', '#86744b'], ['#b2a565', '#998c50']]);
      ctx.save();
      ctx.translate(u * S, v * S); ctx.rotate(ang);
      const w = r * S * 2.4, h = r * S * 0.85;
      ctx.filter = `blur(${1.5 * k}px)`;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2 + rnd() * 4 * k); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2 - rnd() * 6 * k, h / 2); ctx.lineTo(-w / 2 + rnd() * 6 * k, h / 2);
      ctx.closePath();
      ctx.globalAlpha = 0.38; ctx.fillStyle = col[0]; ctx.fill();
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalAlpha = 0.35; ctx.strokeStyle = col[1]; ctx.lineWidth = 2 * k;
      for (let y = -h; y < h; y += 5 * k) { ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y + (rnd() - 0.5) * k); ctx.stroke(); }
      ctx.restore();
      break;
    }
  }
}

function paintRoads(ctx, S, rnd, geo) {
  if (!geo.roads.length) return;
  const k = S / 384;
  const W = ROAD_W * S;
  ctx.save();
  ctx.lineCap = 'butt';
  // trodden, darker verge blending into the meadow
  ctx.filter = `blur(${4 * k}px)`;
  for (const r of geo.roads) { ctx.strokeStyle = 'rgba(70,72,35,0.45)'; ctx.lineWidth = W * 1.65; ctx.stroke(segPath(r.seg, S)); }
  ctx.filter = `blur(${1.2 * k}px)`;
  for (const r of geo.roads) { ctx.strokeStyle = 'rgba(168,150,112,0.8)'; ctx.lineWidth = W * 1.08; ctx.stroke(segPath(r.seg, S)); }
  ctx.restore();
  const layer = canvas(S); const l = layer.getContext('2d');
  l.lineCap = 'butt';
  l.filter = `blur(${0.6 * k}px)`;
  for (const r of geo.roads) { l.strokeStyle = '#d9c9a0'; l.lineWidth = W * 0.9; l.stroke(segPath(r.seg, S)); }
  l.filter = 'none';
  l.globalCompositeOperation = 'source-atop';
  drawSmooth(l, noiseCanvas(10, rnd, '#b9a986'), S, 0.5, 'source-atop');
  drawSmooth(l, noiseCanvas(40, rnd), S, 0.18, 'overlay');
  // faint cart tracks
  for (const r of geo.roads) {
    l.strokeStyle = 'rgba(140,120,85,0.22)'; l.lineWidth = W * 0.55; l.stroke(segPath(r.seg, S));
    l.strokeStyle = 'rgba(217,201,160,0.9)'; l.lineWidth = W * 0.4; l.stroke(segPath(r.seg, S));
  }
  for (let i = 0; i < 700; i++) {
    l.fillStyle = rnd() < 0.6 ? 'rgba(120,100,70,0.22)' : 'rgba(250,245,230,0.3)';
    l.beginPath(); l.arc(rnd() * S, rnd() * S, (0.5 + rnd()) * k, 0, 7); l.fill();
  }
  // keep the texture strictly inside the road
  l.globalCompositeOperation = 'destination-in';
  l.filter = `blur(${0.6 * k}px)`;
  const all = new Path2D();
  for (const r of geo.roads) segPath(r.seg, S, all);
  l.strokeStyle = '#000'; l.lineWidth = W * 0.9; l.stroke(all);
  l.filter = 'none';
  ctx.drawImage(layer, 0, 0);
}

const ROOFS = [['#b8664a', '#7d3a28'], ['#ad5a3f', '#7b3826'], ['#bf6f50', '#86442e'], ['#a65539', '#713424'], ['#b26b4d', '#80432e'], ['#c07a55', '#8a4c33']];
const WALLS = ['#ddd0b2', '#d4c4a2', '#e3d7bd', '#cfbe9b'];

function house(ctx, x, y, w, h, rnd, k, palette) {
  const wallH = h * 0.36, roofH = h - wallH;
  ctx.fillStyle = 'rgba(45,35,20,0.28)';
  ctx.fillRect(x + 2 * k, y + 2.5 * k, w, h);
  ctx.fillStyle = pick(rnd, WALLS); ctx.fillRect(x, y + roofH, w, wallH);
  ctx.fillStyle = 'rgba(70,50,30,0.16)'; ctx.fillRect(x + w * 0.62, y + roofH, w * 0.38, wallH);
  ctx.fillStyle = 'rgba(60,45,35,0.55)';
  ctx.fillRect(x + w * 0.44, y + roofH + wallH * 0.38, w * 0.13, wallH * 0.62);
  if (w > 18 * k) {
    ctx.fillRect(x + w * 0.16, y + roofH + wallH * 0.3, w * 0.1, wallH * 0.28);
    ctx.fillRect(x + w * 0.74, y + roofH + wallH * 0.3, w * 0.1, wallH * 0.28);
  }
  const [rLight, rDark] = palette;
  // two roof slopes meeting at a ridge, with a soft gradient on each
  const g1 = ctx.createLinearGradient(0, y, 0, y + roofH * 0.5);
  g1.addColorStop(0, rLight); g1.addColorStop(1, mix(rLight, '#ffffff', 0.08));
  ctx.fillStyle = g1; ctx.fillRect(x - 0.8 * k, y, w + 1.6 * k, roofH * 0.5);
  const g2 = ctx.createLinearGradient(0, y + roofH * 0.5, 0, y + roofH);
  g2.addColorStop(0, rDark); g2.addColorStop(1, mix(rDark, '#000000', 0.15));
  ctx.fillStyle = g2; ctx.fillRect(x - 0.8 * k, y + roofH * 0.5, w + 1.6 * k, roofH * 0.5);
  ctx.fillStyle = 'rgba(255,235,210,0.35)'; ctx.fillRect(x - 0.8 * k, y + roofH * 0.47, w + 1.6 * k, 0.9 * k);
  ctx.strokeStyle = 'rgba(55,30,18,0.3)'; ctx.lineWidth = 0.7 * k; ctx.strokeRect(x - 0.8 * k, y, w + 1.6 * k, h);
}

function tower(ctx, x, y, r, k) {
  ctx.save();
  ctx.filter = `blur(${2 * k}px)`;
  ctx.fillStyle = 'rgba(30,25,10,0.4)';
  ctx.beginPath(); ctx.ellipse(x + 3 * k, y + 4 * k, r * 1.05, r * 0.95, 0, 0, 7); ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#b3a892'); g.addColorStop(1, '#6f6656');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  const rg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r * 0.8);
  rg.addColorStop(0, '#b06a50'); rg.addColorStop(1, '#6e3b2a');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 0.74, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.25)'; ctx.lineWidth = 0.7 * k;
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); ctx.stroke(); }
}

function paintCities(ctx, S, rnd, geo, label) {
  const k = S / 384;
  for (const c of geo.cities) {
    const path = outlinePath(c.outline, S);
    ctx.save();
    ctx.shadowColor = 'rgba(25,30,10,0.55)'; ctx.shadowBlur = 16 * k; ctx.shadowOffsetX = 3 * k; ctx.shadowOffsetY = 5 * k;
    ctx.fillStyle = '#bfa67c'; ctx.fill(path);
    ctx.restore();
    ctx.save(); ctx.clip(path);
    ctx.fillStyle = '#c4ad84'; ctx.fillRect(0, 0, S, S);
    drawSmooth(ctx, noiseCanvas(8, rnd, '#a88f66'), S, 0.5);
    drawSmooth(ctx, noiseCanvas(36, rnd), S, 0.15, 'overlay');

    const inCity = (u, v) => {
      if (u < 0 || v < 0 || u >= 1 || v >= 1) return true;
      return label[Math.floor(v * HIT) * HIT + Math.floor(u * HIT)] === c.fi;
    };
    const roomy = (x, y, m) => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m], [m, m], [-m, -m], [m, -m], [-m, m]].every(([a, b]) => inCity(x + a, y + b));
    const big = c.cfg.shape === 'three' || c.cfg.shape === 'full';
    const keep = big ? (c.cfg.shape === 'full' ? [0.5, 0.5] : rotUnit(0.5, 0.3, c.cfg.rot)) : null;
    // quarters: clusters of houses around seeds, lanes between them
    const seeds = [];
    for (let i = 0; i < 400 && seeds.length < 40; i++) {
      const x = rnd(), y = rnd();
      if (!roomy(x, y, 0.06)) continue;
      if (seeds.some(([a, b]) => Math.hypot(a - x, b - y) < 0.11)) continue;
      seeds.push([x, y, (rnd() - 0.5) * 1.2]);
    }
    const houses = [];
    for (const [sx, sy, ang] of seeds) {
      const n = 4 + Math.floor(rnd() * 5);
      for (let i = 0; i < n * 3 && houses.filter((h) => h.seed === sx).length < n; i++) {
        const a = rnd() * 6.283, d = rnd() * 0.085;
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d;
        if (!roomy(x, y, 0.055)) continue;
        if (keep && Math.hypot(x - keep[0], y - keep[1]) < 0.17) continue;
        if (houses.some((h) => Math.hypot(h.x - x, h.y - y) < 0.052)) continue;
        houses.push({ x, y, seed: sx, ang: ang + (rnd() - 0.5) * 0.85 });
      }
    }
    houses.sort((p, q) => p.y - q.y);
    for (const hs of houses) {
      const big2 = rnd() < 0.2;
      const w = (big2 ? 0.095 + rnd() * 0.03 : 0.064 + rnd() * 0.03) * S, h = (big2 ? 0.08 : 0.058 + rnd() * 0.02) * S;
      ctx.save(); ctx.translate(hs.x * S, hs.y * S); ctx.rotate(hs.ang);
      house(ctx, -w / 2, -h / 2, w, h, rnd, k, pick(rnd, ROOFS));
      ctx.restore();
    }
    if (keep) churchArt(ctx, keep[0] * S, keep[1] * S, S, k);
    // inner shadow along the walls
    ctx.restore();
    for (const w of c.walls) wallArt(ctx, w, S, rnd, k, label, c.fi, path);
  }
}

function churchArt(ctx, cx, cy, S, k) {
  const w = 0.24 * S, h = 0.18 * S;
  ctx.save(); ctx.filter = `blur(${2 * k}px)`;
  ctx.fillStyle = 'rgba(40,30,15,0.4)'; ctx.fillRect(cx - w / 2 + 4 * k, cy - h / 2 + 5 * k, w, h);
  ctx.restore();
  ctx.fillStyle = '#d9ccb0'; ctx.fillRect(cx - w / 2, cy + h * 0.12, w, h * 0.38);
  ctx.fillStyle = 'rgba(70,50,30,0.18)'; ctx.fillRect(cx + w * 0.15, cy + h * 0.12, w * 0.35, h * 0.38);
  ctx.fillStyle = 'rgba(55,45,40,0.6)';
  for (let i = 0; i < 4; i++) { const x = cx - w * 0.38 + i * w * 0.22; ctx.fillRect(x, cy + h * 0.22, 2.2 * k, h * 0.18); }
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h * 0.12);
  g.addColorStop(0, '#b8694c'); g.addColorStop(0.5, '#a85a3e'); g.addColorStop(0.52, '#7e3f2a'); g.addColorStop(1, '#723826');
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2 - k, cy - h / 2, w + 2 * k, h * 0.62);
  // square tower
  const tx = cx - w * 0.36, tw = 0.07 * S;
  ctx.fillStyle = '#cfc1a3'; ctx.fillRect(tx - tw / 2, cy - h * 0.55, tw, h * 0.95);
  ctx.fillStyle = 'rgba(70,50,30,0.2)'; ctx.fillRect(tx, cy - h * 0.55, tw / 2, h * 0.95);
  ctx.fillStyle = '#7e3f2a';
  ctx.beginPath(); ctx.moveTo(tx - tw / 2 - k, cy - h * 0.55); ctx.lineTo(tx, cy - h * 0.95); ctx.lineTo(tx + tw / 2 + k, cy - h * 0.55); ctx.fill();
  ctx.fillStyle = '#a85a3e';
  ctx.beginPath(); ctx.moveTo(tx - tw / 2 - k, cy - h * 0.55); ctx.lineTo(tx, cy - h * 0.95); ctx.lineTo(tx, cy - h * 0.55); ctx.fill();
  ctx.fillStyle = 'rgba(50,40,35,0.6)'; ctx.fillRect(tx - 1.2 * k, cy - h * 0.4, 2.4 * k, 4 * k);
}

function wallArt(ctx, seg, S, rnd, k, label, cityFi, cityClip) {
  const p = segPath(seg, S);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.filter = `blur(${4 * k}px)`;
  ctx.strokeStyle = 'rgba(25,30,10,0.55)'; ctx.lineWidth = 0.1 * S;
  ctx.translate(2 * k, 4 * k); ctx.stroke(p);
  ctx.restore();
  // stone band on its own layer so it can be textured
  const layer = canvas(S); const l = layer.getContext('2d');
  l.lineCap = 'butt';
  l.strokeStyle = '#584f42'; l.lineWidth = 0.085 * S; l.stroke(p);
  l.strokeStyle = '#6e6455'; l.lineWidth = 0.074 * S; l.stroke(p);
  // walkway on the city side: offset the stroke inwards by clipping to the city
  l.save(); l.clip(cityClip);
  l.strokeStyle = '#a3987f'; l.lineWidth = 0.07 * S; l.stroke(p);
  l.strokeStyle = '#b9ae96'; l.lineWidth = 0.034 * S; l.stroke(p);
  l.restore();
  l.globalCompositeOperation = 'source-atop';
  drawSmooth(l, noiseCanvas(48, rnd), S, 0.22, 'overlay');
  // masonry courses
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = bezierPoint(seg, t);
    const [x2, y2] = bezierPoint(seg, Math.min(1, t + 0.01));
    const [x0, y0] = bezierPoint(seg, Math.max(0, t - 0.01));
    const dx = x2 - x0, dy = y2 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const off = (i % 2 ? 0.012 : -0.012);
    l.strokeStyle = 'rgba(55,45,35,0.35)'; l.lineWidth = 0.7 * k;
    l.beginPath(); l.moveTo((x + nx * (off - 0.01)) * S, (y + ny * (off - 0.01)) * S); l.lineTo((x + nx * (off + 0.01)) * S, (y + ny * (off + 0.01)) * S); l.stroke();
  }
  l.globalCompositeOperation = 'destination-in';
  l.strokeStyle = '#000'; l.lineWidth = 0.085 * S; l.stroke(p);
  ctx.drawImage(layer, 0, 0);
  // crenellations: small merlons on the outer face
  for (let i = 1; i < 22; i++) {
    const t = i / 22;
    const [x, y] = bezierPoint(seg, t);
    const [x2, y2] = bezierPoint(seg, Math.min(1, t + 0.01));
    const [x0, y0] = bezierPoint(seg, Math.max(0, t - 0.01));
    const dx = x2 - x0, dy = y2 - y0, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    const tx = x + nx * 0.06, ty = y + ny * 0.06;
    if (tx > 0 && ty > 0 && tx < 1 && ty < 1 && label[Math.floor(ty * HIT) * HIT + Math.floor(tx * HIT)] === cityFi) { nx = -nx; ny = -ny; }
        ctx.save(); ctx.translate((x + nx * 0.03) * S, (y + ny * 0.03) * S); ctx.rotate(Math.atan2(ny, nx));
    ctx.fillStyle = '#9b907a'; ctx.fillRect(-3 * k, -4.5 * k, 6 * k, 9 * k);
    ctx.fillStyle = 'rgba(40,32,25,0.4)'; ctx.fillRect(2 * k, -4.5 * k, 1.5 * k, 9 * k);
    ctx.restore();
  }
  const [tx, ty] = bezierPoint(seg, 0.5);
  tower(ctx, tx * S, ty * S, 0.05 * S, k);
}

function gateArt(ctx, gate, S, k) {
  const [x, y] = gate.at;
  const ang = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][gate.side];
  ctx.save(); ctx.translate(x * S, y * S); ctx.rotate(ang + Math.PI);
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(-0.06 * S + 3 * k, -0.04 * S + 4 * k, 0.12 * S, 0.08 * S); ctx.restore();
  const g = ctx.createLinearGradient(0, -0.04 * S, 0, 0.04 * S);
  g.addColorStop(0, '#aaa08b'); g.addColorStop(1, '#7c7262');
  ctx.fillStyle = g; ctx.fillRect(-0.06 * S, -0.04 * S, 0.12 * S, 0.08 * S);
  ctx.fillStyle = '#3a2e22';
  ctx.beginPath(); ctx.moveTo(-0.022 * S, 0.04 * S); ctx.lineTo(-0.022 * S, 0.005 * S); ctx.arc(0, 0.005 * S, 0.022 * S, Math.PI, 0); ctx.lineTo(0.022 * S, 0.04 * S); ctx.fill();
  ctx.fillStyle = '#9a5a40'; ctx.fillRect(-0.065 * S, -0.055 * S, 0.13 * S, 0.02 * S);
  ctx.restore();
}

export function drawShield(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  const path = new Path2D();
  path.moveTo(-0.5 * s, -0.55 * s); path.lineTo(0.5 * s, -0.55 * s); path.lineTo(0.5 * s, -0.05 * s);
  path.quadraticCurveTo(0.46 * s, 0.42 * s, 0, 0.62 * s); path.quadraticCurveTo(-0.46 * s, 0.42 * s, -0.5 * s, -0.05 * s); path.closePath();
  ctx.save();
  ctx.shadowColor = 'rgba(20,15,5,0.45)'; ctx.shadowBlur = s * 0.18; ctx.shadowOffsetX = s * 0.05; ctx.shadowOffsetY = s * 0.08;
  ctx.fillStyle = '#e9e3d3'; ctx.fill(path);
  ctx.restore();
  ctx.save(); ctx.scale(0.86, 0.86);
  const g = ctx.createLinearGradient(-0.5 * s, -0.5 * s, 0.5 * s, 0.6 * s);
  g.addColorStop(0, '#3a64ae'); g.addColorStop(1, '#2f5597');
  ctx.fillStyle = g; ctx.fill(path);
  ctx.clip(path);
  // heraldic charge: white chevron-ish band and a small cross
  ctx.fillStyle = '#ece7da';
  ctx.fillRect(-0.06 * s, -0.4 * s, 0.12 * s, 0.75 * s);
  ctx.fillRect(-0.3 * s, -0.16 * s, 0.6 * s, 0.11 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-0.6 * s, -0.6 * s, 0.6 * s, 1.4 * s);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,40,50,0.4)'; ctx.lineWidth = s * 0.025; ctx.stroke(path);
  ctx.restore();
}

function monasteryArt(ctx, S, rnd, k) {
  const cx = 0.5 * S, cy = 0.5 * S;
  // cloister garth: low wall around a small green court
  ctx.save(); ctx.filter = `blur(${4 * k}px)`;
  ctx.fillStyle = 'rgba(30,35,10,0.4)'; ctx.fillRect(cx - 0.15 * S + 4 * k, cy - 0.1 * S + 6 * k, 0.3 * S, 0.29 * S);
  ctx.restore();
  ctx.fillStyle = '#c9b993'; ctx.fillRect(cx - 0.15 * S, cy - 0.02 * S, 0.3 * S, 0.19 * S);
  ctx.fillStyle = '#7d9446'; ctx.fillRect(cx - 0.115 * S, cy + 0.015 * S, 0.23 * S, 0.12 * S);
  drawSmoothRect(ctx, rnd, cx - 0.115 * S, cy + 0.015 * S, 0.23 * S, 0.12 * S);
  // cloister walk roofs
  ctx.fillStyle = '#a7684e'; ctx.fillRect(cx - 0.15 * S, cy - 0.02 * S, 0.035 * S, 0.19 * S); ctx.fillRect(cx + 0.115 * S, cy - 0.02 * S, 0.035 * S, 0.19 * S);
  ctx.fillStyle = '#b77558'; ctx.fillRect(cx - 0.15 * S, cy + 0.135 * S, 0.3 * S, 0.035 * S);
  ctx.fillStyle = '#e1d4b6'; ctx.fillRect(cx - 0.15 * S, cy + 0.17 * S, 0.3 * S, 0.012 * S);
  ctx.strokeStyle = 'rgba(60,35,20,0.25)'; ctx.lineWidth = 0.8 * k; ctx.strokeRect(cx - 0.15 * S, cy - 0.02 * S, 0.3 * S, 0.19 * S);
  ctx.fillStyle = '#879c58'; ctx.fillRect(cx - 0.02 * S, cy + 0.135 * S, 0.04 * S, 0.035 * S);
  // well
  ctx.fillStyle = '#9b927f'; ctx.beginPath(); ctx.arc(cx, cy + 0.085 * S, 4 * k, 0, 7); ctx.fill();
  ctx.fillStyle = '#3d4a52'; ctx.beginPath(); ctx.arc(cx, cy + 0.085 * S, 2.3 * k, 0, 7); ctx.fill();
  // church nave
  const w = 0.3 * S, h = 0.17 * S, x = cx - w / 2, y = cy - 0.17 * S;
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(x + 4 * k, y + 5 * k, w, h); ctx.restore();
  ctx.fillStyle = '#ddd0b1'; ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  ctx.fillStyle = 'rgba(70,50,30,0.15)'; ctx.fillRect(x + w * 0.6, y + h * 0.6, w * 0.4, h * 0.4);
  ctx.fillStyle = 'rgba(55,50,60,0.65)';
  for (let i = 0; i < 5; i++) {
    const wx = x + w * (0.1 + i * 0.18);
    ctx.beginPath(); ctx.moveTo(wx, y + h * 0.93); ctx.lineTo(wx, y + h * 0.74); ctx.arc(wx + 1.8 * k, y + h * 0.74, 1.8 * k, Math.PI, 0); ctx.lineTo(wx + 3.6 * k, y + h * 0.93); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
  g.addColorStop(0, '#b4654a'); g.addColorStop(0.5, '#b4654a'); g.addColorStop(0.52, '#8b4732'); g.addColorStop(1, '#8b4732');
  ctx.fillStyle = g; ctx.fillRect(x - 1.5 * k, y, w + 3 * k, h * 0.6);
  ctx.strokeStyle = 'rgba(60,25,15,0.2)'; ctx.lineWidth = 0.7 * k;
  for (let i = 1; i < 14; i++) { ctx.beginPath(); ctx.moveTo(x + (w * i) / 14, y); ctx.lineTo(x + (w * i) / 14, y + h * 0.6); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(50,30,20,0.3)'; ctx.lineWidth = 0.8 * k; ctx.strokeRect(x - 1.5 * k, y, w + 3 * k, h);
  // bell tower at the west end
  const tx = x + w * 0.12, tw = 0.065 * S, th = 0.2 * S, ty = y - 0.08 * S;
  ctx.save(); ctx.filter = `blur(${2.5 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.4)'; ctx.fillRect(tx - tw / 2 + 4 * k, ty + 6 * k, tw, th); ctx.restore();
  ctx.fillStyle = '#d6c8a8'; ctx.fillRect(tx - tw / 2, ty + th * 0.3, tw, th * 0.7);
  ctx.fillStyle = 'rgba(70,50,30,0.18)'; ctx.fillRect(tx, ty + th * 0.3, tw / 2, th * 0.7);
  ctx.fillStyle = 'rgba(45,40,45,0.7)'; ctx.beginPath(); ctx.arc(tx, ty + th * 0.47, 2.3 * k, Math.PI, 0); ctx.fillRect(tx - 2.3 * k, ty + th * 0.47, 4.6 * k, 3.2 * k); ctx.fill();
  ctx.fillStyle = '#8b4732';
  ctx.beginPath(); ctx.moveTo(tx - tw / 2 - 1.5 * k, ty + th * 0.31); ctx.lineTo(tx, ty - th * 0.02); ctx.lineTo(tx + tw / 2 + 1.5 * k, ty + th * 0.31); ctx.fill();
  ctx.fillStyle = '#b4654a';
  ctx.beginPath(); ctx.moveTo(tx - tw / 2 - 1.5 * k, ty + th * 0.31); ctx.lineTo(tx, ty - th * 0.02); ctx.lineTo(tx, ty + th * 0.31); ctx.fill();
  ctx.strokeStyle = '#6b5c47'; ctx.lineWidth = 1.2 * k;
  ctx.beginPath(); ctx.moveTo(tx, ty - th * 0.02); ctx.lineTo(tx, ty - th * 0.15); ctx.moveTo(tx - 2.5 * k, ty - th * 0.1); ctx.lineTo(tx + 2.5 * k, ty - th * 0.1); ctx.stroke();
}

function drawSmoothRect(ctx, rnd, x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.drawImage(noiseCanvas(6, rnd, '#5f7a3a'), x, y, w, h);
  ctx.restore();
}

function junctionArt(ctx, S, k) {
  const cx = S / 2, cy = S / 2;
  const r = mulberry(5);
  ctx.save(); ctx.filter = `blur(${3 * k}px)`;
  ctx.fillStyle = 'rgba(30,25,10,0.4)'; ctx.beginPath(); ctx.ellipse(cx + 5 * k, cy + 6 * k, 0.12 * S, 0.1 * S, 0, 0, 7); ctx.fill();
  ctx.restore();
  bush(ctx, cx + 0.085 * S, cy - 0.07 * S, 7 * k, r, k);
  // small hamlet: a main house with a gable end and a lean-to barn
  const parts = [[-0.04, -0.035, 0.15, 0.11, -0.15], [0.06, 0.04, 0.11, 0.085, 0.25]];
  for (const [dx, dy, w, h, a] of parts) {
    ctx.save(); ctx.translate(cx + dx * S, cy + dy * S); ctx.rotate(a);
    house(ctx, -w * S / 2, -h * S / 2, w * S, h * S, r, k, pick(r, ROOFS));
    // gable end triangle
    ctx.fillStyle = '#e1d3b4';
    ctx.beginPath(); ctx.moveTo(-w * S / 2, -h * S / 2 + h * S * 0.64); ctx.lineTo(-w * S / 2 - 0.018 * S, -h * S / 2 + h * S * 0.32); ctx.lineTo(-w * S / 2, -h * S / 2); ctx.fill();
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
void roundRect;

function tree(ctx, x, y, r, rnd, k) {
  ctx.save(); ctx.filter = `blur(${2.5 * k}px)`;
  ctx.fillStyle = 'rgba(30,40,10,0.45)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.55, y + r * 0.6, r * 1.0, r * 0.8, 0.4, 0, 7); ctx.fill();
  ctx.restore();
  const blobs = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < blobs; i++) {
    const a = rnd() * Math.PI * 2, d = r * 0.4 * rnd();
    const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d, br = r * (0.45 + rnd() * 0.2);
    const g = ctx.createRadialGradient(bx - br * 0.45, by - br * 0.5, br * 0.05, bx, by, br);
    g.addColorStop(0, '#8ea25a'); g.addColorStop(0.6, '#5d7737'); g.addColorStop(1, '#3f5527');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
  }
  // leaf texture
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, d = rnd() * r * 0.8;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(160,180,100,0.35)' : 'rgba(40,55,25,0.3)';
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d - r * 0.1, y + Math.sin(a) * d - r * 0.1, r * 0.12, 0, 7); ctx.fill();
  }
}

function bush(ctx, x, y, r, rnd, k) {
  ctx.save(); ctx.filter = `blur(${1.5 * k}px)`; ctx.fillStyle = 'rgba(30,40,10,0.4)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.4, y + r * 0.45, r * 1.1, r * 0.7, 0, 0, 7); ctx.fill(); ctx.restore();
  for (let i = 0; i < 4; i++) {
    const bx = x + (rnd() - 0.5) * r, by = y + (rnd() - 0.5) * r * 0.6, br = r * (0.45 + rnd() * 0.2);
    const g = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.4, 0, bx, by, br);
    g.addColorStop(0, '#869c55'); g.addColorStop(1, '#4c6430');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
  }
}

function paintFieldDecor(ctx, S, rnd, label, anchors, id) {
  const k = S / 384;
  const t = TILE_TYPES[id];
  const isField = new Uint8Array(HIT * HIT);
  for (let i = 0; i < label.length; i++) isField[i] = label[i] >= 0 && t.features[label[i]].type === 'field' ? 1 : 0;
  const clearance = (u, v, r) => {
    for (let a = 0; a < 12; a++) {
      const xx = u + Math.cos((a / 12) * 6.283) * r, yy = v + Math.sin((a / 12) * 6.283) * r;
      if (xx < 0 || yy < 0 || xx >= 1 || yy >= 1) continue;
      if (!isField[Math.floor(yy * HIT) * HIT + Math.floor(xx * HIT)]) return false;
    }
    return isField[Math.floor(v * HIT) * HIT + Math.floor(u * HIT)] === 1;
  };
  const items = [];
  const want = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < 80 && items.length < want; i++) {
    // trees prefer the tile margins, like hedgerows
    const edge = rnd() < 0.7;
    let u = 0.06 + rnd() * 0.88, v = 0.06 + rnd() * 0.88;
    if (edge) { if (rnd() < 0.5) u = rnd() < 0.5 ? 0.07 + rnd() * 0.06 : 0.87 + rnd() * 0.06; else v = rnd() < 0.5 ? 0.07 + rnd() * 0.06 : 0.87 + rnd() * 0.06; }
    if (!clearance(u, v, 0.075)) continue;
    if (anchors.some(([x, y]) => Math.hypot(x - u, y - v) < 0.16)) continue;
    if (items.some(([x, y]) => Math.hypot(x - u, y - v) < 0.12)) continue;
    items.push([u, v]);
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [u, v] of items) {
    if (rnd() < 0.65) {
      const n = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) tree(ctx, (u + (rnd() - 0.5) * 0.05) * S, (v + (rnd() - 0.5) * 0.05) * S, (8 + rnd() * 5) * k, rnd, k);
    } else {
      bush(ctx, u * S, v * S, (5 + rnd() * 3) * k, rnd, k);
    }
  }
}

function finishTile(ctx, S, rnd) {
  const k = S / 384;
  // unify the palette: slight desaturation and a warm glaze
  ctx.save();
  ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.14; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.25; ctx.fillStyle = '#e8c890'; ctx.fillRect(0, 0, S, S);
  ctx.restore();
  // paper / print grain
  drawSmooth(ctx, noiseCanvas(160, rnd), S, 0.06, 'overlay');
  // soft light from the top-left
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, 'rgba(255,245,215,0.08)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(25,15,0,0.12)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // thin cardboard edge
  void k;
}

// ---------- public API ----------
const cache = new Map();

export function getTileArt(id) {
  if (cache.has(id)) return cache.get(id);
  const S = ART_SIZE;
  const geo = geometry(id);
  const { label, problems } = buildHitMap(id, geo);
  const anchors = computeAnchors(id, geo, label);
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const rnd = mulberry(hashStr('carc' + id));
  paintGrass(ctx, S, rnd);
  paintFarmPatches(ctx, S, rnd, label, id);
  paintFieldDecor(ctx, S, rnd, label, anchors, id);
  paintRoads(ctx, S, rnd, geo);
  if (geo.monastery >= 0) {
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.scale(1.55, 1.55); ctx.translate(-S / 2, -S / 2);
    monasteryArt(ctx, S, rnd, S / 384);
    ctx.restore();
  }
  if (geo.junction) junctionArt(ctx, S, S / 384);
  paintCities(ctx, S, rnd, geo, label);
  if (geo.gate) gateArt(ctx, geo.gate, S, S / 384);
  // pennants
  for (const cty of geo.cities) {
    if (!cty.pennant) continue;
    const [ax, ay] = anchors[cty.fi];
    // put the shield away from where meeples stand
    let best = null, bestD = -1;
    for (let i = 0; i < label.length; i++) {
      if (label[i] !== cty.fi) continue;
      const x = (i % HIT + 0.5) / HIT, y = (((i / HIT) | 0) + 0.5) / HIT;
      if (x < 0.12 || y < 0.12 || x > 0.88 || y > 0.88) continue;
      const d = Math.min(Math.hypot(x - ax, y - ay), 0.22) - Math.hypot(x - 0.5, y - 0.5) * 0.3;
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    if (best) drawShield(ctx, best[0] * S, best[1] * S, 0.125 * S);
  }
  finishTile(ctx, S, rnd);
  const art = { canvas: c, anchors, label, problems, geo };
  cache.set(id, art);
  return art;
}

// Which feature is at unit point (u,v) in the *unrotated* tile
export function featureAt(id, u, v) {
  const { label } = getTileArt(id);
  const x = Math.max(0, Math.min(HIT - 1, Math.floor(u * HIT)));
  const y = Math.max(0, Math.min(HIT - 1, Math.floor(v * HIT)));
  return label[y * HIT + x];
}

// ---------- meeples ----------
const MEEPLE_PATH = (() => {
  const p = new Path2D();
  // unit meeple, centred at (0,0), height ~1, feet at +0.5
  p.moveTo(0, -0.5);
  p.bezierCurveTo(0.12, -0.5, 0.19, -0.42, 0.18, -0.3);
  p.bezierCurveTo(0.17, -0.22, 0.13, -0.18, 0.12, -0.16);
  p.bezierCurveTo(0.3, -0.14, 0.48, -0.1, 0.5, -0.02);
  p.bezierCurveTo(0.52, 0.06, 0.4, 0.08, 0.26, 0.07);
  p.bezierCurveTo(0.3, 0.2, 0.38, 0.38, 0.4, 0.46);
  p.bezierCurveTo(0.41, 0.5, 0.38, 0.52, 0.34, 0.52);
  p.lineTo(0.12, 0.52);
  p.bezierCurveTo(0.08, 0.4, 0.04, 0.3, 0, 0.28);
  p.bezierCurveTo(-0.04, 0.3, -0.08, 0.4, -0.12, 0.52);
  p.lineTo(-0.34, 0.52);
  p.bezierCurveTo(-0.38, 0.52, -0.41, 0.5, -0.4, 0.46);
  p.bezierCurveTo(-0.38, 0.38, -0.3, 0.2, -0.26, 0.07);
  p.bezierCurveTo(-0.4, 0.08, -0.52, 0.06, -0.5, -0.02);
  p.bezierCurveTo(-0.48, -0.1, -0.3, -0.14, -0.12, -0.16);
  p.bezierCurveTo(-0.13, -0.18, -0.17, -0.22, -0.18, -0.3);
  p.bezierCurveTo(-0.19, -0.42, -0.12, -0.5, 0, -0.5);
  p.closePath();
  return p;
})();

// Unit-sized silhouettes of the wooden figures (centred, height ~1).
const ABBOT_PATH = (() => {
  const p = new Path2D();
  p.moveTo(0, -0.52);
  p.bezierCurveTo(0.08, -0.5, 0.17, -0.42, 0.17, -0.3); // hood
  p.bezierCurveTo(0.17, -0.24, 0.15, -0.2, 0.13, -0.17);
  p.bezierCurveTo(0.28, -0.12, 0.33, 0.05, 0.3, 0.2);    // shoulders / robe
  p.lineTo(0.36, 0.52);
  p.lineTo(-0.36, 0.52);
  p.lineTo(-0.3, 0.2);
  p.bezierCurveTo(-0.33, 0.05, -0.28, -0.12, -0.13, -0.17);
  p.bezierCurveTo(-0.15, -0.2, -0.17, -0.24, -0.17, -0.3);
  p.bezierCurveTo(-0.17, -0.42, -0.08, -0.5, 0, -0.52);
  p.closePath();
  return p;
})();
const PIG_PATH = (() => {
  const p = new Path2D();
  p.ellipse(-0.04, 0.05, 0.4, 0.27, 0, 0, Math.PI * 2);     // body
  p.moveTo(0.48, 0.0); p.ellipse(0.36, -0.02, 0.15, 0.15, 0, 0, Math.PI * 2); // head
  p.moveTo(0.56, 0.0); p.ellipse(0.53, 0.0, 0.07, 0.06, 0, 0, Math.PI * 2);   // snout
  p.moveTo(0.3, -0.15); p.lineTo(0.28, -0.27); p.lineTo(0.4, -0.16); p.closePath(); // ear
  for (const lx of [-0.3, -0.12, 0.08, 0.22]) p.rect(lx, 0.22, 0.08, 0.2);           // legs
  return p;
})();
const SHAPES = { meeple: MEEPLE_PATH, abbot: ABBOT_PATH, pig: PIG_PATH };

function woodenShape(ctx, path, size, color, opts) {
  if (opts.ghost) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.06; ctx.setLineDash([0.12, 0.08]);
    ctx.fill(path); ctx.stroke(path);
    return;
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.2; ctx.shadowOffsetX = size * 0.06; ctx.shadowOffsetY = size * 0.1;
  ctx.fillStyle = color.dark; ctx.translate(0.035, 0.07); ctx.fill(path);
  ctx.restore();
  ctx.save(); ctx.translate(0.02, 0.045); ctx.fillStyle = color.dark; ctx.fill(path); ctx.restore();
  const g = ctx.createLinearGradient(-0.4, -0.5, 0.4, 0.5);
  g.addColorStop(0, mix(color.main, color.light, 0.45)); g.addColorStop(0.5, color.main); g.addColorStop(1, mix(color.main, color.dark, 0.55));
  ctx.fillStyle = g; ctx.fill(path);
  ctx.save(); ctx.clip(path);
  ctx.strokeStyle = 'rgba(0,0,0,0.045)'; ctx.lineWidth = 0.025;
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(-0.6, i * 0.085); ctx.bezierCurveTo(-0.25, i * 0.085 + 0.07, 0.15, i * 0.085 - 0.08, 0.6, i * 0.085 + 0.02); ctx.stroke(); }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = mix(color.main, color.dark, 0.7); ctx.globalAlpha *= 0.6; ctx.lineWidth = 0.025; ctx.lineJoin = 'round'; ctx.stroke(path);
  ctx.restore();
}

// Draw a wooden meeple. opts: lying (farmer), ghost, alpha
export function drawMeeple(ctx, x, y, size, color, opts = {}) {
  drawPiece(ctx, 'meeple', x, y, size, color, opts);
}

// Draw any player figure: meeple, large (big meeple), builder, pig, abbot.
export function drawPiece(ctx, kind, x, y, size, color, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opts.alpha ?? 1;
  let path = SHAPES[kind] || MEEPLE_PATH;
  let sx = 1, sy = 1;
  if (kind === 'large') { sx = sy = 1.32; }
  if (kind === 'builder') { sx = 0.82; sy = 1.22; path = MEEPLE_PATH; }
  if (kind === 'pig') { sx = sy = 0.95; }
  if (opts.lying && (kind === 'meeple' || kind === 'large')) ctx.rotate(-Math.PI / 2 + 0.15);
  ctx.scale(size * sx, size * sy);
  woodenShape(ctx, path, size, color, opts);
  if (kind === 'builder' && !opts.ghost) {
    // a little hammer to tell the builder apart
    ctx.strokeStyle = 'rgba(40,25,10,0.75)'; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.18, 0.18); ctx.lineTo(0.4, -0.08); ctx.stroke();
    ctx.fillStyle = 'rgba(40,25,10,0.85)'; ctx.save(); ctx.translate(0.4, -0.08); ctx.rotate(-0.85); ctx.fillRect(-0.1, -0.04, 0.2, 0.08); ctx.restore();
  }
  if (kind === 'pig' && !opts.ghost) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(0.38, -0.06, 0.025, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// ---------- tile back & table ----------
export function getTileBack() {
  if (cache.has('_back')) return cache.get('_back');
  const S = 256; const c = canvas(S); const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#5a7d3a'); g.addColorStop(1, '#2e4a1c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const rnd = mulberry(11);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; ctx.fillRect(rnd() * S, rnd() * S, 2, 2); }
  ctx.strokeStyle = 'rgba(240,220,160,0.5)'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, S - 28, S - 28);
  ctx.fillStyle = '#f2dc9a'; ctx.font = 'bold 150px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillText('C', S / 2, S / 2 + 8);
  cache.set('_back', c);
  return c;
}

export function getTableTexture() {
  if (cache.has('_table')) return cache.get('_table');
  const S = 512; const c = canvas(S); const ctx = c.getContext('2d');
  const rnd = mulberry(99);
  ctx.fillStyle = '#5a3d26'; ctx.fillRect(0, 0, S, S);
  // planks
  const plank = S / 4;
  for (let p = 0; p < 4; p++) {
    const base = pick(rnd, ['#5a3d26', '#5f412a', '#553923', '#634630']);
    ctx.fillStyle = base; ctx.fillRect(0, p * plank, S, plank);
    for (let i = 0; i < 70; i++) {
      const y = p * plank + rnd() * plank;
      ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '40,22,10' : '150,100,60'},${0.1 + rnd() * 0.18})`;
      ctx.lineWidth = 0.5 + rnd() * 1.6;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= S; x += 16) ctx.lineTo(x, y + Math.sin((x / S) * Math.PI * 2 * (1 + (i % 3)) + i) * 2.2);
      ctx.stroke();
    }
    // knots
    if (rnd() < 0.7) {
      const kx = (0.15 + rnd() * 0.7) * S, ky = p * plank + plank * (0.3 + rnd() * 0.4);
      for (let r = 14; r > 2; r -= 2) {
        ctx.strokeStyle = `rgba(40,20,8,${0.15 + (14 - r) * 0.02})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(kx, ky, r * 1.8, r * 0.7, 0, 0, 7); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(20,10,4,0.55)'; ctx.fillRect(0, p * plank, S, 2);
    ctx.fillStyle = 'rgba(255,220,180,0.08)'; ctx.fillRect(0, p * plank + 2, S, 1);
  }
  cache.set('_table', c);
  return c;
}

export function allFieldProblems() {
  return Object.keys(TILE_TYPES).flatMap((id) => getTileArt(id).problems);
}
