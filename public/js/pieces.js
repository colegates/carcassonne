// Photographed game pieces: painted wooden meeples (big meeple, abbot, builder, pig, the
// farmer lying down) tinted per player colour, the castle token and bridges
// (public/assets/pieces, built by dev/pieces/build.py) and the resin dragon, fairy and tower
// drums from the miniatures (public/assets/minis/sprites).
//
// The wooden pieces are photographed once in pale ivory and stored as grey luminance; a
// colour ramp per player (shadow → paint → highlight) maps that luminance to the colour,
// so the grain, the rounded edges and the soft upper-left light survive. Tinted copies are
// cached per piece, colour and size bucket (stepped down for clean small icons).
//
// Everything is optional: until an image has loaded (or if it never does) the drawing
// functions return false and art.js draws its procedural pieces. A window 'pieces-ready'
// event fires whenever more pieces become drawable.

const BASE = new URL('../assets/pieces/', import.meta.url).href;
const MINIS = new URL('../assets/minis/sprites/', import.meta.url).href;
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('pieces') === 'off';

// Miniature sprites used as pieces: [file]
const MINI = {
  dragon_up: ['dragon_wings_up.webp'], dragon_down: ['dragon_wings_down.webp'], fairy: ['fairy.webp'],
  tower_floor: ['tower_floor.webp'], tower_top: ['tower_top.webp'],
};

const imgs = new Map(); // id -> { img, info }
let manifest = null;
let started = false;
let notify = 0;
function ready() {
  if (notify || typeof window === 'undefined') return;
  notify = setTimeout(() => { notify = 0; window.dispatchEvent(new Event('pieces-ready')); }, 20);
}
function load(id, url, info) {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { imgs.set(id, { img, info }); ready(); };
  img.src = url;
}
export function loadPieces() {
  if (started || OFF || typeof Image === 'undefined') return;
  started = true;
  for (const [id, [file]] of Object.entries(MINI)) load(id, MINIS + file, null);
  fetch(BASE + 'manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => {
    if (!m?.pieces) return;
    manifest = m;
    for (const [id, info] of Object.entries(m.pieces)) load(id, BASE + info.file, info);
  }).catch(() => {});
}
loadPieces();
export const hasPiece = (id) => imgs.has(id);

// ---------- colours ----------
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// shadow, paint, highlight: tuned so the six colours stay apart (black keeps grey
// highlights, yellow stays golden rather than ochre, pink stays clearly not red)
const RAMPS = {
  '#b8342c': ['#4a0f0b', '#b5291f', '#f0806a'], // red
  '#2d5aa0': ['#0d2050', '#2556a6', '#8db6f0'], // blue
  '#3f7d3a': ['#123612', '#367d31', '#9dd98e'], // green
  '#d9a72a': ['#6e4806', '#e2aa1c', '#fff0a6'], // yellow
  '#2b2b2b': ['#070708', '#26262a', '#9a9aa6'], // black
  '#c4568f': ['#5a1640', '#d2589d', '#ffc0e0'], // pink
};
function rampOf(color) {
  const r = RAMPS[color.main];
  if (r) return r.map(hex);
  const m = hex(color.main);
  return [mixRGB(m, hex(color.dark || '#000000'), 0.6), m, mixRGB(m, hex(color.light || '#ffffff'), 0.6)];
}

// ---------- tinted, sized copies ----------
const BUCKETS = [20, 28, 40, 56, 80, 112, 160, 224, 320, 448, 640, 900, 1280];
const tintCache = new Map(); // id|colour|bucket -> canvas (oldest dropped past CACHE_MAX)
const CACHE_MAX = 140;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
// grey -> colour lookup table: shadow at the photo's dark end (lo), paint up to 72 %,
// highlight at the bright end (hi), glints beyond
const luts = new Map();
function lutOf(color, lum) {
  const key = `${color.main}|${lum}`;
  let lut = luts.get(key);
  if (lut) return lut;
  const [s, m, h] = rampOf(color);
  const [lo, hi] = lum || [0.55, 0.9];
  const span = Math.max(0.05, hi - lo);
  lut = new Uint8ClampedArray(256 * 3);
  for (let g = 0; g < 256; g++) {
    const t = (g / 255 - lo) / span;
    let col;
    if (t < 0) col = mixRGB(s, [0, 0, 0], Math.min(0.5, -t * 0.8));
    else if (t < 0.72) col = mixRGB(s, m, Math.pow(t / 0.72, 0.8));
    else if (t <= 1) col = mixRGB(m, h, ((t - 0.72) / 0.28) * 0.55);
    else col = mixRGB(mixRGB(m, h, 0.55), h, Math.min(1, (t - 1) * 3));
    lut[g * 3] = col[0]; lut[g * 3 + 1] = col[1]; lut[g * 3 + 2] = col[2];
  }
  luts.set(key, lut);
  return lut;
}
function tintInPlace(canvas, lut) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const g = px[i] * 3;
    px[i] = lut[g]; px[i + 1] = lut[g + 1]; px[i + 2] = lut[g + 2];
  }
  ctx.putImageData(data, 0, 0);
}
const GHOST = { main: '#ffffff', dark: '#b0b0b0', light: '#ffffff' };

// The piece `id` in `color` (null: untinted) about `px` device pixels tall, with a faint
// dark rim so it reads against busy ground; cached per size bucket.
function sized(id, color, px) {
  const rec = imgs.get(id);
  // (never above the photo's own size: drawing scales it up from there)
  const b = Math.min(BUCKETS.find((v) => v >= px) || BUCKETS[BUCKETS.length - 1], rec.img.naturalHeight);
  const key = `${id}|${color ? color.main : '-'}|${b}`;
  let c = tintCache.get(key);
  if (c) return c;
  let src = rec.img;
  let w = src.naturalWidth, h = src.naturalHeight;
  // step down by halves for a clean small copy
  while (b < h / 2 && h > 8) {
    const half = makeCanvas(w / 2, h / 2);
    const hc = half.getContext('2d');
    hc.imageSmoothingQuality = 'high';
    hc.drawImage(src, 0, 0, half.width, half.height);
    src = half; w = half.width; h = half.height;
  }
  const pad = Math.ceil(b * 0.04) + 1;
  const tw = Math.round(w * (b / h)), th = b;
  if (color) {
    // tint the grey picture at this size (cheap, and no full-size copies kept)
    const t = makeCanvas(tw, th);
    const tc = t.getContext('2d', { willReadFrequently: true });
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(src, 0, 0, tw, th);
    tintInPlace(t, lutOf(color, rec.info?.lum));
    src = t; w = tw; h = th;
  }
  c = makeCanvas(tw + 2 * pad, th + 2 * pad);
  const cx = c.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  if (color) {
    // the rim: a slightly grown dark silhouette under the piece
    const sil = makeCanvas(c.width, c.height);
    const sc = sil.getContext('2d');
    sc.drawImage(src, pad, pad, tw, th);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = 'rgb(20,12,6)'; sc.fillRect(0, 0, sil.width, sil.height);
    const r = Math.max(0.8, b * 0.012);
    cx.globalAlpha = b <= 56 ? 0.75 : 0.45; // (bolder when small: readable zoomed out)
    for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) cx.drawImage(sil, dx, dy);
    cx.globalAlpha = 1;
  }
  cx.drawImage(src, pad, pad, tw, th);
  c.pad = pad; c.tw = tw; c.th = th;
  tintCache.set(key, c);
  if (tintCache.size > CACHE_MAX) tintCache.delete(tintCache.keys().next().value);
  return c;
}
const scaleOf = (ctx) => { const m = ctx.getTransform?.(); return m ? Math.hypot(m.a, m.b) || 1 : 1; };

// Draw image `id` so its trimmed picture fills the box (x0, y0, w, h) in ctx units.
function blit(ctx, id, color, x0, y0, w, h) {
  const c = sized(id, color, h * scaleOf(ctx));
  const k = h / c.th;
  ctx.drawImage(c, x0 - c.pad * k, y0 - c.pad * k, c.width * k, c.height * k);
}

// soft contact shadow on the ground, falling down-right from the upper-left light
function contactShadow(ctx, x, y, rx, ry, alpha = 0.38) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(18,12,4,${alpha})`); g.addColorStop(0.6, `rgba(18,12,4,${alpha * 0.55})`); g.addColorStop(1, 'rgba(18,12,4,0)');
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- the figures ----------
// Height (in units of `size`) and vertical centre offset of each kind, matching the
// procedural silhouettes (centred on (x, y), feet at about y + size / 2).
const FIG = {
  meeple: { id: 'meeple', h: 1.02 },
  large: { id: 'large', h: 1.32 },
  abbot: { id: 'abbot', h: 1.06 },
  builder: { id: 'builder', h: 1.18 },
  pig: { id: 'pig', w: 1.02, dy: 0.08 },
};

// Draw a figure; false when its image is not there (yet).
export function drawPieceImage(ctx, kind, x, y, size, color, opts = {}) {
  if (kind === 'dragon') return drawDragon(ctx, x, y, size, opts);
  if (kind === 'fairy') return drawFairy(ctx, x, y, size, opts);
  const lying = opts.lying && (kind === 'meeple' || kind === 'large');
  const f = FIG[kind] || FIG.meeple;
  const id = lying ? 'meeple_lying' : f.id;
  const rec = imgs.get(id);
  if (!rec) return false;
  const col = opts.ghost ? GHOST : color;
  const ar = rec.img.naturalWidth / rec.img.naturalHeight;
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (lying) {
    const k = kind === 'large' ? 1.3 : 1;
    const w = size * 1.06 * k, h = w / ar;
    contactShadow(ctx, x + size * 0.07, y + h * 0.3, w * 0.55, h * 0.36, 0.42);
    blit(ctx, id, col, x - w / 2, y - h / 2, w, h);
  } else {
    let w, h;
    if (f.w) { w = size * f.w; h = w / ar; } else { h = size * f.h; w = h * ar; }
    // centred on (x, y) like the procedural silhouettes; the pig a little low
    const top = y + size * (f.dy || 0) - h / 2 + h * 0.01;
    const foot = top + h;
    contactShadow(ctx, x + w * 0.12, foot - h * 0.03, w * 0.56, Math.max(size * 0.08, w * 0.17), 0.4);
    blit(ctx, id, col, x - w / 2, top, w, h);
  }
  ctx.restore();
  return true;
}

function drawDragon(ctx, x, y, size, opts) {
  const pose = opts.pose ?? (Math.floor((typeof performance !== 'undefined' ? performance.now() : 0) / 260) % 2 ? 'dragon_up' : 'dragon_down');
  const rec = imgs.get(pose) || imgs.get('dragon_down') || imgs.get('dragon_up');
  if (!rec) return false;
  const id = imgs.get(pose) ? pose : imgs.has('dragon_down') ? 'dragon_down' : 'dragon_up';
  const ar = rec.img.naturalWidth / rec.img.naturalHeight;
  // both poses share a body size: the wings-up picture is the taller one
  const w = size * (id === 'dragon_up' ? 1.38 : 1.45), h = w / ar;
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (!opts.icon) contactShadow(ctx, x + size * 0.16, y + size * 0.5, size * 0.55, size * 0.16, 0.32);
  const cy = id === 'dragon_up' ? y - size * 0.12 : y;
  blit(ctx, id, null, x - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}

function drawFairy(ctx, x, y, size, opts) {
  const rec = imgs.get('fairy');
  if (!rec) return false;
  const ar = rec.img.naturalWidth / rec.img.naturalHeight;
  const h = size * 1.25, w = h * ar;
  const bob = opts.icon ? 0 : Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) / 700) * size * 0.02;
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (!opts.icon) contactShadow(ctx, x + size * 0.08, y + size * 0.52, size * 0.24, size * 0.08, 0.3);
  // a pearly glow around her
  const g = ctx.createRadialGradient(x, y - size * 0.06, 0, x, y - size * 0.06, size * 0.6);
  g.addColorStop(0, 'rgba(235,245,255,0.5)'); g.addColorStop(1, 'rgba(235,245,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - size * 0.06, size * 0.6, 0, 7); ctx.fill();
  blit(ctx, 'fairy', null, x - w / 2, y - h / 2 - size * 0.06 + bob, w, h);
  ctx.restore();
  return true;
}

// ---------- castle, bridges, tower ----------
// The castle token standing at (x, y) (its base); returns the y of the keep's roof (where
// a castellan stands), or null when the image is missing.
export const CASTLE_TOP = 0.5; // keep roof above the base, in units of size
export function drawCastleImage(ctx, x, y, size, opts = {}) {
  const rec = imgs.get('castle');
  if (!rec) return null;
  const ar = rec.img.naturalWidth / rec.img.naturalHeight;
  const h = size * 0.6, w = h * ar; // (the keep's roof is 16 % down the picture)
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  contactShadow(ctx, x + w * 0.1, y - h * 0.08, w * 0.62, h * 0.22, 0.42);
  blit(ctx, 'castle', null, x - w * 0.5, y - h, w, h);
  ctx.restore();
  return y - size * CASTLE_TOP;
}

// A bridge across the tile centred at (cx, cy), axis 0 = up–down, 1 = across.
export function drawBridgeImage(ctx, cx, cy, size, axis, opts = {}) {
  const id = axis === 0 ? 'bridge_along' : 'bridge_across';
  const rec = imgs.get(id);
  if (!rec) return false;
  const ar = rec.img.naturalWidth / rec.img.naturalHeight;
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (axis === 0) {
    const h = size * 1.04, w = h * ar;
    contactShadow(ctx, cx + size * 0.05, cy + size * 0.03, w * 0.75, h * 0.5, 0.3);
    blit(ctx, id, null, cx - w / 2, cy - h / 2, w, h);
  } else {
    const w = size * 1.04, h = w / ar;
    contactShadow(ctx, cx + size * 0.04, cy + size * 0.07, w * 0.5, size * 0.12, 0.34);
    blit(ctx, id, null, cx - w / 2, cy + size * 0.1 - h, w, h);
  }
  ctx.restore();
  return true;
}

// The Tower: h stone drums of height fh (a slice of the photographed floor each) and the
// crenellated top, base at (x, y), w wide. Returns false when the drums are missing.
// Measured on tower_floor.webp: the drum is 410 px across centred on column 210, its base
// ellipse centred on row 430 and 38 px deep. On tower_top.webp the drum is centred on
// column 249 and the crown is cut at row 305 at the front (just under the merlons).
const FLOOR = { cx: 210, w: 410, base: 430, b: 38 };
const CROWN = { cx: 249, cut: 305 };
export function drawTowerImage(ctx, x, y, w, h, fh, opts = {}) {
  const fl = imgs.get('tower_floor'), tp = imgs.get('tower_top');
  if (!fl || !tp) return false;
  const s = w / FLOOR.w, b = FLOOR.b * s;
  const shown = Math.min(h, 7);
  // a sprite drawn at scale s with its source pixel (sx, sy) at (px, py)
  const put = (id, rec, sx, sy, px, py) => {
    const c = sized(id, null, rec.img.naturalHeight * s * scaleOf(ctx));
    const k = (rec.img.naturalHeight * s) / c.th; // canvas px -> ctx units
    const q = c.th / rec.img.naturalHeight; // canvas px per source px
    ctx.drawImage(c, px - (sx * q + c.pad) * k, py - (sy * q + c.pad) * k, c.width * k, c.height * k);
  };
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  contactShadow(ctx, x + w * 0.14, y + b * 0.5, w * 0.72, b * 1.5 + w * 0.06, 0.42);
  for (let i = 0; i < shown; i++) {
    const yb = y - i * fh; // centre of this drum's base ellipse
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w / 2 - 1, yb - fh, w + 2, fh);
    ctx.ellipse(x, yb, w / 2 + 1, b, 0, 0, Math.PI);
    ctx.clip();
    put('tower_floor', fl, FLOOR.cx, FLOOR.base, x, yb);
    // a faint joint where the next drum sits, darkest at the front
    ctx.strokeStyle = 'rgba(30,20,10,0.4)'; ctx.lineWidth = Math.max(0.6, fh * 0.06);
    ctx.beginPath(); ctx.ellipse(x, yb - fh, w / 2, b, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
  }
  // the crenellated crown with its banner, cut along the last drum's rim
  const yt = y - shown * fh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w * 1.5, yt - w * 2, w * 3, w * 2);
  ctx.ellipse(x, yt, w / 2 + 1, b, 0, 0, Math.PI);
  ctx.clip();
  put('tower_top', tp, CROWN.cx, CROWN.cut - FLOOR.b, x, yt);
  ctx.restore();
  ctx.restore();
  return true;
}
