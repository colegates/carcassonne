// App controller: screens, setup, turn flow, animations, persistence.
import { TILE_TYPES } from './tiles.js';
import * as G from './game.js';
import { chooseMove, suggestMove } from './ai.js';
import { BoardView } from './board.js';
import { getTileArt, drawMeeple, getTableTexture, rotUnit, getTileBack } from './art.js';
import { buildRules, renderMini } from './rules.js';
import { sfx, unlockAudio, soundOn, setSound } from './sound.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const TYPE_LABEL = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm' };
const TYPE_ICON = { road: '🛣️', city: '🏯', monastery: '⛪', field: '🌾' };
const COLOR_ORDER = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// ---------------- screens ----------------
let prevScreen = 'home';
function show(id) {
  const cur = document.querySelector('.screen.active');
  if (cur && cur.id !== id) prevScreen = cur.id;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (id === 'home') drawHome();
}
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
  sfx.tap();
  show(b.dataset.back === 'prev' ? prevScreen : b.dataset.back);
}));
document.addEventListener('pointerdown', unlockAudio, { capture: true });

// ---------------- home ----------------
let homeTiles = null;
function drawHome() {
  const c = $('home-bg');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = ctx.createPattern(getTableTexture(), 'repeat'); ctx.fillRect(0, 0, w, h);
  if (!homeTiles) {
    // simulate a random little countryside for the backdrop
    const s = G.newGame([{ name: 'a', color: 'red' }, { name: 'b', color: 'blue' }, { name: 'c', color: 'green' }, { name: 'd', color: 'yellow' }]);
    for (let i = 0; i < 44 && s.phase !== 'over'; i++) {
      const vp = G.validPlacements(s.board, s.drawn);
      vp.sort((a, b) => Math.hypot(a.x, a.y * 1.4) - Math.hypot(b.x, b.y * 1.4));
      const p = vp[Math.floor(Math.random() * Math.min(3, vp.length))];
      G.placeTile(s, p.x, p.y, p.rots[Math.floor(Math.random() * p.rots.length)]);
      const o = G.meepleOptions(s);
      G.finishTurn(s, o.length && Math.random() < 0.3 ? o[Math.floor(Math.random() * o.length)] : null);
    }
    homeTiles = s;
  }
  const z = Math.max(70, Math.min(w, h) / 5.2);
  const cx = w / 2, cy = h / 2;
  const entries = Object.entries(homeTiles.board);
  ctx.fillStyle = 'rgba(10,5,0,0.5)';
  for (const [k] of entries) {
    const [x, y] = G.parseKey(k);
    ctx.fillRect(cx + x * z - z / 2 + z * 0.04, cy + y * z - z / 2 + z * 0.06, z, z);
  }
  for (const [k, t] of entries) {
    const [x, y] = G.parseKey(k);
    ctx.save(); ctx.translate(cx + x * z, cy + y * z); ctx.rotate((t.r * Math.PI) / 2);
    ctx.drawImage(getTileArt(t.t).canvas, -z / 2, -z / 2, z, z); ctx.restore();
  }
  for (const [k, t] of entries) {
    if (!t.m) continue;
    const [x, y] = G.parseKey(k);
    const [ax, ay] = getTileArt(t.t).anchors[t.m.f];
    const [rx, ry] = rotUnit(ax, ay, t.r);
    drawMeeple(ctx, cx + (x + rx - 0.5) * z, cy + (y + ry - 0.5) * z, z * 0.3, G.PLAYER_COLORS[homeTiles.players[t.m.p].color], { lying: TILE_TYPES[t.t].features[t.m.f].type === 'field' });
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  $('btn-continue').hidden = !(store.get('carc-save')?.phase && store.get('carc-save').phase !== 'over');
}
window.addEventListener('resize', () => { if ($('home').classList.contains('active')) drawHome(); });

$('btn-new').addEventListener('click', () => { sfx.tap(); renderSetup(); show('setup'); });
$('btn-rules').addEventListener('click', () => { sfx.tap(); openRules(); });
$('btn-continue').addEventListener('click', () => {
  sfx.tap();
  const s = store.get('carc-save');
  if (s) startGame(s);
});
function openRules() {
  const body = $('rules-body');
  if (!body.childElementCount) buildRules(body);
  show('rules');
  body.parentElement.scrollTop = 0;
}

// ---------------- setup ----------------
let setup = store.get('carc-setup') || {
  players: [
    { name: 'Player 1', color: 'red', kind: 'human' },
    { name: 'Player 2', color: 'blue', kind: 'human' },
  ],
  farmers: true, hints: true,
};
function meepleIcon(color, size = 46) {
  const c = document.createElement('canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  drawMeeple(ctx, size / 2, size / 2 - 1, size * 0.82, G.PLAYER_COLORS[color]);
  return c;
}
function renderSetup() {
  const rows = $('player-rows');
  rows.innerHTML = '';
  setup.players.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'prow';
    const icon = meepleIcon(p.color); icon.title = 'Tap to change colour';
    icon.addEventListener('click', () => {
      const used = new Set(setup.players.map((q) => q.color));
      let idx = COLOR_ORDER.indexOf(p.color);
      for (let n = 0; n < COLOR_ORDER.length; n++) {
        idx = (idx + 1) % COLOR_ORDER.length;
        if (!used.has(COLOR_ORDER[idx])) break;
      }
      p.color = COLOR_ORDER[idx]; sfx.meeple(); renderSetup();
    });
    const input = document.createElement('input');
    input.value = p.name; input.maxLength = 14; input.autocomplete = 'off';
    input.addEventListener('input', () => { p.name = input.value; });
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    const kind = document.createElement('button');
    kind.className = 'kind' + (p.kind === 'ai' ? ' bot' : '');
    kind.textContent = p.kind === 'ai' ? `🤖 ${LEVEL_NAMES[p.level || 'medium']}` : '🙂 Person';
    kind.addEventListener('click', () => {
      // Person -> Easy -> Medium -> Hard -> Person
      const seq = [['human'], ['ai', 'easy'], ['ai', 'medium'], ['ai', 'hard']];
      const cur = seq.findIndex(([k, l]) => k === p.kind && (k === 'human' || l === (p.level || 'medium')));
      const [k, l] = seq[(cur + 1) % seq.length];
      p.kind = k; if (l) p.level = l;
      if (k === 'ai' && /^Player \d$/.test(p.name)) p.name = botName();
      sfx.tap(); renderSetup();
    });
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Remove player');
    del.disabled = setup.players.length <= 2; del.style.opacity = del.disabled ? 0.25 : 1;
    del.addEventListener('click', () => { if (setup.players.length > 2) { setup.players.splice(i, 1); sfx.tap(); renderSetup(); } });
    row.append(icon, input, kind, del);
    rows.appendChild(row);
  });
  $('add-human').disabled = $('add-bot').disabled = setup.players.length >= 5;
  $('opt-farmers').checked = setup.farmers;
  $('opt-hints').checked = setup.hints;
}
const BOT_NAMES = ['Sir Lancelot', 'Lady Brienne', 'Brother Tuck', 'Baron Bruno', 'Dame Matilda', 'Count Roland'];
function botName() {
  const used = new Set(setup.players.map((p) => p.name));
  return BOT_NAMES.find((n) => !used.has(n)) || 'Knight';
}
function addPlayer(kind) {
  if (setup.players.length >= 5) return;
  const used = new Set(setup.players.map((p) => p.color));
  const color = COLOR_ORDER.find((c) => !used.has(c));
  setup.players.push(kind === 'ai' ? { name: botName(), color, kind: 'ai', level: 'medium' } : { name: `Player ${setup.players.length + 1}`, color, kind: 'human' });
  sfx.tap(); renderSetup();
}
$('add-human').addEventListener('click', () => addPlayer('human'));
$('add-bot').addEventListener('click', () => addPlayer('ai'));
$('opt-farmers').addEventListener('change', (e) => { setup.farmers = e.target.checked; });
$('opt-hints').addEventListener('change', (e) => { setup.hints = e.target.checked; });
$('btn-start').addEventListener('click', () => {
  sfx.tap();
  setup.players.forEach((p, i) => { if (!p.name.trim()) p.name = `Player ${i + 1}`; });
  store.set('carc-setup', setup);
  const state = G.newGame(setup.players, { farmers: setup.farmers, hints: setup.hints });
  state.current = Math.floor(Math.random() * state.players.length); // random start player
  startGame(state);
});

// ---------------- game ----------------
const view = new BoardView($('board'));
let state = null;
let ui = {};
let turnToken = 0;

function cur() { return state.players[state.current]; }
function colorOf(p) { return G.PLAYER_COLORS[p.color]; }
const helper = () => state.options.hints !== false;

function startGame(s) {
  state = s;
  ui = { shown: state.players.map((p) => p.score), previewRot: 0 };
  view.setState(state);
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null, extraMeeples: [], lastKey: state.last });
  show('game');
  view.resize();
  renderPlayers();
  view.fit(false);
  turnToken++;
  if (state.phase === 'meeple') {
    // resume after a reload in the middle of a turn: the tile is down, finish the follower step
    if (cur().kind === 'ai') completeTurn(null);
    else beginMeeplePhase();
  } else startTurn();
}

function save() { if (state) store.set('carc-save', state); }

function renderPlayers() {
  const box = $('players');
  if (box.childElementCount !== state.players.length) {
    box.innerHTML = '';
    state.players.forEach((p) => {
      const chip = document.createElement('div'); chip.className = 'pchip';
      chip.append(meepleIcon(p.color, 30));
      chip.insertAdjacentHTML('beforeend', '<div class="pname"></div><div class="pscore"></div><div class="pmeeples"></div>');
      chip.addEventListener('click', showScores);
      box.appendChild(chip);
    });
  }
  [...box.children].forEach((chip, i) => {
    const p = state.players[i];
    chip.querySelector('.pname').textContent = p.name;
    chip.querySelector('.pscore').textContent = ui.shown[i];
    chip.querySelector('.pmeeples').textContent = `♟${p.meeples}`;
    chip.classList.toggle('active', state.phase !== 'over' && i === state.current);
  });
  $('deck-count').textContent = state.deck.length + (state.drawn ? 1 : 0);
}

function bumpChip(i) {
  const chip = $('players').children[i];
  if (!chip) return;
  chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
  chip.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}
function chipCenter(i) {
  const chip = $('players').children[i];
  if (!chip) return [view.w / 2, 30];
  const r = chip.getBoundingClientRect();
  return [r.left + 15, r.top + r.height / 2];
}

let bannerTimer = null;
function banner(html, ms = 1600) {
  const b = $('banner');
  b.innerHTML = html; b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  $('toast-layer').appendChild(t);
  setTimeout(() => t.remove(), 2700);
}

function drawPreview() {
  const c = $('preview'); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if (!state.drawn) {
    c.style.visibility = 'hidden';
    return;
  }
  c.style.visibility = 'visible';
  ctx.drawImage(getTileArt(state.drawn).canvas, 0, 0, c.width, c.height);
  c.style.transform = `rotate(${ui.previewRotDeg ?? ui.previewRot * 90}deg)`;
}

function setDock({ instruction, rotate = false, confirm = false, undo = false, pulse = false }) {
  const p = cur();
  $('turn-name').innerHTML = `<span class="dot" style="background:${colorOf(p).main}"></span>${escapeHtml(p.name)}${p.kind === 'ai' ? ' 🤖' : ''}`;
  $('instruction').innerHTML = instruction;
  $('btn-rotate').disabled = !rotate;
  $('btn-confirm').disabled = !confirm;
  $('btn-confirm').classList.toggle('pulse', pulse);
  $('btn-undo').disabled = !undo;
  $('btn-undo').hidden = !undo;
  $('btn-rotate').hidden = !rotate && undo;
  $('btn-hint').hidden = !helper() || p.kind === 'ai' || state.phase === 'over';
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- turn flow ----------
async function startTurn() {
  const token = ++turnToken;
  ui.tentative = null; ui.selected = null; ui.hint = null; ui.snapshot = null;
  ui.shown = state.players.map((p) => p.score);
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null, extraMeeples: [] });
  save();
  renderPlayers();
  if (state.phase === 'over') { await endGame(); return; }
  if ((state.discarded.length || 0) > (ui.discardSeen ?? state.discarded.length)) {
    const gone = state.discarded.slice(ui.discardSeen).map((t) => TILE_TYPES[t].name);
    toast(`Fits nowhere, put aside: ${gone.join(', ')}`);
  }
  ui.discardSeen = state.discarded.length;
  const p = cur();
  ui.placements = G.validPlacements(state.board, state.drawn);
  // start the preview in a rotation that fits somewhere
  if (!ui.placements.some((pl) => pl.rots.includes(ui.previewRot))) ui.previewRot = ui.placements[0].rots[0];
  ui.previewRotDeg = ui.previewRot * 90;
  drawPreview();
  [...$('players').children].forEach((c, i) => c.classList.toggle('thinking', p.kind === 'ai' && i === state.current));
  if (p.kind === 'ai') {
    setDock({ instruction: `${escapeHtml(p.name)} is thinking…` });
    await aiTurn(token);
  } else {
    if (state.players.filter((q) => q.kind === 'human').length > 1 || state.turn <= 2) {
      banner(`<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}'s turn`);
    }
    sfx.turn();
    humanPlacePhase();
  }
}

function humanPlacePhase() {
  refreshCandidates();
  setDock({ instruction: 'Tap a <b>glowing square</b> to place your tile', rotate: true });
}

function refreshCandidates() {
  const t = ui.tentative;
  view.setVM({
    candidates: ui.placements
      .filter((p) => !t || p.x !== t.x || p.y !== t.y)
      .map((p) => ({ x: p.x, y: p.y, good: p.rots.includes(ui.previewRot), hint: ui.hint && ui.hint.x === p.x && ui.hint.y === p.y })),
  });
}

function setTentative(x, y, r, animate = true) {
  const pl = ui.placements.find((p) => p.x === x && p.y === y);
  const prev = ui.tentative && ui.tentative.x === x && ui.tentative.y === y ? ui.tentative.r : null;
  ui.tentative = { x, y, r, rots: pl.rots };
  const prevDeg = ui.previewRotDeg;
  ui.previewRot = r;
  let delta = ((r * 90 - prevDeg) % 360 + 360) % 360;
  ui.previewRotDeg = prevDeg + delta;
  drawPreview();
  view.setVM({ tentative: { x, y, r, t: state.drawn, ok: true, ...(animate && prev !== null ? { animFrom: prev, animStart: performance.now() } : {}) } });
  refreshCandidates();
  const pts = helper() ? previewPoints(x, y, r) : '';
  setDock({
    instruction: pl.rots.length > 1 ? `Tap the tile or ⟳ to turn it, then ✓${pts}` : `It only fits this way here. Press ✓${pts}`,
    rotate: true, confirm: true, pulse: true,
  });
}

// How many points would be completed right now by this placement (helper mode)
function previewPoints(x, y, r) {
  const k = G.key(x, y);
  state.board[k] = { t: state.drawn, r, m: null, n: 0 };
  const ev = G.scoreAfterPlacement(state, k, false).filter((e) => e.winners.length);
  delete state.board[k];
  if (!ev.length) return '';
  const parts = ev.map((e) => `${e.winners.map((w) => state.players[w].name).join(' & ')} +${e.points}`);
  return `<br>Completes: <b>${escapeHtml(parts.join(', '))}</b>`;
}

function rotateTentative() {
  const t = ui.tentative;
  if (!t) {
    ui.previewRot = (ui.previewRot + 1) % 4;
    ui.previewRotDeg += 90;
    drawPreview();
    refreshCandidates();
    sfx.rotate();
    return;
  }
  if (t.rots.length === 1) { sfx.error(); toast('This tile only fits one way here'); return; }
  const i = t.rots.indexOf(t.r);
  sfx.rotate();
  setTentative(t.x, t.y, t.rots[(i + 1) % t.rots.length]);
}

view.onTap = (wx, wy) => {
  if (!state || state.phase === 'over' || cur().kind === 'ai' || ui.busy) return;
  const x = Math.round(wx), y = Math.round(wy);
  if (state.phase === 'place') {
    if (ui.tentative && ui.tentative.x === x && ui.tentative.y === y) { rotateTentative(); return; }
    const pl = ui.placements.find((p) => p.x === x && p.y === y);
    if (!pl) return;
    sfx.tap();
    setTentative(x, y, pl.rots.includes(ui.previewRot) ? ui.previewRot : pl.rots[0], false);
  } else if (state.phase === 'meeple' && ui.ghosts) {
    // pick the closest ghost meeple on the placed tile
    const tile = state.board[state.last];
    const [tx, ty] = G.parseKey(state.last);
    let best = null, bd = 0.3;
    for (const g of ui.ghosts) {
      const [ax, ay] = getTileArt(tile.t).anchors[g.fi];
      const [rx, ry] = rotUnit(ax, ay, tile.r);
      const d = Math.hypot(tx + rx - 0.5 - wx, ty + ry - 0.5 - wy);
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) {
      // tapping elsewhere on the tile selects the feature under the finger
      if (x === tx && y === ty) {
        const [ux, uy] = rotUnit(wx - tx + 0.5, wy - ty + 0.5, -tile.r);
        const fi = featureUnder(tile.t, ux, uy);
        best = ui.ghosts.find((g) => g.fi === fi) || null;
      }
      if (!best) return;
    }
    selectGhost(best.fi === ui.selected ? null : best.fi);
  }
};

function featureUnder(t, u, v) {
  const { label } = getTileArt(t);
  const H = 96;
  const x = Math.max(0, Math.min(H - 1, Math.floor(u * H))), y = Math.max(0, Math.min(H - 1, Math.floor(v * H)));
  return label[y * H + x];
}

$('btn-rotate').addEventListener('click', () => { if (state?.phase === 'place' && cur().kind !== 'ai') rotateTentative(); });
$('preview').addEventListener('click', () => { if (state?.phase === 'place' && cur().kind !== 'ai' && !ui.busy) rotateTentative(); });
$('btn-confirm').addEventListener('click', () => onConfirm());
$('btn-undo').addEventListener('click', () => onUndo());
$('btn-center').addEventListener('click', () => { sfx.tap(); view.fit(true, ui.placements?.map((p) => [p.x, p.y]) || []); });
$('btn-hint').addEventListener('click', () => onHint());

async function onConfirm() {
  if (!state || ui.busy || cur().kind === 'ai') return;
  if (state.phase === 'place' && ui.tentative) {
    const { x, y, r } = ui.tentative;
    ui.snapshot = { state: G.cloneState(state), tentative: { ...ui.tentative } };
    G.placeTile(state, x, y, r);
    ui.tentative = null;
    view.setVM({ tentative: null, candidates: null, lastKey: state.last });
    view.addEffect({ type: 'drop', key: state.last, dur: 380 });
    sfx.place();
    drawPreview();
    beginMeeplePhase();
  } else if (state.phase === 'meeple') {
    await completeTurn(ui.selected);
  }
}

function beginMeeplePhase() {
  const opts = G.meepleOptions(state);
  const tile = state.board[state.last];
  ui.selected = null;
  if (!opts.length) {
    ui.ghosts = null;
    view.setVM({ ghosts: null });
    const reason = cur().meeples === 0 ? 'You have no followers left.' : 'Nothing free to claim on this tile.';
    setDock({ instruction: `${reason} Press ✓ to finish`, confirm: true, undo: !!ui.snapshot, pulse: true });
    return;
  }
  ui.ghosts = opts.map((fi) => {
    const f = TILE_TYPES[tile.t].features[fi];
    let label = TYPE_LABEL[f.type];
    if (helper()) {
      if (f.type === 'monastery') {
        const [x, y] = G.parseKey(state.last);
        label += ` · ${1 + G.monasteryNeighbours(state.board, x, y)}`;
      } else if (f.type !== 'field') {
        const g = G.describeGroup(state, state.last, fi);
        label += g.complete ? ` · ${g.points}!` : ` · ${g.points} now, ${(g.tiles.size + (f.type === 'city' ? g.pennants : 0)) * (f.type === 'city' ? 2 : 1)} done`;
      }
    }
    return { key: state.last, fi, label, selected: false, hinted: ui.hint && ui.hint.meeple === fi };
  });
  view.setVM({ ghosts: ui.ghosts, ghostColor: colorOf(cur()), showLabels: false });
  const [x, y] = G.parseKey(state.last);
  view.ensureVisible(x, y, 80);
  setDock({ instruction: `Tap a <b>ghost meeple</b> to claim it, or ✓ to skip <small>(♟${cur().meeples} left)</small>`, confirm: true, undo: !!ui.snapshot });
  if (ui.hint && ui.hint.meeple !== null && ui.hint.meeple !== undefined && opts.includes(ui.hint.meeple)) {
    toast(`💡 Hint: claim the ${TYPE_LABEL[TILE_TYPES[tile.t].features[ui.hint.meeple].type].toLowerCase()}`);
    selectGhost(ui.hint.meeple);
  }
}

function selectGhost(fi) {
  ui.selected = fi;
  for (const g of ui.ghosts) g.selected = g.fi === fi;
  sfx.meeple();
  let highlight = null;
  let info = '';
  if (fi !== null) {
    const feat = TILE_TYPES[state.board[state.last].t].features[fi];
    if (feat.type === 'monastery') {
      highlight = { nodes: [[state.last, fi]] };
      info = 'Monk in the monastery: 9 points when surrounded';
    } else {
      const g = G.getGroup(state.board, state.last, fi);
      highlight = { nodes: g.nodes, color: feat.type === 'field' ? '#b6ff6a' : '#ffe680' };
      if (feat.type === 'field') {
        const cities = G.fieldCities(state.board, g);
        const done = cities.filter((c) => c.complete).length;
        info = `Farmer: stays till the end. Right now: ${done} finished cit${done === 1 ? 'y' : 'ies'} → ${done * 3} pts`;
      } else if (feat.type === 'road') {
        info = `Thief on a ${g.tiles.size}-tile road${g.complete ? ' — finished' : ''}`;
      } else {
        info = `Knight in a ${g.tiles.size}-tile city${g.pennants ? ` with ${g.pennants} 🛡️` : ''}${g.complete ? ' — finished' : ''}`;
      }
    }
  }
  view.setVM({ ghosts: ui.ghosts, highlight });
  setDock({
    instruction: fi === null ? 'Tap a <b>ghost meeple</b> to claim it, or ✓ to skip' : `${TYPE_ICON[TILE_TYPES[state.board[state.last].t].features[fi].type]} ${info}. Press ✓`,
    confirm: true, undo: !!ui.snapshot, pulse: fi !== null,
  });
}

function onUndo() {
  if (!ui.snapshot || ui.busy || state.phase !== 'meeple') return;
  sfx.tap();
  const snap = ui.snapshot;
  Object.assign(state, snap.state);
  state.board = snap.state.board;
  ui.snapshot = null; ui.ghosts = null; ui.selected = null;
  view.setState(state);
  view.setVM({ ghosts: null, highlight: null, lastKey: state.last });
  drawPreview();
  setTentative(snap.tentative.x, snap.tentative.y, snap.tentative.r, false);
}

function onHint() {
  if (!state || ui.busy || cur().kind === 'ai') return;
  sfx.tap();
  if (state.phase === 'place') {
    const mv = suggestMove(state);
    if (!mv) return;
    ui.hint = mv;
    setTentative(mv.x, mv.y, mv.r, false);
    view.ensureVisible(mv.x, mv.y);
    toast('💡 How about here?');
  } else if (state.phase === 'meeple' && ui.ghosts) {
    // evaluate the follower choice with the tile already down
    const best = ui.hint && ui.ghosts.some((g) => g.fi === ui.hint.meeple) ? ui.hint.meeple : null;
    if (best !== null) selectGhost(best); else toast('💡 Keeping your follower might be smart');
  }
}

async function completeTurn(fi) {
  ui.busy = true;
  const placer = state.current;
  const k = state.last;
  const events = G.finishTurn(state, fi);
  view.setVM({ ghosts: null, highlight: null });
  ui.ghosts = null;
  // followers that just scored stay visible until they fly home
  const returning = events.flatMap((e) => e.meeples);
  view.setVM({ extraMeeples: returning.map((m) => ({ ...m })) });
  if (fi !== null && fi !== undefined) {
    view.addEffect({ type: 'pop', key: k, dur: 500 });
    sfx.meeple();
    await sleep(420);
  }
  renderPlayers();
  await animateEvents(events, placer);
  ui.busy = false;
  startTurn();
}

async function animateEvents(events, placer, final = false) {
  for (const e of events) {
    const tiles = [...new Set(e.nodes.map(([k]) => k))].map(G.parseKey);
    const cx = tiles.reduce((a, [x]) => a + x, 0) / tiles.length;
    const cy = tiles.reduce((a, [, y]) => a + y, 0) / tiles.length;
    if (!e.winners.length || (final && !e.points)) {
      if (!final) view.addEffect({ type: 'glow', nodes: e.nodes, dur: 900, color: '#ffffff' });
      // nobody scores: meeples (if any, e.g. 0-point farms) just go home
      for (const m of e.meeples) flyHome(m);
      continue;
    }
    view.ensureVisible(cx, cy);
    const winnerColor = colorOf(state.players[e.winners[0]]);
    const what = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm' }[e.kind];
    const sub = final ? (e.kind === 'field' ? `${e.points / 3} finished cit${e.points === 3 ? 'y' : 'ies'}` : `Unfinished ${what.toLowerCase()}`)
      : `${what} complete!`;
    if (e.kind === 'field' && e.cities) {
      for (const cn of e.cities) view.addEffect({ type: 'glow', nodes: cn, dur: 1700, color: '#ffd84a' });
      view.addEffect({ type: 'glow', nodes: e.nodes, dur: 1700, color: '#9dff5a' });
    } else {
      view.addEffect({ type: 'glow', nodes: e.nodes, dur: 1700, color: '#ffd84a' });
    }
    view.addEffect({ type: 'float', x: cx, y: cy, text: `+${e.points}${e.winners.length > 1 ? ' each' : ''}`, sub, color: winnerColor.light, dur: 1900 });
    view.addEffect({ type: 'sparkle', x: cx, y: cy, dur: 1100, n: Math.min(60, 14 + e.points * 2), colors: ['#ffe27a', '#fff', winnerColor.light] });
    sfx.score(e.points >= 8);
    await sleep(final ? 750 : 650);
    for (const w of e.winners) { ui.shown[w] += e.points; bumpChip(w); }
    renderPlayers();
    for (const m of e.meeples) flyHome(m);
    await sleep(final ? 650 : 750);
  }
  view.setVM({ extraMeeples: [] });
  void placer;
}

function flyHome(m) {
  const tile = state.board[m.key];
  if (!tile) return;
  const [x, y] = G.parseKey(m.key);
  const [ax, ay] = getTileArt(tile.t).anchors[m.f];
  const [rx, ry] = rotUnit(ax, ay, tile.r);
  const extra = (view.vm.extraMeeples || []).filter((q) => !(q.key === m.key && q.f === m.f));
  view.setVM({ extraMeeples: extra });
  view.addEffect({ type: 'fly', from: [x + rx - 0.5, y + ry - 0.5], to: chipCenter(m.p), color: colorOf(state.players[m.p]), dur: 700 });
}

// ---------- computer turn ----------
async function aiTurn(token) {
  ui.busy = true;
  const p = cur();
  await sleep(350);
  const t0 = performance.now();
  const mv = chooseMove(state, p.level);
  await sleep(Math.max(0, 450 - (performance.now() - t0)));
  if (token !== turnToken) return;
  // show the tile hovering over its spot
  ui.previewRot = mv.r; ui.previewRotDeg = mv.r * 90; drawPreview();
  view.ensureVisible(mv.x, mv.y);
  view.setVM({ tentative: { x: mv.x, y: mv.y, r: mv.r, t: state.drawn, ok: true } });
  await sleep(550);
  if (token !== turnToken) return;
  G.placeTile(state, mv.x, mv.y, mv.r);
  view.setVM({ tentative: null, lastKey: state.last, lastColor: colorOf(p).light });
  view.addEffect({ type: 'drop', key: state.last, dur: 380 });
  sfx.place();
  drawPreview();
  await sleep(420);
  if (token !== turnToken) return;
  const opts = G.meepleOptions(state);
  const fi = mv.meeple !== null && opts.includes(mv.meeple) ? mv.meeple : null;
  [...$('players').children].forEach((c) => c.classList.remove('thinking'));
  ui.busy = false;
  await completeTurn(fi);
}

// ---------- end of game ----------
async function endGame() {
  ui.busy = true;
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null });
  drawPreview();
  setDock({ instruction: 'The last tile has been placed!' });
  const events = state.finalEvents || [];
  if (!ui.finalShown) {
    // undo the already-applied final points so they can be counted up visibly
    ui.shown = state.players.map((p) => p.score);
    for (const e of events) for (const w of e.winners) ui.shown[w] -= e.points;
    // put followers back on the board for the show
    view.setVM({ extraMeeples: events.flatMap((e) => e.meeples) });
    renderPlayers();
    banner('🏁 Final scoring', 2200);
    await sleep(1200);
    view.fit(true);
    await sleep(700);
    let lastKind = null;
    for (const e of events) {
      if (e.kind !== lastKind) {
        lastKind = e.kind;
        banner({ road: '🛣️ Unfinished roads', city: '🏯 Unfinished cities', monastery: '⛪ Monasteries', field: '🌾 Farms' }[e.kind], 1500);
        await sleep(600);
      }
      await animateEvents([e], null, true);
    }
    ui.finalShown = true;
  }
  ui.shown = state.players.map((p) => p.score);
  renderPlayers();
  view.setVM({ extraMeeples: [] });
  ui.busy = false;
  sfx.fanfare();
  confetti();
  showScores(true);
  store.del('carc-save');
}

function showScores(final = false) {
  if (!state) return;
  const maxScore = Math.max(...state.players.map((p) => p.score));
  const winners = state.players.filter((p) => p.score === maxScore);
  const isFinal = final === true || state.phase === 'over';
  $('scores-title').textContent = isFinal ? 'Final Scores' : 'Scores so far';
  let html = '';
  if (isFinal) {
    html += `<div class="trophy">🏆</div><div class="winner-name" style="color:${colorOf(winners[0]).dark}">${winners.map((w) => escapeHtml(w.name)).join(' & ')} ${winners.length > 1 ? 'tie!' : 'wins!'}</div>`;
  }
  html += '<table class="scores"><tr><th></th><th>🛣️</th><th>🏯</th><th>⛪</th><th>🌾</th><th>Total</th></tr>';
  const order = state.players.map((p, i) => i).sort((a, b) => state.players[b].score - state.players[a].score);
  for (const i of order) {
    const p = state.players[i];
    html += `<tr class="${isFinal && p.score === maxScore ? 'winner' : ''}"><td class="n"><span style="color:${colorOf(p).main}">●</span> ${escapeHtml(p.name)}</td>
      <td>${p.breakdown.road}</td><td>${p.breakdown.city}</td><td>${p.breakdown.monastery}</td><td>${p.breakdown.field}</td><td class="total">${p.score}</td></tr>`;
  }
  html += '</table>';
  if (!isFinal) html += `<p style="text-align:center;margin:0 0 6px;font-size:13px">${state.deck.length + (state.drawn ? 1 : 0)} tiles left · ${state.discarded.length} put aside</p>`;
  $('scores-table').innerHTML = html;
  const actions = $('scores-actions');
  actions.innerHTML = '';
  const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `btn ${cls} wide`; b.textContent = label; b.onclick = fn; actions.appendChild(b); };
  if (isFinal) {
    btn('Play Again', 'red', () => {
      $('scores-modal').hidden = true;
      const ns = G.newGame(state.players.map((p) => ({ name: p.name, color: p.color, kind: p.kind, level: p.level })), state.options);
      ns.current = Math.floor(Math.random() * ns.players.length);
      startGame(ns);
    });
    btn('View the Map', 'parchment', () => { $('scores-modal').hidden = true; });
    btn('Home', 'parchment', () => { $('scores-modal').hidden = true; show('home'); });
  } else {
    btn('Close', 'parchment', () => { $('scores-modal').hidden = true; });
  }
  $('scores-modal').hidden = false;
}

// ---------- confetti on the fx canvas ----------
function confetti() {
  const c = $('fx'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const cols = ['#ffd84a', '#d8322b', '#2a62d6', '#2f9e3a', '#fff', '#e0559f'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const start = performance.now();
  const step = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx + Math.sin((now + p.y) / 300); p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (now - start < 5000) requestAnimationFrame(step); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(step);
}

// ---------- menu ----------
$('btn-menu').addEventListener('click', () => { sfx.tap(); $('m-sound').textContent = `Sound: ${soundOn() ? 'On' : 'Off'}`; $('menu').hidden = false; });
$('m-resume').addEventListener('click', () => { $('menu').hidden = true; });
$('m-rules').addEventListener('click', () => { $('menu').hidden = true; openRules(); });
$('m-sound').addEventListener('click', () => { setSound(!soundOn()); $('m-sound').textContent = `Sound: ${soundOn() ? 'On' : 'Off'}`; sfx.tap(); });
$('m-scores').addEventListener('click', () => { $('menu').hidden = true; showScores(); });
$('m-quit').addEventListener('click', () => { $('menu').hidden = true; turnToken++; ui.busy = false; save(); show('home'); });
$('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') $('menu').hidden = true; });
$('scores-modal').addEventListener('click', (e) => { if (e.target.id === 'scores-modal' && state?.phase !== 'over') $('scores-modal').hidden = true; });

// keep the in-progress game safe when the app is backgrounded
document.addEventListener('visibilitychange', () => { if (document.hidden && state && state.phase !== 'over') save(); });

// ---------- boot ----------
document.querySelector('#deck .stack').style.backgroundImage = `url(${getTileBack().toDataURL()})`;
if (document.fonts?.ready) document.fonts.ready.then(() => { if ($('home').classList.contains('active')) drawHome(); });
drawHome();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// debugging / automated testing hook
window.__carc = { get state() { return state; }, G, view, startGame, get ui() { return ui; } };
void renderMini;
