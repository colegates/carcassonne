// The miniature board renderer used by BoardView: per tile a photographic ground or a baked
// composite (ground + static miniatures + their shadows), then every visible miniature and
// actor sorted by the screen y of its foot, with soft screen-space shadows (the light stays
// upper left whatever the tiles' rotation). Heavy work (grounds, composites) runs as small
// jobs between frames, and caches are bounded.
import * as A from './assets.js';
import { getScene, minisUsable, landmarkFallbacks, groundSymbols, WALL_H, WALL_W } from './scene.js';
import { groundSteps, groundReady, buildGround } from './ground.js';
import { getActors, drawWater } from './actors.js';
import { cacheGet, cachePeek, cachePut, cacheBytes, cacheCount, setBudget } from './cache.js';
import { getTileArt, setThumbProvider, ART_SIZE, drawSymbolAt } from '../art.js';

// LOD thresholds, in CSS pixels per tile
export const LOD = { far: 50, close: 110, detail: 160 };
const BUCKETS = [128, 192, 256, 384, 512, 768, 1024];
const MX = 0.1, MT = 0.32, MB = 0.07; // composite margins (tall miniatures stick out above)
const SHX = 0.62, SHY = 0.26;        // shadow shear: down and to the right
const TAU = Math.PI * 2;
export const bucket = (px) => BUCKETS.find((b) => b >= px * 0.85) || 1024;

// ---------- the job runner: one job at a time, a few ms per frame ----------
const jobs = new Map(); // key -> { gen, seen }
let current = null;
let frameNo = 0;
function request(key, make) {
  let j = jobs.get(key);
  if (!j) { j = { key, make, gen: null, seen: frameNo, prio: jobs.size }; jobs.set(key, j); }
  j.seen = frameNo;
}
function runJobs(budgetMs) {
  const t0 = performance.now();
  while (performance.now() - t0 < budgetMs) {
    if (!current) {
      // newest-requested first, drop jobs nobody asked for lately
      let best = null;
      for (const j of jobs.values()) {
        if (frameNo - j.seen > 90) { jobs.delete(j.key); continue; }
        if (!best || j.seen > best.seen || (j.seen === best.seen && j.prio < best.prio)) best = j;
      }
      if (!best) return false;
      current = best;
      try { current.gen = current.make(); } catch (e) { console.error(e); jobs.delete(current.key); current = null; continue; }
      if (!current.gen) { jobs.delete(current.key); current = null; continue; }
    }
    let r;
    try { r = current.gen.next(); } catch (e) { console.error(e); r = { done: true }; }
    if (r.done) { jobs.delete(current.key); current = null; notifyThumbs(); }
  }
  return true;
}
let thumbTimer = 0;
function notifyThumbs() {
  if (thumbTimer) return;
  thumbTimer = setTimeout(() => { thumbTimer = 0; window.dispatchEvent(new Event('minis-updated')); }, 120);
}

// ---------- grounds and composites ----------
const gkey = (id, res) => `g|${id}|${res}`;
const ckey = (id, r, v, res) => `c|${id}|${r}|${v}|${res}`;
function groundJob(id, res) {
  return function* () {
    if (!groundReady(id, res)) return; // textures still on their way
    const gen = groundSteps(id, res, { fallbacks: landmarkFallbacks(id), symbols: groundSymbols() });
    let c = null;
    for (const v of gen) { if (v) c = v; else yield; }
    if (c) cachePut(gkey(id, res), c, res * res * 4);
  };
}
function getGround(id, res, build = true) {
  const g = cacheGet(gkey(id, res));
  if (g) return g;
  if (build) request(gkey(id, res), groundJob(id, res));
  return null;
}
// any cached ground or composite of a tile, nearest in size
function anyCached(prefix, res) {
  for (const b of [res, ...BUCKETS.filter((x) => x !== res).sort((a, b2) => Math.abs(a - res) - Math.abs(b2 - res))]) {
    const c = cachePeek(prefix(b));
    if (c && c.width) return c;
  }
  return null;
}
function spritesLoaded(list) {
  let ok = true;
  for (const o of list) if (o.t === 's' && !A.spriteImage(o.id)) ok = false;
  return ok;
}
function compositeJob(id, r, v, res) {
  return function* () {
    let ground = cacheGet(gkey(id, res));
    if (!ground) {
      if (!groundReady(id, res)) return;
      const gen = groundSteps(id, res, { fallbacks: landmarkFallbacks(id), symbols: groundSymbols() });
      for (const x of gen) { if (x) ground = x; else yield; }
      if (!ground) return;
      cachePut(gkey(id, res), ground, res * res * 4);
    }
    const scene = getScene(id, r, v);
    if (!spritesLoaded(scene.statics)) return; // try again once they have decoded
    yield;
    const W = Math.round(res * (1 + 2 * MX)), H = Math.round(res * (1 + MT + MB));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const cx = MX * res + res / 2, cy = MT * res + res / 2;
    g.save(); g.translate(cx, cy); g.rotate((r * Math.PI) / 2); g.drawImage(ground, -res / 2, -res / 2, res, res); g.restore();
    A.resetMipBudget(1e6);
    const items = scene.statics.map((o) => ({ ...o, tx: cx, ty: cy, z: res }));
    drawShadows(g, items, 1);
    for (const it of items) drawItem(g, it, 1);
    for (const s of scene.symbols) drawSymbol(g, s, cx, cy, res, 1);
    cachePut(ckey(id, r, v, res), c, W * H * 4);
  };
}
function getComposite(id, r, v, res, build = true) {
  const c = cacheGet(ckey(id, r, v, res));
  if (c) return c;
  if (build) request(ckey(id, r, v, res), compositeJob(id, r, v, res));
  return null;
}

// ---------- the printed symbols, upright over the miniatures ----------
const symCache = new Map();
function drawSymbol(ctx, s, tx, ty, z, dpr) {
  const px = Math.max(16, Math.round(z * 0.16 * dpr / 8) * 8);
  const key = `${s.sym.kind}|${s.sym.goods || ''}|${px}`;
  let c = symCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = px;
    const S = px / 0.2;  // (drawn small: 0.16 of a tile)
    drawSymbolAt(c.getContext('2d'), s.sym, px / 2, px / 2, S);
    if (symCache.size > 60) symCache.clear();
    symCache.set(key, c);
  }
  const X = tx + (s.x - 0.5) * z, Y = ty + (s.y - 0.5) * z, w = z * 0.16;
  ctx.drawImage(c, X - w / 2, Y - w / 2, w, w);
}

// ---------- drawing items ----------
// item: { t: 's' | 'wall' | undefined, x, y (unit, foot), tx, ty (tile centre px), z (tile px),
//         id, w, h, flip, alpha, lift, shadow, draw }
function screen(it) { return [it.tx + (it.x - 0.5) * it.z, it.ty + (it.y - 0.5) * it.z]; }
function drawShadows(ctx, items, dpr) {
  ctx.save();
  for (const it of items) {
    if (it.t === 'wall' || !it.id || it.shadow === false || it.lift > 0.004 || it.alpha === 0) continue;
    const info = A.spriteInfo(it.id); if (!info) continue;
    const [X, Y] = screen(it);
    const W = it.w * it.z, H = it.h * it.z;
    const a = it.alpha ?? 1;
    // contact shadow at the foot
    ctx.globalAlpha = 0.32 * a * Math.min(1, 0.1 / it.w);
    ctx.fillStyle = '#1a1206';
    ctx.beginPath(); ctx.ellipse(X + W * 0.04, Y - H * 0.01, W * 0.42, Math.max(0.8, W * 0.11), 0, 0, TAU); ctx.fill();
    const sh = A.shadowFor(it.id);
    if (!sh) continue;
    ctx.globalAlpha = 0.3 * a;
    ctx.setTransform(dpr, 0, -SHX * dpr, -SHY * dpr, X * dpr, Y * dpr);
    const fx = it.flip ? 1 - sh.fx : sh.fx;
    if (it.flip) { ctx.scale(-1, 1); ctx.drawImage(sh.canvas, -(1 - fx) * W, -sh.fy * H, W, H); } else ctx.drawImage(sh.canvas, -fx * W, -sh.fy * H, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ctx.restore();
}
function drawItem(ctx, it, dpr) {
  if (it.t === 'wall') { drawWall(ctx, it); return; }
  const [X, Y] = screen(it);
  if (it.draw) { it.draw(ctx, X, Y, it.z, it); return; }
  const info = A.spriteInfo(it.id); if (!info) return;
  const W = it.w * it.z, H = it.h * it.z;
  if (W < 0.6) return;
  const img = A.spriteFor(it.id, H * dpr);
  if (!img) return;
  const fx = info.foot[0] / info.w, fy = info.foot[1] / info.h;
  const top = Y - (it.lift || 0) * it.z - fy * H;
  const a = it.alpha ?? 1;
  if (a < 1) ctx.globalAlpha = a;
  if (it.flip || it.angle || it.skew) {
    ctx.save();
    ctx.translate(X, Y - (it.lift || 0) * it.z);
    if (it.skew) ctx.transform(1, 0, it.skew, 1, 0, 0);
    if (it.angle) ctx.rotate(it.angle);
    if (it.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -fx * W, -fy * H, W, H);
    ctx.restore();
  } else ctx.drawImage(img, X - fx * W, top, W, H);
  if (a < 1) ctx.globalAlpha = 1;
}

// A short piece of town wall standing up in screen space: the visible face(s) in banded
// Roman masonry, the flagged wall-walk on top and the merlons along the outer parapet.
let faceCanvas = null, topCanvas = null;
function masonry() {
  if (faceCanvas) return faceCanvas;
  // the curtain-wall miniature's own face (banded Roman masonry), mirrored into a seamless tile
  const wall = A.spriteImage('wall_outer'), info = A.spriteInfo('wall_outer');
  if (wall && info) {
    const sx = info.w * 0.04, sy = info.h * 0.46, sw = info.w * 0.92, sh = info.h * 0.46;
    const w = 256, h = Math.round((256 * sh) / sw);
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
    const g = c.getContext('2d');
    for (const [mx, my] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.save(); g.translate(mx > 0 ? 0 : 2 * w, my > 0 ? 0 : 2 * h); g.scale(mx, my);
      g.drawImage(wall, sx, sy, sw, sh, 0, 0, w, h); g.restore();
    }
    faceCanvas = c;
    return c;
  }
  const c = document.createElement('canvas'); c.width = 96; c.height = 48;
  const g = c.getContext('2d');
  const r = A.rng(77);
  g.fillStyle = '#b3a487'; g.fillRect(0, 0, 96, 48);
  for (let y = 0; y < 48; y += 4) {
    const brick = y % 24 === 12 || y % 24 === 16;
    for (let x = -(y % 8 ? 3 : 0); x < 96; x += brick ? 7 : 5 + Math.floor(r() * 3)) {
      const v = 0.82 + r() * 0.3;
      g.fillStyle = brick ? `rgb(${150 * v | 0},${78 * v | 0},${56 * v | 0})` : `rgb(${190 * v | 0},${176 * v | 0},${146 * v | 0})`;
      g.fillRect(x + 0.5, y + 0.5, (brick ? 6 : 4.5), 3);
    }
  }
  g.fillStyle = 'rgba(40,30,20,0.12)'; g.fillRect(0, 40, 96, 8);
  faceCanvas = c;
  return c;
}
function wallTop() {
  if (topCanvas) return topCanvas;
  const t = A.textureImage('wall_walk', true);
  if (t) { topCanvas = t; return t; }
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#c8bb9c'; g.fillRect(0, 0, 32, 32);
  g.strokeStyle = 'rgba(80,70,55,0.5)'; g.strokeRect(0.5, 0.5, 15, 15); g.strokeRect(16.5, 8.5, 15, 15);
  return c;
}
const patterns = new WeakMap();
function pat(ctx, img) {
  let m = patterns.get(ctx);
  if (!m) { m = new Map(); patterns.set(ctx, m); }
  let p = m.get(img);
  if (!p) { p = ctx.createPattern(img, 'repeat'); m.set(img, p); }
  return p;
}
function drawWall(ctx, it) {
  const { pts, side, z, tx, ty } = it;
  const hw = WALL_W * 0.5, H = WALL_H * z;
  const P = (p, s) => [tx + (p.x + p.nx * s - 0.5) * z, ty + (p.y + p.ny * s - 0.5) * z];
  const outer = pts.map((p) => P(p, side * hw)), inner = pts.map((p) => P(p, -side * hw));
  const mid = pts[Math.floor(pts.length / 2)];
  const fc = masonry();
  const face = pat(ctx, fc);
  // one band of the face texture is the wall's height
  face.setTransform(new DOMMatrix().translate(tx, ty - H).scale((WALL_H * z) / (fc.height / 2)));
  const drawFace = (line, nx, ny) => {
    if (ny <= -0.05) return; // facing away from us
    ctx.beginPath();
    line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = line.length - 1; i >= 0; i--) ctx.lineTo(line[i][0], line[i][1] - H);
    ctx.closePath();
    ctx.fillStyle = face; ctx.fill();
    // light from the upper left: faces turned right are in shade
    const shade = 0.06 + 0.2 * (nx * 0.7 + 0.3);
    ctx.fillStyle = `rgba(30,20,10,${Math.max(0.05, shade).toFixed(3)})`; ctx.fill();
    // grime at the foot
    ctx.strokeStyle = 'rgba(40,30,15,0.35)'; ctx.lineWidth = Math.max(0.6, z * 0.004);
    ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  };
  drawFace(outer, mid.nx * side, mid.ny * side);
  drawFace(inner, -mid.nx * side, -mid.ny * side);
  // the walk on top
  ctx.beginPath();
  outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - H) : ctx.moveTo(x, y - H)));
  for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1] - H);
  ctx.closePath();
  const top = pat(ctx, wallTop());
  const tw = wallTop();
  top.setTransform(new DOMMatrix().translate(tx, ty).scale((0.12 * z) / tw.width));
  ctx.fillStyle = top; ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(50,40,28,0.55)'; ctx.lineWidth = Math.max(0.5, z * 0.002);
  for (const line of [outer, inner]) { ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - H) : ctx.moveTo(x, y - H))); ctx.stroke(); }
  // merlons on the outer parapet
  const mw = 0.011 * z, mh = 0.013 * z;
  for (let i = 0; i < outer.length; i++) {
    const [x, y] = outer[i];
    const p = pts[i];
    // step every ~0.022 tile
    if (Math.floor(p.s / 0.022) === Math.floor((pts[i - 1]?.s ?? -1) / 0.022)) continue;
    const bx = x - p.nx * side * mw * 0.3 / z * z, by = y - H;
    ctx.fillStyle = '#9d907a'; ctx.fillRect(bx - mw / 2, by - mh, mw, mh);
    ctx.fillStyle = '#d6cab0'; ctx.fillRect(bx - mw / 2, by - mh, mw, mh * 0.3);
    ctx.fillStyle = 'rgba(40,30,20,0.35)'; ctx.fillRect(bx + mw * 0.2, by - mh, mw * 0.3, mh);
  }
}

// ---------- the renderer ----------
export class MinisRenderer {
  constructor(view) {
    this.view = view;
    this.live = false;
    this.stats = { items: 0, actors: 0, ms: 0 };
    A.loadManifest();
    A.onAssets(() => { view.dirty = true; notifyThumbs(); });
    setThumbProvider((id, size, r) => this.thumb(id, size, r));
    setBudget(76 * 1024 * 1024);
    // honour "reduce motion": the miniatures stand still (read once, not per frame)
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.still = !!mq?.matches;
    mq?.addEventListener?.('change', (e) => { this.still = e.matches; view.dirty = true; });
  }
  active() { return !A.MINIS_OFF && minisUsable(); }
  variant(key) { return A.hash(key) % 2; }
  mode(z) { return z < LOD.far ? 'far' : z < LOD.close ? 'mid' : 'close'; }

  beginFrame(now) {
    frameNo++;
    this.frameStart = performance.now();
    A.resetMipBudget(4);
    this.pendingStatics = null;
    this.live = false;
  }
  // run queued builds in what is left of the frame
  endFrame(idle) {
    if (this.paused) return;
    const spent = performance.now() - (this.frameStart || performance.now());
    const more = runJobs(Math.max(idle ? 10 : 3, 12 - spent));
    if (more && jobs.size) this.view.dirty = true; // keep going until the queue is empty
  }
  pump() { if (jobs.size && !this.paused) { runJobs(8); if (jobs.size) this.view.dirty = true; } }

  // The tile's base (composite when far/mid, ground when close). Returns false to let the
  // board fall back to the painted tile.
  drawTileBase(ctx, key, tile, sx, sy, size, z, opts = {}) {
    const dpr = this.view.dpr;
    const res = bucket(size * dpr);
    const r = tile.r, v = this.variant(key);
    const mode = opts.mode || this.mode(z);
    if (mode !== 'close') {
      let c = getComposite(tile.t, r, v, res);
      if (!c) c = anyCached((b) => ckey(tile.t, r, v, b), res);
      if (c) {
        ctx.drawImage(c, sx - size / 2 - MX * size, sy - size / 2 - MT * size, size * (1 + 2 * MX), size * (1 + MT + MB));
        if (mode === 'mid' && !opts.noWater) this.drawTileWater(ctx, key, tile, sx, sy, size);
        return true;
      }
    }
    // far/mid without any composite yet: a few tiles show their ground and live miniatures,
    // the rest keep the painted tile until their composite is baked
    if (mode !== 'close' && (this.pendingStatics?.length || 0) >= 6) return false;
    let g = getGround(tile.t, res);
    if (!g) g = anyCached((b) => gkey(tile.t, b), res);
    if (!g) return false;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate((r * Math.PI) / 2);
    ctx.drawImage(g, -size / 2 - 0.4, -size / 2 - 0.4, size + 0.8, size + 0.8);
    ctx.restore();
    if (mode === 'close' && !opts.noWater) this.drawTileWater(ctx, key, tile, sx, sy, size);
    // a far/mid tile still waiting for its composite: show the statics live for now
    if (mode !== 'close') this.pendingStatics = (this.pendingStatics || []).concat([{ key, tile, sx, sy, size }]);
    return true;
  }
  drawTileWater(ctx, key, tile, sx, sy, size) {
    const scene = getScene(tile.t, tile.r, this.variant(key));
    if (!scene.rivers.length && !scene.lakes.length) return;
    drawWater(ctx, scene, this.still ? 20 : performance.now() / 1000, sx, sy, size);
    if (!this.still) this.live = true;
  }

  // Everything that stands up, for the visible tiles: tiles = [{ k, tile, sx, sy }]
  drawObjects(ctx, tiles, now, opts = {}) {
    const t0 = performance.now();
    const z = this.view.cam.z, dpr = this.view.dpr;
    const mode = this.mode(z);
    this.live = this.live || false;
    if (mode === 'far') { this.pendingStatics = null; this.stats = { items: 0, actors: 0, ms: performance.now() - t0 }; return; }
    const t = this.still ? 20 : now / 1000;
    const level = mode === 'mid' ? (z < 80 ? 1 : 2) : z < LOD.detail ? 2 : 3;
    const items = [], over = [];
    const cx = this.view.w / 2, cy = this.view.h / 2;
    // nearest tiles first, so a busy board keeps its actors where you are looking
    const sorted = tiles.slice().sort((a, b) => Math.hypot(a.sx - cx, a.sy - cy) - Math.hypot(b.sx - cx, b.sy - cy));
    const cap = mode === 'close' ? 320 : 140;
    let actorCount = 0;
    const tmp = [];
    const pending = new Set((this.pendingStatics || []).map((p) => p.key));
    for (const v of sorted) {
      if (opts.skip?.has(v.k)) continue;
      const scene = getScene(v.tile.t, v.tile.r, this.variant(v.k));
      if (mode === 'close' || pending.has(v.k)) {
        for (const o of scene.statics) {
          // cull what is far off screen (tall things overhang upwards)
          const X = v.sx + (o.x - 0.5) * z, Y = v.sy + (o.y - 0.5) * z;
          if (X < -0.3 * z || X > this.view.w + 0.3 * z || Y < -0.05 * z || Y > this.view.h + 0.6 * z) continue;
          const it = Object.create(o); it.tx = v.sx; it.ty = v.sy; it.z = z;
          if (o.tag === 'laundry' && !this.still) it.skew = Math.sin(t * 2.2 + o.x * 9) * 0.08 + 0.06; // flapping in the Cers
          items.push(it);
        }
      }
      if (actorCount > cap) continue;
      const acts = getActors(v.k, scene);
      for (const a of acts) {
        if (a.lod > level) continue;
        tmp.length = 0;
        a.update(t, tmp);
        for (const it of tmp) {
          it.tx = v.sx; it.ty = v.sy; it.z = z;
          if (it.over) over.push(it); else items.push(it);
          if (it.id) actorCount++;
        }
      }
    }
    if (mode === 'close') for (const v of tiles) {
      if (opts.skip?.has(v.k)) continue;
      const scene = getScene(v.tile.t, v.tile.r, this.variant(v.k));
      for (const s of scene.symbols) over.unshift({ x: s.x, y: s.y, tx: v.sx, ty: v.sy, z, draw: (c, X, Y, zz) => drawSymbol(c, s, v.sx, v.sy, zz, dpr) });
    }
    for (const p of this.pendingStatics || []) {
      const scene = getScene(p.tile.t, p.tile.r, this.variant(p.key));
      for (const s of scene.symbols) over.unshift({ x: s.x, y: s.y, tx: p.sx, ty: p.sy, z, draw: (c, X, Y, zz) => drawSymbol(c, s, p.sx, p.sy, zz, dpr) });
    }
    this.pendingStatics = null;
    for (const it of items) it.k = (it.y + (it.sort || 0)) * z + it.ty;
    items.sort((a, b) => a.k - b.k);
    drawShadows(ctx, items, dpr);
    for (const it of items) drawItem(ctx, it, dpr);
    for (const it of over) drawItem(ctx, it, dpr);
    this.live = !this.still && (actorCount > 0 || this.live);
    this.stats = { items: items.length + over.length, actors: actorCount, ms: performance.now() - t0, cache: cacheBytes(), entries: cacheCount(), jobs: jobs.size };
  }

  // The tile being placed: its composite, turned by what is left of its rotation animation.
  drawTentative(ctx, t, rot, sx, sy, z) {
    const dpr = this.view.dpr;
    const res = bucket(z * dpr);
    const r = ((Math.round(t.r) % 4) + 4) % 4;
    const v = this.variant(`${t.x},${t.y}`); // the same miniatures it will have once placed
    let c = getComposite(t.t, r, v, res) || anyCached((b) => ckey(t.t, r, v, b), res);
    if (!c) return false;
    ctx.save(); ctx.translate(sx, sy);
    ctx.rotate(((rot - t.r) * Math.PI) / 2);
    ctx.drawImage(c, -z / 2 - MX * z, -z / 2 - MT * z, z * (1 + 2 * MX), z * (1 + MT + MB));
    ctx.restore();
    return true;
  }

  // A square picture of a tile (no overhang) for thumbnails; null until it is ready.
  thumb(id, size, r, sync = false) {
    if (!this.active()) return null;
    const res = bucket(Math.max(128, size * 1.3));
    const tk = `t|${id}|${r}|${res}`;
    const have = cacheGet(tk);
    if (have) return have;
    let c = getComposite(id, r, 0, res, res > 256 && !sync);
    if (!c && (res <= 256 || sync)) {
      // small pictures are cheap: build now when the art has arrived
      try { const gen = compositeJob(id, r, 0, res)(); while (!gen.next().done); } catch (e) { console.error(e); }
      c = cacheGet(ckey(id, r, 0, res));
      if (!c) request(ckey(id, r, 0, res), compositeJob(id, r, 0, res));
    }
    if (!c) { this.view.dirty = true; return null; }
    const out = document.createElement('canvas'); out.width = out.height = res;
    out.getContext('2d').drawImage(c, MX * res, MT * res, res, res, 0, 0, res, res);
    cachePut(tk, out, res * res * 4);
    return out;
  }
}
export { buildGround, getTileArt, ART_SIZE };

// Thumbnails for pages without a board (dev gallery): resolves once the manifest is in;
// getTileThumb then builds the miniature pictures on the spot (null until images decode).
export function standaloneThumbs() {
  A.loadManifest();
  const r = Object.create(MinisRenderer.prototype);
  r.view = { dirty: false, dpr: 1 };
  setThumbProvider((id, size, rot) => r.thumb(id, size, rot, true));
  return new Promise((resolve) => {
    const check = () => (A.manifestStatus() === 'ready' || A.manifestStatus() === 'none' || A.MINIS_OFF ? resolve(r.active()) : setTimeout(check, 100));
    check();
  });
}
// whether getTileThumb(id) would come back as a miniature now
export function thumbReady(id, size, rot = 0) { return !!cachePeek(`t|${id}|${rot}|${bucket(Math.max(128, size * 1.3))}`); }
