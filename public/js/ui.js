// Small DOM helpers shared by the screens.
import { drawPiece, FAIRY_COLOR, DRAGON_COLOR } from './art.js';
import { hasPiece } from './pieces.js';
import { PLAYER_COLORS } from './game.js';
import { sfx } from './sound.js';

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let prevScreen = 'home';
const screenHooks = {};
export function onScreen(id, fn) { screenHooks[id] = fn; }
export function show(id) {
  const cur = document.querySelector('.screen.active');
  if (cur && cur.id !== id) prevScreen = cur.id;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  screenHooks[id]?.();
}
export const previousScreen = () => prevScreen;

// A figure as a small canvas icon (player chips, the picker, setup rows). Icons drawn
// before the photographed pieces have loaded are repainted when they arrive.
const icons = new Set();
function paintIcon(c, color, size, kind) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const col = kind === 'fairy' ? FAIRY_COLOR : kind === 'dragon' ? DRAGON_COLOR : PLAYER_COLORS[color] || PLAYER_COLORS.red;
  const k = { dragon: 0.72, pig: 0.9, builder: 0.74, large: 0.68, fairy: 0.72 }[kind] || 0.86; // (fill the icon, never clip)
  drawPiece(ctx, kind, size / 2, size / 2, size * k, col, { icon: true });
}
export function pieceIcon(color, size = 46, kind = 'meeple') {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr;
  c.style.width = c.style.height = `${size}px`;
  paintIcon(c, color, size, kind);
  if (!hasPiece(kind === 'dragon' ? 'dragon_down' : kind)) {
    c.dataset.icon = JSON.stringify([color, size, kind]);
    icons.add(new WeakRef(c));
  }
  return c;
}
if (typeof window !== 'undefined') {
  window.addEventListener('pieces-ready', () => {
    for (const ref of icons) {
      const c = ref.deref();
      if (!c) { icons.delete(ref); continue; }
      const [color, size, kind] = JSON.parse(c.dataset.icon);
      paintIcon(c, color, size, kind);
    }
  });
}

let bannerTimer = null;
export function banner(html, ms = 1600) {
  const b = $('banner');
  b.innerHTML = html; b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}

export function toast(text, ms = 2700) {
  const layer = $('toast-layer');
  layer.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  t.style.animationDuration = `${ms}ms`;
  layer.appendChild(t);
  setTimeout(() => t.remove(), ms + 100);
}

// Simple modal with buttons; resolves with the chosen value.
export function ask(title, html, buttons) {
  return new Promise((resolve) => {
    const m = $('ask-modal');
    $('ask-title').textContent = title;
    $('ask-body').innerHTML = html;
    const box = $('ask-actions');
    box.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = `btn ${b.cls || 'parchment'} wide`;
      el.textContent = b.label;
      el.onclick = () => { sfx.tap(); m.hidden = true; resolve(b.value); };
      box.appendChild(el);
    }
    m.hidden = false;
  });
}
