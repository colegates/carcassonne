// Living miniatures: everything that moves on a tile, computed from real time alone (no state),
// so a tile is already busy the moment you zoom in and two phones show the same scene.
// Each actor pushes draw items in the tile's screen-oriented unit space:
//   { x, y (foot), id | draw, w, h, flip, alpha, lift, angle, pivot, shadow, sort, over }
import * as A from './assets.js';
import { CAT, GROUPS } from './catalog.js';
import { sampleSeg } from './plan.js';
import { avail, WALL_H } from './scene.js';
import { RIVER_W } from './ground.js';

const TAU = Math.PI * 2;
const frac = (v) => v - Math.floor(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const step12 = (t) => Math.floor(t * 12) / 12; // stop-motion poses at 12 fps

// ---------- path helpers ----------
function along(pts, d) {
  // point at arc length d on sampled pts
  const L = pts[pts.length - 1].s;
  d = clamp(d, 0, L);
  let i = 1;
  while (i < pts.length - 1 && pts[i].s < d) i++;
  const a = pts[i - 1], b = pts[i];
  const u = b.s > a.s ? (d - a.s) / (b.s - a.s) : 0;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, tx: a.tx + (b.tx - a.tx) * u, ty: a.ty + (b.ty - a.ty) * u, nx: a.nx, ny: a.ny };
}
function sizeFor(id, scale = 1) {
  const info = A.spriteInfo(id); const c = CAT[id] || { h: 0.035 };
  const asp = info ? info.h / info.w : 1.6;
  return c.w ? [c.w * scale, c.w * asp * scale] : [(c.h / asp) * scale, c.h * scale];
}
function fig(id, x, y, o = {}) {
  const [w, h] = sizeFor(id, o.scale || 1);
  return { x, y, id, w, h, flip: !!o.flip, alpha: o.alpha ?? 1, lift: o.lift || 0, shadow: o.shadow !== false, sort: o.sort || 0, angle: o.angle || 0, skew: o.skew || 0, squash: o.squash || 0 };
}

// ---------- reusable soft puff for smoke and dust ----------
let puffCanvas = null;
function puff() {
  if (puffCanvas) return puffCanvas;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  puffCanvas = c;
  return c;
}
const tinted = new Map();
function puffOf(color) {
  if (tinted.has(color)) return tinted.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.drawImage(puff(), 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 64, 64);
  tinted.set(color, c);
  return c;
}
function drawPuff(ctx, X, Y, r, color, alpha) {
  if (r < 0.3 || alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(puffOf(color), X - r, Y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// ---------- actor kinds ----------
// A traveller on a road: enters at one end, leaves at the other (fading at the tile edge),
// or walks into a dead end, lingers and walks back.
function roadWalker(road, id, seed, o = {}) {
  const pts = sampleSeg(road.seg, 24);
  const L = pts[pts.length - 1].s;
  const r = A.rng(seed);
  const speed = (o.speed || 0.03) * (0.85 + r() * 0.3);
  const gap = 1 + r() * 5; // seconds off-tile between passes
  const lane = (r() - 0.5) * 0.04;
  const reverse = r() < 0.5;
  const phase = r() * 100;
  const scale = 0.92 + r() * 0.14;
  const dead = road.dead;
  return {
    lod: o.lod || 1,
    update(t, out) {
      const T = t + phase;
      let d, dir;
      if (dead) {
        const cycle = (2 * L) / speed + 4 + gap;
        const u = T % cycle, walk = L / speed;
        if (u < walk) { d = u * speed; dir = 1; } else if (u < walk + 4) { d = L; dir = 0; } else if (u < 2 * walk + 4) { d = L - (u - walk - 4) * speed; dir = -1; } else return;
      } else {
        const cycle = L / speed + gap;
        const u = T % cycle;
        if (u * speed > L) return;
        d = reverse ? L - u * speed : u * speed; dir = reverse ? -1 : 1;
      }
      const p = along(pts, d);
      const edgeFade = dead ? clamp(d / 0.05, 0, 1) : clamp(Math.min(d, L - d) / 0.05, 0, 1);
      if (edgeFade <= 0) return;
      const vx = p.tx * (dir || 1);
      const bob = dir ? Math.abs(Math.sin(step12(T) * 9)) * 0.0022 : 0;
      const x = p.x + p.nx * lane, y = p.y + p.ny * lane;
      // over a bridge: up on its humped deck
      let deck = 0, sort = 0;
      if (road.bridge === 'over' && road.span) {
        const f = d / L, [s0, s1] = road.span;
        if (f > s0 - 0.04 && f < s1 + 0.04) { deck = 0.035 * Math.sin(Math.PI * clamp((f - s0 + 0.04) / (s1 - s0 + 0.08), 0, 1)); sort = 0.09; }
      }
      out.push(fig(id, x, y, { flip: vx > 0.05 ? true : vx < -0.05 ? false : (seed & 1) === 1, alpha: edgeFade, lift: bob + deck, scale, sort }));
    },
  };
}

// Someone strolling between free spots (lanes in town, meadow spots in the country).
function wanderer(points, id, seed, o = {}) {
  const r = A.rng(seed);
  const n = points.length;
  const legT = o.leg || 7 + r() * 5;
  const speed = o.speed || 0.025;
  const phase = r() * 1000;
  const scale = o.scale || 0.92 + r() * 0.14;
  const reach = o.reach || 0.22;
  // stateless: every stop is one of the spots near a home spot, so any leg is short
  const home = points[seed % n];
  let near = points.filter((q) => Math.hypot(q[0] - home[0], q[1] - home[1]) < reach);
  if (near.length < 2) near = points;
  const at = (k) => near[A.hash(seed, k) % near.length];
  return {
    lod: o.lod || 2,
    update(t, out) {
      const T = (t + phase) / legT;
      const k = Math.floor(T), u = T - k;
      const a = at(k), b = at(k + 1);
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const walkU = clamp(dist / speed / legT, 0, 0.95);
      let x, y, moving = false;
      if (u < walkU) { const v = u / walkU; x = a[0] + (b[0] - a[0]) * v; y = a[1] + (b[1] - a[1]) * v; moving = true; } else { x = b[0]; y = b[1]; }
      const bob = moving ? Math.abs(Math.sin(step12(t + phase) * 9)) * 0.002 : 0;
      const flip = b[0] - a[0] > 0.002;
      out.push(fig(o.idAt ? o.idAt(k) : id, x, y, { flip, lift: bob + (o.lift || 0), scale }));
    },
  };
}

// A sentry pacing the wall-walk between two towers.
function wallPatrol(wall, id, seed) {
  const r = A.rng(seed);
  const pts = wall.pts;
  const L = pts[pts.length - 1].s;
  const a = L * (0.15 + r() * 0.2), b = L * (0.6 + r() * 0.25);
  const speed = 0.018, phase = r() * 100;
  const span = b - a, cycle = (2 * span) / speed + 6;
  return {
    lod: 1,
    update(t, out) {
      const u = (t + phase) % cycle;
      const walk = span / speed;
      let d, dir;
      if (u < walk) { d = a + u * speed; dir = 1; } else if (u < walk + 3) { d = b; dir = 0; } else if (u < 2 * walk + 3) { d = b - (u - walk - 3) * speed; dir = -1; } else { d = a; dir = 0; }
      const p = along(pts, d);
      const inward = -wall.side * 0.008;
      const vx = p.tx * dir;
      const bob = dir ? Math.abs(Math.sin(step12(t + phase) * 8)) * 0.0018 : 0;
      out.push(fig(id, p.x + p.nx * inward, p.y + p.ny * inward, { flip: vx > 0.05, lift: WALL_H + bob, sort: 0.045, scale: 0.95 }));
    },
  };
}

// Boats and ducks drifting along a river and back.
function riverCraft(river, id, seed, o = {}) {
  const pts = sampleSeg(river.seg, 24);
  const L = pts[pts.length - 1].s;
  const r = A.rng(seed);
  const speed = o.speed || 0.012, phase = r() * 200, lane = (r() - 0.5) * RIVER_W * 0.35;
  const a = L * 0.12, b = L * 0.88, span = b - a;
  const cycle = (2 * span) / speed + 8;
  return {
    lod: o.lod || 1,
    update(t, out) {
      const u = (t + phase) % cycle, walk = span / speed;
      let d, dir;
      if (u < walk) { d = a + u * speed; dir = 1; } else if (u < walk + 4) { d = b; dir = 0; } else if (u < 2 * walk + 4) { d = b - (u - walk - 4) * speed; dir = -1; } else { d = a; dir = 0; }
      const p = along(pts, d);
      const bob = Math.sin((t + phase) * 2.2) * 0.0012;
      const x = p.x + p.nx * lane, y = p.y + p.ny * lane;
      const item = fig(id, x, y + 0.008, { flip: p.tx * (dir || 1) > 0, lift: bob, shadow: false, scale: o.scale || 1 });
      out.push(item);
      // a little wake
      if (dir) out.push({ x, y: y + 0.004, sort: -0.01, shadow: false, draw: (ctx, X, Y, z) => {
        ctx.strokeStyle = 'rgba(235,240,230,0.35)'; ctx.lineWidth = Math.max(0.6, z * 0.0025);
        const bx = X - p.tx * dir * item.w * 0.5 * z, by = Y - p.ty * dir * item.w * 0.3 * z;
        for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(bx, by, z * 0.01 * i, z * 0.004 * i, Math.atan2(p.ty, p.tx), 0, Math.PI); ctx.stroke(); }
      } });
    },
  };
}

// Smoke rising through roof tiles, from a bread oven, a campfire or the volcano; leans east (the Cers).
function smoke(x, y, lift, o = {}) {
  const n = o.n || 7, P = o.period || 6, rise = o.rise || 0.12, r0 = o.r0 || 0.006, r1 = o.r1 || 0.022;
  const color = o.color || '#d8d4cc', alpha = o.alpha ?? 0.4, seed = o.seed || 1;
  return {
    lod: o.lod || 1,
    update(t, out) {
      out.push({ x, y, sort: 0.002, shadow: false, over: !!o.over, draw: (ctx, X, Y, z) => {
        for (let k = 0; k < n; k++) {
          const age = frac((t + (k * P) / n + seed) / P);
          const px = X + (age * 0.055 + Math.sin(age * 5 + k) * 0.006) * z * (o.wind ?? 1);
          const py = Y - (lift + age * rise) * z;
          drawPuff(ctx, px, py, (r0 + (r1 - r0) * age) * z, color, alpha * (1 - age) * Math.min(1, age * 6));
        }
      } });
    },
  };
}

// Swallows (or jackdaws) wheeling over a tile, with faint shadows on the ground.
function birds(cx, cy, seed, o = {}) {
  const r = A.rng(seed);
  const n = o.n || 3 + Math.floor(r() * 3);
  const list = Array.from({ length: n }, () => ({ rx: 0.12 + r() * 0.2, ry: 0.08 + r() * 0.12, w: (0.6 + r() * 0.7) * (r() < 0.5 ? -1 : 1), ph: r() * TAU, lift: 0.18 + r() * 0.16, fl: 6 + r() * 4 }));
  const color = o.color || '#2a2522';
  const size = o.size || 0.012;
  return {
    lod: o.lod || 1,
    update(t, out) {
      for (const b of list) {
        const a = t * b.w * 0.6 + b.ph;
        const x = cx + Math.cos(a) * b.rx, y = cy + Math.sin(a) * b.ry;
        const flap = Math.sin(t * b.fl + b.ph);
        const head = Math.atan2(Math.cos(a) * b.ry * b.w, -Math.sin(a) * b.rx * b.w);
        out.push({ x, y, over: true, shadow: false, draw: (ctx, X, Y, z) => {
          // shadow on the ground, then the bird high above it
          ctx.fillStyle = 'rgba(20,15,5,0.16)';
          ctx.beginPath(); ctx.ellipse(X + b.lift * 0.35 * z, Y + b.lift * 0.12 * z, size * 0.7 * z, size * 0.3 * z, 0, 0, TAU); ctx.fill();
          const bx = X, by = Y - b.lift * z, s = size * z;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(head);
          ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.8, s * 0.22); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-s * 0.9, flap * s * 0.55); ctx.quadraticCurveTo(-s * 0.3, -s * 0.1, 0, 0); ctx.quadraticCurveTo(s * 0.3, -s * 0.1, s * 0.9, flap * s * 0.55); ctx.stroke();
          ctx.restore();
        } });
      }
    },
  };
}

// A cloth banner on a pole, streaming east and rippling.
const ARMS = {
  toulouse: (g, w, h) => { g.fillStyle = '#a11d1d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b13a'; g.lineWidth = w * 0.09; g.beginPath(); g.moveTo(w / 2, h * 0.15); g.lineTo(w / 2, h * 0.85); g.moveTo(w * 0.18, h / 2); g.lineTo(w * 0.82, h / 2); g.stroke(); g.fillStyle = '#e2bd48'; for (const [x, y] of [[w / 2, h * 0.12], [w / 2, h * 0.88], [w * 0.14, h / 2], [w * 0.86, h / 2]]) { g.beginPath(); g.arc(x, y, w * 0.06, 0, TAU); g.fill(); } },
  trencavel: (g, w, h) => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#ece6d8' : '#a3241f'; g.fillRect(0, (i * h) / 6, w, h / 6 + 0.5); } g.fillStyle = '#222'; for (let i = 1; i < 6; i += 2) for (let j = 0; j < 3; j++) g.fillRect((j + 0.35) * w / 3, (i + 0.35) * h / 6, w * 0.06, h * 0.05); },
  foix: (g, w, h) => { g.fillStyle = '#d6a92e'; g.fillRect(0, 0, w, h); g.fillStyle = '#a3241f'; for (let i = 0; i < 3; i++) g.fillRect(((i * 2 + 1) * w) / 7, 0, w / 7, h); },
  france: (g, w, h) => { g.fillStyle = '#2f4f93'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9b13a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const x = (j + 0.5 + (i % 2) * 0.25) * w / 3, y = (i + 0.5) * h / 4; g.beginPath(); g.moveTo(x, y - h * 0.07); g.lineTo(x + w * 0.06, y + h * 0.04); g.lineTo(x - w * 0.06, y + h * 0.04); g.fill(); } },
};
const flagCanvases = new Map();
function flagCloth(lord) {
  if (flagCanvases.has(lord)) return flagCanvases.get(lord);
  const spriteId = `banner_${lord}`;
  const img = A.spriteFor(spriteId, 64);
  let c;
  if (img) { c = img; } else {
    c = document.createElement('canvas'); c.width = 40; c.height = 52;
    ARMS[lord](c.getContext('2d'), 40, 52);
    flagCanvases.set(lord, c);
  }
  return c;
}
export function lordAt(tx, ty) {
  const lords = ['toulouse', 'trencavel', 'foix', 'france'];
  return lords[A.hash('lord', Math.floor(tx / 4), Math.floor(ty / 4)) % 4];
}
function flag(x, y, lift, lord, seed, o = {}) {
  const ph = (seed % 100) / 10;
  const pole = o.pole || 0.05, fw = o.w || 0.032, fh = o.h || 0.022;
  return {
    lod: o.lod || 1,
    update(t, out) {
      out.push({ x, y, sort: o.sort ?? 0.001, shadow: false, draw: (ctx, X, Y, z) => {
        const top = Y - (lift + pole) * z;
        ctx.strokeStyle = '#3d3125'; ctx.lineWidth = Math.max(0.8, z * 0.0028);
        ctx.beginPath(); ctx.moveTo(X, Y - lift * z); ctx.lineTo(X, top); ctx.stroke();
        const cloth = flagCloth(lord);
        const W = fw * z, Hh = fh * z, slices = Math.max(4, Math.min(14, Math.round(W / 2)));
        const sw = cloth.width / slices;
        for (let i = 0; i < slices; i++) {
          const u = i / slices;
          const wave = Math.sin(t * 6 + ph - u * 5) * Hh * 0.18 * u + Math.sin(t * 2.3 + ph) * Hh * 0.05 * u;
          const shade = 0.85 + 0.15 * Math.cos(t * 6 + ph - u * 5);
          ctx.globalAlpha = 1;
          ctx.drawImage(cloth, i * sw, 0, sw + 0.5, cloth.height, X + u * W, top + wave, W / slices + 0.6, Hh);
          if (shade < 0.95) { ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 0.6})`; ctx.fillRect(X + u * W, top + wave, W / slices + 0.6, Hh); }
        }
      } });
    },
  };
}

// A two-pose figure (alternating sprites) or a figure that sways in place.
function twoPose(idA, idB, x, y, period, seed, o = {}) {
  const ph = (seed % 1000) / 100;
  return {
    lod: o.lod || 2,
    update(t, out) {
      const u = frac((t + ph) / period);
      const id = u < (o.split ?? 0.5) ? idA : idB;
      const bob = o.bob ? Math.abs(Math.sin(step12(t + ph) * (o.bobRate || 6))) * o.bob : 0;
      out.push(fig(id, x, y, { flip: o.flip, lift: (o.lift || 0) + bob, scale: o.scale || 1, sort: o.sort || 0 }));
      if (o.extra) o.extra(t + ph, u, out);
    },
  };
}

// ---------- the vignettes ----------
// The pierrière drill: haulers heave, the arm whips over, a stone arcs to the straw target, dust.
function trebuchet(v, seed) {
  const f = v.frame;
  const pivX = f.x + (f.flip ? 0.004 : -0.004), pivLift = f.h * 0.86;
  const dirX = v.tx > f.x ? 1 : -1;
  const hauler = avail('rope_haulers');
  const eng = avail('engineer') || avail('sergeant_spear');
  const ph = (seed % 1000) / 100;
  const C = 14;
  return {
    lod: 1,
    update(t, out) {
      const u = (t + ph) % C;
      // arm angle (screen radians, long end): rest leaning back and down, fire = over the top
      let a;
      const rest = dirX > 0 ? Math.PI * 0.82 : Math.PI * 0.18, fire = dirX > 0 ? -Math.PI * 0.32 : -Math.PI * 0.68;
      if (u < 1.2) a = rest;
      else if (u < 1.75) a = rest + (fire - rest) * smooth((u - 1.2) / 0.55);
      else if (u < 3.5) a = fire;
      else if (u < 9) a = fire + (rest - fire) * smooth((u - 3.5) / 5.5);
      else a = rest;
      const haul = u > 0.8 && u < 1.9;
      // the arm (a tapering oak beam with the sling) drawn in screen space over the frame
      out.push({ x: f.x, y: f.y, sort: 0.0005, shadow: false, draw: (ctx, X, Y, z) => {
        const px = X + (pivX - f.x) * z, py = Y - pivLift * z;
        const L1 = 0.075 * z, L2 = 0.028 * z;
        const ex = px + Math.cos(a) * L1, ey = py + Math.sin(a) * L1 * 0.85;
        const sx = px - Math.cos(a) * L2, sy = py - Math.sin(a) * L2 * 0.85;
        ctx.lineCap = 'round';
        const arm = A.spriteFor('pierriere_arm', 0.07 * z * 2);
        const ai = A.spriteInfo('pierriere_arm');
        if (arm && ai) {
          // the arm miniature (flat, side-on): pivot near the rope end, beam rising 0.13 rad to the sling
          const W = 0.115 * z, Hh = (W * ai.h) / ai.w;
          ctx.save(); ctx.translate(px, py); ctx.rotate(a - 0.132);
          if (Math.cos(a) < 0) ctx.scale(1, -1); // keep the sling hanging below the beam
          ctx.drawImage(arm, -0.3 * W, -0.13 * Hh, W, Hh);
          ctx.restore();
        } else {
          ctx.strokeStyle = '#3b2a1b'; ctx.lineWidth = Math.max(1.2, z * 0.0075); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = '#8a6a48'; ctx.lineWidth = Math.max(0.7, z * 0.0045); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        }
        // hauling ropes from the short end down to the crew
        ctx.strokeStyle = 'rgba(70,55,35,0.85)'; ctx.lineWidth = Math.max(0.5, z * 0.0015);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(X + (-dirX * (0.035 + i * 0.008)) * z, Y - 0.012 * z); ctx.stroke(); }
        // the sling hanging from the long end (empty while the stone flies)
        if (!arm && (u < 1.75 || u > 6)) {
          const hx = ex + Math.cos(a + 1.2) * z * 0.01, hy = ey + z * 0.016;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = '#6d6a62'; ctx.beginPath(); ctx.arc(hx, hy, Math.max(0.8, z * 0.004), 0, TAU); ctx.fill();
        }
      } });
      if (hauler) {
        const lean = haul ? 0.004 : 0;
        out.push(fig(hauler, f.x - dirX * (0.045 + lean), f.y + 0.012, { flip: dirX < 0, lift: haul ? Math.abs(Math.sin(u * 9)) * 0.002 : 0 }));
      }
      if (eng) out.push(fig(eng, f.x + dirX * 0.05, f.y + 0.018, { flip: dirX > 0 }));
      // the stone in flight and the dust when it lands
      if (u >= 1.75 && u < 3.4) {
        const k = (u - 1.75) / 1.65;
        const sx0 = pivX + dirX * 0.07, sy0 = f.y;
        const x = sx0 + (v.tx - sx0) * k, y = sy0 + (v.ty - sy0) * k;
        const h = pivLift + 0.06 + Math.sin(k * Math.PI) * 0.28 - pivLift * k;
        out.push({ x, y, over: true, shadow: false, draw: (ctx, X, Y, z) => {
          ctx.fillStyle = 'rgba(20,15,5,0.2)'; ctx.beginPath(); ctx.ellipse(X + h * 0.3 * z, Y + h * 0.1 * z, z * 0.005, z * 0.0025, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#7d776c'; ctx.beginPath(); ctx.arc(X, Y - h * z, Math.max(1, z * 0.0045), 0, TAU); ctx.fill();
        } });
      }
      if (u >= 3.4 && u < 6.5 && v.inTile) {
        const k = (u - 3.4) / 3.1;
        out.push({ x: v.tx, y: v.ty, sort: 0.01, shadow: false, draw: (ctx, X, Y, z) => {
          for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * TAU;
            const d = (0.006 + k * 0.03) * z;
            drawPuff(ctx, X + Math.cos(ang) * d, Y - 0.01 * z + Math.sin(ang) * d * 0.4 - k * 0.02 * z, (0.008 + k * 0.016) * z, '#cdb88e', 0.55 * (1 - k));
          }
          // straw bits
          ctx.fillStyle = `rgba(220,190,110,${1 - k})`;
          for (let i = 0; i < 9; i++) { const ang = i * 0.7; ctx.fillRect(X + Math.cos(ang) * k * 0.05 * z, Y - 0.015 * z + Math.sin(ang) * k * 0.03 * z + k * k * 0.03 * z, Math.max(0.6, z * 0.002), Math.max(0.6, z * 0.0012)); }
        } });
      }
    },
  };
}

// Crossbowmen at the butts: span (foot in the stirrup), stand, aim, loose; the bolt flies, thunk.
function butts(v, seed) {
  const span = avail('crossbowman_spanning'), shoot = avail('crossbowman_shooting');
  if (!shoot) return null;
  const ph = (seed % 1000) / 100;
  const men = [{ x: v.ax, y: v.ay, d: 0 }, { x: v.ax - 0.025, y: v.ay + 0.03, d: 2.6 }];
  return {
    lod: 1,
    update(t, out) {
      for (const m of men) {
        const u = (t + ph + m.d) % 5.2;
        const id = u < 2.4 && span ? span : shoot;
        out.push(fig(id, m.x, m.y, { flip: v.bx > m.x }));
        if (u >= 3.6 && u < 3.85) {
          const k = (u - 3.6) / 0.25;
          const x = m.x + 0.02 + (v.bx - m.x - 0.03) * k, y = m.y + (v.by - m.y) * k;
          out.push({ x, y, over: true, shadow: false, draw: (ctx, X, Y, z) => {
            ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = Math.max(0.6, z * 0.0018);
            ctx.beginPath(); ctx.moveTo(X - 0.012 * z, Y - 0.024 * z); ctx.lineTo(X, Y - 0.024 * z); ctx.stroke();
          } });
        }
      }
    },
  };
}

// The juggler: three balls looping above his hands.
function juggler(x, y, seed) {
  const id = avail('juggler') || avail('minstrel') || avail('townsman');
  if (!id) return null;
  const ph = (seed % 1000) / 100;
  const cols = ['#c8322a', '#e2c43a', '#3c62b8'];
  return {
    lod: 2,
    update(t, out) {
      const T = t + ph;
      out.push(fig(id, x, y, { lift: Math.abs(Math.sin(step12(T) * 4)) * 0.001 }));
      const [, h] = sizeFor(id);
      out.push({ x, y, sort: 0.001, shadow: false, draw: (ctx, X, Y, z) => {
        for (let i = 0; i < 3; i++) {
          const k = frac(T * 0.9 + i / 3);
          const bx = X + Math.cos(k * TAU) * 0.008 * z, by = Y - (h * 0.95 + Math.abs(Math.sin(k * Math.PI)) * 0.022) * z;
          ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(bx, by, Math.max(0.8, z * 0.0022), 0, TAU); ctx.fill();
        }
      } });
    },
  };
}

// Bees swirling round the hives; a beekeeper with his smoking pot.
function bees(x, y, seed, n = 9) {
  const r = A.rng(seed);
  const list = Array.from({ length: n }, () => ({ rx: 0.01 + r() * 0.025, ry: 0.006 + r() * 0.015, w: 2 + r() * 3, ph: r() * TAU, lift: 0.02 + r() * 0.03 }));
  return {
    lod: 3,
    update(t, out) {
      out.push({ x, y, sort: 0.02, shadow: false, draw: (ctx, X, Y, z) => {
        ctx.fillStyle = '#2a2213';
        for (const b of list) {
          const a = t * b.w + b.ph;
          const bx = X + Math.cos(a) * b.rx * z, by = Y - b.lift * z + Math.sin(a * 1.3) * b.ry * z;
          ctx.fillRect(bx, by, Math.max(0.8, z * 0.0018), Math.max(0.8, z * 0.0014));
        }
      } });
    },
  };
}

// Sparks at the anvil when the hammer falls.
function sparks(x, y, lift, period, seed) {
  const r = A.rng(seed);
  const list = Array.from({ length: 8 }, () => ({ a: -Math.PI / 2 + (r() - 0.5) * 2.4, v: 0.02 + r() * 0.03 }));
  return (t, out) => {
    const k = frac(t / period);
    if (k > 0.35) return;
    const age = k / 0.35;
    out.push({ x, y, sort: 0.003, shadow: false, draw: (ctx, X, Y, z) => {
      for (const s of list) {
        const d = s.v * age * z;
        ctx.fillStyle = `rgba(255,${190 - age * 90 | 0},70,${1 - age})`;
        ctx.fillRect(X + Math.cos(s.a) * d, Y - lift * z + Math.sin(s.a) * d + age * age * 0.02 * z, Math.max(0.7, z * 0.0018), Math.max(0.7, z * 0.0018));
      }
    } });
  };
}

// A flock grazing and drifting, the shepherd and his dog keeping it together.
function flock(points, seed) {
  const sheep = avail('sheep_group');
  if (!sheep || points.length < 4) return null;
  const r = A.rng(seed);
  const shepherd = avail('shepherd'), dog = avail('guard_dog');
  const n = 3 + Math.floor(r() * 3);
  const offs = Array.from({ length: n }, () => [(r() - 0.5) * 0.09, (r() - 0.5) * 0.05, r() * TAU, r() < 0.5]);
  const centre = wanderer(points, 'x', seed + 1, { leg: 26, speed: 0.006, reach: 0.18 });
  const tmp = [];
  return {
    lod: 1,
    update(t, out) {
      tmp.length = 0; centre.update(t, tmp);
      const c = tmp[0];
      for (const [ox, oy, ph, fl] of offs) {
        const x = c.x + ox + Math.sin(t * 0.13 + ph) * 0.012, y = c.y + oy + Math.cos(t * 0.11 + ph) * 0.008;
        out.push(fig(sheep, x, y, { flip: fl, scale: 0.75 + (ph % 0.3), lift: Math.abs(Math.sin(t * 0.6 + ph)) * 0.0006 }));
      }
      if (shepherd) out.push(fig(shepherd, c.x - 0.07, c.y + 0.02, { flip: true }));
      if (dog) {
        const a = t * 0.5 + seed;
        out.push(fig(dog, c.x + Math.cos(a) * 0.08, c.y + Math.sin(a) * 0.045 + 0.01, { flip: Math.sin(a) < 0 }));
      }
    },
  };
}

// The ploughman and his oxen working a plot up and down; dust follows the share.
function plough(p, seed) {
  const id = avail('ploughman_oxen_ard');
  if (!id) return null;
  const ph = (seed % 1000) / 10;
  const len = Math.hypot(p.ex, p.ey) * 0.8;
  const ux = p.ex / (len / 0.8 || 1), uy = p.ey / (len / 0.8 || 1);
  return {
    lod: 1,
    update(t, out) {
      const C = 24;
      const u = ((t + ph) % C) / C;
      const s = u < 0.5 ? -1 + u * 4 : 3 - u * 4; // -1..1..-1
      const dir = u < 0.5 ? 1 : -1;
      const lane = (Math.floor((t + ph) / C) % 3 - 1) * 0.015;
      const x = p.cx + ux * len * s + uy * lane, y = p.cy + uy * len * s - ux * lane;
      const vx = ux * dir;
      out.push(fig(id, x, y, { flip: vx > 0, lift: Math.abs(Math.sin(step12(t) * 5)) * 0.001 }));
      out.push({ x: x - vx * 0.04, y, sort: -0.002, shadow: false, draw: (ctx, X, Y, z) => drawPuff(ctx, X, Y - 0.006 * z, 0.012 * z, '#b39570', 0.25) });
    },
  };
}

// A river scene on the bank: an angler (a fish leaps to his creel now and then) or washerwomen.
function bankFigure(river, id, seed, kind) {
  const pts = sampleSeg(river.seg, 24);
  const r = A.rng(seed);
  const i = 6 + Math.floor(r() * 12);
  const p = pts[i];
  const side = r() < 0.5 ? 1 : -1;
  const x = p.x + p.nx * side * RIVER_W * 0.62, y = p.y + p.ny * side * RIVER_W * 0.62;
  if (x < 0.06 || x > 0.94 || y < 0.08 || y > 0.96) return null;
  const ph = r() * 50;
  return {
    lod: 2,
    update(t, out) {
      const T = t + ph;
      if (kind === 'wash') {
        out.push(fig(id, x, y + 0.004, { flip: p.nx * side > 0, lift: Math.abs(Math.sin(step12(T) * 7)) * 0.0015 }));
        // soap foam drifting downstream
        for (let k = 0; k < 5; k++) {
          const age = frac(T / 7 + k / 5);
          const q = pts[Math.min(pts.length - 1, i + Math.floor(age * 6))];
          out.push({ x: q.x - p.nx * side * RIVER_W * 0.25, y: q.y - p.ny * side * RIVER_W * 0.25, sort: -0.05, shadow: false, draw: (ctx, X, Y, z) => drawPuff(ctx, X, Y, 0.005 * z, '#f4f4ee', 0.5 * (1 - age)) });
        }
      } else {
        out.push(fig(id, x, y + 0.004, { flip: p.nx * side > 0 }));
        const k = frac(T / 9);
        if (k < 0.12) {
          const a = k / 0.12;
          const fx = x - p.nx * side * RIVER_W * 0.45 * (1 - a), fy = y - p.ny * side * RIVER_W * 0.45 * (1 - a);
          out.push({ x: fx, y: fy, over: true, shadow: false, draw: (ctx, X, Y, z) => {
            ctx.fillStyle = '#c9d2d4'; ctx.beginPath(); ctx.ellipse(X, Y - Math.sin(a * Math.PI) * 0.04 * z, z * 0.004, z * 0.0016, a * 6, 0, TAU); ctx.fill();
          } });
        }
      }
    },
  };
}

// Pigeons bursting from a roof when the bells ring (every ~40 s).
function bellPigeons(x, y, lift, seed) {
  const r = A.rng(seed);
  const list = Array.from({ length: 9 }, () => ({ a: -Math.PI / 2 + (r() - 0.5) * 2.6, v: 0.12 + r() * 0.15, f: 8 + r() * 4 }));
  const ph = r() * 40;
  return {
    lod: 1,
    update(t, out) {
      const k = ((t + ph) % 40) / 4;
      if (k > 1) return;
      out.push({ x, y, over: true, shadow: false, draw: (ctx, X, Y, z) => {
        ctx.strokeStyle = '#8f8f94'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, z * 0.0025);
        for (const b of list) {
          const d = b.v * smooth(k) * z;
          const bx = X + Math.cos(b.a) * d, by = Y - lift * z + Math.sin(b.a) * d * 0.7 - k * 0.05 * z;
          const fl = Math.sin(t * b.f) * z * 0.004, s = z * 0.006;
          ctx.globalAlpha = 1 - Math.max(0, k - 0.75) * 4;
          ctx.beginPath(); ctx.moveTo(bx - s, by + fl); ctx.lineTo(bx, by); ctx.lineTo(bx + s, by + fl); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // the sound of the bells: a faint ring spreading
        if (k < 0.6) { ctx.strokeStyle = `rgba(255,240,200,${0.35 * (1 - k / 0.6)})`; ctx.lineWidth = Math.max(0.6, z * 0.002); ctx.beginPath(); ctx.ellipse(X, Y - lift * z, k * 0.2 * z, k * 0.09 * z, 0, 0, TAU); ctx.stroke(); }
      } });
    },
  };
}

// The stork: on its nest atop a tower, off for a circuit now and then (wings up/down).
function stork(tower, seed) {
  const nest = avail('stork_nest');
  const up = avail('stork_wings_up'), down = avail('stork_wings_down');
  if (!nest) return null;
  const top = tower.h * 0.92;
  const ph = (seed % 1000) / 10;
  return {
    lod: 1,
    update(t, out) {
      const u = (t + ph) % 45;
      const away = up && down && u > 30;
      out.push(fig(nest, tower.x, tower.y, { lift: top, sort: 0.001, shadow: false, scale: away ? 0.9 : 1 }));
      if (away) {
        const k = (u - 30) / 15;
        const a = k * TAU;
        const x = tower.x + Math.sin(a) * 0.3, y = tower.y - 0.1 + (1 - Math.cos(a)) * 0.12;
        const lift = top + 0.12 * Math.sin(k * Math.PI) + 0.02;
        out.push({ ...fig(Math.floor(t * 4) % 2 ? up : down, x, y, { flip: Math.cos(a) > 0, lift, shadow: false }), over: true });
      }
    },
  };
}

// ---------- building a tile's cast ----------
const cache = new Map();
export function getActors(key, scene) {
  const ck = `${key}|${scene.id}|${scene.rot}|${scene.variant}`;
  let list = cache.get(ck);
  if (!list) { list = buildActors(key, scene); cache.set(ck, list); if (cache.size > 400) cache.delete(cache.keys().next().value); }
  return list;
}

function buildActors(key, scene) {
  const seed = A.hash('actors', key, scene.id);
  const r = A.rng(seed);
  const acts = [];
  const add = (a) => { if (a) acts.push(a); };
  const any = (list) => list.filter((id) => A.hasSprite(id));
  const [tx, ty] = key.split(',').map(Number);
  const lord = lordAt(tx || 0, ty || 0);

  // travellers on every road
  const travellers = any(GROUPS.travellers);
  scene.roads.forEach((road, i) => {
    if (!travellers.length) return;
    const n = road.dead ? 1 : 1 + (r() < 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const id = travellers[Math.floor(r() * travellers.length)];
      const slow = id === 'hay_cart' || id === 'mule_packed' || id === 'donkey_rider';
      add(roadWalker(road, id, A.hash(seed, 'road', i, k), { speed: slow ? 0.018 : id === 'knight_mounted' || id === 'palfrey_rider' ? 0.04 : 0.026 }));
    }
  });
  // townsfolk in the lanes, sentries on the walls, flags and storks on the towers
  const folk = any(GROUPS.townsfolk);
  for (const [fi, pts] of scene.cityFree) {
    if (pts.length < 3 || !folk.length) continue;
    const n = Math.min(9, Math.max(2, Math.round(pts.length / 14)));
    for (let k = 0; k < n; k++) add(wanderer(pts, folk[Math.floor(r() * folk.length)], A.hash(seed, 'folk', fi, k), { lod: k < 2 ? 1 : 2 }));
  }
  // the princess strolls her town with a lady-in-waiting a step behind
  const princessCity = scene.cities.find((c) => c.princess);
  if (princessCity && A.hasSprite('princess')) {
    const pts = scene.cityFree.get(princessCity.fi) || [];
    if (pts.length > 2) {
      const w = wanderer(pts, 'princess', A.hash(seed, 'princess'), { leg: 9, speed: 0.012, lod: 1 });
      const lady = avail('noble_lady');
      add({ lod: 1, update(t, out) {
        const n = out.length; w.update(t, out);
        const p = out[n];
        if (p && lady) out.push(fig(lady, p.x + (p.flip ? -0.025 : 0.025), p.y - 0.006, { flip: p.flip, lift: p.lift }));
      } });
    }
  }
  const sentry = avail('sergeant_spear');
  scene.walls.forEach((w, i) => {
    if (sentry && w.pts[w.pts.length - 1].s > 0.35 && r() < 0.85) add(wallPatrol(w, i % 3 === 2 && avail('crossbowman_shooting') ? avail('crossbowman_shooting') : sentry, A.hash(seed, 'wall', i)));
  });
  scene.towers.forEach((tw, i) => {
    if (i === 0 || r() < 0.3) add(flag(tw.x, tw.y, tw.h * 0.86, lord, A.hash(seed, 'flag', i), { sort: 0.001 }));
  });
  if (scene.towers.length && r() < 0.45) add(stork(scene.towers[Math.floor(r() * scene.towers.length)], seed));

  // the vignettes
  if (scene.vign.treb) add(trebuchet(scene.vign.treb, seed));
  if (scene.vign.butts) add(butts(scene.vign.butts, seed));
  for (const o of scene.statics) {
    if (o.tag === 'smithy') {
      const up = avail('blacksmith_up'), down = avail('blacksmith_down');
      const sx = o.x + o.w * 0.28, sy = o.y + 0.012;
      const sp = sparks(sx - 0.008, sy, 0.02, 0.8, seed);
      if (up) add(twoPose(up, down || up, sx, sy, 0.8, seed, { flip: true, split: 0.6, extra: (t, u, out) => sp(t, out) }));
      add(smoke(o.x - o.w * 0.1, o.y - o.h * 0.05, o.h * 0.75, { seed: 3, n: 5, alpha: 0.3 }));
    } else if (o.tag === 'bakehouse') {
      add(smoke(o.x + o.w * 0.15, o.y - o.h * 0.1, o.h * 0.7, { seed: 5, n: 7, alpha: 0.45 }));
    } else if (o.tag === 'inn' || o.tag === 'farmhouse') {
      add(smoke(o.x + o.w * 0.1, o.y - o.h * 0.2, o.h * 0.75, { seed: 7, n: 6, alpha: 0.35 }));
    } else if (o.tag === 'cottage' && r() < 0.35) {
      add(smoke(o.x, o.y - o.h * 0.15, o.h * 0.7, { seed: 9, n: 5, alpha: 0.25, r1: 0.016 }));
    } else if (o.tag === 'house' && r() < 0.08) {
      add(smoke(o.x, o.y - o.h * 0.15, o.h * 0.8, { seed: 11, n: 5, alpha: 0.22, r1: 0.015, lod: 2 }));
    } else if (o.tag === 'cathedral' || o.tag === 'church' || o.tag === 'monastery') {
      add(bellPigeons(o.x - o.w * 0.2, o.y - o.h * 0.2, o.h * 0.75, seed));
    } else if (o.tag === 'volcano') {
      add(smoke(o.x, o.y - o.h * 0.1, o.h * 0.85, { seed: 13, n: 10, rise: 0.3, r0: 0.012, r1: 0.05, alpha: 0.55, color: '#6f6862', period: 7, over: true }));
      add({ lod: 1, update(t, out) {
        const p = 0.6 + 0.4 * Math.sin(t * 2.1) * Math.sin(t * 0.7);
        out.push({ x: o.x, y: o.y, sort: 0.001, shadow: false, draw: (ctx, X, Y, z) => {
          const cy = Y - o.h * 0.86 * z;
          const g = ctx.createRadialGradient(X, cy, 0, X, cy, 0.05 * z);
          g.addColorStop(0, `rgba(255,190,80,${0.55 * p})`); g.addColorStop(1, 'rgba(255,90,20,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, cy, 0.05 * z, 0.025 * z, 0, 0, TAU); ctx.fill();
        } });
      } });
    } else if (o.tag === 'highwaymen') {
      add(smoke(o.x + 0.02, o.y + 0.01, 0.005, { seed: 17, n: 5, alpha: 0.3, rise: 0.07, r1: 0.014, lod: 2 }));
    } else if (o.tag === 'portal') {
      add({ lod: 1, update(t, out) {
        const p = 0.55 + 0.45 * Math.sin(t * 1.7);
        out.push({ x: o.x, y: o.y, sort: 0.002, shadow: false, draw: (ctx, X, Y, z) => {
          const cy = Y - o.h * 0.35 * z;
          const g = ctx.createRadialGradient(X, cy, 0, X, cy, 0.07 * z);
          g.addColorStop(0, `rgba(200,230,255,${0.6 * p})`); g.addColorStop(0.5, `rgba(140,170,255,${0.25 * p})`); g.addColorStop(1, 'rgba(120,90,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, cy, 0.07 * z, 0.05 * z, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,240,0.8)';
          for (let i = 0; i < 6; i++) { const a = t * 0.6 + i; ctx.fillRect(X + Math.cos(a) * 0.04 * z, cy + Math.sin(a * 1.3) * 0.03 * z - frac(t * 0.2 + i / 6) * 0.03 * z, Math.max(0.6, z * 0.0015), Math.max(0.6, z * 0.0015)); }
        } });
      } });
    }
  }
  // the mill wheel turning in the race, with spray
  if (scene.marks.mill && A.hasSprite('mill_wheel')) {
    const m = scene.marks.mill;
    const sq = 0.3 + 0.7 * Math.abs(m.tx);
    add({ lod: 1, update(t, out) {
      out.push({ x: m.x, y: m.y + 0.002, sort: 0.001, shadow: false, draw: (ctx, X, Y, z) => {
        const img = A.spriteFor('mill_wheel', 0.07 * z * 2);
        if (!img) return;
        const W = 0.07 * z;
        ctx.save(); ctx.translate(X, Y - W * 0.3); ctx.scale(sq, 1); ctx.rotate(t * 1.4);
        ctx.drawImage(img, -W / 2, -W / 2, W, W);
        ctx.restore();
        for (let k = 0; k < 5; k++) { const age = frac(t * 0.8 + k / 5); drawPuff(ctx, X + (k - 2) * 0.006 * z, Y - age * 0.02 * z, (0.004 + age * 0.008) * z, '#f2f5f2', 0.45 * (1 - age)); }
      } });
    } });
  }
  // the bazaar and the cathedral square: a crowd, a juggler
  if (scene.marks.bazaar) {
    const [cx, cy, br] = scene.marks.bazaar;
    const pts = [];
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * br * 0.75; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.75 + 0.02]); }
    for (let k = 0; k < 9 && folk.length; k++) add(wanderer(pts, folk[Math.floor(r() * folk.length)], A.hash(seed, 'market', k), { leg: 5 + r() * 4, reach: 0.12, lod: k < 3 ? 1 : 2 }));
    add(juggler(cx + 0.01, cy + 0.03, seed));
    const minstrel = avail('minstrel');
    if (minstrel) add(twoPose(minstrel, minstrel, cx - 0.06, cy + 0.06, 1, seed, { bob: 0.0012, bobRate: 3 }));
  }
  // the monastery: monks walking round, the beekeeper by his hives
  if (scene.marks.monasteryAt) {
    const [mx, my, ms] = scene.marks.monasteryAt;
    const clergy = any(GROUPS.clergy);
    const ring = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const x = mx + Math.cos(a) * 0.24 * ms, y = my + 0.08 + Math.sin(a) * 0.08 * ms; if (x > 0.05 && x < 0.95 && y > 0.05 && y < 0.97 && scene.typeAt(x, y) !== 'road') ring.push([x, y]); }
    for (let k = 0; k < 3 && clergy.length && ring.length > 3; k++) add(wanderer(ring, clergy[k % clergy.length], A.hash(seed, 'monk', k), { leg: 8, reach: 0.2, lod: 1 }));
  }
  if (scene.marks.gardenAt || scene.marks.monasteryAt) {
    const [gx, gy] = scene.marks.gardenAt || [scene.marks.monasteryAt[0] + 0.2, scene.marks.monasteryAt[1] + 0.2];
    const hoe = avail('monk_hoeing');
    if (hoe && scene.marks.gardenAt) add(twoPose(hoe, hoe, gx - 0.04, gy + 0.03, 1.2, seed, { bob: 0.002, bobRate: 3 }));
    if (scene.marks.bees) add(bees(scene.marks.bees[0], scene.marks.bees[1] - 0.03, seed));
    const keeper = avail('lay_brother_beekeeper');
    if (keeper && scene.marks.gardenAt) {
      add(twoPose(keeper, keeper, gx + 0.1, gy + 0.05, 2, seed + 1, { extra: (t, u, out) => out.push({ x: gx + 0.1, y: gy + 0.05, sort: 0.002, shadow: false, draw: (ctx, X, Y, z) => drawPuff(ctx, X - 0.01 * z + frac(t / 2) * 0.01 * z, Y - (0.03 + frac(t / 2) * 0.03) * z, 0.008 * z, '#dddad2', 0.35 * (1 - frac(t / 2))) }) }));
    }
  }
  // the country: flocks, ploughing, reapers, kites, butterflies
  if (scene.fieldFree.length > 10 && r() < 0.5) add(flock(scene.fieldFree, seed));
  for (const p of scene.patches) {
    if (p.kind === 'ploughed') add(plough(p, A.hash(seed, p.seed)));
    else if (p.kind === 'wheat_ripe') {
      const folk2 = any(GROUPS.fieldFolk);
      if (folk2.length) add(twoPose(folk2[p.seed % folk2.length], folk2[p.seed % folk2.length], p.cx + p.ex * 0.5, p.cy + 0.02, 1.4, p.seed, { bob: 0.002, bobRate: 4, flip: (p.seed & 2) > 0 }));
    }
  }
  if (scene.fieldFree.length > 6 && r() < 0.5) {
    const [cx, cy] = scene.fieldFree[Math.floor(r() * scene.fieldFree.length)];
    add(birds(cx, cy, A.hash(seed, 'birds'), { lod: 1 }));
  }
  if (scene.fieldFree.length > 4 && r() < 0.25) {
    const [cx, cy] = scene.fieldFree[0];
    add(birds(cx, cy, A.hash(seed, 'kite'), { n: 1, size: 0.03, color: '#5a3a22', lod: 1 }));
  }
  // the river: ducks, punts, an angler, washerwomen
  scene.rivers.forEach((rv, i) => {
    const ducks = avail('ducks');
    if (ducks && r() < 0.7) add(riverCraft(rv, ducks, A.hash(seed, 'duck', i), { speed: 0.008 }));
    const boat = A.hasSprite('punt_fishermen') ? 'punt_fishermen' : A.hasSprite('ferry') ? 'ferry' : null;
    if (boat && r() < 0.4) add(riverCraft(rv, boat, A.hash(seed, 'boat', i), { speed: 0.01 }));
    const angler = avail('angler'), wash = avail('washerwomen');
    if (angler && r() < 0.5) add(bankFigure(rv, angler, A.hash(seed, 'angler', i), 'fish'));
    else if (wash && r() < 0.6) add(bankFigure(rv, wash, A.hash(seed, 'wash', i), 'wash'));
  });
  return acts;
}

// Animated water: ripples drifting downstream and glints, masked to the river.
export function drawWater(ctx, scene, t, X0, Y0, z) {
  if (!scene.rivers.length && !scene.lakes.length) return;
  const toX = (x) => X0 + (x - 0.5) * z, toY = (y) => Y0 + (y - 0.5) * z;
  ctx.save();
  ctx.lineCap = 'round';
  for (const rv of scene.rivers) {
    const pts = rv._pts || (rv._pts = sampleSeg(rv.seg, 30));
    const L = pts[pts.length - 1].s;
    const flow = rv.spring ? -1 : 1;
    const n = 14;
    for (let k = 0; k < n; k++) {
      const lane = ((k * 7919) % 100) / 100 - 0.5;
      const sp = 0.035 * (1 - Math.abs(lane) * 0.8);
      const d = frac(k / n + flow * t * sp / L) * L;
      const p = along(pts, d), q = along(pts, Math.min(L, d + 0.03));
      const off = lane * RIVER_W * 0.7;
      const a = Math.min(1, Math.min(d, L - d) / 0.04) * (0.5 + 0.5 * Math.sin(t * 1.3 + k));
      ctx.strokeStyle = k % 3 ? `rgba(230,240,232,${0.22 * a})` : `rgba(20,40,34,${0.18 * a})`;
      ctx.lineWidth = Math.max(0.6, z * (k % 3 ? 0.0025 : 0.003));
      ctx.beginPath(); ctx.moveTo(toX(p.x + p.nx * off), toY(p.y + p.ny * off)); ctx.lineTo(toX(q.x + q.nx * off), toY(q.y + q.ny * off)); ctx.stroke();
    }
    // glints
    for (let k = 0; k < 6; k++) {
      const d = (((k * 0.37 + 0.11) % 1) * L);
      const p = along(pts, d);
      const tw = Math.max(0, Math.sin(t * 2.5 + k * 2.1));
      if (tw < 0.6) continue;
      const off = (((k * 31) % 10) / 10 - 0.5) * RIVER_W * 0.6;
      ctx.fillStyle = `rgba(255,252,235,${(tw - 0.6) * 1.6})`;
      ctx.beginPath(); ctx.ellipse(toX(p.x + p.nx * off), toY(p.y + p.ny * off), z * 0.004, z * 0.0015, 0, 0, TAU); ctx.fill();
    }
  }
  for (const lk of scene.lakes) {
    for (let k = 0; k < 3; k++) {
      const age = frac(t / 5 + k / 3);
      const cx = lk.x + Math.cos(k * 2.3) * lk.rx * 0.4, cy = lk.y + Math.sin(k * 2.3) * lk.ry * 0.4;
      ctx.strokeStyle = `rgba(235,240,232,${0.3 * (1 - age)})`; ctx.lineWidth = Math.max(0.6, z * 0.002);
      ctx.beginPath(); ctx.ellipse(toX(cx), toY(cy), age * lk.rx * 0.35 * z, age * lk.ry * 0.3 * z, 0, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}
export { drawPuff };
