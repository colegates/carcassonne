// Game controller: turn flow, animations, online sync, end of game.
// Works for pass-and-play (one phone) and online play (one phone each).
import { TILE_TYPES } from './tiles.js';
import * as G from './game.js';
import { chooseMove, suggestMove } from './ai.js';
import { BoardView } from './board.js';
import { getTileArt, rotUnit } from './art.js';
import { sfx } from './sound.js';
import { $, sleep, store, escapeHtml, show, pieceIcon, banner, toast } from './ui.js';

export const TYPE_LABEL = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm', garden: 'Garden' };
const TYPE_ICON = { road: '🛣️', city: '🏯', monastery: '⛪', field: '🌾', garden: '🌳' };
const PIECE_LABEL = { meeple: 'Meeple' };

export const view = new BoardView($('board'));
let state = null;
let ui = {};
let session = { online: false };
let turnToken = 0;
const pending = [];
const sent = new Set(); // seq numbers of actions this phone sent (ignore their echo)
let cursor = 0; // seq of the next action we expect from the server (applied + queued + in flight)
let pumping = false;
export const hooks = { onLeave: null, onRematch: null };

export const getState = () => state;
export const getSession = () => session;
export const getUI = () => ui;

const cur = () => state.players[state.current];
const colorOf = (p) => G.PLAYER_COLORS[p.color] || G.PLAYER_COLORS.red;
const helper = () => state.options.hints !== false;

// Who decides for seat i on this phone: 'local' (a person here), 'bot' (the
// computer, run here) or 'remote' (decided on another phone).
export function controlOf(i) {
  const p = state.players[i];
  if (!session.online) return p.kind === 'ai' ? 'bot' : 'local';
  if (p.kind === 'ai') return session.room?.botRunner === session.net.id ? 'bot' : 'remote';
  return p.owner === session.net.id ? 'local' : 'remote';
}
const isLocal = () => controlOf(state.current) === 'local';
const localSeats = () => state.players.map((p, i) => i).filter((i) => controlOf(i) === 'local');

export function startGame(s, sess = { online: false }) {
  state = G.migrate(s);
  session = sess;
  pending.length = 0;
  sent.clear();
  cursor = state.seq || 0;
  $('btn-confirm').textContent = '✓';
  ui = { shown: state.players.map((p) => p.score), previewRot: 0, previewRotDeg: 0, discardSeen: state.discarded.length };
  view.setState(state);
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null, extraMeeples: [], lastKey: state.last });
  show('game');
  view.resize();
  renderPlayers();
  view.fit(false);
  turnToken++;
  updateNetBadge();
  if (state.phase === 'action') {
    // resumed in the middle of a turn (offline save): finish the follower step
    if (controlOf(state.current) === 'bot') completeTurn(null, { x: 0, y: 0, r: 0, resumed: true });
    else { ui.placedAt = { resumed: true }; beginActionPhase(); }
  } else startTurn();
}

function save() {
  if (!state) return;
  if (session.online) return; // the server keeps online games
  store.set('carc-save', state);
}

export function renderPlayers() {
  const box = $('players');
  if (box.childElementCount !== state.players.length) {
    box.innerHTML = '';
    state.players.forEach((p) => {
      const chip = document.createElement('div'); chip.className = 'pchip';
      chip.append(pieceIcon(p.color, 30));
      chip.insertAdjacentHTML('beforeend', '<div class="pname"></div><div class="pscore"></div><div class="pmeeples"></div>');
      chip.addEventListener('click', () => showScores());
      box.appendChild(chip);
    });
  }
  const online = session.online ? session.room?.clients || {} : null;
  [...box.children].forEach((chip, i) => {
    const p = state.players[i];
    chip.querySelector('.pname').textContent = p.name;
    chip.querySelector('.pscore').textContent = ui.shown[i];
    chip.querySelector('.pmeeples').textContent = supplyText(p);
    chip.classList.toggle('active', state.phase !== 'over' && i === state.current);
    chip.classList.toggle('me', session.online && controlOf(i) === 'local');
    const off = online && p.kind !== 'ai' && p.owner && !online[p.owner]?.online;
    chip.classList.toggle('offline', !!off);
  });
  $('deck-count').textContent = state.deck.length + (state.drawn ? 1 : 0);
}

function supplyText(p) {
  return `♟${p.supply.meeple}`;
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

function drawPreview() {
  const c = $('preview'); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if (!state.drawn) { c.style.visibility = 'hidden'; return; }
  c.style.visibility = 'visible';
  ctx.drawImage(getTileArt(state.drawn).canvas, 0, 0, c.width, c.height);
  c.style.transform = `rotate(${ui.previewRotDeg ?? ui.previewRot * 90}deg)`;
}

function setDock({ instruction, rotate = false, confirm = false, undo = false, pulse = false, picker = null }) {
  const p = cur();
  const who = session.online && controlOf(state.current) === 'local' ? ' (you)' : '';
  $('turn-name').innerHTML = `<span class="dot" style="background:${colorOf(p).main}"></span>${escapeHtml(p.name)}${who}${p.kind === 'ai' ? ' 🤖' : ''}`;
  $('instruction').innerHTML = instruction;
  $('btn-rotate').disabled = !rotate;
  $('btn-confirm').disabled = !confirm;
  $('btn-confirm').classList.toggle('pulse', pulse);
  $('btn-undo').disabled = !undo;
  $('btn-undo').hidden = !undo;
  $('btn-rotate').hidden = !rotate && undo;
  $('btn-hint').hidden = !helper() || !isLocal() || state.phase === 'over';
  renderPicker(picker);
  requestAnimationFrame(() => { $('side-tools').style.bottom = `${$('dock').offsetHeight + 14}px`; });
}

// Row of piece/action choices in the dock (only shown when there is a choice).
function renderPicker(picker) {
  const box = $('picker');
  box.innerHTML = '';
  if (!picker || picker.items.length < 2) { box.hidden = true; return; }
  box.hidden = false;
  for (const it of picker.items) {
    const b = document.createElement('button');
    b.className = 'pick' + (it.id === picker.active ? ' active' : '');
    if (it.kind) b.append(pieceIcon(cur().color, 22, it.kind));
    else b.append(document.createTextNode(it.icon || ''));
    const span = document.createElement('span'); span.textContent = it.label; b.append(span);
    b.onclick = () => { sfx.tap(); picker.onPick(it.id); };
    box.appendChild(b);
  }
}

// ---------- turn flow ----------
export async function startTurn() {
  const token = ++turnToken;
  ui.tentative = null; ui.selected = null; ui.hint = null; ui.snapshot = null; ui.placedAt = null;
  ui.shown = state.players.map((p) => p.score);
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null, extraMeeples: [] });
  save();
  renderPlayers();
  if (state.phase === 'over') { await endGame(); return; }
  if (state.discarded.length > (ui.discardSeen ?? state.discarded.length)) {
    const gone = state.discarded.slice(ui.discardSeen).map((t) => TILE_TYPES[t].name);
    toast(`Fits nowhere, put aside: ${gone.join(', ')}`);
  }
  ui.discardSeen = state.discarded.length;
  const p = cur();
  const control = controlOf(state.current);
  ui.placements = G.validPlacements(state);
  if (!ui.placements.some((pl) => pl.rots.includes(ui.previewRot))) ui.previewRot = ui.placements[0]?.rots[0] ?? 0;
  ui.previewRotDeg = ui.previewRot * 90;
  drawPreview();
  [...$('players').children].forEach((c, i) => c.classList.toggle('thinking', i === state.current && control !== 'local'));
  if (control === 'bot') {
    setDock({ instruction: `${escapeHtml(p.name)} is thinking…` });
    await aiTurn(token);
  } else if (control === 'remote') {
    remoteWaiting();
    pump();
  } else {
    const humansHere = localSeats().length;
    if (session.online) {
      banner(`<span style="color:${colorOf(p).dark}">●</span> Your turn${humansHere > 1 ? `, ${escapeHtml(p.name)}` : ''}!`, 1800);
      try { navigator.vibrate?.(120); } catch { /* not supported */ }
    } else if (state.players.filter((q) => q.kind === 'human').length > 1 || state.turn <= 2) {
      banner(`<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}'s turn`);
    }
    sfx.turn();
    humanPlacePhase();
  }
}

function remoteWaiting() {
  const p = cur();
  const offline = session.online && p.kind !== 'ai' && p.owner && !session.room?.clients?.[p.owner]?.online;
  const isHost = session.online && session.room?.hostId === session.net.id;
  let txt = p.kind === 'ai' ? `${escapeHtml(p.name)} is thinking…` : `Waiting for <b>${escapeHtml(p.name)}</b>…`;
  if (offline) txt = `<b>${escapeHtml(p.name)}</b>'s phone is offline.${isHost ? ' <a href="#" id="take-over">Let a bot play</a>' : ' Waiting…'}`;
  setDock({ instruction: txt });
  const link = document.getElementById('take-over');
  if (link) link.onclick = (e) => { e.preventDefault(); sendAction({ t: 'kind', seat: state.current, kind: 'ai', level: 'medium' }, true); };
}

function humanPlacePhase() {
  refreshCandidates();
  setDock({ instruction: 'Tap a square to place your tile — <b>gold</b> ones fit the way it is turned', rotate: true });
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
  const delta = ((r * 90 - prevDeg) % 360 + 360) % 360;
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

// What a placement would complete right now (helper mode)
function previewPoints(x, y, r) {
  const k = G.key(x, y);
  state.board[k] = { t: state.drawn, r, pieces: [], n: 0 };
  let ev = [];
  try { ev = G.scoreAfterPlacement(state, k, false).filter((e) => e.winners.length); } finally { delete state.board[k]; }
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

view.onTap = (wx, wy, sx, sy) => {
  if (ui.skippable) { ui.fast = true; return; }
  if (!state || state.phase === 'over' || !isLocal() || ui.busy) return;
  const x = Math.round(wx), y = Math.round(wy);
  if (state.phase === 'place') {
    if (ui.tentative && ui.tentative.x === x && ui.tentative.y === y) { rotateTentative(); return; }
    const pl = ui.placements.find((p) => p.x === x && p.y === y);
    if (!pl) return;
    sfx.tap();
    setTentative(x, y, pl.rots.includes(ui.previewRot) ? ui.previewRot : pl.rots[0], false);
  } else if (state.phase === 'action' && ui.ghosts?.length) {
    let best = null, bd = Math.max(26, view.cam.z * 0.22);
    for (const g of ui.ghosts) {
      const [gx, gy] = view.ghostScreenPos(g);
      const d = Math.hypot(gx - sx, gy - sy);
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) {
      // tapping elsewhere on a tile selects the feature under the finger
      const tile = state.board[G.key(x, y)];
      if (tile) {
        const [ux, uy] = rotUnit(wx - x + 0.5, wy - y + 0.5, -tile.r);
        const fi = featureUnder(tile.t, ux, uy);
        best = ui.ghosts.find((g) => g.key === G.key(x, y) && g.fi === fi) || null;
      }
      if (!best) { if (ui.selected) selectOption(null); return; }
    }
    if (ui.selected && sameOpt(best.act, ui.selected)) { onConfirm(); return; } // second tap = place it
    selectOption(best.act);
  }
};

function featureUnder(t, u, v) {
  const { label } = getTileArt(t);
  const H = 96;
  const x = Math.max(0, Math.min(H - 1, Math.floor(u * H))), y = Math.max(0, Math.min(H - 1, Math.floor(v * H)));
  return label[y * H + x];
}

$('btn-rotate').addEventListener('click', () => { if (state?.phase === 'place' && isLocal() && !ui.busy) rotateTentative(); });
$('preview').addEventListener('click', () => { if (state?.phase === 'place' && isLocal() && !ui.busy) rotateTentative(); });
$('btn-confirm').addEventListener('click', () => onConfirm());
$('btn-undo').addEventListener('click', () => onUndo());
$('btn-center').addEventListener('click', () => { sfx.tap(); view.fit(true, ui.placements?.map((p) => [p.x, p.y]) || [], 30); });
$('btn-hint').addEventListener('click', () => onHint());

async function onConfirm() {
  if (state?.phase === 'over' && !ui.busy) { showScores(); return; }
  if (!state || ui.busy || !isLocal()) return;
  if (state.phase === 'place' && ui.tentative) {
    const { x, y, r } = ui.tentative;
    ui.snapshot = { state: G.cloneState(state), tentative: { ...ui.tentative } };
    G.placeTile(state, x, y, r);
    ui.placedAt = { x, y, r };
    ui.tentative = null;
    view.setVM({ tentative: null, candidates: null, lastKey: state.last, lastColor: colorOf(cur()).light });
    view.addEffect({ type: 'drop', key: state.last, dur: 380 });
    sfx.place();
    drawPreview();
    beginActionPhase();
  } else if (state.phase === 'action') {
    await completeTurn(ui.selected, ui.placedAt);
  }
}

// ---------- follower phase ----------
const sameOpt = (a, b) => !!a && !!b && a.kind === b.kind && a.key === b.key && a.fi === b.fi && a.k === b.k;
const optGroup = (o) => (o.kind === 'follower' ? o.k : o.kind);

function beginActionPhase() {
  const opts = G.followerOptions(state);
  ui.options = opts;
  ui.selected = null;
  const groups = [...new Set(opts.map(optGroup))];
  ui.group = groups.includes('meeple') ? 'meeple' : groups[0] || null;
  if (!opts.length) {
    ui.ghosts = null;
    view.setVM({ ghosts: null });
    const reason = cur().supply.meeple === 0 ? 'You have no followers left.' : 'Nothing free to claim on this tile.';
    setDock({ instruction: `${reason} Press ✓ to finish`, confirm: true, undo: !!ui.snapshot, pulse: true });
    return;
  }
  const [x, y] = G.parseKey(state.last);
  view.animateCam({ x, y, z: Math.max(Math.min(view.cam.z, view.viewport().vh / 1.25), Math.min(170, view.w / 2.4, view.viewport().vh / 1.25)) });
  showGhosts();
  if (ui.hint && ui.hint.act && opts.some((o) => sameOpt(o, ui.hint.act))) {
    toast('💡 Hint: try this one');
    selectOption(opts.find((o) => sameOpt(o, ui.hint.act)));
  }
}

function ghostLabel(o) {
  const tile = state.board[o.key];
  const f = TILE_TYPES[tile.t].features[o.fi];
  let label = TYPE_LABEL[f.type] || f.type;
  if (!helper()) return label;
  if (f.type === 'monastery') {
    const [x, y] = G.parseKey(o.key);
    label += ` · ${1 + G.monasteryNeighbours(state.board, x, y)}`;
  } else if (f.type === 'road' || f.type === 'city') {
    const g = G.describeGroup(state, o.key, o.fi);
    label += g.complete ? ` · ${g.points} pts!` : f.type === 'city' ? ` · ${g.points} now · ${(g.tiles.size + g.pennants) * 2} if finished` : ` · worth ${g.points}+`;
  }
  return label;
}

function showGhosts() {
  const list = ui.options.filter((o) => optGroup(o) === ui.group && o.fi !== undefined);
  ui.ghosts = list.map((o) => ({ key: o.key, fi: o.fi, k: o.k || 'meeple', act: o, label: ghostLabel(o), selected: sameOpt(o, ui.selected) }));
  view.setVM({ ghosts: ui.ghosts, ghostColor: colorOf(cur()), showLabels: false });
  updateActionDock();
}

function pickerFor() {
  const groups = [...new Set(ui.options.map(optGroup))];
  return {
    active: ui.group,
    items: groups.map((g) => ({ id: g, kind: g, label: PIECE_LABEL[g] || g })),
    onPick: (g) => { ui.group = g; ui.selected = null; view.setVM({ highlight: null }); showGhosts(); },
  };
}

function updateActionDock(info = '') {
  const left = `<small>(♟${cur().supply.meeple} left)</small>`;
  setDock({
    instruction: ui.selected ? `${info}. Tap again or ✓` : `Tap a <b>ghost</b> to claim it, or ✓ to skip ${left}`,
    confirm: true, undo: !!ui.snapshot, pulse: !!ui.selected, picker: pickerFor(),
  });
}

function selectOption(opt) {
  ui.selected = opt;
  for (const g of ui.ghosts || []) g.selected = sameOpt(g.act, opt);
  sfx.meeple();
  let highlight = null;
  let info = '';
  if (opt && opt.kind === 'follower') {
    const tile = state.board[opt.key];
    const feat = TILE_TYPES[tile.t].features[opt.fi];
    if (feat.type === 'monastery') {
      highlight = { nodes: [[opt.key, opt.fi]] };
      info = `${TYPE_ICON.monastery} Monk in the monastery: 9 points when surrounded`;
    } else {
      const g = G.getGroup(state.board, opt.key, opt.fi);
      highlight = { nodes: g.nodes, color: feat.type === 'field' ? '#b6ff6a' : '#ffe680' };
      if (feat.type === 'field') {
        const done = G.fieldCities(state.board, g).filter((c) => c.complete).length;
        info = `${TYPE_ICON.field} Farmer (stays all game): ${done * 3} pts so far`;
      } else if (feat.type === 'road') {
        info = `${TYPE_ICON.road} Thief on a ${g.tiles.size}-tile road${g.complete ? ' — finished' : ''}`;
      } else {
        info = `${TYPE_ICON.city} Knight in a ${g.tiles.size}-tile city${g.pennants ? ` with ${g.pennants} 🛡️` : ''}${g.complete ? ' — finished' : ''}`;
      }
    }
  }
  view.setVM({ ghosts: ui.ghosts, highlight });
  updateActionDock(info);
}

function onUndo() {
  if (!ui.snapshot || ui.busy || state.phase !== 'action') return;
  sfx.tap();
  const snap = ui.snapshot;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, snap.state);
  ui.snapshot = null; ui.ghosts = null; ui.selected = null; ui.placedAt = null;
  view.setState(state);
  view.setVM({ ghosts: null, highlight: null, lastKey: state.last });
  drawPreview();
  setTentative(snap.tentative.x, snap.tentative.y, snap.tentative.r, false);
}

function onHint() {
  if (!state || ui.busy || !isLocal()) return;
  sfx.tap();
  if (state.phase === 'place') {
    const mv = suggestMove(state);
    if (!mv) return;
    ui.hint = mv;
    setTentative(mv.x, mv.y, mv.r, false);
    view.ensureVisible(mv.x, mv.y);
    toast('💡 How about here?');
  } else if (state.phase === 'action' && ui.options?.length) {
    const best = ui.hint?.act && ui.options.find((o) => sameOpt(o, ui.hint.act));
    if (best) { ui.group = optGroup(best); showGhosts(); selectOption(best); } else toast('💡 Keeping your follower might be smart');
  }
}

// ---------- committing a turn ----------
function sendAction(action, applyNow = false) {
  if (!session.online) return;
  const seq = cursor++;
  sent.add(seq);
  session.net.send({ type: 'action', seq, action, over: state.phase === 'over' });
  if (applyNow) { pending.push(action); pump(); }
}

// The local player (or a bot on this phone) finishes the turn.
async function completeTurn(act, placedAt) {
  const token = turnToken;
  ui.busy = true;
  const placer = state.current;
  const k = state.last;
  const action = { t: 'turn', x: placedAt.x, y: placedAt.y, r: placedAt.r, act: act || null };
  const events = G.finishTurn(state, act);
  state.seq = (state.seq || 0) + 1;
  if (session.online && !placedAt.resumed) sendAction(action);
  await afterTurnAnimation(events, act, k, placer, token);
}

async function afterTurnAnimation(events, act, k, placer, token) {
  view.setVM({ ghosts: null, highlight: null });
  ui.ghosts = null;
  const returning = events.flatMap((e) => e.meeples || []);
  view.setVM({ extraMeeples: returning.map((m) => ({ ...m })) });
  if (act && act.kind === 'follower') {
    view.addEffect({ type: 'pop', key: act.key, f: act.fi, dur: 500 });
    sfx.meeple();
    await sleep(420);
  }
  if (token !== turnToken) return;
  renderPlayers();
  await animateEvents(events, placer, false, token);
  if (token !== turnToken) return;
  ui.busy = false;
  void k;
  startTurn();
}

// Show another phone's (or the computer's) turn with the same animations.
async function playTurnAction(a, token) {
  const p = cur();
  ui.busy = true;
  ui.previewRot = a.r; ui.previewRotDeg = a.r * 90; drawPreview();
  view.ensureVisible(a.x, a.y);
  view.setVM({ tentative: { x: a.x, y: a.y, r: a.r, t: state.drawn, ok: true } });
  await sleep(ui.fast ? 0 : 550);
  if (token !== turnToken) return;
  const placer = state.current;
  G.placeTile(state, a.x, a.y, a.r);
  view.setVM({ tentative: null, lastKey: state.last, lastColor: colorOf(p).light });
  view.addEffect({ type: 'drop', key: state.last, dur: 380 });
  sfx.place();
  drawPreview();
  await sleep(ui.fast ? 0 : 420);
  if (token !== turnToken) return;
  [...$('players').children].forEach((c) => c.classList.remove('thinking'));
  const k = state.last;
  const events = G.finishTurn(state, a.act || null);
  state.seq = (state.seq || 0) + 1;
  await afterTurnAnimation(events, a.act, k, placer, token);
}

async function aiTurn(token) {
  ui.busy = true;
  const p = cur();
  await sleep(350);
  const t0 = performance.now();
  const mv = chooseMove(state, p.level);
  await sleep(Math.max(0, 450 - (performance.now() - t0)));
  if (token !== turnToken) return;
  const action = { t: 'turn', x: mv.x, y: mv.y, r: mv.r, act: mv.act || null };
  if (session.online) { const seq = cursor++; sent.add(seq); session.net.send({ type: 'action', seq, action, over: false }); }
  await playTurnAction(action, token);
}

// ---------- remote actions ----------
async function pump() {
  if (pumping || !state) return;
  pumping = true;
  try {
    while (pending.length && state && state.phase !== 'over') {
      if (ui.busy) break;
      const a = pending[0];
      if (a.t === 'turn') {
        if (controlOf(state.current) !== 'remote') break; // it's not their turn on this phone
        pending.shift();
        await playTurnAction(a, turnToken);
      } else {
        pending.shift();
        G.applyAction(state, a);
        renderPlayers();
        startTurn();
      }
    }
  } finally {
    pumping = false;
  }
}

export function onNetMessage(msg) {
  if (!session.online) return;
  if (msg.type === 'room') {
    const prevRunner = session.room?.botRunner;
    session.room = msg.room;
    if (!state) return;
    renderPlayers();
    updateNetBadge();
    if (state.phase !== 'over' && !ui.busy && !pumping) {
      const c = controlOf(state.current);
      if (c === 'bot' && prevRunner !== msg.room.botRunner) startTurn();
      else if (c === 'remote') remoteWaiting();
    }
    return;
  }
  if (msg.type === 'action') {
    if (!state) return;
    if (sent.has(msg.seq)) { sent.delete(msg.seq); return; } // our own move coming back
    if (msg.seq < cursor) return; // duplicate
    if (msg.seq > cursor) { session.net.send({ type: 'resync' }); return; }
    pending.push(msg.action);
    cursor++;
    pump();
    return;
  }
  if (msg.type === 'resync' || msg.type === 'welcome') {
    if (!msg.init) return;
    resyncFrom(msg.init, msg.actions || []);
    return;
  }
  if (msg.type === 'emote') {
    const who = Object.entries(session.room?.clients || {}).find(([id]) => id === msg.from)?.[1]?.name || '';
    banner(`${escapeHtml(who)} ${escapeHtml(msg.emoji)}`, 1400);
  }
}

// Bring this phone in line with the server's list of actions.
export function resyncFrom(init, actions) {
  if (state && state.gameId === init.gameId && state.seq <= actions.length && cursor <= actions.length) {
    for (let i = cursor; i < actions.length; i++) pending.push(actions[i]);
    cursor = actions.length;
    if (!ui.busy) pump();
    return;
  }
  const s = G.cloneState(init);
  for (const a of actions) G.applyAction(s, a);
  startGame(s, session);
}

function updateNetBadge() {
  const b = $('net-badge');
  if (!b) return;
  if (!session.online) { b.hidden = true; return; }
  b.hidden = false;
  const up = session.net?.isOpen();
  b.textContent = up ? `● ${session.code}` : '○ reconnecting…';
  b.classList.toggle('down', !up);
}
export function netStatus() { updateNetBadge(); if (state) renderPlayers(); }

// ---------- scoring animations ----------
async function animateEvents(events, placer, final = false, token = turnToken) {
  const wait = (ms) => (ui.fast ? Promise.resolve() : sleep(ms));
  for (const e of events) {
    if (token !== turnToken) return;
    const nodes = e.nodes || [];
    if (!nodes.length) continue;
    const tiles = [...new Set(nodes.map(([k]) => k))].map(G.parseKey);
    const cx = tiles.reduce((a, [x]) => a + x, 0) / tiles.length;
    const cy = tiles.reduce((a, [, y]) => a + y, 0) / tiles.length;
    if (!e.winners.length || (final && !e.points)) {
      if (!final) view.addEffect({ type: 'glow', nodes, dur: 900, color: '#ffffff' });
      for (const m of e.meeples || []) flyHome(m);
      continue;
    }
    view.ensureVisible(cx, cy);
    const winnerColor = colorOf(state.players[e.winners[0]]);
    const what = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm', garden: 'Garden' }[e.kind] || e.kind;
    const sub = e.label || (final ? (e.kind === 'field' ? `${e.cityCount ?? e.points / 3} finished cit${(e.cityCount ?? e.points / 3) === 1 ? 'y' : 'ies'}` : `Unfinished ${what.toLowerCase()}`)
      : `${what} complete!`);
    if (e.kind === 'field' && e.cities) {
      for (const cn of e.cities) view.addEffect({ type: 'glow', nodes: cn, dur: 1700, color: '#ffd84a' });
      view.addEffect({ type: 'glow', nodes, dur: 1700, color: '#9dff5a' });
    } else {
      view.addEffect({ type: 'glow', nodes, dur: 1700, color: '#ffd84a' });
    }
    view.addEffect({ type: 'float', x: cx, y: cy, text: `+${e.points}${e.winners.length > 1 ? ' each' : ''}`, sub, color: winnerColor.light, dur: 1900 });
    view.addEffect({ type: 'sparkle', x: cx, y: cy, dur: 1100, n: Math.min(60, 14 + e.points * 2), colors: ['#ffe27a', '#fff', winnerColor.light] });
    if (!ui.fast) sfx.score(e.points >= 8);
    const ms = e.meeples || [];
    if (!final && ms.length && new Set(ms.filter((m) => (m.w ?? 1) > 0).map((m) => m.p)).size > 1) {
      const losers = [...new Set(ms.map((m) => m.p))].filter((p) => !e.winners.includes(p));
      banner(losers.length ? `⚔️ ${escapeHtml(state.players[e.winners[0]].name)} wins the ${what.toLowerCase()} from ${losers.map((p) => escapeHtml(state.players[p].name)).join(' & ')}!` : `🤝 Shared ${what.toLowerCase()}! +${e.points} each`, 2200);
    } else if (!final && e.points >= 8) {
      banner(`🎉 ${escapeHtml(state.players[e.winners[0]].name)} +${e.points}! Great ${what.toLowerCase()}!`, 2000);
    }
    await wait(final ? 750 : 650);
    for (const w of e.winners) { ui.shown[w] += e.points; bumpChip(w); }
    renderPlayers();
    for (const m of ms) flyHome(m);
    await wait(final ? 650 : 750);
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
  const extra = (view.vm.extraMeeples || []).filter((q) => !(q.key === m.key && q.f === m.f && q.k === m.k && q.p === m.p));
  view.setVM({ extraMeeples: extra });
  view.addEffect({ type: 'fly', from: [x + rx - 0.5, y + ry - 0.5], to: chipCenter(m.p), color: colorOf(state.players[m.p]), kind: m.k, dur: 700 });
}

// ---------- end of game ----------
async function endGame() {
  ui.busy = true;
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null });
  drawPreview();
  setDock({ instruction: 'The last tile has been placed!' });
  const events = state.finalEvents || [];
  if (!ui.finalShown) {
    ui.shown = state.players.map((p) => p.score);
    for (const e of events) for (const w of e.winners) ui.shown[w] -= e.points;
    view.setVM({ extraMeeples: events.flatMap((e) => e.meeples || []) });
    renderPlayers();
    banner('🏁 Final scoring — tap to skip', 2200);
    ui.fast = false;
    ui.skippable = true;
    await sleep(1200);
    view.fit(true);
    await sleep(700);
    let lastKind = null;
    for (const e of events) {
      if (e.kind !== lastKind && !ui.fast) {
        lastKind = e.kind;
        const title = e.section || { road: '🛣️ Unfinished roads', city: '🏯 Unfinished cities', monastery: '⛪ Monasteries', field: '🌾 Farms' }[e.kind];
        if (title) banner(title, 1500);
        await sleep(600);
      }
      await animateEvents([e], null, true);
    }
    ui.finalShown = true;
    ui.skippable = false;
  }
  setDock({ instruction: 'Game over! Tap 🏆 to see the results', confirm: true });
  $('btn-confirm').textContent = '🏆';
  ui.shown = state.players.map((p) => p.score);
  renderPlayers();
  view.setVM({ extraMeeples: [] });
  ui.busy = false;
  sfx.fanfare();
  confetti();
  showScores();
  if (!session.online) store.del('carc-save');
}

const SCORE_COLUMNS = [['road', '🛣️'], ['city', '🏯'], ['monastery', '⛪'], ['field', '🌾']];

export function showScores() {
  if (!state) return;
  const maxScore = Math.max(...state.players.map((p) => p.score));
  const winners = state.players.filter((p) => p.score === maxScore);
  const isFinal = state.phase === 'over';
  $('scores-title').textContent = isFinal ? 'Final Scores' : 'Scores so far';
  let html = '';
  if (isFinal) {
    html += `<div class="trophy">🏆</div><div class="winner-name" style="color:${colorOf(winners[0]).dark}">${winners.map((w) => escapeHtml(w.name)).join(' & ')} ${winners.length > 1 ? 'tie!' : 'wins!'}</div>`;
  }
  const cols = SCORE_COLUMNS.filter(([k]) => ['road', 'city', 'monastery', 'field'].includes(k) || state.players.some((p) => p.breakdown[k]));
  html += `<table class="scores"><tr><th></th>${cols.map(([, icon]) => `<th>${icon}</th>`).join('')}<th>Total</th></tr>`;
  const order = state.players.map((p, i) => i).sort((a, b) => state.players[b].score - state.players[a].score);
  for (const i of order) {
    const p = state.players[i];
    html += `<tr class="${isFinal && p.score === maxScore ? 'winner' : ''}"><td class="n"><span style="color:${colorOf(p).main}">●</span> ${escapeHtml(p.name)}</td>
      ${cols.map(([k]) => `<td>${p.breakdown[k] || 0}</td>`).join('')}<td class="total">${p.score}</td></tr>`;
  }
  html += '</table>';
  if (!isFinal) html += `<p style="text-align:center;margin:0 0 6px;font-size:13px">${state.deck.length + (state.drawn ? 1 : 0)} tiles left · ${state.discarded.length} put aside</p>`;
  $('scores-table').innerHTML = html;
  const actions = $('scores-actions');
  actions.innerHTML = '';
  const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `btn ${cls} wide`; b.textContent = label; b.onclick = fn; actions.appendChild(b); };
  if (isFinal) {
    const isHost = !session.online || session.room?.hostId === session.net.id;
    if (isHost) {
      btn('Play Again', 'red', () => {
        $('scores-modal').hidden = true;
        if (session.online) { hooks.onRematch?.(); return; }
        const ns = G.newGame(state.players.map((p) => ({ name: p.name, color: p.color, kind: p.kind, level: p.level })), state.options);
        ns.current = Math.floor(Math.random() * ns.players.length);
        startGame(ns);
      });
    }
    btn('View the Map', 'parchment', () => { $('scores-modal').hidden = true; view.fit(true, [], 20); });
    btn('Home', 'parchment', () => { $('scores-modal').hidden = true; leaveGame(); });
  } else {
    btn('Close', 'parchment', () => { $('scores-modal').hidden = true; });
  }
  $('scores-modal').hidden = false;
}

export function leaveGame() {
  turnToken++;
  ui.busy = false;
  save();
  pending.length = 0;
  hooks.onLeave?.();
  show('home');
}

export function stopGame() { turnToken++; state = null; }

export function emote(emoji) {
  if (session.online) session.net.send({ type: 'emote', emoji });
  else banner(emoji, 1200);
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

// keep the in-progress game safe when the app is backgrounded
document.addEventListener('visibilitychange', () => { if (document.hidden && state && state.phase !== 'over') save(); });
