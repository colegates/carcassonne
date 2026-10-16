// Board renderer: camera, pan/pinch-zoom, tiles, meeples, overlays & effects.
import { TILE_TYPES } from './tiles.js';
import { getTileArt, drawMeeple, getTableTexture, rotUnit, ART_SIZE } from './art.js';
import { parseKey, PLAYER_COLORS } from './game.js';

const HIT = 96;
const maskCache = new Map();
export function featureMask(id, fi, color) {
  const ck = `${id}|${fi}|${color}`;
  if (maskCache.has(ck)) return maskCache.get(ck);
  const { label } = getTileArt(id);
  const small = document.createElement('canvas'); small.width = small.height = HIT;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(HIT, HIT);
  for (let i = 0; i < label.length; i++) if (label[i] === fi) img.data[i * 4 + 3] = 255;
  sctx.putImageData(img, 0, 0);
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.filter = 'blur(2px)';
  ctx.drawImage(small, 0, 0, 192, 192);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color; ctx.fillRect(0, 0, 192, 192);
  maskCache.set(ck, c);
  return c;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

export class BoardView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, z: 90 };
    this.camTarget = null;
    this.state = null;
    this.vm = {};
    this.effects = [];
    this.pointers = new Map();
    this.onTap = null;
    this.dirty = true;
    this.tablePattern = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    const loop = (now) => { this.frame(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr;
    const r = this.canvas.getBoundingClientRect();
    this.w = r.width || window.innerWidth; this.h = r.height || window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.dirty = true;
  }

  // Safe area of the board not covered by top bar / dock
  viewport() {
    const top = (document.getElementById('topbar')?.offsetHeight || 60) + 10;
    const bottom = (document.getElementById('dock')?.offsetHeight || 120) + 10;
    return { top, bottom, cx: this.w / 2, cy: top + (this.h - top - bottom) / 2, vh: this.h - top - bottom };
  }

  toScreen(wx, wy) {
    const { cx, cy } = this.viewport();
    return [(wx - this.cam.x) * this.cam.z + cx, (wy - this.cam.y) * this.cam.z + cy];
  }
  toWorld(sx, sy) {
    const { cx, cy } = this.viewport();
    return [(sx - cx) / this.cam.z + this.cam.x, (sy - cy) / this.cam.z + this.cam.y];
  }

  setState(state) { this.state = state; this.dirty = true; }
  setVM(vm) { this.vm = { ...this.vm, ...vm }; this.dirty = true; }

  bounds(extra = []) {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    const keys = this.state ? Object.keys(this.state.board) : [];
    for (const k of keys) {
      const [x, y] = parseKey(k);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    for (const [x, y] of extra) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { minX, maxX, minY, maxY };
  }

  fit(animate = true, extra = []) {
    const b = this.bounds(extra);
    const { vh } = this.viewport();
    const wTiles = b.maxX - b.minX + 2, hTiles = b.maxY - b.minY + 2;
    const z = Math.max(34, Math.min(110, Math.min(this.w / wTiles, vh / hTiles)));
    const target = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z };
    if (animate) this.animateCam(target); else { this.cam = target; this.dirty = true; }
  }

  // Make sure a world point is comfortably visible
  ensureVisible(x, y, minZ = 0) {
    const [sx, sy] = this.toScreen(x, y);
    const { top, bottom } = this.viewport();
    const m = this.cam.z * 0.9;
    const z = Math.max(this.cam.z, minZ);
    if (sx < m || sx > this.w - m || sy < top + m || sy > this.h - bottom - m || z !== this.cam.z) {
      this.animateCam({ x: lerpN(this.cam.x, x, 0.7), y: lerpN(this.cam.y, y, 0.7), z });
    }
  }

  animateCam(target, dur = 550) {
    this.camTarget = { from: { ...this.cam }, to: target, start: performance.now(), dur };
    this.dirty = true;
  }

  addEffect(e) {
    e.start = performance.now() + (e.delay || 0);
    this.effects.push(e);
    this.dirty = true;
    return new Promise((res) => { e.done = res; });
  }

  // ---------- input ----------
  bindInput() {
    const c = this.canvas;
    let tapStart = null;
    let pinch = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.camTarget = null;
      if (this.pointers.size === 1) tapStart = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      else { tapStart = null; pinch = this.pinchInfo(); }
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 1) {
        if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 9) tapStart.moved = true;
        if (!tapStart || tapStart.moved) {
          this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z; this.dirty = true;
        }
      } else if (this.pointers.size === 2 && pinch) {
        const now = this.pinchInfo();
        const [wx, wy] = this.toWorld(pinch.mx, pinch.my);
        this.cam.z = clamp(pinch.z * (now.d / pinch.d), 24, 260);
        // keep the pinch centre anchored
        const { cx, cy } = this.viewport();
        this.cam.x = wx - (now.mx - cx) / this.cam.z;
        this.cam.y = wy - (now.my - cy) / this.cam.z;
        pinch = { ...now, z: this.cam.z };
        this.dirty = true;
      }
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) pinch = null;
      if (this.pointers.size === 1) {
        // continue panning with the remaining finger without a jump
        tapStart = null;
      }
      if (tapStart && !tapStart.moved && e.type === 'pointerup' && performance.now() - tapStart.t < 600) {
        const [wx, wy] = this.toWorld(e.clientX, e.clientY);
        this.onTap?.(wx, wy);
      }
      if (this.pointers.size === 0) tapStart = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [wx, wy] = this.toWorld(e.clientX, e.clientY);
      this.cam.z = clamp(this.cam.z * Math.exp(-e.deltaY * 0.0015), 24, 260);
      const { cx, cy } = this.viewport();
      this.cam.x = wx - (e.clientX - cx) / this.cam.z;
      this.cam.y = wy - (e.clientY - cy) / this.cam.z;
      this.dirty = true;
    }, { passive: false });
  }

  pinchInfo() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: this.cam.z };
  }

  // ---------- rendering ----------
  frame(now) {
    if (this.camTarget) {
      const { from, to, start, dur } = this.camTarget;
      const t = Math.min(1, (now - start) / dur), e = easeOut(t);
      this.cam = { x: lerpN(from.x, to.x, e), y: lerpN(from.y, to.y, e), z: lerpN(from.z, to.z, e) };
      if (t >= 1) this.camTarget = null;
      this.dirty = true;
    }
    const animating = this.effects.length > 0 || this.vm.candidates?.length || this.vm.ghosts?.length || this.vm.tentative;
    if (!this.dirty && !animating) return;
    this.dirty = false;
    this.draw(now);
  }

  draw(now) {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTable();
    if (!this.state) return;
    const z = this.cam.z;
    const board = this.state.board;
    const entries = Object.entries(board);
    const visible = [];
    for (const [k, tile] of entries) {
      const [x, y] = parseKey(k);
      const [sx, sy] = this.toScreen(x, y);
      if (sx < -z || sy < -z || sx > this.w + z || sy > this.h + z) continue;
      visible.push({ k, tile, x, y, sx, sy });
    }
    const dropFx = new Map();
    for (const e of this.effects) if (e.type === 'drop') dropFx.set(e.key, e);

    // shadows
    ctx.fillStyle = 'rgba(15,8,2,0.45)';
    for (const v of visible) {
      if (dropFx.has(v.k)) continue;
      ctx.fillRect(v.sx - z / 2 + z * 0.035, v.sy - z / 2 + z * 0.05, z, z);
    }
    // tiles
    for (const v of visible) {
      const fx = dropFx.get(v.k);
      let scale = 1, alpha = 1, lift = 0;
      if (fx) {
        const t = clamp((now - fx.start) / fx.dur, 0, 1);
        if (t <= 0) continue;
        scale = 1 + 0.35 * (1 - easeOutBack(t));
        alpha = Math.min(1, t * 3);
        lift = (1 - easeOut(t)) * z * 0.25;
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = 'rgba(15,8,2,1)';
        const sz = z * (1 + 0.15 * (1 - t));
        ctx.fillRect(v.sx - sz / 2 + z * 0.06 + lift * 0.5, v.sy - sz / 2 + z * 0.08 + lift, sz, sz);
        ctx.globalAlpha = alpha;
      }
      this.drawTile(v.tile.t, v.tile.r, v.sx, v.sy - lift, z * scale);
      ctx.globalAlpha = 1;
    }
    // last placed tile marker
    if (this.vm.lastKey && board[this.vm.lastKey] && !this.vm.tentative) {
      const [x, y] = parseKey(this.vm.lastKey);
      const [sx, sy] = this.toScreen(x, y);
      ctx.strokeStyle = this.vm.lastColor || 'rgba(255,230,140,0.9)';
      ctx.lineWidth = Math.max(2, z * 0.035);
      ctx.setLineDash([z * 0.12, z * 0.06]);
      ctx.strokeRect(sx - z / 2 + 1, sy - z / 2 + 1, z - 2, z - 2);
      ctx.setLineDash([]);
    }
    // feature glows
    for (const e of this.effects) if (e.type === 'glow') this.drawGlow(e, now);
    if (this.vm.highlight) this.drawHighlight(this.vm.highlight, now);
    // candidate spots
    if (this.vm.candidates) this.drawCandidates(now);
    // tentative tile
    if (this.vm.tentative) this.drawTentative(now);
    // meeples
    const popFx = new Map();
    for (const e of this.effects) if (e.type === 'pop') popFx.set(e.key, e);
    const hidden = this.vm.hiddenMeeples || new Set();
    for (const v of visible) {
      if (!v.tile.m || hidden.has(v.k)) continue;
      const fx = popFx.get(v.k);
      let dy = 0, a = 1;
      if (fx) {
        const t = clamp((now - fx.start) / fx.dur, 0, 1);
        if (t <= 0) continue;
        dy = -(1 - easeOutBounce(t)) * z * 0.9; a = Math.min(1, t * 4);
      }
      this.drawPlacedMeeple(v.tile, v.k, v.sx, v.sy + dy, a);
    }
    for (const m of this.vm.extraMeeples || []) {
      const tile = board[m.key]; if (!tile) continue;
      const [x, y] = parseKey(m.key); const [sx, sy] = this.toScreen(x, y);
      this.drawPlacedMeeple({ ...tile, m: { p: m.p, f: m.f } }, m.key, sx, sy, 1);
    }
    // ghost meeple choices
    if (this.vm.ghosts) this.drawGhosts(now);
    // transient effects on top
    this.effects = this.effects.filter((e) => {
      const t = (now - e.start) / e.dur;
      if (e.type === 'float') this.drawFloat(e, t);
      if (e.type === 'fly') this.drawFly(e, t);
      if (e.type === 'sparkle') this.drawSparkle(e, t);
      if (t >= 1) { e.done?.(); return false; }
      return true;
    });
  }

  drawTable() {
    const { ctx } = this;
    if (!this.tablePattern) this.tablePattern = ctx.createPattern(getTableTexture(), 'repeat');
    const s = clamp(this.cam.z / 90, 0.35, 2.5) * 0.9;
    const [ox, oy] = this.toScreen(0, 0);
    this.tablePattern.setTransform(new DOMMatrix().translate(ox, oy).scale(s));
    ctx.fillStyle = this.tablePattern;
    ctx.fillRect(0, 0, this.w, this.h);
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.25, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    g.addColorStop(0, 'rgba(255,200,120,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
  }

  drawTile(t, r, sx, sy, size, ctx = this.ctx) {
    const art = getTileArt(t).canvas;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate((r * Math.PI) / 2);
    ctx.drawImage(art, 0, 0, ART_SIZE, ART_SIZE, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  anchorScreen(t, r, fi, sx, sy, z = this.cam.z) {
    const [ax, ay] = getTileArt(t).anchors[fi];
    const [rx, ry] = rotUnit(ax, ay, r);
    return [sx + (rx - 0.5) * z, sy + (ry - 0.5) * z];
  }

  drawPlacedMeeple(tile, k, sx, sy, alpha = 1) {
    const p = this.state.players[tile.m.p];
    const color = PLAYER_COLORS[p.color];
    const feat = TILE_TYPES[tile.t].features[tile.m.f];
    const [mx, my] = this.anchorScreen(tile.t, tile.r, tile.m.f, sx, sy);
    drawMeeple(this.ctx, mx, my, this.cam.z * 0.3, color, { lying: feat.type === 'field', alpha });
  }

  drawCandidates(now) {
    const { ctx } = this;
    const z = this.cam.z;
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    for (const c of this.vm.candidates) {
      const [sx, sy] = this.toScreen(c.x, c.y);
      const inset = z * 0.06;
      const good = c.good;
      ctx.fillStyle = good ? `rgba(255,224,110,${0.16 + 0.14 * pulse})` : `rgba(255,255,255,${0.06 + 0.05 * pulse})`;
      roundRect(ctx, sx - z / 2 + inset, sy - z / 2 + inset, z - 2 * inset, z - 2 * inset, z * 0.1);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, z * (good ? 0.035 : 0.022));
      ctx.strokeStyle = good ? `rgba(255,215,90,${0.65 + 0.35 * pulse})` : 'rgba(255,255,255,0.45)';
      ctx.setLineDash(good ? [] : [z * 0.08, z * 0.06]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (c.hint) {
        ctx.font = `${Math.round(z * 0.38)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💡', sx, sy);
      }
    }
  }

  drawTentative(now) {
    const { ctx } = this;
    const z = this.cam.z;
    const t = this.vm.tentative;
    const [sx, sy] = this.toScreen(t.x, t.y);
    let rot = t.r;
    // animate rotation
    if (t.animFrom !== undefined) {
      const k = clamp((now - t.animStart) / 220, 0, 1);
      let from = t.animFrom, to = t.r;
      if (to < from) to += 4;
      rot = lerpN(from, to, easeOut(k));
      if (k >= 1) delete t.animFrom;
    }
    const lift = z * 0.06;
    ctx.fillStyle = 'rgba(10,5,0,0.45)';
    ctx.fillRect(sx - z / 2 + z * 0.08, sy - z / 2 + z * 0.1, z, z);
    ctx.save();
    ctx.translate(sx, sy - lift);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.drawImage(getTileArt(t.t).canvas, -z / 2, -z / 2, z, z);
    ctx.restore();
    const pulse = 0.5 + 0.5 * Math.sin(now / 200);
    ctx.lineWidth = Math.max(2.5, z * 0.05);
    ctx.strokeStyle = t.ok ? `rgba(120,255,120,${0.6 + 0.4 * pulse})` : `rgba(255,80,60,${0.6 + 0.4 * pulse})`;
    ctx.strokeRect(sx - z / 2, sy - z / 2 - lift, z, z);
    // edge-match indicators
    if (t.edgeHints) {
      for (const [side, ok] of t.edgeHints) {
        const [ex, ey] = [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]][side];
        ctx.fillStyle = ok ? '#4fd14a' : '#ff4b3a';
        ctx.beginPath(); ctx.arc(sx + ex * z, sy + ey * z - lift, Math.max(4, z * 0.07), 0, 7); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    }
  }

  drawGhosts(now) {
    const z = this.cam.z;
    const pulse = 0.5 + 0.5 * Math.sin(now / 230);
    for (const g of this.vm.ghosts) {
      const tile = this.state.board[g.key];
      const [x, y] = parseKey(g.key);
      const [sx, sy] = this.toScreen(x, y);
      const [mx, my] = this.anchorScreen(tile.t, tile.r, g.fi, sx, sy);
      const lying = TILE_TYPES[tile.t].features[g.fi].type === 'field';
      if (g.selected) {
        drawMeeple(this.ctx, mx, my - z * 0.04 * pulse, z * 0.32, this.vm.ghostColor, { lying });
      } else {
        const ctx = this.ctx;
        ctx.fillStyle = `rgba(255,240,170,${0.25 + 0.25 * pulse})`;
        ctx.beginPath(); ctx.arc(mx, my, z * 0.19, 0, 7); ctx.fill();
        drawMeeple(ctx, mx, my, z * 0.26, this.vm.ghostColor, { lying, alpha: 0.55 + 0.25 * pulse });
      }
      if (g.label && (g.selected || this.vm.showLabels)) {
        this.label(mx, my + z * 0.24, g.label);
      }
    }
  }

  label(x, y, text) {
    const { ctx } = this;
    ctx.font = `800 ${Math.max(11, Math.round(this.cam.z * 0.13))}px Nunito, sans-serif`;
    const w = ctx.measureText(text).width + 12, h = Math.max(16, this.cam.z * 0.18);
    ctx.fillStyle = 'rgba(30,18,8,0.85)';
    roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#ffe7a6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

  drawHighlight(h, now) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    this.drawNodes(h.nodes, h.color || '#ffe680', 0.35 + 0.25 * pulse);
  }

  drawGlow(e, now) {
    const t = clamp((now - e.start) / e.dur, 0, 1);
    if (t <= 0) return;
    const a = t < 0.2 ? t / 0.2 : t > 0.75 ? (1 - t) / 0.25 : 1;
    this.drawNodes(e.nodes, e.color || '#ffd84a', 0.75 * a);
  }

  drawNodes(nodes, color, alpha) {
    const { ctx } = this;
    const z = this.cam.z;
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    for (const [k, fi] of nodes) {
      const tile = this.state.board[k];
      if (!tile) continue;
      const [x, y] = parseKey(k);
      const [sx, sy] = this.toScreen(x, y);
      const feat = TILE_TYPES[tile.t].features[fi];
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate((tile.r * Math.PI) / 2);
      if (feat.type === 'monastery') {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, z * 0.3, 0, 7); ctx.fill();
      } else {
        ctx.drawImage(featureMask(tile.t, fi, color), -z / 2, -z / 2, z, z);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawFloat(e, t) {
    if (t < 0) return;
    const { ctx } = this;
    const [sx, sy] = this.toScreen(e.x, e.y);
    const y = sy - easeOut(Math.min(1, t)) * 60;
    const a = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
    const scale = t < 0.15 ? 0.5 + (t / 0.15) * 0.7 : 1.2 - Math.min(0.2, (t - 0.15));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(sx, y); ctx.scale(scale, scale);
    ctx.font = '900 34px Cinzel, Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(20,10,0,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(e.text, 0, 0);
    ctx.fillStyle = e.color || '#ffe27a';
    ctx.fillText(e.text, 0, 0);
    if (e.sub) {
      ctx.font = '900 15px Nunito, sans-serif';
      ctx.lineWidth = 4; ctx.strokeText(e.sub, 0, 26);
      ctx.fillStyle = '#fff3d0'; ctx.fillText(e.sub, 0, 26);
    }
    ctx.restore();
  }

  drawFly(e, t) {
    if (t < 0) return;
    const [fx, fy] = this.toScreen(e.from[0], e.from[1]);
    const [tx, ty] = e.to;
    const k = easeInOut(Math.min(1, t));
    const x = lerpN(fx, tx, k), y = lerpN(fy, ty, k) - Math.sin(k * Math.PI) * 80;
    drawMeeple(this.ctx, x, y, lerpN(this.cam.z * 0.3, 22, k), e.color, { alpha: 1 - Math.max(0, (t - 0.85) / 0.15) });
  }

  drawSparkle(e, t) {
    if (t < 0) return;
    const { ctx } = this;
    if (!e.parts) {
      e.parts = Array.from({ length: e.n || 26 }, () => ({ a: Math.random() * 6.28, v: 40 + Math.random() * 110, s: 2 + Math.random() * 4, c: pickC(e.colors) }));
    }
    const [sx, sy] = this.toScreen(e.x, e.y);
    for (const p of e.parts) {
      const d = p.v * easeOut(Math.min(1, t));
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(sx + Math.cos(p.a) * d, sy + Math.sin(p.a) * d + t * t * 40); ctx.rotate(p.a + t * 6);
      ctx.fillRect(-p.s, -p.s / 3, p.s * 2, p.s * 0.66);
      ctx.fillRect(-p.s / 3, -p.s, p.s * 0.66, p.s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

function pickC(arr = ['#ffe27a', '#fff', '#ffb84a']) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerpN(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBounce(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
