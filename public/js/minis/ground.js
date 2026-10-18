// The photographic ground of a tile type: diorama textures (static grass, dust roads, resin
// water, town lanes, wall-walk flags) clipped to the exact feature geometry of layout.js.
// Painted unrotated, top-down, with only symmetric ambient occlusion (no directional shadow),
// so it can be turned with the tile. Tile margins share one meadow tone so neighbours join.
import { bezierPoint } from '../layout.js';
import { drawTileSymbols, ART_SIZE } from '../art.js';
import * as A from './assets.js';
import { getPlan, sampleSeg, riverCrossing } from './plan.js';

export const ROAD_W = 0.11;
export const RIVER_W = 0.13;
const MONASTERY_BOX = (m) => [m.x - 0.2 * m.s, m.y - 0.22 * m.s, 0.4 * m.s, 0.44 * m.s];
const GARDEN_BOX = (g) => [g.x - 0.14, g.y - 0.095, 0.28, 0.19];

function cv(w, h = w) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
// reusable scratch canvases by size
const scratch = new Map();
function layer(S, slot = 0) {
  const k = `${S}|${slot}`;
  let c = scratch.get(k);
  if (!c) { c = cv(S); scratch.set(k, c); }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, S, S);
  return [c, g];
}
function segPath(seg, S, p = new Path2D()) {
  p.moveTo(seg[0][0] * S, seg[0][1] * S);
  p.bezierCurveTo(seg[1][0] * S, seg[1][1] * S, seg[2][0] * S, seg[2][1] * S, seg[3][0] * S, seg[3][1] * S);
  return p;
}
function outlinePath(outline, S, p = new Path2D()) {
  for (const c of outline) {
    if (c[0] === 'M') p.moveTo(c[1] * S, c[2] * S);
    else if (c[0] === 'L') p.lineTo(c[1] * S, c[2] * S);
    else if (c[0] === 'C') p.bezierCurveTo(c[1] * S, c[2] * S, c[3] * S, c[4] * S, c[5] * S, c[6] * S);
    else p.closePath();
  }
  return p;
}
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- textures (real, or a procedural stand-in when the manifest has none) ----------
const PROC = {
  meadow: ['#7d9246', '#5f7434', '#a3ad62'], meadow_flowers: ['#7d9246', '#c8322a', '#3c62b8'], dirt_road: ['#c4ae84', '#a8936c', '#e1d4b6'],
  town_lane: ['#8c7258', '#6e5a46', '#a29c90'], wall_walk: ['#c2b394', '#8f846e', '#ddd2b8'], riverbed: ['#8a876a', '#6c6a5a', '#cdc4ac'],
  ploughed: ['#9c7a55', '#7d5f40', '#b39570'], wheat_ripe: ['#c7a754', '#a8893c', '#e0c878'], vineyard: ['#b39b74', '#5e7a34', '#cdb894'],
  stubble: ['#d1bd84', '#b49f66', '#e6d7a8'], flax: ['#7d9646', '#6f8fc8', '#9db35c'], farmyard: ['#7a6448', '#5c4a36', '#a68f5c'],
  market_ground: ['#8f7656', '#6e5a42', '#b49c74'], garden_path: ['#cfc4ab', '#a99f88', '#e6ddc8'], garrigue: ['#bdb49c', '#6f7a4a', '#d8d2c0'],
  roman_paving: ['#c9c0aa', '#8f8774', '#ddd6c4'],
};
const procCache = new Map();
function procTexture(id) {
  if (procCache.has(id)) return procCache.get(id);
  const [base, dark, light] = PROC[id] || PROC.meadow;
  const N = 256; const c = cv(N); const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  const r = A.rng(A.hash('proc', id));
  const dot = (x, y, s, col, a) => { g.globalAlpha = a; g.fillStyle = col; for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) g.fillRect(x + ox, y + oy, s, s); };
  for (let i = 0; i < 900; i++) dot(r() * N, r() * N, 6 + r() * 26, r() < 0.5 ? dark : light, 0.05);
  for (let i = 0; i < 6000; i++) dot(r() * N, r() * N, 1 + r() * 2, r() < 0.5 ? dark : light, 0.35);
  g.globalAlpha = 1;
  procCache.set(id, c);
  return c;
}
// Textures that run across tile edges lose their broad light and dark patches (a high-pass),
// so every tile meets its neighbours on the same tone whatever its rotation.
const FLATTEN = new Set(['meadow', 'meadow_flowers', 'town_lane', 'dirt_road', 'wall_walk', 'riverbed']);
const flat = new Map();
function flatten(img) {
  let c = flat.get(img);
  if (c) return c;
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  c = cv(W, H); const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, W, H);
  // blurred copy: a tiny version stretched back up (tiled 3x3 so the blur wraps around)
  const n = 6; const tiny = cv(n * 3); const tg = tiny.getContext('2d'); tg.imageSmoothingQuality = 'high';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tg.drawImage(img, i * n, j * n, n, n);
  const big = cv(W, H); const bg = big.getContext('2d', { willReadFrequently: true }); bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
  bg.drawImage(tiny, n, n, n, n, 0, 0, W, H);
  const blur = bg.getImageData(0, 0, W, H).data;
  const d = src.data;
  let mr = 0, mg = 0, mb = 0; const N = W * H;
  for (let i = 0; i < d.length; i += 4) { mr += blur[i]; mg += blur[i + 1]; mb += blur[i + 2]; }
  mr /= N; mg /= N; mb /= N;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] - blur[i] + mr; d[i + 1] = d[i + 1] - blur[i + 1] + mg; d[i + 2] = d[i + 2] - blur[i + 2] + mb;
  }
  g.putImageData(src, 0, 0);
  big.width = 0;
  flat.set(img, c);
  return c;
}
// texture image for id: 'wait' while the real one is loading, else the image to use
function texture(id, small) {
  if (A.hasTexture(id)) {
    const img = A.textureImage(id, small);
    if (!img) return 'wait';
    return FLATTEN.has(id) ? flatten(img) : img;
  }
  return procTexture(id);
}
function pattern(g, img, repeat, S, { rot = 0, ox = 0, oy = 0 } = {}) {
  const p = g.createPattern(img, 'repeat');
  const k = (repeat * S) / img.width;
  p.setTransform(new DOMMatrix().translate(ox * S, oy * S).rotate((rot * 180) / Math.PI).scale(k));
  return p;
}

// A soft mask: shapes drawn small and stretched up, which blurs them without canvas filters.
// res = the mask's resolution across the tile (so the softness is the same at every size)
function softMask(S, res, draw) {
  const m = Math.min(S, Math.max(16, Math.round(res)));
  const [c, g] = layer(m, 'mask');
  g.setTransform(m / S, 0, 0, m / S, 0, 0);
  g.fillStyle = '#000'; g.strokeStyle = '#000';
  draw(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
function applyMask(g, S, mask) {
  g.save(); g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(mask, 0, 0, S, S); g.restore();
}
// low-frequency noise blob canvas (alpha)
function blobs(cells, seed, color = '#000') {
  const c = cv(cells); const g = c.getContext('2d');
  const r = A.rng(seed);
  const img = g.createImageData(cells, cells);
  const [R, G, B] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  for (let i = 0; i < cells * cells; i++) { img.data[i * 4] = R; img.data[i * 4 + 1] = G; img.data[i * 4 + 2] = B; img.data[i * 4 + 3] = r() * 255; }
  g.putImageData(img, 0, 0);
  return c;
}
function smoothDraw(g, src, S, alpha, op = 'source-over') {
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, -S * 0.08, -S * 0.08, S * 1.16, S * 1.16); g.restore();
}
// fade a layer out towards the tile margins (so neighbours meet on the same base tone)
function fadeEdges(g, S, band = 0.16) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  const b = band * S;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, b, 0, 0, S, b], [0, S, 0, S - b, 0, S - b, S, b], [0, 0, b, 0, 0, 0, b, S], [S, 0, S - b, 0, S - b, 0, b, S]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.restore();
}

// Lay a texture along a path like a ribbon (its top-to-bottom axis follows the curve), so
// ruts and flagstones bend with the road or wall.
function ribbon(g, seg, width, img, S, { n = 28, lenScale = 1, startS = 0 } = {}) {
  const pts = sampleSeg(seg, n);
  const W = width * S;
  const k = W / img.width;
  const pat = g.createPattern(img, 'repeat');
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const ext = 0.6 / S; // overlap slices a hair so no seams show
    const q = new Path2D();
    q.moveTo((a.x - a.tx * ext + a.nx * width * 0.5) * S, (a.y - a.ty * ext + a.ny * width * 0.5) * S);
    q.lineTo((b.x + b.tx * ext + b.nx * width * 0.5) * S, (b.y + b.ty * ext + b.ny * width * 0.5) * S);
    q.lineTo((b.x + b.tx * ext - b.nx * width * 0.5) * S, (b.y + b.ty * ext - b.ny * width * 0.5) * S);
    q.lineTo((a.x - a.tx * ext - a.nx * width * 0.5) * S, (a.y - a.ty * ext - a.ny * width * 0.5) * S);
    q.closePath();
    g.save(); g.clip(q);
    const ang = Math.atan2(a.ty + b.ty, a.tx + b.tx);
    g.translate(a.x * S, a.y * S); g.rotate(ang - Math.PI / 2);
    pat.setTransform(new DOMMatrix().translate(-W / 2, -(startS + a.s) * S * lenScale).scale(k));
    g.fillStyle = pat;
    g.fillRect(-W, -W * 0.2, W * 2, (b.s - a.s) * S + W * 0.4);
    g.restore();
  }
}
function offsetLine(g, seg, off, S, n = 28) {
  const pts = sampleSeg(seg, n);
  g.beginPath();
  pts.forEach((p, i) => { const x = (p.x + p.nx * off) * S, y = (p.y + p.ny * off) * S; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
}
// de Casteljau: the part of a bezier between t0 and t1
export function subSeg(seg, t0, t1) {
  const split = (s, t) => {
    const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a = L(s[0], s[1]), b = L(s[1], s[2]), c = L(s[2], s[3]), d = L(a, b), e = L(b, c), f = L(d, e);
    return [[s[0], a, d, f], [f, e, c, s[3]]];
  };
  const right = split(seg, t0)[1];
  return split(right, t0 >= 1 ? 0 : (t1 - t0) / (1 - t0))[0];
}
function bridgePart(r) {
  const a = bezierPoint(r.seg, r.span[0]), b = bezierPoint(r.seg, r.span[1]);
  return [a, [lerp(a[0], b[0], 1 / 3), lerp(a[1], b[1], 1 / 3)], [lerp(a[0], b[0], 2 / 3), lerp(a[1], b[1], 2 / 3)], b];
}

// Which textures a tile's ground needs (so it is only built once they have arrived).
function neededTextures(plan) {
  const { lay } = plan;
  const t = ['meadow', 'meadow_flowers'];
  for (const p of plan.patches) t.push(p.kind);
  if (lay.rivers.length || lay.lake || lay.inns.length) t.push('riverbed');
  if (lay.roads.length || lay.stubs.length) t.push('dirt_road');
  if (lay.cities.length) t.push('town_lane', 'wall_walk');
  if (lay.village || lay.house || lay.farmhouse || lay.inns.length) t.push('farmyard');
  if (lay.bazaar) t.push('market_ground');
  if (lay.monastery || lay.garden) t.push('garden_path');
  if (lay.rock) t.push('garrigue');
  if (lay.foundation || lay.roads.some((r) => r.bridge === 'over')) t.push('wall_walk');
  return [...new Set(t)];
}
export function groundReady(id, S) {
  const plan = getPlan(id);
  return neededTextures(plan).every((t) => texture(t, S <= 512) !== 'wait');
}

// options.fallbacks: [{ box: [x, y, w, h] | ellipse: [x, y, rx, ry] }] regions copied from the
// painted tile where a landmark sprite is missing.
export function* groundSteps(id, S, options = {}) {
  const plan = getPlan(id);
  const { lay } = plan;
  const small = S <= 512;
  const T = (tid) => {
    const t = texture(tid, small);
    if (t === 'wait') throw new Wait();
    return t;
  };
  const c = cv(S); const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const seed = A.hash('ground', id);

  // ---- meadow: two takes of the static-grass texture, blended by a slow noise, toned
  g.fillStyle = pattern(g, T('meadow'), 0.42, S); g.fillRect(0, 0, S, S);
  {
    const [l, lg] = layer(S, 1);
    lg.fillStyle = pattern(lg, T('meadow'), 0.57, S, { rot: Math.PI / 2, ox: 0.31, oy: 0.17 }); lg.fillRect(0, 0, S, S);
    smoothDraw(lg, blobs(5, seed + 1), S, 1, 'destination-in');
    fadeEdges(lg, S, 0.2);
    g.globalAlpha = 0.55; g.drawImage(l, 0, 0); g.globalAlpha = 1;
  }
  {
    const [l, lg] = layer(S, 1);
    smoothDraw(lg, blobs(4, seed + 2, '#b4b86a'), S, 0.22);
    smoothDraw(lg, blobs(5, seed + 3, '#4a5e2a'), S, 0.2);
    fadeEdges(lg, S);
    g.drawImage(l, 0, 0);
  }
  // wildflowers on the verges (along roads, walls and banks) and in a few drifts
  {
    const [l, lg] = layer(S, 1);
    lg.fillStyle = pattern(lg, T('meadow_flowers'), 0.42, S, { ox: 0.13, oy: 0.29 }); lg.fillRect(0, 0, S, S);
    const mask = softMask(S, 14, (m) => {
      m.lineCap = 'round';
      m.lineWidth = ROAD_W * 2.3 * S; for (const r of lay.roads) m.stroke(segPath(r.seg, S));
      m.lineWidth = RIVER_W * 2.4 * S; for (const r of lay.rivers) m.stroke(segPath(r.seg, S));
      m.lineWidth = 0.16 * S; for (const cty of lay.cities) for (const w of cty.walls) m.stroke(segPath(w, S));
      const r = A.rng(seed + 4);
      for (let i = 0; i < 3; i++) { m.beginPath(); m.ellipse((0.2 + r() * 0.6) * S, (0.2 + r() * 0.6) * S, (0.05 + r() * 0.08) * S, (0.04 + r() * 0.06) * S, r() * 3, 0, 7); m.fill(); }
    });
    applyMask(lg, S, mask);
    g.globalAlpha = 0.85; g.drawImage(l, 0, 0); g.globalAlpha = 1;
  }

  yield;
  // ---- farm plots
  for (const p of plan.patches) {
    // a crop texture the art set lacks is stood in for by a tinted one it has
    const SUB = { vineyard: ['ploughed', 'rgba(214,192,140,0.3)'], stubble: ['wheat_ripe', 'rgba(236,226,190,0.38)'], flax: ['meadow', 'rgba(120,150,215,0.2)'], wheat_ripe: ['meadow', 'rgba(220,190,90,0.45)'], ploughed: ['meadow', 'rgba(150,115,75,0.6)'] };
    let texId = p.kind, tint = null;
    if (!A.hasTexture(texId) && SUB[texId] && (A.hasTexture(SUB[texId][0]) || SUB[texId][0] === 'meadow')) { [texId, tint] = SUB[texId]; if (!A.hasTexture(texId) && SUB[texId]) [texId, tint] = SUB[texId]; }
    const [l, lg] = layer(S, 1);
    const path = new Path2D(); p.poly.forEach(([x, y], i) => (i ? path.lineTo(x * S, y * S) : path.moveTo(x * S, y * S))); path.closePath();
    // a soft trodden margin, then the crop
    g.save(); g.globalAlpha = 0.28; g.lineWidth = 0.022 * S; g.lineJoin = 'round'; g.strokeStyle = '#6b5a3c'; g.stroke(path); g.restore();
    lg.fillStyle = pattern(lg, T(texId), texId === 'vineyard' ? 0.34 : 0.28, S, { rot: p.ang, ox: p.cx, oy: p.cy });
    lg.fill(path);
    if (tint) { lg.fillStyle = tint; lg.fill(path); }
    g.drawImage(l, 0, 0);
    // a hedge or a low dry-stone wall round it
    const r = A.rng(p.seed);
    if (r() < 0.55) {
      g.save(); g.lineJoin = 'round';
      g.strokeStyle = 'rgba(30,38,16,0.35)'; g.lineWidth = 0.014 * S; g.stroke(path);
      g.strokeStyle = '#4c5f2c'; g.lineWidth = 0.008 * S; g.setLineDash([0.006 * S, 0.003 * S]); g.stroke(path);
      g.strokeStyle = 'rgba(120,140,70,0.6)'; g.lineWidth = 0.003 * S; g.setLineDash([0.004 * S, 0.006 * S]); g.stroke(path);
      g.restore();
    } else {
      g.save(); g.lineJoin = 'round';
      g.strokeStyle = 'rgba(40,34,24,0.4)'; g.lineWidth = 0.009 * S; g.stroke(path);
      g.strokeStyle = '#b9ad94'; g.lineWidth = 0.005 * S; g.setLineDash([0.004 * S, 0.0015 * S]); g.stroke(path);
      g.restore();
    }
  }

  yield;
  // ---- rivers, lakes, the spring, the inns' ponds
  const waters = new Path2D();
  const waterShapes = [];
  for (const r of lay.rivers) waterShapes.push({ seg: r.seg, dead: r.dead });
  const ellipses = [];
  if (lay.lake) ellipses.push([lay.lake[0], lay.lake[1], lay.lake[2], lay.lake[3], 0]);
  for (const r of lay.rivers) if (r.spring) ellipses.push([r.seg[3][0], r.seg[3][1], 0.07, 0.1, 0]);
  for (const [, , lx, ly] of lay.inns) ellipses.push([lx, ly, 0.075, 0.047, 0.2]);
  if (waterShapes.length || ellipses.length) {
    // muddy, pebbly banks
    const bank = softMask(S, 40, (m) => {
      m.lineCap = 'round'; m.lineWidth = RIVER_W * 1.75 * S;
      for (const w of waterShapes) m.stroke(segPath(w.seg, S));
      for (const [x, y, rx, ry, a] of ellipses) { m.beginPath(); m.ellipse(x * S, y * S, (rx + 0.03) * S, (ry + 0.03) * S, a, 0, 7); m.fill(); }
    });
    {
      const [l, lg] = layer(S, 1);
      lg.fillStyle = pattern(lg, T('riverbed'), 0.22, S, { ox: 0.5 }); lg.fillRect(0, 0, S, S);
      lg.fillStyle = 'rgba(92,84,56,0.45)'; lg.fillRect(0, 0, S, S);
      applyMask(lg, S, bank);
      g.drawImage(l, 0, 0);
    }
    // pebbles along the banks
    const r = A.rng(seed + 9);
    for (const w of waterShapes) {
      const pts = sampleSeg(w.seg, 60);
      for (const p of pts) for (const side of [-1, 1]) {
        if (r() < 0.55) continue;
        const off = RIVER_W * (0.47 + r() * 0.4) * side;
        const x = (p.x + p.nx * off) * S, y = (p.y + p.ny * off) * S;
        if (x < 0 || y < 0 || x > S || y > S) continue;
        const rr = (0.002 + r() * r() * 0.006) * S;
        g.fillStyle = 'rgba(30,26,18,0.35)'; g.beginPath(); g.ellipse(x, y, rr * 1.25, rr * 1.05, 0, 0, 7); g.fill();
        g.fillStyle = r() < 0.4 ? '#bfb7a3' : r() < 0.5 ? '#8f8a7e' : '#a89e88'; g.beginPath(); g.ellipse(x + (r() - 0.5) * 0.01 * S, y + (r() - 0.5) * 0.01 * S, rr, rr * 0.82, r() * 3, 0, 7); g.fill();
      }
    }
    // resin water: riverbed seen through, deepening in the channel
    for (const w of waterShapes) waters.addPath(segPath(w.seg, S));
    const [l, lg] = layer(S, 1);
    lg.fillStyle = pattern(lg, T('riverbed'), 0.3, S); lg.fillRect(0, 0, S, S);
    // depth: olive-teal in the channel, paler at the edges
    lg.globalCompositeOperation = 'source-over';
    const deep = softMask(S, 30, (m) => {
      m.lineCap = 'round'; m.lineWidth = RIVER_W * 0.62 * S;
      for (const w of waterShapes) m.stroke(segPath(w.seg, S));
      for (const [x, y, rx, ry, a] of ellipses) { m.beginPath(); m.ellipse(x * S, y * S, rx * 0.72 * S, ry * 0.72 * S, a, 0, 7); m.fill(); }
    });
    {
      const [d, dg] = layer(S, 2);
      dg.fillStyle = '#2f4a40'; dg.fillRect(0, 0, S, S);
      applyMask(dg, S, deep);
      lg.globalAlpha = 0.62; lg.drawImage(d, 0, 0); lg.globalAlpha = 1;
    }
    lg.fillStyle = 'rgba(70,98,84,0.32)'; lg.fillRect(0, 0, S, S);
    // a glossy sheen
    lg.fillStyle = 'rgba(210,225,215,0.08)'; lg.fillRect(0, 0, S, S);
    const shape = softMask(S, 110, (m) => {
      m.lineCap = 'round'; m.lineWidth = RIVER_W * S;
      for (const w of waterShapes) { m.lineCap = w.dead ? 'round' : 'butt'; m.stroke(segPath(w.seg, S)); }
      for (const [x, y, rx, ry, a] of ellipses) { m.beginPath(); m.ellipse(x * S, y * S, rx * S, ry * S, a, 0, 7); m.fill(); }
    });
    applyMask(lg, S, shape);
    // meniscus: a pale line where resin meets the bank
    g.drawImage(l, 0, 0);
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(235,232,210,0.1)'; g.lineWidth = 0.006 * S;
    for (const w of waterShapes) for (const side of [-1, 1]) { offsetLine(g, w.seg, side * RIVER_W * 0.47, S); g.stroke(); }
    g.restore();
    if (lay.rock) stones(g, lay.rock[0], lay.rock[1], S, A.rng(seed + 11), T('garrigue'));
  }

  yield;
  // ---- roads: a worn verge, then the dust surface with its ruts, laid along the curve
  const plain = lay.roads.filter((r) => r.bridge !== 'over');
  const overs = lay.roads.filter((r) => r.bridge === 'over');
  const stubs = lay.stubs.map(([x1, y1, x2, y2]) => [[x1, y1], [lerp(x1, x2, 1 / 3), lerp(y1, y2, 1 / 3)], [lerp(x1, x2, 2 / 3), lerp(y1, y2, 2 / 3)], [x2, y2]]);
  const roadSet = (list, w) => {
    if (!list.length) return;
    const verge = softMask(S, 34, (m) => { m.lineCap = 'butt'; m.lineWidth = w * 1.75 * S; for (const s of list) m.stroke(segPath(s, S)); });
    {
      const [l, lg] = layer(S, 1);
      lg.fillStyle = 'rgba(120,108,66,0.5)'; lg.fillRect(0, 0, S, S);
      applyMask(lg, S, verge);
      g.drawImage(l, 0, 0);
    }
    const [l, lg] = layer(S, 1);
    for (const s of list) ribbon(lg, s, w * 1.05, T('dirt_road'), S);
    const edge = softMask(S, 100, (m) => { m.lineCap = 'butt'; m.lineWidth = w * 0.98 * S; for (const s of list) m.stroke(segPath(s, S)); });
    applyMask(lg, S, edge);
    g.drawImage(l, 0, 0);
  };
  roadSet(plain.map((r) => r.seg), ROAD_W);
  roadSet(stubs, ROAD_W * 0.55);

  yield;
  // ---- yards: villages, farms, inns, the bazaar, the monastery precinct, the garden
  const yard = (texId, draw, alpha = 1, rep = 0.3) => {
    const [l, lg] = layer(S, 1);
    lg.fillStyle = pattern(lg, T(texId), rep, S); lg.fillRect(0, 0, S, S);
    applyMask(lg, S, softMask(S, 70, draw));
    g.globalAlpha = alpha; g.drawImage(l, 0, 0); g.globalAlpha = 1;
  };
  if (lay.village) yard('farmyard', (m) => { m.beginPath(); m.arc(lay.village.x * S, lay.village.y * S, (lay.village.r + 0.035) * S, 0, 7); m.fill(); }, 0.95);
  if (lay.house) yard('farmyard', (m) => { m.beginPath(); m.ellipse(lay.house[0] * S, lay.house[1] * S, 0.09 * S, 0.07 * S, 0, 0, 7); m.fill(); }, 0.85);
  if (lay.farmhouse) yard('farmyard', (m) => { m.beginPath(); m.ellipse(lay.farmhouse[0] * S, lay.farmhouse[1] * S, 0.15 * S, 0.11 * S, -0.5, 0, 7); m.fill(); }, 0.9);
  for (const [x, y] of lay.inns) yard('farmyard', (m) => { m.beginPath(); m.ellipse(x * S, (y + 0.01) * S, 0.11 * S, 0.085 * S, 0, 0, 7); m.fill(); }, 0.9);
  const bazaarYard = () => lay.bazaar && yard('market_ground', (m) => { m.beginPath(); m.ellipse(lay.bazaar[0] * S, lay.bazaar[1] * S, (lay.bazaar[2] + 0.02) * S, (lay.bazaar[2] * 0.82 + 0.02) * S, 0, 0, 7); m.fill(); }, 0.85, 0.17);
  if (lay.monastery) {
    const [x, y, w, h] = MONASTERY_BOX(lay.monastery);
    yard('garden_path', (m) => { m.beginPath(); m.ellipse((x + w / 2) * S, (y + h / 2 + 0.04) * S, w * 0.55 * S, h * 0.42 * S, 0, 0, 7); m.fill(); }, 0.4, 0.2);
  }
  if (lay.garden && !lay.garden.auto) {
    const [x, y, w, h] = GARDEN_BOX(lay.garden);
    yard('garden_path', (m) => m.fillRect(x * S, y * S, w * S, h * S), 0.8, 0.16);
  }
  if (lay.highwaymen) yard('farmyard', (m) => { m.beginPath(); m.arc(lay.highwaymen[0] * S, lay.highwaymen[1] * S, 0.06 * S, 0, 7); m.fill(); }, 0.6);
  if (lay.volcano) {
    const [x, y] = lay.volcano;
    const gr = g.createRadialGradient(x * S, y * S, 0, x * S, y * S, 0.2 * S);
    gr.addColorStop(0, 'rgba(40,34,30,0.9)'); gr.addColorStop(0.6, 'rgba(70,52,40,0.6)'); gr.addColorStop(1, 'rgba(70,52,40,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x * S, (y + 0.02) * S, 0.2 * S, 0.16 * S, 0, 0, 7); g.fill();
  }

  yield;
  // ---- cities: town lanes inside, occlusion along the walls, the wall-walk with merlons
  for (const cty of lay.cities) {
    const path = outlinePath(cty.outline, S);
    // ambient occlusion around the wall foot (both sides alike)
    g.save(); g.lineCap = 'round';
    const ao = softMask(S, 26, (m) => { m.lineWidth = 0.17 * S; for (const w of cty.walls) m.stroke(segPath(w, S)); });
    {
      const [l, lg] = layer(S, 1);
      lg.fillStyle = 'rgba(28,22,10,0.42)'; lg.fillRect(0, 0, S, S);
      applyMask(lg, S, ao);
      g.drawImage(l, 0, 0);
    }
    g.restore();
    const [l, lg] = layer(S, 1);
    lg.fillStyle = pattern(lg, T('town_lane'), 0.3, S, { ox: 0.07 }); lg.fill(path);
    // inner occlusion
    lg.save(); lg.clip(path);
    const [d, dg] = layer(S, 2);
    dg.fillStyle = 'rgba(25,18,8,0.45)'; dg.fillRect(0, 0, S, S);
    applyMask(dg, S, softMask(S, 22, (m) => { m.lineWidth = 0.15 * S; for (const w of cty.walls) m.stroke(segPath(w, S)); }));
    lg.drawImage(d, 0, 0);
    // trodden lanes where the roads run on into the town
    lg.globalAlpha = 0.35; lg.strokeStyle = '#4e3d2b'; lg.lineCap = 'round'; lg.lineWidth = ROAD_W * 0.55 * S;
    for (const r of lay.roads) lg.stroke(segPath(r.seg, S));
    lg.globalAlpha = 1;
    lg.restore();
    g.drawImage(l, 0, 0);
    // the wall-walk (top-down): flagstones along the curve, dark joints both sides, merlons outside
    for (const w of cty.walls) {
      const WW = 0.07;
      g.save(); g.lineCap = 'butt'; g.strokeStyle = 'rgba(30,24,16,0.55)'; g.lineWidth = (WW + 0.012) * S; g.stroke(segPath(w, S)); g.restore();
      ribbon(g, w, WW, T('wall_walk'), S, { n: 32 });
      g.save(); g.strokeStyle = 'rgba(40,32,22,0.6)'; g.lineWidth = 0.004 * S;
      for (const side of [-1, 1]) { offsetLine(g, w, side * WW * 0.5, S); g.stroke(); }
      // merlons along the outer parapet
      const pts = sampleSeg(w, 70);
      const mid = pts[35];
      const sgn = plan.typeAt(mid.x + mid.nx * 0.06, mid.y + mid.ny * 0.06) === 'city' ? -1 : 1;
      for (let i = 1; i < pts.length - 1; i += 2) {
        const p = pts[i];
        const x = (p.x + p.nx * sgn * WW * 0.4) * S, y = (p.y + p.ny * sgn * WW * 0.4) * S;
        g.save(); g.translate(x, y); g.rotate(Math.atan2(p.ty, p.tx));
        g.fillStyle = 'rgba(30,24,16,0.5)'; g.fillRect(-0.0055 * S, -0.0045 * S, 0.011 * S, 0.009 * S);
        g.fillStyle = '#cdbf9f'; g.fillRect(-0.0045 * S, -0.0035 * S, 0.009 * S, 0.007 * S);
        g.restore();
      }
      g.restore();
    }
  }

  yield;
  if (lay.bazaar) bazaarYard();

  // ---- bridges carried by a road over a river or a town
  for (const r of overs) {
    const span = bridgePart(r);
    // a stone bridge miniature spans the river: the road stops at its abutments
    const cross = riverCrossing(r.seg, lay.rivers, RIVER_W);
    if (A.hasSprite('bridge_lr') && cross && !lay.cities.some((cc) => cc.bridgedBy === r.fi)) {
      roadSet([subSeg(r.seg, 0, cross[0] + 0.02), subSeg(r.seg, cross[1] - 0.02, 1)].filter((s) => Math.hypot(s[3][0] - s[0][0], s[3][1] - s[0][1]) > 0.01), ROAD_W);
      continue;
    }
    roadSet([r.seg], ROAD_W);
    g.save(); g.lineCap = 'butt';
    const ao = softMask(S, 30, (m) => { m.lineWidth = ROAD_W * 2.1 * S; m.stroke(segPath(span, S)); });
    const [l, lg] = layer(S, 1);
    lg.fillStyle = 'rgba(15,18,8,0.55)'; lg.fillRect(0, 0, S, S); applyMask(lg, S, ao); g.drawImage(l, 0, 0);
    g.strokeStyle = 'rgba(30,24,16,0.7)'; g.lineWidth = ROAD_W * 1.62 * S; g.stroke(segPath(span, S));
    ribbon(g, span, ROAD_W * 1.5, T('wall_walk'), S, { n: 12 });
    ribbon(g, span, ROAD_W * 0.92, T('dirt_road'), S, { n: 12 });
    g.strokeStyle = 'rgba(30,24,16,0.65)'; g.lineWidth = 0.016 * S;
    for (const side of [-1, 1]) { offsetLine(g, span, side * ROAD_W * 0.66, S, 12); g.stroke(); }
    g.strokeStyle = '#cfc4aa'; g.lineWidth = 0.011 * S;
    for (const side of [-1, 1]) { offsetLine(g, span, side * ROAD_W * 0.66, S, 12); g.stroke(); }
    g.restore();
  }

  yield;
  // ---- the tower's foundation
  if (lay.foundation) {
    const [x, y] = lay.foundation; const a = 0.105;
    g.fillStyle = 'rgba(25,20,12,0.45)'; g.fillRect((x - a - 0.012) * S, (y - a - 0.012) * S, (2 * a + 0.024) * S, (2 * a + 0.024) * S);
    g.fillStyle = pattern(g, T('wall_walk'), 0.12, S); g.fillRect((x - a) * S, (y - a) * S, 2 * a * S, 2 * a * S);
    g.strokeStyle = 'rgba(40,32,24,0.7)'; g.lineWidth = 0.006 * S; g.strokeRect((x - a) * S, (y - a) * S, 2 * a * S, 2 * a * S);
  }

  yield;
  // ---- painted stand-ins where a landmark's miniature is missing
  for (const f of options.fallbacks || []) {
    const art = plan.art.canvas;
    const [l, lg] = layer(S, 1);
    lg.drawImage(art, 0, 0, ART_SIZE, ART_SIZE, 0, 0, S, S);
    applyMask(lg, S, softMask(S, 60, (m) => {
      m.beginPath();
      if (f.ellipse) { const [x, y, rx, ry] = f.ellipse; m.ellipse(x * S, y * S, rx * S, ry * S, 0, 0, 7); } else { const [x, y, w, h] = f.box; m.rect(x * S, y * S, w * S, h * S); }
      m.fill();
    }));
    g.drawImage(l, 0, 0);
  }

  yield;
  // ---- the printed symbols (pennants, goods, princess, dragon, portal)
  drawTileSymbols(g, id, S, options.symbols || null);

  yield;
  // ---- grade: warm June light, a touch of contrast
  g.save();
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.22; g.fillStyle = '#f0c27a'; g.fillRect(0, 0, S, S);
  g.restore();
  yield c;
}
class Wait extends Error {}
export { Wait };
// Build in one go (thumbnails in tools); null while a texture is still loading.
export function buildGround(id, S, options) {
  try { let last; for (const v of groundSteps(id, S, options)) last = v; return last || null; } catch (e) { if (e instanceof Wait) return null; throw e; }
}

// a heap of mossy stones (the spring)
function stones(g, cx, cy, S, r, tex) {
  const p = tex ? pattern(g, tex, 0.25, S) : null;
  const list = [];
  for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = Math.sqrt(r()); list.push([cx + Math.cos(a) * d * 0.07, cy + Math.sin(a) * d * 0.11, 0.008 + r() * 0.016]); }
  list.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr] of list) {
    g.fillStyle = 'rgba(25,22,15,0.4)'; g.beginPath(); g.ellipse(x * S, y * S, rr * 1.15 * S, rr * S, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient((x - rr * 0.3) * S, (y - rr * 0.3) * S, 0, x * S, y * S, rr * S);
    const tone = 0.85 + r() * 0.25;
    gr.addColorStop(0, `rgb(${190 * tone | 0},${184 * tone | 0},${168 * tone | 0})`); gr.addColorStop(1, `rgb(${110 * tone | 0},${106 * tone | 0},${96 * tone | 0})`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x * S, y * S, rr * S, rr * 0.85 * S, r(), 0, 7); g.fill();
    if (p) { g.save(); g.globalAlpha = 0.55; g.globalCompositeOperation = 'multiply'; g.fillStyle = p; g.fill(); g.restore(); }
    if (r() < 0.5) { g.fillStyle = 'rgba(96,120,52,0.7)'; g.beginPath(); g.ellipse((x - rr * 0.2) * S, (y - rr * 0.3) * S, rr * 0.4 * S, rr * 0.25 * S, 0, 0, 7); g.fill(); }
  }
}
