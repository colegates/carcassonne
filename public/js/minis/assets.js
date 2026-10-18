// Miniature assets: the manifest written by the art pipeline (public/assets/minis/manifest.json),
// lazily loaded and decoded sprites and textures, downscaled copies for small draws, soft
// cast-shadow silhouettes, and deterministic pickers. Everything tolerates missing ids: a
// lookup for something not (yet) in the manifest returns null and the caller falls back.
//
// manifest: { version, sprites: { id: { file, w, h, foot: [x, y], kind, sheet, flat?, desc } },
//             textures: { id: { file, small, size } } }

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
// ?minis=off keeps the painted tiles; ?minis=<folder> loads another asset folder (dev)
const OPT = params.get('minis');
export const MINIS_OFF = OPT === 'off';
const BASE = OPT && OPT !== 'off' ? new URL(OPT.endsWith('/') ? OPT : OPT + '/', location.href).href : new URL('../../assets/minis/', import.meta.url).href;

let manifest = null;
let status = 'idle'; // idle | loading | ready | none
const listeners = new Set();
let notifyQueued = false;

// Something new became drawable (the manifest, an image, a downscaled copy).
export function onAssets(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function changed() {
  if (notifyQueued) return;
  notifyQueued = true;
  setTimeout(() => { notifyQueued = false; for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } }, 30);
}
let generation = 0; // bumps whenever the set of available images grows (caches key on it)
export const assetGeneration = () => generation;

export function loadManifest() {
  if (status !== 'idle' || MINIS_OFF) return;
  status = 'loading';
  fetch(BASE + 'manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => {
      if (!m || (!m.sprites && !m.textures)) { status = 'none'; return; }
      manifest = { version: m.version || 0, sprites: m.sprites || {}, textures: m.textures || {} };
      status = 'ready';
      generation++;
      changed();
    })
    .catch(() => { status = 'none'; });
}
export const manifestStatus = () => status;
export const hasSprite = (id) => !!manifest?.sprites[id];
export const hasTexture = (id) => !!manifest?.textures[id];
export const spriteInfo = (id) => manifest?.sprites[id] || null;
export const spriteIds = () => (manifest ? Object.keys(manifest.sprites) : []);

// ---------- image loading ----------
const images = new Map(); // url -> { img, state }
let inflight = 0;
const queue = [];
function pump() {
  while (inflight < 6 && queue.length) {
    const rec = queue.shift();
    inflight++;
    const img = new Image();
    img.decoding = 'async';
    img.src = rec.url;
    const done = (ok) => {
      inflight--;
      rec.state = ok ? 'ready' : 'error';
      if (ok) { rec.img = img; generation++; changed(); }
      pump();
    };
    (img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; })).then(() => done(true), () => done(false));
  }
}
function image(file, priority = false) {
  const url = BASE + file;
  let rec = images.get(url);
  if (!rec) {
    rec = { url, img: null, state: 'queued' };
    images.set(url, rec);
    if (priority) queue.unshift(rec); else queue.push(rec);
    pump();
  }
  return rec.img;
}

// The full sprite image (or null while loading / when missing).
export function spriteImage(id) {
  const m = mips.get(id);
  if (m) return m[0];
  const info = manifest?.sprites[id];
  return info ? image(info.file) : null;
}
// Ask for a set of sprites ahead of time, so they decode while the board is far away.
export function prefetch(ids) { for (const id of ids) spriteImage(id); }

// A texture image: the small copy for small grounds, falling back to whichever is loaded.
export function textureImage(id, small = false) {
  const info = manifest?.textures[id];
  if (!info) return null;
  if (small && info.small) return image(info.small, true) || image(info.file);
  return image(info.file, true) || (info.small ? images.get(BASE + info.small)?.img : null) || null;
}

// ---------- downscaled copies ----------
// Big sprites drawn small shimmer and cost a lot; we keep a chain of halvings, warm-graded
// once, and draw from the smallest copy that is still at least as tall as needed.
const mips = new Map(); // id -> [canvas...] (largest first)
let mipBudget = 0;
export function resetMipBudget(ms) { mipBudget = performance.now() + ms; }
function grade(c) {
  const g = c.getContext('2d');
  // a warm June grade baked into every sprite: soft-light warm glaze, alpha restored
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.07; g.fillStyle = '#ffcf8a'; g.fillRect(0, 0, c.width, c.height);
  g.restore();
}
const MAX_H = 400; // no miniature is ever drawn taller than this many device pixels
function buildMips(id, img) {
  const out = [];
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  let src = img;
  // the first copy: the image itself (graded), no taller than needed
  const k = Math.min(1, MAX_H / h);
  w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  const first = document.createElement('canvas'); first.width = w; first.height = h;
  const fg = first.getContext('2d'); fg.imageSmoothingQuality = 'high'; fg.drawImage(src, 0, 0, w, h); grade(first);
  out.push(first); src = first;
  while (h > 24 && w > 8) {
    const nw = Math.max(1, Math.round(w / 2)), nh = Math.max(1, Math.round(h / 2));
    const c = document.createElement('canvas'); c.width = nw; c.height = nh;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, nw, nh);
    out.push(c); src = c; w = nw; h = nh;
  }
  return out;
}
// Best image to draw sprite id at devH device pixels tall; null if not loaded.
export function spriteFor(id, devH) {
  let m = mips.get(id);
  if (!m) {
    const img = spriteImage(id);
    if (!img) return null;
    if (performance.now() > mipBudget) return img; // no time this frame: the full image will do
    m = buildMips(id, img);
    mips.set(id, m);
    // keep only our copies: the decoded original is several times larger
    const rec = images.get(BASE + manifest.sprites[id].file);
    if (rec) rec.img = null;
  }
  let best = m[0];
  for (const c of m) { if (c.height >= devH) best = c; else break; }
  return best;
}

// ---------- soft cast shadows ----------
// A blurred silhouette of the sprite (alpha only); the renderer shears it onto the ground.
const shadows = new Map();
export function shadowFor(id) {
  let s = shadows.get(id);
  if (s !== undefined) return s;
  const img = spriteImage(id);
  if (!img) return null;
  if (performance.now() > mipBudget) return null;
  const info = manifest.sprites[id];
  spriteFor(id, 1); // (make the downscaled copies, freeing the original)
  const W = 48, H = Math.max(8, Math.round((48 * info.h) / info.w));
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const g = small.getContext('2d');
  g.drawImage(img, 0, 0, W, H);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  // blur by scaling down and up again (works without canvas filters)
  const tiny = document.createElement('canvas'); tiny.width = Math.max(4, W >> 2); tiny.height = Math.max(4, H >> 2);
  const tg = tiny.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(small, 0, 0, tiny.width, tiny.height);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d'); og.imageSmoothingQuality = 'high';
  og.globalAlpha = 0.55; og.drawImage(small, 0, 0);
  og.globalAlpha = 0.75; og.drawImage(tiny, 0, 0, W, H);
  s = { canvas: out, fx: info.foot[0] / info.w, fy: info.foot[1] / info.h };
  shadows.set(id, s);
  return s;
}

// ---------- picking ----------
export function hash(...parts) {
  let h = 2166136261;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= 0x9e37; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// The first available id of a preference list, or a deterministic one of the available ones
// when `any` is set; null when none exists.
export function pickSprite(ids, seed = 0, any = true) {
  if (!manifest) return null;
  const have = ids.filter((id) => manifest.sprites[id]);
  if (!have.length) return null;
  return any ? have[seed % have.length] : have[0];
}
export function spritesOfKind(kind) {
  if (!manifest) return [];
  return Object.entries(manifest.sprites).filter(([, s]) => s.kind === kind).map(([id]) => id);
}
