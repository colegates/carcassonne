// Procedural, hand-painted-style artwork for Carcassonne tiles and meeples.
// Every tile type is painted once into an offscreen canvas (in its unrotated
// orientation) and then blitted/rotated by the board renderer.
import { TILE_TYPES } from './tiles.js';
import { layoutOf, bezierPoint, rotUnit } from './layout.js';

export const ART_SIZE = 576; // px per tile in the cached artwork
const HIT = 96; // resolution of the feature hit-map
export const LABEL_RES = HIT;

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
export { rotUnit } from './layout.js';

function outlinePath(outline, S, ctx = new Path2D()) {
  for (const c of outline) {
    if (c[0] === 'M') ctx.moveTo(c[1] * S, c[2] * S);
    else if (c[0] === 'L') ctx.lineTo(c[1] * S, c[2] * S);
    else if (c[0] === 'C') ctx.bezierCurveTo(c[1] * S, c[2] * S, c[3] * S, c[4] * S, c[5] * S, c[6] * S);
    else ctx.closePath();
  }
  return ctx;
}

function segPath(seg, S, p = new Path2D()) {
  p.moveTo(seg[0][0] * S, seg[0][1] * S);
  p.bezierCurveTo(seg[1][0] * S, seg[1][1] * S, seg[2][0] * S, seg[2][1] * S, seg[3][0] * S, seg[3][1] * S);
  return p;
}

// ---------- hit map: which pixel belongs to which feature ----------
const ROAD_W = 0.11;
const RIVER_W = 0.13;
const MONASTERY_BOX = (m) => [m.x - 0.2 * m.s, m.y - 0.22 * m.s, 0.4 * m.s, 0.44 * m.s];
const GARDEN_BOX = (g) => [g.x - 0.14, g.y - 0.095, 0.28, 0.19];

function buildHitMap(id, lay) {
  const t = TILE_TYPES[id];
  const c = canvas(HIT);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const label = new Int16Array(HIT * HIT).fill(-1); // -1 = grass, -2 = blocker
  const stamp = (draw, val, clip = null) => {
    ctx.clearRect(0, 0, HIT, HIT);
    ctx.save();
    if (clip) ctx.clip(clip);
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    draw(ctx);
    ctx.restore();
    const d = ctx.getImageData(0, 0, HIT, HIT).data;
    for (let i = 0; i < label.length; i++) if (d[i * 4 + 3] > 110) label[i] = val;
  };
  const H = HIT;
  for (const r of lay.rivers) stamp((g) => { g.lineWidth = RIVER_W * H; g.lineCap = r.dead ? 'round' : 'butt'; g.stroke(segPath(r.seg, H)); }, r.fi);
  if (lay.lake) {
    const [x, y, rx, ry] = lay.lake;
    const fi = lay.rivers[0]?.fi ?? -2;
    stamp((g) => { g.beginPath(); g.ellipse(x * H, y * H, rx * H, ry * H, 0, 0, 7); g.fill(); }, fi);
  }
  // a road through a tunnel is drawn up to the city wall and hidden beneath the city
  const plain = lay.roads.filter((r) => r.bridge !== 'over'), over = lay.roads.filter((r) => r.bridge === 'over');
  for (const r of [...plain, ...over]) stamp((g) => { g.lineWidth = ROAD_W * H; g.lineCap = 'butt'; g.stroke(segPath(r.seg, H)); }, r.fi);
  for (const cty of lay.cities) stamp((g) => g.fill(outlinePath(cty.outline, H)), cty.fi);
  // a road on a bridge over a city stays on top of it
  for (const r of over) if (lay.cities.some((cc) => cc.bridgedBy === r.fi)) stamp((g) => { g.lineWidth = ROAD_W * H; g.lineCap = 'butt'; g.stroke(segPath(r.seg, H)); }, r.fi);
  for (const [x1, y1, x2, y2] of lay.stubs) stamp((g) => { g.lineWidth = ROAD_W * 0.9 * H; g.beginPath(); g.moveTo(x1 * H, y1 * H); g.lineTo(x2 * H, y2 * H); g.stroke(); }, -2);
  if (lay.village) stamp((g) => { g.beginPath(); g.arc(lay.village.x * H, lay.village.y * H, lay.village.r * H, 0, 7); g.fill(); }, -2);
  if (lay.trees) stamp((g) => { g.beginPath(); g.arc(lay.trees.x * H, lay.trees.y * H, 0.085 * H, 0, 7); g.fill(); }, -2);
  if (lay.house) stamp((g) => g.fillRect((lay.house[0] - 0.07) * H, (lay.house[1] - 0.06) * H, 0.14 * H, 0.12 * H), -2);
  if (lay.volcano) stamp((g) => { g.beginPath(); g.ellipse(lay.volcano[0] * H, lay.volcano[1] * H, 0.15 * H, 0.12 * H, 0, 0, 7); g.fill(); }, -2);
  if (lay.foundation) stamp((g) => g.fillRect((lay.foundation[0] - 0.115) * H, (lay.foundation[1] - 0.115) * H, 0.23 * H, 0.23 * H), -2);
  // Bridges, Castles & Bazaars: the bazaar (it ends roads; with two roads it splits the meadow), farmhouse, bushes
  if (lay.bazaar) stamp((g) => { g.beginPath(); g.ellipse(lay.bazaar[0] * H, lay.bazaar[1] * H, lay.bazaar[2] * H, lay.bazaar[2] * 0.8 * H, 0, 0, 7); g.fill(); }, -2);
  if (lay.farmhouse) stamp((g) => { g.beginPath(); g.ellipse(lay.farmhouse[0] * H, lay.farmhouse[1] * H, 0.12 * H, 0.09 * H, -0.5, 0, 7); g.fill(); }, -2);
  for (const p of [lay.highwaymen, lay.shrub]) if (p) stamp((g) => { g.beginPath(); g.arc(p[0] * H, p[1] * H, 0.05 * H, 0, 7); g.fill(); }, -2);
  for (const [x, y, lx, ly] of lay.inns) {
    stamp((g) => { g.fillRect((x - 0.075) * H, (y - 0.065) * H, 0.15 * H, 0.13 * H); g.beginPath(); g.ellipse(lx * H, ly * H, 0.07 * H, 0.045 * H, 0.2, 0, 7); g.fill(); }, -2);
  }
  if (lay.monastery) { const [x, y, w, h] = MONASTERY_BOX(lay.monastery); stamp((g) => g.fillRect(x * H, y * H, w * H, h * H), lay.monastery.fi); }
  if (lay.garden && !lay.garden.auto) { const [x, y, w, h] = GARDEN_BOX(lay.garden); stamp((g) => g.fillRect(x * H, y * H, w * H, h * H), lay.garden.fi); }
  const problems = [];
  if (lay.garden?.auto) problems.push(`${id}: garden has no position hint`);

  // grass components
  const comp = new Int16Array(HIT * HIT).fill(-1);
  const sizes = [];
  let nComp = 0;
  for (let i = 0; i < label.length; i++) {
    if (label[i] !== -1 || comp[i] !== -1) continue;
    const st = [i]; comp[i] = nComp; let n = 0;
    while (st.length) {
      const j = st.pop(); n++;
      const x = j % HIT, y = (j / HIT) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= HIT || ny >= HIT) continue;
        const nj = ny * HIT + nx;
        if (label[nj] === -1 && comp[nj] === -1) { comp[nj] = nComp; st.push(nj); }
      }
    }
    sizes.push(n);
    nComp++;
  }
  // map components to field features using edge port sample points
  const portPt = (p) => {
    const s = Math.floor(p / 3), i = p % 3;
    const u = [0.13, 0.5, 0.87][i], v = 0.025;
    return [[u, v], [1 - v, u], [1 - u, 1 - v], [v, 1 - u]][s];
  };
  const compToField = new Map();
  t.features.forEach((f, fi) => {
    if (f.type !== 'field' || !f.ports.length) return;
    const mine = new Set();
    for (const p of f.ports) {
      const [u, v] = portPt(p);
      const j = Math.min(HIT - 1, (v * HIT) | 0) * HIT + Math.min(HIT - 1, (u * HIT) | 0);
      const cc = comp[j];
      if (cc < 0) { problems.push(`${id}: field ${fi} port ${p} not grass`); continue; }
      if (compToField.has(cc) && compToField.get(cc) !== fi) problems.push(`${id}: component shared by fields ${compToField.get(cc)} & ${fi}`);
      compToField.set(cc, fi);
      mine.add(cc);
    }
    if (mine.size > 1 && !lay.splitFields) problems.push(`${id}: field ${fi} drawn in ${mine.size} pieces`);
  });
  // fields that touch no edge take the biggest leftover meadow
  t.features.forEach((f, fi) => {
    if (f.type !== 'field' || f.ports.length) return;
    let best = -1;
    for (let cc = 0; cc < nComp; cc++) if (!compToField.has(cc) && (best < 0 || sizes[cc] > sizes[best])) best = cc;
    if (best < 0 || sizes[best] < 20) { problems.push(`${id}: no meadow for inner field ${fi}`); return; }
    compToField.set(best, fi);
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

function computeAnchors(id, lay, label) {
  const t = TILE_TYPES[id];
  const through = lay.roads.filter((r) => !r.dead);
  return t.features.map((f, fi) => {
    if (f.type === 'monastery' && lay.monastery) return [lay.monastery.x, lay.monastery.y + 0.07 * lay.monastery.s];
    if (f.type === 'garden' && lay.garden) return [(lay.garden.x ?? 0.5) + 0.05, (lay.garden.y ?? 0.5) + 0.02];
    if (f.type === 'river') return [0.5, 0.5];
    if (f.type === 'road') {
      const r = lay.roads.find((rr) => rr.fi === fi);
      if (r.dead) return bezierPoint(r.seg, 0.36);
      // two roads crossing on one tile: keep the figures apart
      if (through.length > 1) return bezierPoint(r.seg, r.bridge === 'over' ? 0.74 : 0.26);
      if (r.tunnel) return bezierPoint(r.seg, 0.11); // the visible stretch before the tunnel
      return bezierPoint(r.seg, 0.5);
    }
    const d = distanceMap(label, fi);
    let best = -1, bx = 0.5, by = 0.5;
    for (let i = 0; i < d.length; i++) {
      if (label[i] !== fi) continue;
      const x = (i % HIT + 0.5) / HIT, y = (((i / HIT) | 0) + 0.5) / HIT;
      // prefer roomy spots, slightly toward the tile centre (but not on top of a cathedral)
      let score = Math.min(d[i], f.type === 'field' ? 17 : 20) - Math.hypot(x - 0.5, y - 0.5) * 6;
      if (f.cathedral && lay.cathedral) score -= Math.max(0, 0.34 - Math.hypot(x - lay.cathedral[0], y - lay.cathedral[1])) * 60;
      if (score > best) { best = score; bx = x; by = y; }
    }
    const lo = f.type === 'city' ? 0.1 : 0.12;
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

function paintRivers(ctx, S, rnd, lay) {
  if (!lay.rivers.length && !lay.lake) return;
  const k = S / 384;
  const W = RIVER_W * S;
  const paths = lay.rivers.map((r) => segPath(r.seg, S));
  // muddy, reedy banks
  ctx.save();
  ctx.lineCap = 'round';
  ctx.filter = `blur(${3.5 * k}px)`;
  for (const p of paths) { ctx.strokeStyle = 'rgba(70,80,40,0.55)'; ctx.lineWidth = W * 1.55; ctx.stroke(p); }
  if (lay.lake) {
    const [x, y, rx, ry] = lay.lake;
    ctx.fillStyle = 'rgba(70,80,40,0.55)';
    ctx.beginPath(); ctx.ellipse(x * S, y * S, (rx + 0.04) * S, (ry + 0.04) * S, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
  const layer = canvas(S); const l = layer.getContext('2d');
  l.lineCap = 'round';
  for (const p of paths) { l.strokeStyle = '#4f7a9a'; l.lineWidth = W; l.stroke(p); }
  if (lay.lake) {
    const [x, y, rx, ry] = lay.lake;
    l.fillStyle = '#4f7a9a';
    l.beginPath(); l.ellipse(x * S, y * S, rx * S, ry * S, 0, 0, 7); l.fill();
  }
  for (const r of lay.rivers) if (r.spring) {
    const [x, y] = r.seg[3];
    l.fillStyle = '#3f6d8f'; l.beginPath(); l.ellipse(x * S, y * S, 0.07 * S, 0.1 * S, 0, 0, 7); l.fill();
  }
  l.globalCompositeOperation = 'source-atop';
  // lighter middle of the stream and ripples
  for (const p of paths) { l.strokeStyle = 'rgba(140,185,210,0.45)'; l.lineWidth = W * 0.45; l.stroke(p); }
  drawSmooth(l, noiseCanvas(9, rnd, '#2f5a7a'), S, 0.35, 'source-atop');
  l.strokeStyle = 'rgba(230,245,255,0.35)'; l.lineWidth = 1.1 * k; l.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = rnd() * S, y = rnd() * S;
    l.beginPath(); l.moveTo(x, y); l.quadraticCurveTo(x + 3 * k, y - 1.5 * k, x + 6 * k, y); l.stroke();
  }
  ctx.drawImage(layer, 0, 0);
  // reeds along the banks
  ctx.lineCap = 'round';
  for (const r of lay.rivers) {
    for (let i = 0; i < 26; i++) {
      const t = rnd(); const [x, y] = bezierPoint(r.seg, t);
      const [x2, y2] = bezierPoint(r.seg, Math.min(1, t + 0.01));
      const dx = x2 - x, dy = y2 - y, len = Math.hypot(dx, dy) || 1;
      const sgn = rnd() < 0.5 ? -1 : 1;
      const px = (x - (dy / len) * sgn * RIVER_W * 0.55) * S, py = (y + (dx / len) * sgn * RIVER_W * 0.55) * S;
      ctx.strokeStyle = rnd() < 0.5 ? '#5d6e33' : '#7c8a45'; ctx.lineWidth = 1.2 * k;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (rnd() - 0.5) * 3 * k, py - (3 + rnd() * 4) * k); ctx.stroke();
    }
  }
  if (lay.lake) {
    // wooded island and a little boat
    const [x, y, rx, ry] = lay.lake;
    bushCluster(ctx, (x + rx * 0.35) * S, (y + ry * 0.4) * S, 9 * k, rnd, k);
    ctx.fillStyle = '#8a3b22'; ctx.beginPath(); ctx.ellipse((x - rx * 0.3) * S, (y - ry * 0.6) * S, 7 * k, 2.6 * k, -0.3, 0, 7); ctx.fill();
  }
  if (lay.rock) rockyOutcrop(ctx, lay.rock[0] * S, lay.rock[1] * S, S, rnd, k);
}

// The spring's rocks: a heap of mossy boulders the river wells up from.
function rockyOutcrop(ctx, cx, cy, S, rnd, k) {
  ctx.save();
  ctx.filter = `blur(${4 * k}px)`;
  ctx.fillStyle = 'rgba(30,32,18,0.4)';
  ctx.beginPath(); ctx.ellipse(cx + 0.015 * S, cy + 0.025 * S, 0.12 * S, 0.17 * S, 0, 0, 7); ctx.fill();
  ctx.restore();
  const stones = [];
  for (let i = 0; i < 11; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    stones.push({ x: cx + Math.cos(a) * d * 0.075 * S, y: cy + Math.sin(a) * d * 0.13 * S, r: (0.032 + rnd() * 0.03) * S * (1.15 - d * 0.35) });
  }
  stones.sort((p, q) => p.y - q.y);
  for (const st of stones) {
    const pts = [];
    for (let j = 0; j < 9; j++) {
      const a = (j / 9) * Math.PI * 2 + rnd() * 0.3;
      const rr = st.r * (0.78 + rnd() * 0.3);
      pts.push([st.x + Math.cos(a) * rr, st.y + Math.sin(a) * rr * 0.82]);
    }
    const path = new Path2D();
    pts.forEach(([px, py], j) => {
      const [nx, ny] = pts[(j + 1) % pts.length];
      const mx = (px + nx) / 2, my = (py + ny) / 2;
      if (j === 0) path.moveTo(mx, my); else path.quadraticCurveTo(px, py, mx, my);
    });
    const [px0, py0] = pts[0], [nx0, ny0] = pts[1];
    path.quadraticCurveTo(px0, py0, (px0 + nx0) / 2, (py0 + ny0) / 2);
    path.closePath();
    const g = ctx.createLinearGradient(st.x - st.r, st.y - st.r, st.x + st.r, st.y + st.r);
    const tone = 0.85 + rnd() * 0.25;
    const c = (v) => Math.round(Math.min(255, v * tone));
    g.addColorStop(0, `rgb(${c(176)},${c(170)},${c(156)})`);
    g.addColorStop(0.55, `rgb(${c(132)},${c(127)},${c(116)})`);
    g.addColorStop(1, `rgb(${c(84)},${c(80)},${c(72)})`);
    ctx.fillStyle = g; ctx.fill(path);
    ctx.strokeStyle = 'rgba(40,38,30,0.55)'; ctx.lineWidth = 1.1 * k; ctx.stroke(path);
    // light catching the top edge, a crack, and a little moss
    ctx.save(); ctx.clip(path);
    ctx.strokeStyle = 'rgba(235,230,215,0.45)'; ctx.lineWidth = 1.6 * k;
    ctx.beginPath(); ctx.arc(st.x + st.r * 0.15, st.y + st.r * 0.2, st.r * 0.85, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
    if (rnd() < 0.6) {
      ctx.strokeStyle = 'rgba(50,46,38,0.5)'; ctx.lineWidth = 0.9 * k;
      ctx.beginPath(); ctx.moveTo(st.x - st.r * 0.3, st.y - st.r * 0.1); ctx.lineTo(st.x + st.r * 0.05, st.y + st.r * 0.2); ctx.lineTo(st.x + st.r * 0.3, st.y + st.r * 0.15); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(96,120,52,0.75)';
    for (let m = 0; m < 3; m++) if (rnd() < 0.55) { ctx.beginPath(); ctx.ellipse(st.x + (rnd() - 0.6) * st.r, st.y - rnd() * st.r * 0.6, 2.4 * k, 1.6 * k, rnd(), 0, 7); ctx.fill(); }
    ctx.restore();
  }
  bushCluster(ctx, cx - 0.04 * S, cy - 0.15 * S, 7 * k, rnd, k);
  bushCluster(ctx, cx - 0.05 * S, cy + 0.15 * S, 6 * k, rnd, k);
}

function bushCluster(ctx, x, y, r, rnd, k) {
  for (let i = 0; i < 3; i++) bush(ctx, x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, r * 0.7, rnd, k);
}

function strokeRoadBed(ctx, S, rnd, segs, width = ROAD_W) {
  const k = S / 384;
  const W = width * S;
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.filter = `blur(${4 * k}px)`;
  for (const s of segs) { ctx.strokeStyle = 'rgba(70,72,35,0.45)'; ctx.lineWidth = W * 1.65; ctx.stroke(segPath(s, S)); }
  ctx.filter = `blur(${1.2 * k}px)`;
  for (const s of segs) { ctx.strokeStyle = 'rgba(168,150,112,0.8)'; ctx.lineWidth = W * 1.08; ctx.stroke(segPath(s, S)); }
  ctx.restore();
  const layer = canvas(S); const l = layer.getContext('2d');
  l.lineCap = 'butt';
  l.filter = `blur(${0.6 * k}px)`;
  for (const s of segs) { l.strokeStyle = '#d9c9a0'; l.lineWidth = W * 0.9; l.stroke(segPath(s, S)); }
  l.filter = 'none';
  l.globalCompositeOperation = 'source-atop';
  drawSmooth(l, noiseCanvas(10, rnd, '#b9a986'), S, 0.5, 'source-atop');
  drawSmooth(l, noiseCanvas(40, rnd), S, 0.18, 'overlay');
  for (const s of segs) {
    l.strokeStyle = 'rgba(140,120,85,0.22)'; l.lineWidth = W * 0.55; l.stroke(segPath(s, S));
    l.strokeStyle = 'rgba(217,201,160,0.9)'; l.lineWidth = W * 0.4; l.stroke(segPath(s, S));
  }
  for (let i = 0; i < 700; i++) {
    l.fillStyle = rnd() < 0.6 ? 'rgba(120,100,70,0.22)' : 'rgba(250,245,230,0.3)';
    l.beginPath(); l.arc(rnd() * S, rnd() * S, (0.5 + rnd()) * k, 0, 7); l.fill();
  }
  l.globalCompositeOperation = 'destination-in';
  l.filter = `blur(${0.6 * k}px)`;
  const all = new Path2D();
  for (const s of segs) segPath(s, S, all);
  l.strokeStyle = '#000'; l.lineWidth = W * 0.9; l.stroke(all);
  l.filter = 'none';
  ctx.drawImage(layer, 0, 0);
}

function paintRoads(ctx, S, rnd, lay, which) {
  const list = lay.roads.filter((r) => (which === 'over' ? r.bridge === 'over' : r.bridge !== 'over'));
  if (!list.length) return;
  const k = S / 384;
  if (which === 'over') {
    // a stone bridge: a deep shadow on whatever passes underneath, then the deck
    for (const r of list) {
      ctx.save(); ctx.filter = `blur(${4 * k}px)`; ctx.strokeStyle = 'rgba(15,18,8,0.65)'; ctx.lineWidth = ROAD_W * S * 1.75; ctx.lineCap = 'butt';
      ctx.translate(4 * k, 6 * k); ctx.stroke(segPath(bridgePart(r), S)); ctx.restore();
      ctx.strokeStyle = '#6a6153'; ctx.lineWidth = ROAD_W * S * 1.55; ctx.lineCap = 'butt'; ctx.stroke(segPath(bridgePart(r), S));
    }
  }
  strokeRoadBed(ctx, S, rnd, list.map((r) => r.seg));
  if (which === 'over') for (const r of list) parapets(ctx, bridgePart(r), S, k);
}

// low stone walls along both sides of a bridge
function parapets(ctx, seg, S, k) {
  const off = ROAD_W * 0.66;
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const [x, y] = bezierPoint(seg, t);
      const [x2, y2] = bezierPoint(seg, Math.min(1, t + 0.02));
      const [x0, y0] = bezierPoint(seg, Math.max(0, t - 0.02));
      const dx = x2 - x0, dy = y2 - y0, len = Math.hypot(dx, dy) || 1;
      pts.push([(x - (dy / len) * off * side) * S, (y + (dx / len) * off * side) * S]);
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30,25,15,0.55)'; ctx.lineWidth = 7 * k;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 1.5 * k, y + 2.5 * k) : ctx.moveTo(x + 1.5 * k, y + 2.5 * k))); ctx.stroke();
    ctx.strokeStyle = '#a49a84'; ctx.lineWidth = 6 * k;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = '#cfc5ad'; ctx.lineWidth = 2.4 * k;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x - 0.8 * k, y - 0.8 * k) : ctx.moveTo(x - 0.8 * k, y - 0.8 * k))); ctx.stroke();
    // joints between the stones
    ctx.strokeStyle = 'rgba(60,50,40,0.45)'; ctx.lineWidth = 0.9 * k;
    for (let i = 2; i < pts.length - 1; i += 3) {
      const [x, y] = pts[i];
      ctx.beginPath(); ctx.moveTo(x - 2.5 * k, y - 2.5 * k); ctx.lineTo(x + 2.5 * k, y + 2.5 * k); ctx.stroke();
    }
    ctx.restore();
  }
}

// short footpaths that split meadows but are not roads (Inns & Cathedrals village)
function paintStubs(ctx, S, rnd, lay) {
  if (!lay.stubs.length) return;
  const line = (x1, y1, x2, y2) => [[x1, y1], [lerp(x1, x2, 1 / 3), lerp(y1, y2, 1 / 3)], [lerp(x1, x2, 2 / 3), lerp(y1, y2, 2 / 3)], [x2, y2]];
  strokeRoadBed(ctx, S, rnd, lay.stubs.map(([x1, y1, x2, y2]) => line(x1, y1, x2, y2)), ROAD_W * 0.55);
}

// the middle part of a road that crosses on a bridge
function bridgePart(r) {
  const a = bezierPoint(r.seg, r.span[0]), b = bezierPoint(r.seg, r.span[1]);
  return [a, [lerp(a[0], b[0], 1 / 3), lerp(a[1], b[1], 1 / 3)], [lerp(a[0], b[0], 2 / 3), lerp(a[1], b[1], 2 / 3)], b];
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

function paintCities(ctx, S, rnd, lay, label) {
  const k = S / 384;
  for (const c of lay.cities) {
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
    const big = (c.shape === 'three' || c.shape === 'full') && !c.cathedral && !lay.monastery;
    const keep = c.cathedral ? (lay.cathedral || [0.5, 0.5]) : big ? (c.shape === 'full' ? [0.5, 0.5] : rotUnit(0.5, 0.3, c.rot)) : null;
    const keepR = c.cathedral ? 0.3 : 0.17;
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
        if (keep && Math.hypot(x - keep[0], y - keep[1]) < keepR) continue;
        if (lay.monastery && Math.hypot(x - lay.monastery.x, y - lay.monastery.y) < 0.22 * lay.monastery.s) continue;
        if (lay.foundation && Math.hypot(x - lay.foundation[0], y - lay.foundation[1]) < 0.15) continue;
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
    if (c.cathedral) cathedralArt(ctx, keep[0] * S, keep[1] * S, S, k, rnd);
    else if (keep) churchArt(ctx, keep[0] * S, keep[1] * S, S, k);
    ctx.restore();
    for (const w of c.walls) wallArt(ctx, w, S, rnd, k, label, c.fi, path);
  }
  // gates where roads meet city walls (and tunnel mouths)
  for (const r of lay.roads) {
    if (r.bridge === 'over' && lay.cities.some((cc) => cc.bridgedBy === r.fi)) continue;
    let prev = null;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const [x, y] = bezierPoint(r.seg, t);
      const l = label[Math.min(HIT - 1, Math.floor(y * HIT)) * HIT + Math.min(HIT - 1, Math.floor(x * HIT))];
      const inCity = l >= 0 && TILE_TYPES[lay.id].features[l]?.type === 'city';
      if (prev !== null && inCity !== prev) {
        const [x2, y2] = bezierPoint(r.seg, Math.min(1, t + 0.02));
        const [x0, y0] = bezierPoint(r.seg, Math.max(0, t - 0.02));
        gateArt(ctx, [x, y], Math.atan2(y2 - y0, x2 - x0) + (inCity ? 0 : Math.PI), S, k);
      }
      prev = inCity;
    }
  }
}

function cathedralArt(ctx, cx, cy, S, k, rnd) {
  // a cruciform cathedral seen at an angle, with twin towers and a crossing spire
  const w = 0.5 * S, h = 0.34 * S;
  ctx.save(); ctx.filter = `blur(${4 * k}px)`;
  ctx.fillStyle = 'rgba(40,30,15,0.45)'; ctx.fillRect(cx - w / 2 + 6 * k, cy - h / 2 + 8 * k, w, h);
  ctx.restore();
  const stone = (x, y, ww, hh, light) => {
    const g = ctx.createLinearGradient(x, y, x, y + hh);
    g.addColorStop(0, light ? '#efe6d2' : '#d9ccb0'); g.addColorStop(1, light ? '#d8cbae' : '#c2b395');
    ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
  };
  const roof = (x, y, ww, hh) => {
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#b8694c'); g.addColorStop(0.5, '#a85a3e'); g.addColorStop(0.52, '#7e3f2a'); g.addColorStop(1, '#723826');
    ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh);
    ctx.strokeStyle = 'rgba(60,25,15,0.25)'; ctx.lineWidth = 0.7 * k;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(x + (ww * i) / 10, y); ctx.lineTo(x + (ww * i) / 10, y + hh); ctx.stroke(); }
  };
  // nave
  stone(cx - w * 0.42, cy - h * 0.05, w * 0.84, h * 0.3, true);
  for (let i = 0; i < 7; i++) {
    const x = cx - w * 0.36 + i * w * 0.11;
    ctx.fillStyle = '#4a5a74'; ctx.beginPath(); ctx.moveTo(x, cy + h * 0.2); ctx.lineTo(x, cy + h * 0.06); ctx.arc(x + 2.2 * k, cy + h * 0.06, 2.2 * k, Math.PI, 0); ctx.lineTo(x + 4.4 * k, cy + h * 0.2); ctx.fill();
  }
  roof(cx - w * 0.44, cy - h * 0.32, w * 0.88, h * 0.28);
  // transept
  stone(cx - w * 0.1, cy - h * 0.5, w * 0.2, h * 0.75, false);
  roof(cx - w * 0.11, cy - h * 0.52, w * 0.22, h * 0.5);
  // west front with twin towers
  for (const dx of [-0.46, -0.3]) {
    const tx = cx + dx * w;
    stone(tx - 0.035 * S, cy - h * 0.55, 0.07 * S, h * 0.8, true);
    ctx.fillStyle = '#5f5853';
    ctx.beginPath(); ctx.moveTo(tx - 0.04 * S, cy - h * 0.55); ctx.lineTo(tx, cy - h * 0.92); ctx.lineTo(tx + 0.04 * S, cy - h * 0.55); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,50,0.6)'; ctx.fillRect(tx - 1.6 * k, cy - h * 0.38, 3.2 * k, 6 * k);
  }
  // rose window and portal
  ctx.fillStyle = '#3d5a8a'; ctx.beginPath(); ctx.arc(cx - w * 0.38, cy + h * 0.02, 4 * k, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a3220'; ctx.fillRect(cx - w * 0.395, cy + h * 0.11, 6 * k, h * 0.14);
  // crossing spire
  ctx.fillStyle = '#6a625d';
  ctx.beginPath(); ctx.moveTo(cx - 0.03 * S, cy - h * 0.3); ctx.lineTo(cx, cy - h * 0.82); ctx.lineTo(cx + 0.03 * S, cy - h * 0.3); ctx.fill();
  ctx.strokeStyle = '#d9b860'; ctx.lineWidth = 1.4 * k;
  ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.82); ctx.lineTo(cx, cy - h * 0.95); ctx.moveTo(cx - 2.5 * k, cy - h * 0.9); ctx.lineTo(cx + 2.5 * k, cy - h * 0.9); ctx.stroke();
  // market stalls around it
  for (let i = 0; i < 5; i++) {
    const a = rnd() * 6.28, d = 0.3 + rnd() * 0.08;
    const x = cx + Math.cos(a) * d * S * 0.8, y = cy + Math.sin(a) * d * S * 0.7;
    if (x < 0.06 * S || y < 0.06 * S || x > 0.94 * S || y > 0.94 * S) continue;
    ctx.fillStyle = 'rgba(40,30,15,0.3)'; ctx.fillRect(x + 1.5 * k, y + 2 * k, 10 * k, 6 * k);
    ctx.fillStyle = pick(rnd, ['#b8452e', '#3c6a9a', '#d8b03a', '#5d8a3a']); ctx.fillRect(x, y, 10 * k, 4 * k);
    ctx.fillStyle = '#e9dcc0'; ctx.fillRect(x, y + 4 * k, 10 * k, 2 * k);
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

function gateArt(ctx, at, ang, S, k) {
  const [x, y] = at;
  ctx.save(); ctx.translate(x * S, y * S); ctx.rotate(ang - Math.PI / 2);
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(-0.06 * S + 3 * k, -0.04 * S + 4 * k, 0.12 * S, 0.08 * S); ctx.restore();
  const g = ctx.createLinearGradient(0, -0.04 * S, 0, 0.04 * S);
  g.addColorStop(0, '#aaa08b'); g.addColorStop(1, '#7c7262');
  ctx.fillStyle = g; ctx.fillRect(-0.06 * S, -0.04 * S, 0.12 * S, 0.08 * S);
  ctx.fillStyle = '#3a2e22';
  ctx.beginPath(); ctx.moveTo(-0.022 * S, -0.04 * S); ctx.lineTo(-0.022 * S, -0.005 * S); ctx.arc(0, -0.005 * S, 0.022 * S, Math.PI, 0, true); ctx.lineTo(0.022 * S, -0.04 * S); ctx.fill();
  ctx.fillStyle = '#9a5a40'; ctx.fillRect(-0.065 * S, 0.035 * S, 0.13 * S, 0.02 * S);
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

function monasteryArt(ctx, S, rnd, k, at = [0.5, 0.5]) {
  const cx = at[0] * S, cy = at[1] * S;
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

function junctionArt(ctx, S, k, cx = S / 2, cy = S / 2) {
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

// ---------- buildings & symbols for the expansions ----------
function innArt(ctx, x, y, lx, ly, S, k, rnd) {
  // the inn's little lake first, then a half-timbered inn with smoke
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(60,70,35,0.5)';
  ctx.beginPath(); ctx.ellipse(lx * S, ly * S, 0.085 * S, 0.055 * S, 0.2, 0, 7); ctx.fill(); ctx.restore();
  const g = ctx.createRadialGradient(lx * S - 4 * k, ly * S - 3 * k, 1, lx * S, ly * S, 0.08 * S);
  g.addColorStop(0, '#86b3cf'); g.addColorStop(1, '#3f6d8f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx * S, ly * S, 0.075 * S, 0.047 * S, 0.2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1 * k;
  ctx.beginPath(); ctx.moveTo(lx * S - 8 * k, ly * S); ctx.quadraticCurveTo(lx * S - 4 * k, ly * S - 2 * k, lx * S, ly * S); ctx.stroke();
  const w = 0.13 * S, h = 0.1 * S, bx = x * S - w / 2, by = y * S - h / 2;
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(bx + 4 * k, by + 5 * k, w, h); ctx.restore();
  // walls with timber frame
  ctx.fillStyle = '#efe5cc'; ctx.fillRect(bx, by + h * 0.55, w, h * 0.45);
  ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 1.2 * k;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(bx + (w * i) / 4, by + h * 0.55); ctx.lineTo(bx + (w * i) / 4, by + h); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(bx, by + h * 0.55); ctx.lineTo(bx + w / 4, by + h); ctx.moveTo(bx + w / 2, by + h * 0.55); ctx.lineTo(bx + w * 0.75, by + h); ctx.stroke();
  ctx.fillStyle = '#3b2b1d'; ctx.fillRect(bx + w * 0.42, by + h * 0.72, w * 0.14, h * 0.28);
  const rg = ctx.createLinearGradient(0, by, 0, by + h * 0.55);
  rg.addColorStop(0, '#c26a48'); rg.addColorStop(0.5, '#b05a3c'); rg.addColorStop(0.52, '#83402a'); rg.addColorStop(1, '#783a26');
  ctx.fillStyle = rg; ctx.fillRect(bx - 1.5 * k, by, w + 3 * k, h * 0.56);
  // hanging sign with a tankard
  ctx.fillStyle = '#6b4a2c'; ctx.fillRect(bx + w + 1 * k, by + h * 0.58, 6 * k, 1.2 * k);
  ctx.fillStyle = '#e0b34a'; ctx.fillRect(bx + w + 2.5 * k, by + h * 0.62, 4 * k, 5 * k);
  // chimney smoke
  ctx.fillStyle = '#8b7d6b'; ctx.fillRect(bx + w * 0.75, by - 3 * k, 4 * k, 6 * k);
  ctx.fillStyle = 'rgba(235,235,235,0.55)';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(bx + w * 0.77 + i * 2.5 * k, by - 6 * k - i * 4.5 * k, (2.5 + i * 0.9) * k, 0, 7); ctx.fill(); }
  void rnd;
}

// Bridges, Castles & Bazaars: a market — striped awnings, canopies, crates and
// shoppers on a patch of trodden earth (it ends any road that runs into it).
const AWNINGS = [['#c4402e', '#f2e6cf'], ['#e1b13c', '#f6e7b4'], ['#3d7c48', '#e9efe2'], ['#3a5e9c', '#e3eaf4'], ['#f1ede2', '#d6cdb9'], ['#a04a6e', '#f0e0e6']];
function bazaarArt(ctx, x, y, r, S, k, rnd) {
  const cx = x * S, cy = y * S, R = r * S;
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(40,30,15,0.4)';
  ctx.beginPath(); ctx.ellipse(cx + 3 * k, cy + 4 * k, R, R * 0.8, 0, 0, 7); ctx.fill(); ctx.restore();
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  g.addColorStop(0, '#b4905f'); g.addColorStop(1, '#8c6b44');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, rr = R * (0.93 + rnd() * 0.1);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(70,50,28,0.25)' : 'rgba(220,195,150,0.25)';
    ctx.beginPath(); ctx.arc(cx + (rnd() - 0.5) * 2 * R, cy + (rnd() - 0.5) * 1.6 * R, (0.6 + rnd()) * k, 0, 7); ctx.fill();
  }
  ctx.restore();
  // stalls round the square, shoppers and goods between them
  const spots = [[-0.5, -0.38], [0.08, -0.55], [0.55, -0.22], [-0.6, 0.18], [0.02, 0.0], [0.5, 0.36], [-0.14, 0.5]];
  spots.forEach(([ux, uy], i) => {
    const w = (0.085 + rnd() * 0.03) * S, h = (0.06 + rnd() * 0.02) * S;
    stall(ctx, cx + ux * R * 0.92, cy + uy * R * 0.74, w, h, AWNINGS[(i + Math.floor(rnd() * 2)) % AWNINGS.length], (rnd() - 0.5) * 0.6, k, i % 3 === 2);
  });
  for (let i = 0; i < 5; i++) {
    const px = cx + (rnd() - 0.5) * 1.3 * R, py = cy + (rnd() - 0.5) * 1.0 * R;
    if (rnd() < 0.5) { ctx.fillStyle = '#7a5530'; ctx.fillRect(px - 2.4 * k, py - 2.4 * k, 4.8 * k, 4.8 * k); ctx.strokeStyle = 'rgba(40,25,10,0.6)'; ctx.lineWidth = 0.6 * k; ctx.strokeRect(px - 2.4 * k, py - 2.4 * k, 4.8 * k, 4.8 * k); }
    else { ctx.fillStyle = '#8a5d34'; ctx.beginPath(); ctx.arc(px, py, 2.6 * k, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,25,10,0.6)'; ctx.lineWidth = 0.6 * k; ctx.stroke(); }
  }
  const DRESS = ['#6b3d8a', '#a83228', '#2f5d8c', '#3d6e3a', '#c08a2a', '#7a4a2a'];
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.283, d = (0.25 + rnd() * 0.55) * R;
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8;
    ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.beginPath(); ctx.ellipse(px + 1 * k, py + 1.5 * k, 2.2 * k, 1.4 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = DRESS[i % DRESS.length]; ctx.beginPath(); ctx.arc(px, py, 2 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c6a0'; ctx.beginPath(); ctx.arc(px, py - 0.4 * k, 1 * k, 0, 7); ctx.fill();
  }
}

// one market stall seen from above: a striped awning or a square canopy
function stall(ctx, x, y, w, h, [c1, c2], rot, k, canopy) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.fillRect(-w / 2 + 2 * k, -h / 2 + 3 * k, w, h);
  if (canopy) {
    ctx.fillStyle = '#f1ece0'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(0, 0); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2, -h / 2); ctx.lineTo(0, 0); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,50,0.45)'; ctx.lineWidth = 0.7 * k;
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.moveTo(w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2); ctx.stroke();
    // bunting along the front
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = [c1, '#e1b13c', '#3a5e9c'][i % 3];
      const bx = -w / 2 + (i + 0.5) * (w / 5);
      ctx.beginPath(); ctx.moveTo(bx - w / 14, h / 2); ctx.lineTo(bx + w / 14, h / 2); ctx.lineTo(bx, h / 2 + 2.4 * k); ctx.closePath(); ctx.fill();
    }
  } else {
    const n = 6;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? c2 : c1; ctx.fillRect(-w / 2 + (i * w) / n, -h / 2, w / n + 0.4, h); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.45);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-w / 2, h * 0.05, w, h * 0.45);
    // scalloped front edge
    ctx.fillStyle = c1;
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(-w / 2 + (i + 0.5) * (w / n), h / 2, w / n / 2, 0, Math.PI); ctx.fill(); }
  }
  ctx.strokeStyle = 'rgba(60,40,25,0.5)'; ctx.lineWidth = 0.7 * k; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

// a long thatched farmhouse with a shed beside it
function farmhouseArt(ctx, x, y, S, k, rnd) {
  ctx.save(); ctx.translate(x * S, y * S); ctx.rotate(-0.5);
  const w = 0.2 * S, h = 0.085 * S;
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(-w / 2 + 3 * k, -h / 2 + 4 * k, w, h); ctx.restore();
  house(ctx, -w / 2, -h / 2, w, h, mulberry(23), k, ['#cfae62', '#9c7c3a']);
  ctx.strokeStyle = 'rgba(120,90,40,0.35)'; ctx.lineWidth = 0.6 * k;
  for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + (i * w) / 12, -h / 2); ctx.lineTo(-w / 2 + (i * w) / 12 + 1.5 * k, -h / 2 + h * 0.6); ctx.stroke(); }
  const sw = 0.08 * S, sh = 0.06 * S;
  ctx.fillStyle = 'rgba(30,25,10,0.35)'; ctx.fillRect(-w / 2 + 2 * k, h / 2 + 5 * k, sw, sh);
  house(ctx, -w / 2, h / 2 + 3 * k, sw, sh, mulberry(29), k, ['#a07a4a', '#76552e']);
  ctx.restore();
  bushCluster(ctx, (x + 0.12) * S, (y - 0.1) * S, 6 * k, rnd, k);
}

// two highwaymen lurking behind a bush (they mark nothing in the rules)
function highwaymenArt(ctx, x, y, S, k, rnd) {
  const px = x * S, py = y * S;
  for (const [dx, dy] of [[-3.5, -3], [3.5, -2]]) {
    ctx.fillStyle = 'rgba(30,25,15,0.35)'; ctx.beginPath(); ctx.ellipse(px + (dx + 1) * k, py + (dy + 2) * k, 3 * k, 2 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3128'; ctx.beginPath(); ctx.arc(px + dx * k, py + dy * k, 2.8 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#20180f'; ctx.beginPath(); ctx.ellipse(px + dx * k, py + (dy - 0.6) * k, 3.6 * k, 1.6 * k, 0, 0, 7); ctx.fill();
  }
  bushCluster(ctx, px, py + 4 * k, 8 * k, rnd, k);
}

function gardenArt(ctx, x, y, S, k, rnd) {
  // a walled kitchen garden: low hedge, rows of flowers and vegetables, a tree in one corner
  const w = 0.27 * S, h = 0.18 * S;
  ctx.save();
  ctx.translate(x * S, y * S);
  ctx.rotate(-0.06);
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(30,40,10,0.45)';
  ctx.fillRect(-w / 2 + 3 * k, -h / 2 + 4 * k, w, h); ctx.restore();
  // hedge border
  ctx.fillStyle = '#3f5a26'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#56763a'; ctx.fillRect(-w / 2 + 1.2 * k, -h / 2 + 1.2 * k, w - 2.4 * k, h - 2.4 * k);
  // soil
  const iw = w - 8 * k, ih = h - 8 * k;
  ctx.fillStyle = '#8d6a44'; ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
  ctx.save(); ctx.beginPath(); ctx.rect(-iw / 2, -ih / 2, iw, ih); ctx.clip();
  const cols = ['#e2483a', '#f5cf3e', '#ef8fbd', '#7d9cf0', '#ffffff', '#b066d8'];
  const rows = 3, per = 6;
  for (let r = 0; r < rows; r++) {
    const ry = -ih / 2 + (r + 0.5) * (ih / rows);
    for (let i = 0; i < per; i++) {
      const px = -iw / 2 + (i + 0.5) * (iw / per) + (rnd() - 0.5) * 1.5 * k;
      ctx.fillStyle = '#4b7a2a'; ctx.beginPath(); ctx.arc(px, ry + 1.2 * k, 4.4 * k, 0, 7); ctx.fill();
      const c = cols[(r * 2 + i) % cols.length];
      for (let a = 0; a < 5; a++) {
        const an = (a / 5) * 6.283 + r;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + Math.cos(an) * 1.9 * k, ry + Math.sin(an) * 1.9 * k, 1.9 * k, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#f7d65a'; ctx.beginPath(); ctx.arc(px, ry, 1.1 * k, 0, 7); ctx.fill();
    }
  }
  // a little path down the middle
  ctx.fillStyle = 'rgba(215,195,150,0.9)'; ctx.fillRect(-1.6 * k, -ih / 2, 3.2 * k, ih);
  ctx.restore();
  ctx.restore();
}

function cottageArt(ctx, x, y, S, k) {
  const w = 0.12 * S, h = 0.1 * S;
  ctx.save(); ctx.filter = `blur(${2 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)'; ctx.fillRect(x * S - w / 2 + 3 * k, y * S - h / 2 + 4 * k, w, h); ctx.restore();
  house(ctx, x * S - w / 2, y * S - h / 2, w, h, mulberry(17), k, ['#b97a4a', '#8a5532']);
}

function villageArt(ctx, v, S, k, rnd) {
  const cx = v.x * S, cy = v.y * S;
  if (v.house) { junctionArt(ctx, S, k, cx, cy); return; }
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)';
  ctx.beginPath(); ctx.arc(cx + 3 * k, cy + 4 * k, v.r * S, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#c4ad84'; ctx.beginPath(); ctx.arc(cx, cy, v.r * S, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, v.r * S * 0.92, 0, 7); ctx.clip();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.283 + rnd(), d = rnd() * v.r * 0.55;
    const w = (0.05 + rnd() * 0.02) * S, h = 0.045 * S;
    ctx.save(); ctx.translate(cx + Math.cos(a) * d * S, cy + Math.sin(a) * d * S); ctx.rotate((rnd() - 0.5) * 0.8);
    house(ctx, -w / 2, -h / 2, w, h, rnd, k, pick(rnd, ROOFS));
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = '#7a705e'; ctx.lineWidth = 3.5 * k; ctx.beginPath(); ctx.arc(cx, cy, v.r * S, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#b3a88f'; ctx.lineWidth = 1.5 * k; ctx.stroke();
}

function treeClumpArt(ctx, t, S, k, rnd) {
  for (let i = 0; i < 4; i++) tree(ctx, (t.x + (rnd() - 0.5) * 0.08) * S, (t.y + (rnd() - 0.5) * 0.07) * S, (9 + rnd() * 4) * k, rnd, k);
}

function volcanoArt(ctx, x, y, S, k, rnd) {
  const cx = x * S, cy = y * S, w = 0.17 * S, h = 0.16 * S;
  ctx.save(); ctx.filter = `blur(${4 * k}px)`; ctx.fillStyle = 'rgba(30,20,10,0.5)';
  ctx.beginPath(); ctx.ellipse(cx + 5 * k, cy + h * 0.55, w * 1.15, h * 0.4, 0, 0, 7); ctx.fill(); ctx.restore();
  // cone
  const cone = new Path2D();
  cone.moveTo(cx - w, cy + h * 0.55); cone.quadraticCurveTo(cx - w * 0.45, cy - h * 0.1, cx - w * 0.28, cy - h * 0.55);
  cone.lineTo(cx + w * 0.28, cy - h * 0.55); cone.quadraticCurveTo(cx + w * 0.45, cy - h * 0.1, cx + w, cy + h * 0.55); cone.closePath();
  const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, '#7a6a58'); g.addColorStop(0.45, '#5e5144'); g.addColorStop(1, '#3d342c');
  ctx.fillStyle = g; ctx.fill(cone);
  ctx.save(); ctx.clip(cone);
  // lava streams
  ctx.strokeStyle = '#e8562a'; ctx.lineWidth = 2.4 * k; ctx.lineCap = 'round';
  for (const dx of [-0.12, 0.05, 0.16]) {
    ctx.beginPath(); ctx.moveTo(cx + dx * w * 0.8, cy - h * 0.5);
    ctx.quadraticCurveTo(cx + dx * w * 2.5, cy, cx + dx * w * 3.4, cy + h * 0.55); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,200,80,0.8)'; ctx.lineWidth = 1 * k;
  for (const dx of [-0.12, 0.05, 0.16]) {
    ctx.beginPath(); ctx.moveTo(cx + dx * w * 0.8, cy - h * 0.5);
    ctx.quadraticCurveTo(cx + dx * w * 2.5, cy, cx + dx * w * 3.4, cy + h * 0.55); ctx.stroke();
  }
  ctx.restore();
  // glowing crater and smoke
  const cg = ctx.createRadialGradient(cx, cy - h * 0.55, 1, cx, cy - h * 0.55, w * 0.32);
  cg.addColorStop(0, '#ffe08a'); cg.addColorStop(0.5, '#f0752e'); cg.addColorStop(1, '#8a2a12');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.55, w * 0.3, h * 0.12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(90,85,80,0.55)';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + (rnd() - 0.3) * 6 * k + i * 3 * k, cy - h * 0.75 - i * 6 * k, (4 + i * 1.6) * k, 0, 7); ctx.fill(); }
}

function dragonSymbolArt(ctx, x, y, S, k) {
  // small red dragon emblem in a round cartouche
  const r = 0.08 * S;
  ctx.save(); ctx.translate(x * S, y * S);
  ctx.save(); ctx.shadowColor = 'rgba(20,10,0,0.45)'; ctx.shadowBlur = 4 * k; ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#8a2a1a'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.stroke();
  ctx.scale(r / 10, r / 10);
  ctx.fillStyle = '#b3261c';
  // body, wings, tail
  ctx.beginPath(); ctx.ellipse(0, 1.5, 4.2, 2.2, -0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3.5, -2.5); ctx.lineTo(-2.2, -6.5); ctx.lineTo(0.5, -1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(4, -6.5); ctx.lineTo(4.4, -2.6); ctx.lineTo(7, -4.5); ctx.lineTo(3, 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3.5, 1); ctx.quadraticCurveTo(6.5, -0.5, 7.2, -2.8); ctx.lineTo(6.2, -2.9); ctx.quadraticCurveTo(5.6, -1.4, 3.2, 2.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3.8, 2); ctx.quadraticCurveTo(-7, 3.5, -6.5, 6.5); ctx.lineTo(-5.8, 5.8); ctx.quadraticCurveTo(-5.6, 4, -3, 3.2); ctx.fill();
  ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(6.6, -3.1, 0.5, 0, 7); ctx.fill();
  ctx.restore();
}

function portalArt(ctx, x, y, S, k) {
  const cx = x * S, cy = y * S, w = 0.14 * S, h = 0.19 * S;
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)';
  ctx.beginPath(); ctx.ellipse(cx + 3 * k, cy + h * 0.5, w * 0.9, h * 0.18, 0, 0, 7); ctx.fill(); ctx.restore();
  // glowing magic doorway inside a stone arch
  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, w);
  glow.addColorStop(0, 'rgba(230,250,255,0.95)'); glow.addColorStop(0.5, 'rgba(120,190,255,0.85)'); glow.addColorStop(1, 'rgba(90,60,200,0.2)');
  const arch = new Path2D();
  arch.moveTo(cx - w * 0.38, cy + h * 0.45); arch.lineTo(cx - w * 0.38, cy - h * 0.05);
  arch.arc(cx, cy - h * 0.05, w * 0.38, Math.PI, 0); arch.lineTo(cx + w * 0.38, cy + h * 0.45); arch.closePath();
  ctx.fillStyle = glow; ctx.fill(arch);
  ctx.strokeStyle = '#8c8574'; ctx.lineWidth = 5 * k; ctx.stroke(arch);
  ctx.strokeStyle = '#c9c1aa'; ctx.lineWidth = 2 * k; ctx.stroke(arch);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.55, cy - h * 0.1 + Math.sin(a) * h * 0.45, 1.2 * k, 0, 7); ctx.fill(); }
}

function princessArt(ctx, x, y, S, k) {
  // a small framed portrait of the princess
  const w = 0.13 * S, h = 0.17 * S;
  ctx.save(); ctx.translate(x * S, y * S);
  ctx.save(); ctx.shadowColor = 'rgba(20,10,0,0.45)'; ctx.shadowBlur = 4 * k; ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = '#d9b860'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 2 * k, h / 2 - 2 * k, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 2 * k, h / 2 - 2 * k, 0, 0, 7); ctx.clip();
  ctx.fillStyle = '#d65c8e'; ctx.beginPath(); ctx.moveTo(-w * 0.45, h * 0.5); ctx.quadraticCurveTo(0, h * 0.02, w * 0.45, h * 0.5); ctx.fill(); // dress
  ctx.fillStyle = '#f2cfae'; ctx.beginPath(); ctx.arc(0, -h * 0.08, w * 0.17, 0, 7); ctx.fill();          // face
  ctx.fillStyle = '#a56a2a'; ctx.beginPath(); ctx.arc(0, -h * 0.13, w * 0.19, Math.PI, 0); ctx.fill();    // hair
  ctx.fillRect(-w * 0.19, -h * 0.13, w * 0.07, h * 0.2); ctx.fillRect(w * 0.12, -h * 0.13, w * 0.07, h * 0.2);
  ctx.fillStyle = '#f2c94c';                                                                         // crown
  ctx.beginPath(); ctx.moveTo(-w * 0.14, -h * 0.24); ctx.lineTo(-w * 0.14, -h * 0.33); ctx.lineTo(-w * 0.07, -h * 0.27); ctx.lineTo(0, -h * 0.36); ctx.lineTo(w * 0.07, -h * 0.27); ctx.lineTo(w * 0.14, -h * 0.33); ctx.lineTo(w * 0.14, -h * 0.24); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function goodsArt(ctx, kind, x, y, S, k) {
  // white house-shaped plaque with the trade good on it
  const w = 0.14 * S, h = 0.155 * S;
  ctx.save(); ctx.translate(x * S, y * S);
  const plaque = new Path2D();
  plaque.moveTo(-w / 2, -h * 0.15); plaque.lineTo(0, -h / 2); plaque.lineTo(w / 2, -h * 0.15); plaque.lineTo(w / 2, h / 2); plaque.lineTo(-w / 2, h / 2); plaque.closePath();
  ctx.save(); ctx.shadowColor = 'rgba(20,10,0,0.45)'; ctx.shadowBlur = 4 * k; ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = '#f6f1e4'; ctx.fill(plaque); ctx.restore();
  ctx.strokeStyle = 'rgba(80,60,40,0.55)'; ctx.lineWidth = 1 * k; ctx.stroke(plaque);
  ctx.translate(0, h * 0.1);
  if (kind === 'wine') {
    ctx.fillStyle = '#8a5a2e'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.26, h * 0.27, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 1.4 * k;
    for (const dy of [-0.13, 0.13]) { ctx.beginPath(); ctx.moveTo(-w * 0.25, dy * h); ctx.lineTo(w * 0.25, dy * h); ctx.stroke(); }
    ctx.fillStyle = '#6a1e2a'; ctx.beginPath(); ctx.arc(0, 0, 1.6 * k, 0, 7); ctx.fill();
  } else if (kind === 'grain') {
    ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 1.4 * k; ctx.lineCap = 'round';
    for (const a of [-0.35, -0.12, 0.12, 0.35]) { ctx.beginPath(); ctx.moveTo(0, h * 0.3); ctx.lineTo(Math.sin(a) * h * 0.4, -h * 0.25); ctx.stroke(); }
    ctx.fillStyle = '#e8b93a';
    for (const a of [-0.35, -0.12, 0.12, 0.35]) { ctx.beginPath(); ctx.ellipse(Math.sin(a) * h * 0.4, -h * 0.25, 2 * k, 4 * k, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#9a6a1e'; ctx.fillRect(-w * 0.18, h * 0.05, w * 0.36, h * 0.07);
  } else {
    ctx.fillStyle = '#b5332a'; ctx.fillRect(-w * 0.3, -h * 0.18, w * 0.6, h * 0.36);
    ctx.fillStyle = '#d9574a'; ctx.fillRect(-w * 0.3, -h * 0.18, w * 0.6, h * 0.1);
    ctx.fillStyle = '#7d1f18'; ctx.beginPath(); ctx.ellipse(w * 0.3, 0, w * 0.06, h * 0.18, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// The Tower: a square stone foundation (as on the 3rd-edition tiles).
function foundationArt(ctx, x, y, S, k) {
  const cx = x * S, cy = y * S, a = 0.105 * S; // half the side
  ctx.save(); ctx.filter = `blur(${3 * k}px)`; ctx.fillStyle = 'rgba(30,25,10,0.45)';
  ctx.fillRect(cx - a + 3 * k, cy - a + 5 * k, 2 * a, 2 * a); ctx.restore();
  // its stone sides, seen a little from the south, then the top
  ctx.fillStyle = '#6a6153'; ctx.fillRect(cx - a, cy - a + 4 * k, 2 * a, 2 * a);
  const g = ctx.createLinearGradient(cx - a, cy - a, cx + a, cy + a);
  g.addColorStop(0, '#d4cbb4'); g.addColorStop(1, '#8f8673');
  ctx.fillStyle = g; ctx.fillRect(cx - a, cy - a, 2 * a, 2 * a);
  // squared stones laid in courses
  ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1.1 * k;
  const rows = 4, cols = 3;
  ctx.beginPath();
  for (let i = 0; i < rows; i++) {
    const y0 = cy - a + (i * 2 * a) / rows, y1 = y0 + (2 * a) / rows;
    if (i) { ctx.moveTo(cx - a, y0); ctx.lineTo(cx + a, y0); }
    for (let j = 1; j <= cols; j++) {
      const xx = cx - a + ((j - (i % 2 ? 0.5 : 0)) * 2 * a) / cols;
      if (xx > cx - a + 2 * k && xx < cx + a - 2 * k) { ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); }
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,32,24,0.7)'; ctx.lineWidth = 1.4 * k; ctx.strokeRect(cx - a, cy - a, 2 * a, 2 * a);
  ctx.strokeStyle = 'rgba(240,232,210,0.5)'; ctx.lineWidth = 1.2 * k;
  ctx.beginPath(); ctx.moveTo(cx - a + k, cy + a - k); ctx.lineTo(cx - a + k, cy - a + k); ctx.lineTo(cx + a - k, cy - a + k); ctx.stroke();
}

// Find a spot inside feature fi for a symbol, preferring a target point and
// keeping clear of the meeple spot and other symbols.
function symbolSpot(label, fi, prefer, avoid, margin = 0.1) {
  let best = null, bestScore = -1e9;
  for (let i = 0; i < label.length; i += 1) {
    if (label[i] !== fi) continue;
    const x = (i % HIT + 0.5) / HIT, y = (((i / HIT) | 0) + 0.5) / HIT;
    if (x < margin || y < margin || x > 1 - margin || y > 1 - margin) continue;
    let clear = 1;
    for (const [ax, ay, r] of avoid) if (Math.hypot(x - ax, y - ay) < r) clear = 0;
    const score = (clear ? 0 : -10) - Math.hypot(x - prefer[0], y - prefer[1]);
    if (score > bestScore) { bestScore = score; best = [x, y]; }
  }
  return best;
}

// ---------- public API ----------
const cache = new Map();

export function getTileArt(id) {
  if (cache.has(id)) return cache.get(id);
  const S = ART_SIZE, k = S / 384;
  const lay = layoutOf(id);
  const { label, problems } = buildHitMap(id, lay);
  const anchors = computeAnchors(id, lay, label);
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const rnd = mulberry(hashStr('carc' + id));
  // spots that trees and symbols keep clear of
  const busy = [...anchors];
  for (const p of [lay.portal, lay.dragon, lay.house, lay.volcano, lay.foundation, lay.bazaar, lay.farmhouse, lay.highwaymen, lay.shrub]) if (p) busy.push(p);
  for (const [x, y, lx, ly] of lay.inns) busy.push([x, y], [lx, ly]);
  paintGrass(ctx, S, rnd);
  paintFarmPatches(ctx, S, rnd, label, id);
  paintFieldDecor(ctx, S, rnd, label, busy, id);
  paintRivers(ctx, S, rnd, lay);
  paintRoads(ctx, S, rnd, lay, 'under');
  paintStubs(ctx, S, rnd, lay);
  if (lay.volcano) volcanoArt(ctx, lay.volcano[0], lay.volcano[1], S, k, rnd);
  if (lay.village) villageArt(ctx, lay.village, S, k, rnd);
  if (lay.trees) treeClumpArt(ctx, lay.trees, S, k, rnd);
  if (lay.house) cottageArt(ctx, lay.house[0], lay.house[1], S, k);
  for (const [x, y, lx, ly] of lay.inns) innArt(ctx, x, y, lx, ly, S, k, rnd);
  if (lay.farmhouse) farmhouseArt(ctx, lay.farmhouse[0], lay.farmhouse[1], S, k, rnd);
  if (lay.highwaymen) highwaymenArt(ctx, lay.highwaymen[0], lay.highwaymen[1], S, k, rnd);
  if (lay.shrub) bushCluster(ctx, lay.shrub[0] * S, lay.shrub[1] * S, 7 * k, rnd, k);
  paintCities(ctx, S, rnd, lay, label);
  paintRoads(ctx, S, rnd, lay, 'over');
  if (lay.bazaar) bazaarArt(ctx, lay.bazaar[0], lay.bazaar[1], lay.bazaar[2], S, k, rnd);
  if (lay.gate) gateArt(ctx, [lay.gate[0], lay.gate[1]], lay.gate[2], S, k);
  if (lay.monastery) {
    const m = lay.monastery;
    ctx.save(); ctx.translate(m.x * S, m.y * S); ctx.scale(1.55 * m.s, 1.55 * m.s); ctx.translate(-S / 2, -S / 2);
    monasteryArt(ctx, S, rnd, k);
    ctx.restore();
  }
  if (lay.garden && !lay.garden.auto) gardenArt(ctx, lay.garden.x, lay.garden.y, S, k, rnd);
  if (lay.foundation) foundationArt(ctx, lay.foundation[0], lay.foundation[1], S, k);
  // symbols: keep them off the meeple spots and off each other
  const symbols = [];
  const avoid = anchors.map(([x, y]) => [x, y, 0.13]);
  const place = (fi, prefer, r = 0.14) => {
    const at = fi >= 0 ? symbolSpot(label, fi, prefer, avoid) : prefer;
    if (at) avoid.push([at[0], at[1], r]);
    return at;
  };
  for (const cty of lay.cities) {
    if (cty.pennants) {
      let at = null;
      if (lay.pennant) at = place(cty.fi, lay.pennant);
      else {
        // away from where meeples stand, a little towards the middle of the tile
        const [ax, ay] = anchors[cty.fi];
        let bestD = -1;
        for (let i = 0; i < label.length; i++) {
          if (label[i] !== cty.fi) continue;
          const x = (i % HIT + 0.5) / HIT, y = (((i / HIT) | 0) + 0.5) / HIT;
          if (x < 0.12 || y < 0.12 || x > 0.88 || y > 0.88) continue;
          if (avoid.slice(anchors.length).some(([px, py, r]) => Math.hypot(px - x, py - y) < r)) continue;
          const d = Math.min(Math.hypot(x - ax, y - ay), 0.22) - Math.hypot(x - 0.5, y - 0.5) * 0.3;
          if (d > bestD) { bestD = d; at = [x, y]; }
        }
        if (at) avoid.push([at[0], at[1], 0.14]);
      }
      if (at) symbols.push({ kind: 'shield', x: at[0], y: at[1] });
    }
    if (cty.goods) {
      const at = place(cty.fi, [0.3, 0.2]);
      if (at) symbols.push({ kind: 'goods', goods: cty.goods, x: at[0], y: at[1] });
    }
    if (cty.princess) {
      const at = place(cty.fi, lay.princess || [0.22, 0.2]);
      if (at) symbols.push({ kind: 'princess', x: at[0], y: at[1] });
    }
  }
  const featAt = ([x, y]) => label[Math.min(HIT - 1, Math.floor(y * HIT)) * HIT + Math.min(HIT - 1, Math.floor(x * HIT))];
  if (lay.portal) { const at = place(featAt(lay.portal), lay.portal); symbols.push({ kind: 'portal', x: at[0], y: at[1] }); }
  if (lay.dragon) { const at = place(featAt(lay.dragon), lay.dragon); symbols.push({ kind: 'dragon', x: at[0], y: at[1] }); }
  paintSymbols(ctx, symbols, S);
  finishTile(ctx, S, rnd);
  const art = { canvas: c, anchors, label, problems, lay, symbols };
  cache.set(id, art);
  return art;
}

// The printed symbols of a tile (pennant shields, trade goods, princess, portal, dragon),
// painted at their spots in the tile's own frame; the miniature renderer paints them on its ground.
function paintSymbols(ctx, symbols, S, only = null) {
  const k = S / 384;
  for (const sym of symbols) {
    if (only && !only.includes(sym.kind)) continue;
    if (sym.kind === 'shield') drawShield(ctx, sym.x * S, sym.y * S, 0.125 * S);
    else if (sym.kind === 'goods') goodsArt(ctx, sym.goods, sym.x, sym.y, S, k);
    else if (sym.kind === 'princess') princessArt(ctx, sym.x, sym.y, S, k);
    else if (sym.kind === 'portal') portalArt(ctx, sym.x, sym.y, S, k);
    else if (sym.kind === 'dragon') dragonSymbolArt(ctx, sym.x, sym.y, S, k);
  }
}
export function drawTileSymbols(ctx, id, S, only = null) { paintSymbols(ctx, getTileArt(id).symbols, S, only); }
// one symbol centred at (x, y), drawn at the scale of a tile S px wide
export function drawSymbolAt(ctx, sym, x, y, S) {
  ctx.save(); ctx.translate(x - sym.x * S, y - sym.y * S); paintSymbols(ctx, [sym], S); ctx.restore();
}

// A picture of a tile for thumbnails (dock, bazaar cards, rules, galleries), turned r
// quarter turns: the miniature renderer's composite when it has one, else the painted tile.
let thumbProvider = null;
export function setThumbProvider(fn) { thumbProvider = fn; }
const turned = new Map();
export function getTileThumb(id, size = 256, r = 0) {
  const c = thumbProvider?.(id, size, ((r % 4) + 4) % 4);
  if (c) return c;
  const base = getTileArt(id).canvas;
  r = ((r % 4) + 4) % 4;
  if (!r) return base;
  const key = `${id}|${r}`;
  if (!turned.has(key)) {
    const t = canvas(ART_SIZE); const g = t.getContext('2d');
    g.translate(ART_SIZE / 2, ART_SIZE / 2); g.rotate((r * Math.PI) / 2); g.drawImage(base, -ART_SIZE / 2, -ART_SIZE / 2);
    turned.set(key, t);
  }
  return turned.get(key);
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
// The Princess & the Dragon: the big red dragon and the little fairy
const DRAGON_PATH = (() => {
  const p = new Path2D();
  p.ellipse(-0.02, 0.2, 0.32, 0.2, -0.1, 0, Math.PI * 2);                  // body
  p.moveTo(0.16, 0.12); p.bezierCurveTo(0.3, 0.02, 0.3, -0.2, 0.36, -0.3);   // neck
  p.lineTo(0.5, -0.3); p.bezierCurveTo(0.44, -0.18, 0.4, 0.0, 0.3, 0.2); p.closePath();
  p.moveTo(0.3, -0.36); p.bezierCurveTo(0.38, -0.46, 0.5, -0.44, 0.6, -0.36); // head & snout
  p.lineTo(0.58, -0.3); p.bezierCurveTo(0.5, -0.28, 0.38, -0.26, 0.3, -0.3); p.closePath();
  p.moveTo(0.36, -0.42); p.lineTo(0.33, -0.54); p.lineTo(0.43, -0.44); p.closePath(); // horn
  p.moveTo(-0.08, 0.04);                                                       // wing
  p.bezierCurveTo(-0.16, -0.18, -0.3, -0.4, -0.22, -0.56);
  p.bezierCurveTo(-0.08, -0.44, 0.06, -0.42, 0.2, -0.46);
  p.bezierCurveTo(0.14, -0.36, 0.14, -0.3, 0.16, -0.24);
  p.bezierCurveTo(0.08, -0.22, 0.02, -0.18, 0.02, -0.12);
  p.bezierCurveTo(-0.02, -0.08, -0.04, -0.02, -0.08, 0.04); p.closePath();
  p.moveTo(-0.3, 0.26); p.bezierCurveTo(-0.46, 0.3, -0.56, 0.4, -0.5, 0.52); // tail
  p.lineTo(-0.42, 0.46); p.bezierCurveTo(-0.44, 0.38, -0.38, 0.34, -0.26, 0.34); p.closePath();
  p.rect(-0.2, 0.3, 0.1, 0.2); p.rect(0.1, 0.3, 0.1, 0.2);                 // legs
  return p;
})();
const FAIRY_PATH = (() => {
  const p = new Path2D();
  p.ellipse(-0.2, -0.12, 0.17, 0.24, -0.5, 0, Math.PI * 2);   // wings
  p.moveTo(0.37, -0.12); p.ellipse(0.2, -0.12, 0.17, 0.24, 0.5, 0, Math.PI * 2);
  p.moveTo(0.11, -0.33); p.arc(0, -0.33, 0.11, 0, Math.PI * 2); // head
  p.moveTo(0, -0.2); p.bezierCurveTo(0.12, -0.18, 0.14, 0.0, 0.24, 0.5); // dress
  p.lineTo(-0.24, 0.5); p.bezierCurveTo(-0.14, 0.0, -0.12, -0.18, 0, -0.2); p.closePath();
  return p;
})();
const SHAPES = { meeple: MEEPLE_PATH, abbot: ABBOT_PATH, pig: PIG_PATH, dragon: DRAGON_PATH, fairy: FAIRY_PATH };
export const DRAGON_COLOR = { main: '#b3261c', dark: '#5e110b', light: '#ef7a5c' };
export const FAIRY_COLOR = { main: '#8fb7e0', dark: '#3f6390', light: '#e6f3ff' };

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
  if (kind === 'dragon') { sx = sy = 1.45; }
  if (kind === 'fairy') { sx = sy = 0.72; }
  if (kind === 'fairy' && !opts.ghost) {
    // a soft magic glow around the fairy
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
    g.addColorStop(0, 'rgba(230,245,255,0.55)'); g.addColorStop(1, 'rgba(230,245,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, 7); ctx.fill();
  }
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
  if (kind === 'dragon' && !opts.ghost) {
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(0.46, -0.37, 0.025, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// Bridges, Castles & Bazaars: a stone bridge carrying a road straight across a
// tile, from one edge to the opposite one (axis 0 = up–down on screen, 1 = across),
// seen from above like the tiles; (cx, cy) is the tile's centre.
export function drawBridge(ctx, cx, cy, size, axis, opts = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  if (axis === 0) ctx.rotate(Math.PI / 2);
  ctx.globalAlpha = opts.alpha ?? 1;
  const L = size / 2, w = size * 0.085, wall = size * 0.028;
  // shadow on the meadow below
  ctx.save();
  ctx.filter = `blur(${Math.max(1, size * 0.02)}px)`;
  ctx.fillStyle = 'rgba(25,30,10,0.45)';
  ctx.fillRect(-L * 0.86, -w - wall + size * 0.035, L * 1.72, 2 * (w + wall));
  ctx.restore();
  // stone abutments where it meets the ground at each end
  for (const e of [-1, 1]) {
    const g = ctx.createLinearGradient(0, -w * 1.8, 0, w * 1.8);
    g.addColorStop(0, '#b9ad94'); g.addColorStop(1, '#7d725f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(e * L, -w - wall * 1.9); ctx.lineTo(e * (L - size * 0.11), -w - wall); ctx.lineTo(e * (L - size * 0.11), w + wall); ctx.lineTo(e * L, w + wall * 1.9);
    ctx.closePath(); ctx.fill();
  }
  // the roadway
  const deck = ctx.createLinearGradient(0, -w, 0, w);
  deck.addColorStop(0, '#d9c49a'); deck.addColorStop(0.5, '#e8d6ae'); deck.addColorStop(1, '#c4ad80');
  ctx.fillStyle = deck;
  ctx.fillRect(-L, -w, 2 * L, 2 * w);
  ctx.strokeStyle = 'rgba(120,95,60,0.35)'; ctx.lineWidth = Math.max(0.6, size * 0.006);
  for (let x = -L + size * 0.05; x < L; x += size * 0.055) { ctx.beginPath(); ctx.moveTo(x, -w); ctx.lineTo(x + size * 0.01, w); ctx.stroke(); }
  // parapets, bowing out a little over the arch
  for (const e of [-1, 1]) {
    const g = ctx.createLinearGradient(0, e * w, 0, e * (w + wall));
    g.addColorStop(0, '#e2d8c2'); g.addColorStop(1, '#9a8f7a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-L, e * w);
    ctx.quadraticCurveTo(0, e * (w + wall * 0.6), L, e * w);
    ctx.lineTo(L, e * (w + wall));
    ctx.quadraticCurveTo(0, e * (w + wall * 2.2), -L, e * (w + wall));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,38,0.6)'; ctx.lineWidth = Math.max(0.7, size * 0.007); ctx.stroke();
  }
  ctx.restore();
}

// Bridges, Castles & Bazaars: a little wooden castle standing at (x, y) (its base).
export function drawCastle(ctx, x, y, size, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opts.alpha ?? 1;
  const w = size * 0.5, h = size * 0.2, tw = size * 0.13, th = size * 0.3;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = size * 0.06; ctx.shadowOffsetX = size * 0.025; ctx.shadowOffsetY = size * 0.03;
  ctx.fillStyle = '#8a6a3c';
  ctx.fillRect(-w / 2, -h, w, h);
  ctx.restore();
  const wood = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#e8c98f'); g.addColorStop(0.55, '#cfa565'); g.addColorStop(1, '#9c7440');
    return g;
  };
  const edge = Math.max(0.8, size * 0.008);
  // curtain wall with battlements and a gate
  ctx.fillStyle = wood(-w / 2, w / 2);
  ctx.fillRect(-w / 2, -h, w, h);
  for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + tw + i * ((w - 2 * tw) / 4) + size * 0.012, -h - size * 0.04, (w - 2 * tw) / 8, size * 0.04);
  ctx.fillStyle = 'rgba(60,38,16,0.8)';
  ctx.beginPath(); ctx.moveTo(-size * 0.045, 0); ctx.lineTo(-size * 0.045, -h * 0.55); ctx.arc(0, -h * 0.55, size * 0.045, Math.PI, 0); ctx.lineTo(size * 0.045, 0); ctx.closePath(); ctx.fill();
  // two corner towers
  for (const e of [-1, 1]) {
    const x0 = e < 0 ? -w / 2 : w / 2 - tw;
    ctx.fillStyle = wood(x0, x0 + tw);
    ctx.fillRect(x0, -th, tw, th);
    for (let i = 0; i < 3; i++) if (i !== 1) ctx.fillRect(x0 + i * tw / 3, -th - size * 0.045, tw / 3, size * 0.045);
    ctx.fillStyle = 'rgba(60,38,16,0.75)';
    ctx.fillRect(x0 + tw * 0.4, -th * 0.7, tw * 0.2, th * 0.18);
    ctx.strokeStyle = 'rgba(70,45,20,0.6)'; ctx.lineWidth = edge;
    ctx.strokeRect(x0, -th, tw, th);
  }
  ctx.strokeStyle = 'rgba(70,45,20,0.6)'; ctx.lineWidth = edge;
  ctx.strokeRect(-w / 2 + tw, -h, w - 2 * tw, h);
  ctx.restore();
  return y - th - size * 0.045; // top of the towers
}

// The Tower: a stack of h wooden tower floors standing at (x, y) (its base);
// returns the screen y of the top of the stack.
export function drawTower(ctx, x, y, size, h, opts = {}) {
  const w = size * 0.24, fh = opts.fh ?? size * 0.075;
  const shown = Math.min(h, 7);
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = size * 0.08; ctx.shadowOffsetX = size * 0.03; ctx.shadowOffsetY = size * 0.04;
  ctx.fillStyle = '#6f6555';
  ctx.fillRect(x - w / 2, y - shown * fh, w, shown * fh);
  ctx.restore();
  for (let i = 0; i < shown; i++) {
    const top = y - (i + 1) * fh;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#e9dfc7'); g.addColorStop(0.55, '#cfc2a3'); g.addColorStop(1, '#9d9077');
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, fh - Math.max(1, size * 0.006));
    ctx.fillStyle = 'rgba(60,45,30,0.35)'; ctx.fillRect(x - w / 2, top + fh - Math.max(1, size * 0.008), w, Math.max(1, size * 0.008));
    ctx.fillStyle = 'rgba(50,40,30,0.55)'; ctx.fillRect(x - w * 0.06, top + fh * 0.3, w * 0.12, fh * 0.45);
  }
  // crenellations on the top floor
  const top = y - shown * fh;
  ctx.fillStyle = '#ddd1b5';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - w / 2 + i * w * 0.4, top - fh * 0.45, w * 0.2, fh * 0.45);
  if (opts.badge) drawTowerBadge(ctx, x, y, size, h, fh);
  ctx.restore();
  return top - fh * 0.45;
}

// The tower's height, on a dark disc beside its upper floors (clear of a figure on top).
export function drawTowerBadge(ctx, x, y, size, h, fh = size * 0.075, color = '#ffe7a6') {
  const w = size * 0.24;
  const r = Math.max(size * 0.075, 7);
  const bx = x + w * 0.5 + r * 0.8;
  const by = Math.min(y - r, y - Math.min(h, 7) * fh + r * 1.2);
  ctx.save();
  ctx.fillStyle = 'rgba(30,18,8,0.88)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();
  ctx.fillStyle = color; ctx.font = `900 ${Math.round(r * 1.3)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(h), bx, by + r * 0.05);
  ctx.restore();
}

// ---------- tile back & table ----------
// The back of a tile: green, or blue with a stream for The River's tiles (they are kept
// apart from the others and come first).
// Photographed table and tile backs (public/assets/ui); the painted ones stand in until
// they load, or if they never do. On arrival the cached canvases are dropped and a window
// 'ui-art-ready' event lets the board and the deck pile repaint.
const uiArt = {};
if (typeof Image !== 'undefined' && typeof window !== 'undefined') {
  for (const [key, file] of [['table', 'table.webp'], ['back:base', 'tile-back-base.webp'], ['back:river', 'tile-back-river.webp']]) {
    const img = new Image();
    img.onload = () => {
      uiArt[key] = img;
      cache.delete(key === 'table' ? '_table' : `_${key}`);
      window.dispatchEvent(new Event('ui-art-ready'));
    };
    img.src = new URL(`../assets/ui/${file}`, import.meta.url).href;
  }
}
// planks of the photographed table are drawn at this scale to match the painted ones
export const tableScale = () => (uiArt.table ? 512 / uiArt.table.width : 1);

export function getTileBack(kind = 'base') {
  const id = `_back:${kind}`;
  if (cache.has(id)) return cache.get(id);
  const photo = uiArt[`back:${kind}`];
  if (photo) {
    const c = canvas(256); c.getContext('2d').drawImage(photo, 0, 0, 256, 256);
    cache.set(id, c);
    return c;
  }
  const river = kind === 'river';
  const S = 256; const c = canvas(S); const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, river ? '#4f7f9a' : '#5a7d3a'); g.addColorStop(1, river ? '#22465c' : '#2e4a1c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const rnd = mulberry(11);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; ctx.fillRect(rnd() * S, rnd() * S, 2, 2); }
  ctx.strokeStyle = 'rgba(240,220,160,0.5)'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, S - 28, S - 28);
  if (river) {
    ctx.strokeStyle = 'rgba(200,232,250,0.45)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const y of [60, 196]) {
      ctx.beginPath(); ctx.moveTo(44, y);
      for (let x = 44; x <= 212; x += 4) ctx.lineTo(x, y + Math.sin((x - 44) / 14) * 7);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#f2dc9a'; ctx.font = 'bold 150px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillText('C', S / 2, S / 2 + 8);
  cache.set(id, c);
  return c;
}

export function getTableTexture() {
  if (cache.has('_table')) return cache.get('_table');
  if (uiArt.table) {
    const t = canvas(uiArt.table.width, uiArt.table.height); t.getContext('2d').drawImage(uiArt.table, 0, 0);
    cache.set('_table', t);
    return t;
  }
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
