// Game controller: turn flow, animations, online sync, end of game.
// Works for pass-and-play (one phone) and online play (one phone each).
import { TILE_TYPES, isRiverTile } from './tiles.js';
import * as G from './game.js';
import { chooseMove, suggestMove, chooseDragonMove, chooseRansom, chooseCastle, chooseBazaarAction } from './ai.js';
import { BoardView, besideBridge } from './board.js';
import { getTileArt, getTileThumb, getTileBack, rotUnit, drawCastle } from './art.js';
import { sfx } from './sound.js';
import { fingerprint } from './net.js';
import { $, sleep, store, escapeHtml, show, pieceIcon, banner, toast, ask } from './ui.js';

export const TYPE_LABEL = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm', garden: 'Garden' };
const TYPE_ICON = { road: '🛣️', city: '🏯', monastery: '⛪', field: '🌾', garden: '🌳' };
const PIECE_LABEL = {
  meeple: 'Meeple', large: 'Big meeple', abbot: 'Abbot', builder: 'Builder', pig: 'Pig', recall: 'Abbot home',
  fairy: 'Fairy', princess: 'Princess', floor: 'Tower floor', 'towerTop:meeple': 'Close a tower', 'towerTop:large': 'Close · big',
  'portal:meeple': 'Portal', 'portal:large': 'Portal · big', 'portal:abbot': 'Portal · abbot',
  bridge: 'Bridge',
};
const GROUP_ICON = { recall: '⤴️', princess: '👸', floor: '🏰', bridge: '🌉' };
const KIND_NAME = { meeple: 'meeple', large: 'big meeple', abbot: 'abbot', builder: 'builder', pig: 'pig' };

export const view = new BoardView($('board'));
let state = null;
let ui = {};
let session = { online: false };
let turnToken = 0;
const pending = [];
const sent = new Set(); // seq numbers of actions this phone sent (ignore their echo)
let cursor = 0; // seq of the next action we expect from the server (applied + queued + in flight)
let applied = []; // online: every action applied to our copy, in order (JSON), to check against the room's list
const record = (action) => { if (session.online) applied.push(JSON.stringify(action)); };
// our copy has every move the room has sent us, so a move made now is a move on the latest game
const caughtUp = () => !pending.length && cursor === applied.length;
let forceRebuild = false; // set when a move from the room could not be applied
let pumping = false;
const offlineSince = {}; // online: phone id -> when we saw it go offline
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
// whose decision it is right now: the player in turn, whoever moves the dragon, the
// owner of a small city that may become a castle, or whoever acts in a bazaar auction
const actingSeat = () => G.actingSeat(state) ?? state.current;
const isLocal = () => controlOf(actingSeat()) === 'local';
const localSeats = () => state.players.map((p, i) => i).filter((i) => controlOf(i) === 'local');

export function startGame(s, sess = { online: false }, log = []) {
  state = G.migrate(s);
  session = sess;
  pending.length = 0;
  sent.clear();
  applied = log.map((a) => JSON.stringify(a));
  cursor = state.seq || 0;
  if (session.online) noteOnline();
  $('btn-confirm').textContent = '✓';
  ui = { shown: state.players.map((p) => p.score), previewRot: 0, previewRotDeg: 0, discardSeen: state.discarded.length };
  view.setState(state);
  view.setVM({ candidates: null, tentative: null, ghosts: null, highlight: null, castleArea: null, extraMeeples: [], lastKey: state.last });
  show('game');
  view.resize();
  renderPlayers();
  renderBazaar();
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
      chip.insertAdjacentHTML('beforeend', '<div class="pname"></div><div class="pscore"></div><div class="pmeeples"></div><div class="pextra"></div>');
      chip.addEventListener('click', () => showScores());
      box.appendChild(chip);
    });
  }
  const online = session.online ? session.room?.clients || {} : null;
  // 5 or 6 players: two rows of smaller cards, with the meeple count on the small line
  const compact = state.players.length >= 5;
  box.dataset.n = state.players.length;
  [...box.children].forEach((chip, i) => {
    const p = state.players[i];
    chip.querySelector('.pname').textContent = p.name;
    chip.querySelector('.pscore').textContent = String(ui.shown[i]).replace('-', '−');
    chip.querySelector('.pmeeples').textContent = '';
    const extra = `${supplyText(p)} ${extraText(p, i)}`.trim();
    const ex = chip.querySelector('.pextra');
    if (ex.dataset.html !== extra) { ex.dataset.html = extra; ex.innerHTML = extra; }
    chip.classList.toggle('active', state.phase !== 'over' && i === actingSeat());
    chip.classList.toggle('neg', ui.shown[i] < 0);
    chip.classList.toggle('me', session.online && controlOf(i) === 'local');
    // (while our own connection is down we can't tell who else is there)
    const off = online && session.net?.isOpen() && p.kind !== 'ai' && p.owner && !online[p.owner]?.online;
    chip.classList.toggle('offline', !!off);
  });
  renderSeatBack();
  // keep the player whose turn it is in view when the cards don't all fit
  const active = box.children[actingSeat()];
  if (active && box.scrollWidth > box.clientWidth + 2) {
    const r = active.getBoundingClientRect(), br = box.getBoundingClientRect();
    if (r.left < br.left || r.right > br.right) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  $('deck-count').textContent = state.deck.length + (state.drawn ? 1 : 0) + (state.setAside?.length || 0) + (state.bazaar ? state.bazaar.tiles.filter((x) => !x.played).length : 0);
  // the pile shows the back of the next tile: The River's tiles come first, with a blue back
  const back = state.deck.length && isRiverTile(state.deck[state.deck.length - 1]) ? 'river' : 'base';
  const stack = document.querySelector('#deck .stack');
  // (the photographed back over the painted one, which shows if the photo is missing)
  if (stack.dataset.back !== back) { stack.dataset.back = back; stack.style.backgroundImage = `url(assets/ui/tile-back-${back}.webp), url(${getTileBack(back).toDataURL()})`; }
}

function supplyText(p) {
  return `♟${p.supply.meeple}`;
}

// Expansion counters under the score (HTML): tower floors, prisoners (a dot in each
// prisoner's colour), the fairy, goods, and the big meeple and abbot while still at home.
function extraText(p, i) {
  const ex = state.options.expansions || {};
  const parts = [];
  if (ex.tower) parts.push(`🏰${p.floors}`);
  if (p.prisoners?.length) parts.push(`⛓${p.prisoners.map((q) => `<i class="dot" style="background:${colorOf(state.players[q.p]).main}"></i>`).join('')}`);
  if (state.fairy?.p === i) parts.push('🧚');
  if (ex.traders && p.goods) {
    const g = [['🍷', p.goods.wine], ['🌾', p.goods.grain], ['🧵', p.goods.cloth]].filter(([, n]) => n > 0);
    if (g.length) parts.push(g.map(([icon, n]) => `${icon}${n}`).join(''));
  }
  const figs = [p.supply.large ? 'large' : null, ex.abbot && p.supply.abbot ? 'abbot' : null].filter(Boolean);
  if (figs.length) parts.push(figs.map((k) => miniIcon(p.color, k)).join(''));
  // Bridges, Castles & Bazaars: bridges and castles still to build
  if (G.bcbOn(state, 'bridges')) parts.push(`🌉${p.bridges || 0}`);
  if (G.bcbOn(state, 'castles')) parts.push(`${castleIcon()}${p.castles || 0}`);
  return parts.join(' ');
}

let castleURL = null;
function castleIcon() {
  if (!castleURL) {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    drawCastle(c.getContext('2d'), 24, 42, 80);
    castleURL = c.toDataURL();
  }
  return `<img class="mini" src="${castleURL}" alt="castles">`;
}

const miniIcons = new Map();
function miniIcon(color, kind) {
  const id = `${color}:${kind}`;
  if (!miniIcons.has(id)) miniIcons.set(id, pieceIcon(color, 16, kind).toDataURL());
  return `<img class="mini" src="${miniIcons.get(id)}" alt="+${KIND_NAME[kind]}">`;
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

// the miniature pictures arrive a moment later: repaint the tile in hand
window.addEventListener('minis-updated', () => { if (state) drawPreview(); });
function drawPreview() {
  const c = $('preview'); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if (!state.drawn) { c.style.visibility = 'hidden'; return; }
  c.style.visibility = 'visible';
  ctx.drawImage(getTileThumb(state.drawn, c.width), 0, 0, c.width, c.height);
  c.style.transform = `rotate(${ui.previewRotDeg ?? ui.previewRot * 90}deg)`;
}

function setDock({ instruction, rotate = false, confirm = false, undo = false, pulse = false, picker = null, seat = actingSeat() }) {
  const p = state.players[seat];
  const who = session.online && controlOf(seat) === 'local' ? ' (you)' : '';
  $('turn-name').innerHTML = `<span class="dot" style="background:${colorOf(p).main}"></span>${escapeHtml(p.name)}${who}${p.kind === 'ai' ? ' 🤖' : ''}`;
  $('instruction').innerHTML = instruction;
  $('btn-rotate').disabled = !rotate;
  $('btn-confirm').disabled = !confirm;
  $('btn-confirm').classList.toggle('pulse', pulse);
  $('btn-undo').disabled = !undo;
  $('btn-undo').hidden = !undo;
  const decision = state.phase === 'castle' || state.phase === 'bazaar'; // (the choices are elsewhere)
  $('btn-rotate').hidden = decision || (!rotate && undo);
  $('btn-confirm').hidden = decision;
  $('btn-hint').hidden = !helper() || !isLocal() || !['place', 'action'].includes(state.phase);
  $('btn-ransom').hidden = !(isLocal() && !ui.busy && G.ransomOptions(state).length);
  renderPicker(picker);
  renderDockExtra();
  requestAnimationFrame(placeOverlays);
}

// The buttons and badges over the map sit above the dock, and above the bazaar round's
// strip while it is shown (Bridges, Castles & Bazaars).
function placeOverlays() {
  const h = $('dock').offsetHeight;
  const bz = $('bazaar');
  bz.style.bottom = `${h + 8}px`;
  const over = bz.hidden ? 0 : bz.offsetHeight + 8; // the auction sheet or the round's strip
  const strip = bz.classList.contains('strip') ? over : 0;
  // the map keeps clear of the dock and the strip (measured here, not on every draw)
  const top = $('topbar').offsetHeight;
  if (view.dockH !== h || view.stripH !== strip || view.topH !== top) { view.dockH = h; view.stripH = strip; view.topH = top; view.dirty = true; }
  $('side-tools').style.bottom = `${h + 14 + strip}px`;
  $('seat-back').style.bottom = `${h + 12 + over}px`;
  $('net-badge').style.bottom = `${h + 16 + over}px`;
}

window.addEventListener('resize', () => requestAnimationFrame(placeOverlays));

// Row of piece/action choices in the dock (only shown when there is a choice).
function renderPicker(picker) {
  const box = $('picker');
  box.innerHTML = '';
  if (!picker || picker.items.length < 2) { box.hidden = true; return; }
  box.hidden = false;
  for (const it of picker.items) {
    const b = document.createElement('button');
    b.className = 'pick' + (it.id === picker.active ? ' active' : '');
    if (it.icon) b.append(document.createTextNode(it.icon));
    if (it.kind) b.append(pieceIcon(cur().color, 22, it.kind));
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
  if (session.online && pending.length) {
    // moves from the room are still to be shown: play them first
    setDock({ instruction: 'Catching up…' });
    pump();
    return;
  }
  if (state.discarded.length > (ui.discardSeen ?? state.discarded.length)) {
    const gone = state.discarded.slice(ui.discardSeen).map((t) => TILE_TYPES[t].name);
    toast(`Fits nowhere, put aside: ${gone.join(', ')}`);
  }
  ui.discardSeen = state.discarded.length;
  renderBazaar();
  if (state.phase === 'dragon') { dragonPhase(); return; }
  if (state.phase === 'castle') { castlePhase(); return; }
  if (state.phase === 'bazaar') { bazaarPhase(); return; }
  view.setVM({ dragonPath: null, dragonMoves: null, castleArea: null });
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
    } else if (state.part === 2) {
      banner(`🔨 ${escapeHtml(p.name)}'s builder: play a bonus tile!`, 1800);
    } else if (state.players.filter((q) => q.kind === 'human').length > 1 || state.turn <= 2) {
      banner(`<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}'s turn`);
    }
    sfx.turn();
    humanPlacePhase();
  }
}

// ---------- The Princess & the Dragon: the dragon's flight ----------
async function dragonPhase() {
  const token = turnToken;
  const mover = G.dragonMover(state);
  const p = state.players[mover];
  const moves = G.dragonMoves(state);
  const control = controlOf(mover);
  const step = state.flight.moves + 1;
  ui.dragonMoves = control === 'local' ? moves : null;
  view.setVM({ dragonPath: [...state.flight.visited], dragonMoves: ui.dragonMoves, candidates: null, ghosts: null, highlight: null, tentative: null });
  [...$('players').children].forEach((c, i) => c.classList.toggle('thinking', i === mover && control !== 'local'));
  const [dx, dy] = G.parseKey(state.dragon);
  view.ensureVisible(dx, dy);
  renderPlayers();
  const who = `<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}`;
  if (step === 1) { banner(`🐉 The dragon takes flight! ${who} moves it first`, 1900); sfx.dragon(); }
  if (control === 'local') {
    if (step > 1 && (session.online || state.players.filter((q) => q.kind === 'human').length > 1)) banner(`${who}: move the dragon`, 1400);
    setDock({ instruction: `🐉 Move the dragon, step <b>${step} of ${G.DRAGON_STEPS}</b>: tap a <b style="color:#c62b1d">red</b> tile. It eats every figure there!`, seat: mover });
  } else if (control === 'bot') {
    setDock({ instruction: `🐉 ${escapeHtml(p.name)} is moving the dragon (${step}/${G.DRAGON_STEPS})…`, seat: mover });
    ui.busy = true;
    await sleep(ui.fast ? 0 : 650);
    if (token !== turnToken) return;
    ui.busy = false;
    // another phone runs the computer players now, or the room has moved on: catch up instead
    if (state.phase !== 'dragon' || controlOf(mover) !== 'bot' || !caughtUp()) { catchUp(); return; }
    const k = chooseDragonMove(state, p.level);
    sendMove({ t: 'dragon', key: k });
    await playDragonMove(k, token);
  } else {
    remoteWaiting(mover);
    pump();
  }
}

async function playDragonMove(k, token) {
  ui.busy = true;
  ui.dragonMoves = null;
  const placer = state.current;
  const path = [...state.flight.visited, k];
  view.setVM({ dragonMoves: null, dragonPath: path });
  const from = state.dragon;
  const events = G.moveDragon(state, k);
  state.seq = (state.seq || 0) + 1;
  record({ t: 'dragon', key: k });
  view.setVM({ dragonFly: { from, start: performance.now(), dur: ui.fast ? 1 : 520 } });
  sfx.dragon();
  await sleep(ui.fast ? 0 : 560);
  if (token !== turnToken) return;
  const eaten = events.find((e) => e.kind === 'dragon')?.meeples || [];
  if (eaten.length) {
    sfx.chomp();
    const names = [...new Set(eaten.map((m) => state.players[m.p].name))];
    banner(`🐉 Chomp! The dragon eats ${eaten.length === 1 ? `${escapeHtml(names[0])}'s ${KIND_NAME[eaten[0].k] || 'figure'}` : `${eaten.length} figures`}!`, 1600);
  }
  view.setVM({ extraMeeples: events.flatMap((e) => e.meeples || []) });
  renderPlayers();
  await animateEvents(events, placer, false, token);
  if (token !== turnToken) return;
  ui.busy = false;
  if (state.phase !== 'dragon') view.setVM({ dragonPath: null });
  startTurn();
}

// ---------- Bridges, Castles & Bazaars: castles, discards and the bazaar ----------
// Apply a castle, bazaar or discard move (made here, by a bot run here, or on another
// phone) and show it. send: made on this phone, so tell the other phones too.
async function playSimple(action, token, send = false) {
  ui.busy = true;
  const placer = state.current;
  const thrown = state.discarded.length;
  const events = G.applyAction(state, action);
  if (action.t === 'discard') ui.discardSeen = thrown + 1; // (told by its own message, not as "fits nowhere")
  if (send) sendMove(action, state.phase === 'over');
  record(action);
  setDock({ instruction: '…', seat: G.actingSeat(state) ?? state.current });
  view.setVM({ highlight: null, castleArea: null });
  renderBazaar();
  renderPlayers();
  await animateEvents(events, placer, false, token);
  if (token !== turnToken) return;
  ui.busy = false;
  startTurn();
}

// A move made on this phone: play it here and send it to the other phones.
function localMove(action) {
  playSimple(action, turnToken, true).catch((err) => {
    console.error(err);
    ui.busy = false;
    toast('That move is not allowed');
    startTurn();
  });
}

// What a castle could score: the unfinished things around it, in words.
function castleReach(area) {
  const seen = new Set();
  const parts = [];
  for (const k of area) {
    const tile = state.board[k];
    if (!tile) continue;
    G.featuresOf(tile).forEach((f, fi) => {
      if (f.type === 'monastery' || f.type === 'garden') {
        if (seen.has(k)) return; // (occupied or not: either sets the castle off)
        seen.add(k);
        const [x, y] = G.parseKey(k);
        const n = G.monasteryNeighbours(state.board, x, y);
        if (n < 8) parts.push(`a ${f.type} with ${n} of 8 neighbours`);
        return;
      }
      if (f.type !== 'road' && f.type !== 'city') return;
      const g = G.getGroup(state.board, k, fi);
      if (seen.has(g.id) || g.complete) return;
      seen.add(g.id);
      const open = g.openEdges ?? 0;
      parts.push(`a ${g.tiles.size}-tile ${f.type}${open ? ` (${open} open end${open === 1 ? '' : 's'})` : ''}`);
    });
  }
  return parts.length ? parts.slice(0, 4).join(', ') : 'nothing open yet (tiles laid there later count too)';
}

async function castlePhase() {
  const token = turnToken;
  const o = G.castleOptions(state);
  const seat = o.seat;
  const p = state.players[seat];
  const control = controlOf(seat);
  view.setVM({ highlight: { nodes: o.nodes, color: '#ffd84a' }, castleArea: o.area, candidates: null, ghosts: null, tentative: null });
  const pts = o.area.map(G.parseKey);
  requestAnimationFrame(() => { if (token === turnToken) view.frameTiles(pts, 120); });
  drawPreview();
  renderPlayers();
  const who = `<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}`;
  if (control === 'local') {
    // the buttons are in the dock (renderDockExtra), so the map stays in view
    setDock({ instruction: '🏰 Small city finished! A <b>castle</b> scores the next road, city or monastery finished in the gold squares.', seat });
    if (seat !== state.current) {
      // somebody else's tile finished this player's small city
      sfx.tap();
      banner(`👉 ${escapeHtml(p.name)}: your small city is finished — castle or points?`, 1800);
    }
  } else if (control === 'bot') {
    setDock({ instruction: `🏰 ${who} is deciding about a castle…`, seat });
    ui.busy = true;
    await sleep(ui.fast ? 0 : 900);
    if (token !== turnToken) return;
    ui.busy = false;
    if (state.phase !== 'castle' || controlOf(seat) !== 'bot' || !caughtUp()) { catchUp(); return; }
    await playSimple(chooseCastle(state, p.level), token, true);
  } else {
    remoteWaiting(seat);
    pump();
  }
}

// The castle decision made on this phone.
function castleDecision(build) {
  if (!state || ui.busy || state.phase !== 'castle' || !isLocal()) return;
  sfx.tap();
  localMove({ t: 'castle', fi: G.castleOptions(state).fi, build });
}

// The auction: everyone sees the sheet; whoever must act gets the controls.
async function bazaarPhase() {
  const token = turnToken;
  const seat = G.actingSeat(state);
  const p = state.players[seat];
  const control = controlOf(seat);
  view.setVM({ candidates: null, ghosts: null, tentative: null, highlight: null });
  renderBazaar();
  renderPlayers();
  const o = G.bazaarOptions(state);
  const who = `<span style="color:${colorOf(p).dark}">●</span> ${escapeHtml(p.name)}`;
  if (control === 'local') {
    const what = { pick: 'choose a tile to auction and make the first bid', bid: `raise the bid above ${o.high?.bid} or pass`, decide: `keep the tile (pay ${escapeHtml(state.players[o.high?.p]?.name || '')} ${o.high?.bid}) or sell it`, take: 'take one of the tiles' }[o.stage];
    setDock({ instruction: `🛒 ${who}: ${what}`, seat });
    if (!session.online && localSeats().length > 1) banner(`👉 ${escapeHtml(p.name)}: your turn in the bazaar`, 1300);
  } else if (control === 'bot') {
    setDock({ instruction: `🛒 ${who} is thinking about the bazaar…`, seat });
    ui.busy = true;
    await sleep(ui.fast ? 0 : 700);
    if (token !== turnToken) return;
    ui.busy = false;
    if (state.phase !== 'bazaar' || G.actingSeat(state) !== seat || controlOf(seat) !== 'bot' || !caughtUp()) { catchUp(); return; }
    await playSimple(chooseBazaarAction(state, p.level), token, true);
  } else {
    remoteWaiting(seat);
    pump();
  }
}

// A bazaar move made on this phone.
function bazaarMove(action) {
  if (!state || ui.busy || state.phase !== 'bazaar' || !isLocal()) return;
  sfx.tap();
  localMove(action);
}

// Whether anybody could place tile t now (with a bridge if someone has one left).
function fitsForSomeone(t) {
  const seat = state.players.findIndex((p) => p.bridges > 0);
  const current = state.current;
  if (seat >= 0) state.current = seat;
  try { return G.validPlacements(state, t).length > 0; } finally { state.current = current; }
}

// The bazaar sheet (auction) or strip (bazaar round), drawn from the state.
function renderBazaar() {
  const box = $('bazaar');
  const bz = state?.bazaar;
  view.dirty = true; // (the strip changes the map's visible area)
  if (!bz) { box.hidden = true; box.innerHTML = ''; ui.bazaarPick = null; ui.bazaarReady = null; requestAnimationFrame(placeOverlays); return; }
  box.hidden = false;
  const n = state.players.length;
  const sheet = state.phase === 'bazaar';
  box.classList.toggle('strip', !sheet);
  const o = sheet ? G.bazaarOptions(state) : null;
  const mine = sheet && isLocal() && !ui.busy;
  // several people on this phone: the next one takes the phone before their controls show
  const handOver = mine && localSeats().length > 1 && ui.bazaarReady !== o.seat;
  if (!o?.pick?.includes(ui.bazaarPick) || o.stage !== 'pick') ui.bazaarPick = null;
  const nm = (i) => escapeHtml(state.players[i].name);
  const dot = (i) => `<span style="color:${colorOf(state.players[i]).main}">●</span>`;
  // (the strip shows the tiles in playing order; tiles nobody has taken yet come last)
  const turnOf = (i) => (bz.tiles[i].owner === null ? n : (bz.tiles[i].owner - bz.host - 1 + 2 * n) % n);
  const order = bz.tiles.map((x, i) => i);
  if (!sheet) order.sort((a, b) => turnOf(a) - turnOf(b));
  let html = `<div class="bz-head">🛒 Bazaar <small>· ${sheet ? `hosted by ${dot(bz.host)} ${nm(bz.host)}` : 'everyone plays their tile in turn'}</small></div><div class="bz-tiles">`;
  for (const i of order) {
    const x = bz.tiles[i];
    let who;
    if (x.owner !== null) {
      const how = x.how === 'take' ? '' : x.price ? ` · paid ${x.price}` : ' · free';
      const mark = sheet || !x.played ? '' : x.owner === state.current && state.phase !== 'over' ? '▶ ' : '✓ ';
      who = `${mark}${dot(x.owner)} ${nm(x.owner)}${sheet ? how : ''}`;
    } else if (bz.item === i && bz.high) who = `<b>Bid ${bz.high.bid}</b> · ${dot(bz.high.p)} ${nm(bz.high.p)}`;
    else who = fitsForSomeone(x.t) ? '' : '<span class="bz-warn">⚠ fits nowhere now</span>';
    const sel = sheet ? ui.bazaarPick === i || bz.item === i : x.owner === state.current && x.played;
    const can = mine && !handOver && o.pick?.includes(i);
    // (a real button: iPhones don't send taps on plain boxes to the sheet's click handler)
    html += `<button type="button" class="bz-card${sel ? ' sel' : ''}${x.owner !== null && sheet ? ' owned' : ''}${can ? ' can' : ''}" data-i="${i}"${can ? '' : ' tabindex="-1"'}><canvas width="128" height="128"></canvas><span class="bz-who">${who}</span></button>`;
  }
  html += '</div>';
  if (sheet) {
    const seat = o.seat;
    const capped = o.stage === 'bid' && o.minBid > o.maxBid;
    const status = o.stage === 'pick' ? `${dot(seat)} ${nm(seat)} chooses a tile to auction`
      : capped ? `${dot(seat)} ${nm(seat)}: nobody can bid more than ${o.maxBid} — pass`
      : o.stage === 'bid' ? `${dot(seat)} ${nm(seat)}: bid more than ${o.high.bid}, or pass`
        : o.stage === 'decide' ? `${dot(seat)} ${nm(seat)}: keep the tile (pay ${nm(o.high.p)} ${o.high.bid}) or sell it to ${nm(o.high.p)}`
          : `${dot(seat)} ${nm(seat)} takes a tile`;
    html += `<div class="bz-status">${status}</div>`;
    const still = [];
    for (let k = 0; k < n; k++) { const q = (bz.chooser + k) % n; if (!bz.tiles.some((x) => x.owner === q)) still.push(q); }
    if (o.stage !== 'take' && still.length > 1) html += `<div class="bz-order">Still without a tile: ${still.map((q) => `${dot(q)} ${nm(q)}`).join(' ▸ ')}</div>`;
    if (handOver) html += `<div class="bz-ctrl"><button class="btn small red" data-bz="ready">👉 ${nm(seat)}: tap when you have the phone</button></div>`;
    if (mine && !handOver) {
      const stepper = (label, op) => `<button class="btn small parchment bz-step" data-bz="minus" aria-label="Less">−</button><b class="bz-bid">${ui.bazaarBid}</b><button class="btn small parchment bz-step" data-bz="plus" aria-label="More">+</button><button class="btn small red" data-bz="${op}">${label}</button>`;
      if (o.stage === 'pick') {
        ui.bazaarBid = Math.max(0, ui.bazaarBid ?? 0);
        html += `<div class="bz-ctrl">${ui.bazaarPick === null ? '<span class="bz-tip">👆 Tap the tile you want to auction</span>' : stepper(`Pick &amp; bid ${ui.bazaarBid}`, 'pick')}</div>`;
      } else if (o.stage === 'bid' && capped) {
        html += '<div class="bz-ctrl"><button class="btn small parchment" data-bz="pass">Pass</button></div>';
      } else if (o.stage === 'bid') {
        ui.bazaarBid = Math.max(o.minBid, ui.bazaarBid ?? o.minBid);
        html += `<div class="bz-ctrl">${stepper(`Bid ${ui.bazaarBid}`, 'raise')}<button class="btn small parchment" data-bz="pass">Pass</button></div>`;
      } else if (o.stage === 'decide') {
        html += `<div class="bz-ctrl"><button class="btn small red" data-bz="buy">Keep it (pay ${nm(o.high.p)} ${o.high.bid})</button><button class="btn small parchment" data-bz="sell">Sell it (${nm(o.high.p)} pays you ${o.high.bid})</button></div>`;
      } else {
        html += '<div class="bz-ctrl"><span class="bz-tip">👆 Tap the tile you want</span></div>';
      }
    }
  }
  box.innerHTML = html;
  requestAnimationFrame(placeOverlays);
  box.querySelectorAll('.bz-card').forEach((card) => {
    const c = card.querySelector('canvas');
    c.getContext('2d').drawImage(getTileThumb(bz.tiles[+card.dataset.i].t, c.width), 0, 0, c.width, c.height);
  });
}

$('bazaar').addEventListener('click', (e) => {
  if (!state?.bazaar || state.phase !== 'bazaar' || !isLocal() || ui.busy) return;
  if (e.target.closest('[data-bz="ready"]')) { ui.bazaarReady = G.actingSeat(state); sfx.tap(); renderBazaar(); return; }
  if (localSeats().length > 1 && ui.bazaarReady !== G.actingSeat(state)) return;
  const o = G.bazaarOptions(state);
  const card = e.target.closest('.bz-card');
  if (card && o.pick?.includes(+card.dataset.i)) {
    sfx.tap();
    if (o.stage === 'take') { bazaarMove({ t: 'bazaar', take: +card.dataset.i }); return; }
    ui.bazaarPick = +card.dataset.i;
    renderBazaar();
    return;
  }
  const b = e.target.closest('[data-bz]');
  if (!b) return;
  const op = b.dataset.bz;
  if (op === 'plus' || op === 'minus') {
    ui.bazaarBid = Math.min(o.maxBid ?? G.BAZAAR_MAX_BID, Math.max(o.minBid ?? 0, (ui.bazaarBid ?? 0) + (op === 'plus' ? 1 : -1)));
    sfx.tap();
    renderBazaar();
    return;
  }
  if (op === 'pick' && ui.bazaarPick !== null && ui.bazaarPick !== undefined) { const i = ui.bazaarPick; ui.bazaarPick = null; bazaarMove({ t: 'bazaar', pick: i, bid: ui.bazaarBid || 0 }); ui.bazaarBid = null; }
  else if (op === 'raise') { const bid = ui.bazaarBid; ui.bazaarBid = null; bazaarMove({ t: 'bazaar', bid }); }
  else if (op === 'pass') { ui.bazaarBid = null; bazaarMove({ t: 'bazaar', pass: true }); }
  else if (op === 'buy' || op === 'sell') bazaarMove({ t: 'bazaar', sell: op === 'sell' });
});

// A tile that only fits with a bridge may be thrown away instead (draw another).
async function discardTile() {
  if (!state || ui.busy || !isLocal() || state.phase !== 'place' || !G.canDiscard(state)) return;
  sfx.tap();
  const ok = await ask('Throw this tile away?', `<p>It only fits with a bridge (you have ${cur().bridges}). You may throw it away and draw another tile instead.</p>`, [
    { label: '🗑 Throw it away', value: true, cls: 'red' }, { label: 'Keep it', value: false },
  ]);
  if (!ok || ui.busy || state.phase !== 'place' || !isLocal() || !G.canDiscard(state)) return;
  localMove({ t: 'discard' });
}

// ---------- The Tower: buying a prisoner back ----------
$('btn-ransom').addEventListener('click', async () => {
  if (!state || ui.busy || !isLocal()) return;
  const opts = G.ransomOptions(state);
  if (!opts.length) return;
  sfx.tap();
  const token = turnToken;
  const choice = await ask('Buy back a prisoner', `Pay <b>3 points</b> to the player holding your figure and it comes straight back to you. You may do this once per turn.`, [
    ...opts.map((o) => ({ label: `Pay ${state.players[o.from].name} for your ${KIND_NAME[o.k]}`, value: o, cls: 'red' })),
    { label: 'Not now', value: null },
  ]);
  if (!choice || token !== turnToken || ui.busy || !isLocal()) return;
  if (!G.ransomOptions(state).some((o) => o.from === choice.from && o.k === choice.k)) return;
  const action = { t: 'ransom', from: choice.from, k: choice.k };
  sendMove(action);
  const events = G.applyAction(state, action);
  record(action);
  // keep the ransom if the tile placement is undone
  if (ui.snapshot) { G.payRansom(ui.snapshot.state, choice.from, choice.k); ui.snapshot.state.seq = state.seq; }
  showRansom(events[0]);
  if (state.phase === 'action') beginActionPhase();
  else setDock({ instruction: $('instruction').innerHTML, rotate: true, confirm: !!ui.tentative });
});

function showRansom(e) {
  sfx.coins();
  banner(`💰 ${escapeHtml(state.players[e.payer].name)} pays ${escapeHtml(state.players[e.winners[0]].name)} 3 points to free a ${KIND_NAME[e.k]}`, 2000);
  ui.shown = state.players.map((q) => q.score);
  bumpChip(e.payer); bumpChip(e.winners[0]);
  renderPlayers();
}

// The dock while another phone (or a bot run on another phone) decides. When that
// phone has been offline for a while, anyone may let a bot play the seat so the game goes on.
const TAKEOVER_AFTER_MS = 15000;
let waitTimer = null;
function remoteWaiting(seat = actingSeat()) {
  clearTimeout(waitTimer);
  const p = state.players[seat];
  const dragon = state.phase === 'dragon';
  const step = dragon ? ` (${state.flight.moves + 1}/${G.DRAGON_STEPS})` : '';
  const stage = state.phase === 'bazaar' ? state.bazaar.stage : null;
  const [icon, doing] = dragon ? ['🐉 ', ' to move the dragon']
    : state.phase === 'castle' ? ['🏰 ', ' to decide about a castle']
      : stage ? ['🛒 ', { pick: ' to choose a tile to auction', bid: ' to bid or pass', decide: ' to keep or sell the tile', take: ' to take a tile' }[stage] || '']
        : ['', ''];
  let txt = p.kind === 'ai' ? `${icon}${escapeHtml(p.name)} is ${dragon ? 'moving the dragon' : 'thinking'}${step}…`
    : `${icon}Waiting for <b>${escapeHtml(p.name)}</b>${doing}${step}…`;
  if (session.online && !session.net?.isOpen()) txt = '📡 Connection lost — reconnecting…';
  else if (session.online && p.kind !== 'ai' && p.owner && !session.room?.clients?.[p.owner]?.online) {
    const gone = Date.now() - (offlineSince[p.owner] ?? Date.now());
    if (gone >= TAKEOVER_AFTER_MS) txt = `<b>${escapeHtml(p.name)}</b>'s phone is offline. <button class="inline-btn" id="take-over">🤖 Let a bot play</button>`;
    else {
      txt = `<b>${escapeHtml(p.name)}</b>'s phone is offline. Waiting…`;
      waitTimer = setTimeout(() => {
        if (state && !ui.busy && state.phase !== 'over' && actingSeat() === seat && controlOf(seat) === 'remote') remoteWaiting(seat);
      }, TAKEOVER_AFTER_MS - gone + 200);
    }
  }
  setDock({ instruction: txt, seat });
  const btn = document.getElementById('take-over');
  if (btn) btn.onclick = () => { sfx.tap(); btn.disabled = true; sendKind({ t: 'kind', seat, kind: 'ai', level: 'medium' }); };
}

// A seat of this phone that a bot is playing (another phone let a bot play while we were away).
function renderSeatBack() {
  const b = $('seat-back');
  if (!b) return;
  const mine = session.online && state && state.phase !== 'over'
    ? state.players.map((p, i) => i).filter((i) => state.players[i].kind === 'ai' && state.players[i].owner === session.net.id) : [];
  b.hidden = !mine.length;
  if (!mine.length) return;
  b.textContent = `🤖 A bot is playing for ${state.players[mine[0]].name} · Take back`;
  b.onclick = () => {
    sfx.tap();
    for (const seat of mine) sendKind({ t: 'kind', seat, kind: 'human' });
    b.hidden = true;
  };
}

function humanPlacePhase() {
  refreshCandidates();
  frameCandidates();
  const riverTile = state.drawn && isRiverTile(state.drawn);
  const instruction = riverTile ? '🌊 Make the river longer: its water must join the end of the river (no U-turns)'
    : G.canDiscard(state) ? '🌉 This tile only fits with a bridge: tap a square marked 🌉 — or throw the tile away and draw another'
      : state.part === 2 ? '🔨 <b>Bonus tile</b> from your builder: place this one too — gold squares fit as it is turned'
        : 'Tap a square to place your tile — <b>gold</b> ones fit the way it is turned';
  setDock({ instruction, rotate: true });
}

// Make sure the squares you can play on are on screen (only a few: show them all).
function frameCandidates() {
  const list = ui.placements || [];
  if (!list.length) return;
  const vp = view.viewport();
  const z = view.cam.z;
  const onScreen = (p) => {
    const [sx, sy] = view.toScreen(p.x, p.y);
    return sx - z / 2 >= 0 && sx + z / 2 <= view.w && sy - z / 2 >= vp.top && sy + z / 2 <= vp.top + vp.vh;
  };
  if (list.length <= 3 || !list.some(onScreen)) {
    const pts = list.map((p) => [p.x, p.y]);
    if (state.last) pts.push(G.parseKey(state.last));
    view.frameTiles(pts, 120);
  }
}

function refreshCandidates() {
  const t = ui.tentative;
  view.setVM({
    candidates: ui.placements
      .filter((p) => !t || p.x !== t.x || p.y !== t.y)
      .map((p) => ({ x: p.x, y: p.y, good: p.rots.includes(ui.previewRot), bridge: !!p.needsBridge?.[ui.previewRot], hint: ui.hint && ui.hint.x === p.x && ui.hint.y === p.y })),
  });
}

function setTentative(x, y, r, animate = true) {
  const pl = ui.placements.find((p) => p.x === x && p.y === y);
  const prev = ui.tentative && ui.tentative.x === x && ui.tentative.y === y ? ui.tentative.r : null;
  // Bridges, Castles & Bazaars: a turn that only fits with a bridge gets one (it can be moved afterwards)
  const bridge = pl.needsBridge?.[r]?.[0] || null;
  ui.tentative = { x, y, r, rots: pl.rots, bridge };
  const prevDeg = ui.previewRotDeg;
  ui.previewRot = r;
  const delta = ((r * 90 - prevDeg) % 360 + 360) % 360;
  ui.previewRotDeg = prevDeg + delta;
  drawPreview();
  view.setVM({ tentative: { x, y, r, t: state.drawn, ok: true, bridge, ...(animate && prev !== null ? { animFrom: prev, animStart: performance.now() } : {}) } });
  refreshCandidates();
  const pts = helper() ? previewPoints(x, y, r, bridge) : '';
  const needs = bridge ? `🌉 Fits here with a bridge (you have ${cur().bridges}). ` : '';
  setDock({
    instruction: needs + (pl.rots.length > 1 ? `Tap the tile or ⟳ to turn it, then ✓${pts}` : `It only fits this way here. Press ✓${pts}`),
    rotate: true, confirm: true, pulse: true,
  });
}

// What a placement would complete right now (helper mode)
function previewPoints(x, y, r, bridge = null) {
  const k = G.key(x, y);
  state.board[k] = { t: state.drawn, r, pieces: [], n: 1e6 };
  if (!state.options.expansions?.inns && G.featuresOf({ t: state.drawn, r: 0 }).some((f) => f.inn)) state.board[k].noInn = true;
  if (bridge) state.board[bridge.key].bridge = bridge.axis;
  const lastBridge = state.lastBridge;
  state.lastBridge = bridge ? bridge.key : null;
  let all = [];
  try { all = G.scoreAfterPlacement(state, k, false); } finally {
    state.lastBridge = lastBridge;
    if (bridge && bridge.key !== k) delete state.board[bridge.key].bridge;
    delete state.board[k];
  }
  const ev = all.filter((e) => e.winners.length);
  const goods = all.filter((e) => e.kind === 'goods').reduce((a, e) => a + Object.values(e.goods).reduce((x, y) => x + y, 0), 0);
  if (!ev.length && !goods) return '';
  const parts = ev.map((e) => `${e.winners.map((w) => state.players[w].name).join(' & ')} +${e.points}`);
  if (goods) parts.push(`you take ${goods} goods`);
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
  if (!state || state.phase === 'over' || !isLocal() || ui.busy || pending.length) return; // (not while catching up)
  const x = Math.round(wx), y = Math.round(wy);
  if (state.phase === 'dragon') {
    const k = G.key(x, y);
    if (!ui.dragonMoves?.includes(k)) { if (state.board[k]) { sfx.error(); toast('The dragon can only fly to a red tile'); } return; }
    sfx.tap();
    sendMove({ t: 'dragon', key: k });
    playDragonMove(k, turnToken);
    return;
  }
  if (state.phase === 'place') {
    if (ui.tentative && ui.tentative.x === x && ui.tentative.y === y) { rotateTentative(); return; }
    const pl = ui.placements.find((p) => p.x === x && p.y === y);
    if (!pl) return;
    sfx.tap();
    setTentative(x, y, pl.rots.includes(ui.previewRot) ? ui.previewRot : pl.rots[0], false);
  } else if (state.phase === 'action' && ui.ghosts?.length) {
    const radius = Math.max(26, view.cam.z * 0.22);
    const nearest = (list) => {
      let best = null, bd = radius;
      for (const g of list) {
        const [gx, gy] = view.ghostScreenPos(g);
        const d = Math.hypot(gx - sx, gy - sy);
        if (d < bd) { bd = d; best = g; }
      }
      return best;
    };
    // capture targets and other figure rings first (they sit on top of everything else)
    let best = nearest(ui.ghosts.filter((g) => g.type !== 'follower'));
    if (!best) {
      // a ghost right under the finger (a monk's or knight's spot can lie under a bridge)
      let bd = Math.max(18, view.cam.z * 0.13);
      for (const g of ui.ghosts) {
        if (g.type !== 'follower') continue;
        const [gx, gy] = view.ghostScreenPos(g);
        const d = Math.hypot(gx - sx, gy - sy);
        if (d < bd) { bd = d; best = g; }
      }
    }
    if (!best) {
      // a bridge is not painted on the tile: a tap on it picks its road
      const tile = state.board[G.key(x, y)];
      const bf = tile ? G.bridgeFeature(tile) : -1;
      if (bf >= 0 && Math.abs(tile.bridge === 0 ? wx - x : wy - y) < 0.12) best = ui.ghosts.find((g) => g.type === 'follower' && g.key === G.key(x, y) && g.fi === bf) || null;
    }
    if (!best) {
      // then the feature under the finger, so a tap in a meadow picks that meadow
      const tile = state.board[G.key(x, y)];
      if (tile) {
        const [ux, uy] = rotUnit(wx - x + 0.5, wy - y + 0.5, -tile.r);
        const fi = featureUnder(tile.t, ux, uy);
        const here = ui.ghosts.filter((g) => g.type === 'follower' && g.key === G.key(x, y) && g.fi === fi);
        best = here.find((g) => sameOpt(g.act, ui.selected)) || here[0] || null;
      }
    }
    if (!best) best = nearest(ui.ghosts.filter((g) => g.type === 'follower'));
    if (!best) { if (ui.selected && !ui.capturing) selectOption(null); return; }
    if (best.type === 'capture') {
      ui.capture = ui.capture && sameCapture(ui.capture, best.act) ? null : best.act;
      sfx.capture();
      showGhosts();
      return;
    }
    if (best.type === 'bridge') { chooseBridge(best.act); return; }
    // second tap = place it (but a tower floor waits for a capture choice or ✓)
    if (ui.selected && sameOpt(best.act, ui.selected)) { if (!ui.capturing) onConfirm(); return; }
    selectOption(best.act);
  }
};
const sameCapture = (a, b) => a.key === b.key && a.fi === b.fi && a.k === b.k && a.p === b.p;

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
  if (!state || ui.busy || !isLocal() || pending.length) return;
  if (state.phase === 'place' && ui.tentative) {
    const { x, y, r, bridge } = ui.tentative;
    ui.snapshot = { state: G.cloneState(state), tentative: { ...ui.tentative } };
    const aside = state.setAside?.length || 0;
    G.placeTile(state, x, y, r, bridge);
    if (aside && !state.setAside.length) toast(`🌋 The dragon has arrived! The ${aside} dragon tile${aside > 1 ? 's' : ''} put aside go${aside > 1 ? '' : 'es'} back into the pile`);
    ui.placedAt = { x, y, r, bridge };
    ui.tentative = null;
    ui.noBonus = false; ui.bonusTold = false;
    view.setVM({ tentative: null, candidates: null, lastKey: state.last, lastColor: colorOf(cur()).light });
    view.addEffect({ type: 'drop', key: state.last, dur: 380 });
    sfx.place();
    drawPreview();
    beginActionPhase();
  } else if (state.phase === 'action') {
    let act = ui.selected && ui.selected.kind === 'floor' ? { ...ui.selected, capture: ui.capture || null } : ui.selected;
    if (act?.capture) {
      const token = turnToken;
      const swap = await exchangeChoice(act.capture);
      if (token !== turnToken || state.phase !== 'action') return; // the room moved on meanwhile
      if (swap) act = { ...act, swap };
    }
    await completeTurn(act, ui.placedAt);
  }
}

// The Tower: capturing a figure of someone who holds more than one kind of yours. They
// are swapped back at once, and you choose which of yours comes home.
async function exchangeChoice(c) {
  if (c.p === state.current) return null;
  const order = ['large', 'abbot', 'meeple'];
  const kinds = [...new Set(state.players[c.p].prisoners.filter((q) => q.p === state.current).map((q) => q.k))]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (kinds.length < 2) return null;
  ui.busy = true;
  const k = await ask('Prisoner exchange', `${escapeHtml(state.players[c.p].name)} holds more than one kind of your figures and swaps one back at once. Which one do you want?`,
    kinds.map((q) => ({ label: `My ${KIND_NAME[q]}`, value: q, cls: q === kinds[0] ? 'red' : 'parchment' })));
  ui.busy = false;
  return k;
}

// ---------- follower phase ----------
const sameOpt = (a, b) => !!a && !!b && a.kind === b.kind && a.key === b.key && a.fi === b.fi && a.k === b.k && (a.c ?? null) === (b.c ?? null);
const optGroup = (o) => (o.kind === 'follower' ? (o.portal ? `portal:${o.k}` : o.k) : o.kind === 'towerTop' ? `towerTop:${o.k}` : o.kind);
const sameBridge = (a, b) => !!a && !!b && a.key === b.key && a.axis === b.axis;
const groupKind = (g) => (g.includes(':') ? g.split(':')[1] : ({ recall: 'abbot', fairy: 'fairy' }[g] || (G.PIECES[g] ? g : null)));
const GROUP_ORDER = ['meeple', 'large', 'abbot', 'builder', 'pig', 'portal:meeple', 'portal:large', 'portal:abbot', 'princess', 'fairy', 'recall', 'floor', 'towerTop:meeple', 'towerTop:large', 'bridge'];

// The row under the instruction: Traders & Builders' builder bonus tile may be declined;
// Bridges, Castles & Bazaars' castle decision and "throw this tile away".
function bonusToggle() { return ''; }
function renderDockExtra() {
  const box = $('dock-extra');
  const mine = state && state.phase !== 'over' && isLocal() && !ui.busy;
  let html = '';
  if (mine && state.phase === 'action' && state.bonus && state.part === 1 && state.deck.length > 0) {
    html = `<button class="bonus-toggle${ui.noBonus ? ' off' : ''}" id="bonus-toggle">🔨 Builder's bonus tile after this one: <b>${ui.noBonus ? 'skip it' : 'yes'}</b></button>`;
  } else if (mine && state.phase === 'castle') {
    const o = G.castleOptions(state);
    const pts = G.describeGroup(state, state.last, o.fi).points;
    html = `<div class="dock-row"><button class="dock-btn red" id="castle-build">🏰 Build a castle <small>(${state.players[o.seat].castles} left)</small></button><button class="dock-btn" id="castle-points">Take ${pts} points</button></div>`
      + `<div class="dock-note">In reach: ${escapeHtml(castleReach(o.area))}</div>`;
  } else if (mine && state.phase === 'place' && G.canDiscard(state)) {
    html = '<button class="dock-btn" id="btn-discard">🗑 Throw this tile away</button>';
  }
  box.hidden = !html;
  if (box.innerHTML !== html) box.innerHTML = html;
}
$('dock-extra').addEventListener('click', (e) => {
  if (e.target.closest('#bonus-toggle') && state?.phase === 'action' && isLocal()) {
    ui.noBonus = !ui.noBonus;
    sfx.tap();
    renderDockExtra();
  } else if (e.target.closest('#castle-build')) castleDecision(true);
  else if (e.target.closest('#castle-points')) castleDecision(false);
  else if (e.target.closest('#btn-discard')) discardTile();
});

function beginActionPhase() {
  const opts = G.followerOptions(state);
  opts.push(...bridgeChoices());
  ui.options = opts;
  ui.selected = null; ui.capture = null; ui.capturing = false;
  if (state.bonus && state.part === 1 && state.deck.length && !ui.bonusTold) { ui.bonusTold = true; toast('🔨 Your builder earns you a bonus tile after this one!'); }
  const groups = [...new Set(opts.map(optGroup))];
  ui.group = groups.includes('meeple') ? 'meeple' : groups.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))[0] || null;
  if (!opts.length) {
    ui.ghosts = null;
    view.setVM({ ghosts: null });
    const volcano = state.dragon === state.last;
    const sup = cur().supply;
    const reason = volcano ? '🌋 The dragon has landed here, so no figure may go on this tile.' : !sup.meeple && !sup.large && !sup.abbot ? 'You have no followers left.' : 'Nothing free to claim on this tile.';
    setDock({ instruction: `${reason} Press ✓ to finish${bonusToggle()}`, confirm: true, undo: !!ui.snapshot, pulse: true });
    return;
  }
  const [x, y] = G.parseKey(state.last);
  showGhosts();
  if (ui.ghosts.some((g) => g.key !== state.last)) frameGhosts();
  else view.animateCam({ x, y, z: Math.max(Math.min(view.cam.z, view.viewport().vh / 1.25), Math.min(170, view.w / 2.4, view.viewport().vh / 1.25)) });
  if (state.dragon === state.last) toast('🌋 The dragon lands on the volcano: no figure may go on this tile');
  else gardenTip(opts);
  if (ui.hint && ui.hint.act && opts.some((o) => sameOpt(o, ui.hint.act))) {
    toast('💡 Hint: try this one');
    const best = opts.find((o) => sameOpt(o, ui.hint.act));
    ui.group = optGroup(best);
    selectOption(best);
    if (ui.hint.act.capture) { ui.capture = ui.hint.act.capture; showGhosts(); }
  }
}

// Bridges, Castles & Bazaars: where a bridge could go with the tile just placed
// (worked out on the board as it was before the tile went down). Shown as a
// "Bridge" choice when there is something to choose: an optional bridge, or
// another spot for the one the tile needs.
function bridgeChoices() {
  if (!state.options.expansions?.bridges || !ui.snapshot || !ui.placedAt || ui.placedAt.resumed) return [];
  const before = ui.snapshot.state;
  const { x, y, r } = ui.placedAt;
  const spots = G.bridgeSpots(before, x, y, before.drawn, r);
  const needed = !G.canPlace(before, x, y, before.drawn, r);
  if (!spots.length || (needed && spots.length < 2)) return [];
  return spots.map((b) => ({ kind: 'bridge', key: b.key, axis: b.axis }));
}

// Build, move or take back the bridge: put the tile down again from the copy
// taken before it was placed.
function chooseBridge(b) {
  if (!ui.snapshot || ui.busy) return;
  const { x, y, r } = ui.placedAt;
  const before = ui.snapshot.state;
  const next = sameBridge(b, ui.placedAt.bridge) ? null : { key: b.key, axis: b.axis };
  if (!next && !G.canPlace(before, x, y, before.drawn, r)) { sfx.error(); toast('🌉 This tile only fits here with a bridge'); return; }
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, G.cloneState(before));
  G.placeTile(state, x, y, r, next);
  ui.placedAt = { x, y, r, bridge: next };
  ui.selected = null; ui.capture = null; ui.capturing = false;
  view.setState(state);
  view.setVM({ highlight: null, lastKey: state.last });
  sfx.place();
  if (next && next.key === state.last) toast('🌉 Bridge built — you can put a meeple on it');
  else if (next) toast('🌉 Bridge built');
  const group = ui.group;
  beginActionPhase();
  if (ui.options.some((o) => optGroup(o) === group)) { ui.group = group; showGhosts(); }
}

// The Abbot: gardens are easy to miss
function gardenTip(opts) {
  if (!state.options.expansions?.abbot) return;
  const tile = state.board[state.last];
  const gi = G.featuresOf(tile).findIndex((f) => f.type === 'garden');
  if (gi < 0) return;
  if (opts.some((o) => o.kind === 'follower' && o.k === 'abbot' && o.key === state.last && o.fi === gi)) {
    if (ui.group !== 'abbot') toast('🌷 This tile has a garden: tap "Abbot" to put your abbot on it');
  } else if (!cur().supply.abbot && G.findPiece(state, state.current, 'abbot')) {
    toast('🌷 A garden! Your abbot is busy elsewhere: call him home first to use gardens');
  }
}

function ghostLabel(o) {
  if (o.kind === 'bridge') return sameBridge(o, ui.placedAt?.bridge) ? '🌉 Take the bridge back' : '🌉 Bridge here';
  if (o.kind === 'fairy') return '🧚 Fairy here';
  if (o.kind === 'princess') return `👸 Send ${state.players[o.p].name}'s knight home`;
  if (o.kind === 'recall') {
    const [x, y] = G.parseKey(o.key);
    return `⤴️ Abbot home +${1 + G.monasteryNeighbours(state.board, x, y)}`;
  }
  if (o.kind === 'floor') return `🏰 Tower floor ${state.towers[o.key].h + 1}`;
  if (o.kind === 'towerTop') return '🏰 Close this tower';
  const tile = state.board[o.key];
  const f = G.featuresOf(tile)[o.fi];
  if (o.k === 'builder') return '🔨 Builder here';
  if (o.k === 'pig') return '🐖 Pig here';
  let label = (o.portal ? '🌀 ' : '') + (TYPE_LABEL[f.type] || f.type);
  if (!helper()) return label;
  if (f.type === 'monastery' || f.type === 'garden') {
    const [x, y] = G.parseKey(o.key);
    label += ` · ${1 + G.monasteryNeighbours(state.board, x, y)}`;
  } else if (f.type === 'road' || f.type === 'city') {
    const g = G.describeGroup(state, o.key, o.fi);
    const mult = f.type === 'city' ? (g.cathedral ? 3 : 2) : (g.inn ? 2 : 1);
    label += g.complete ? ` · ${g.points} pts!` : f.type === 'city' ? ` · ${g.points} now · ${(g.tiles.size + g.pennants) * mult} if finished`
      : g.inn ? ` · ${g.points} now · ${g.tiles.size * 2} if finished` : ` · worth ${g.points}+`;
  }
  return label;
}

function ghostType(o) {
  if (o.kind === 'follower') return 'follower';
  return o.kind; // fairy, princess, recall, floor, towerTop
}

function showGhosts() {
  const list = ui.options.filter((o) => optGroup(o) === ui.group);
  ui.ghosts = list.map((o) => ({
    key: o.key, fi: o.fi, k: o.kind === 'recall' ? 'abbot' : o.k || 'meeple', p: o.kind === 'recall' ? state.current : o.p,
    type: ghostType(o), act: o, label: ghostLabel(o), selected: o.kind === 'bridge' ? sameBridge(o, ui.placedAt?.bridge) : sameOpt(o, ui.selected),
    ...(o.kind === 'bridge' ? { axis: o.axis } : {}),
  }));
  // The Tower: after choosing a floor, the figures it can capture
  const wasCapturing = ui.capturing;
  ui.capturing = false;
  if (ui.selected?.kind === 'floor' && ui.group === 'floor') {
    const targets = G.captureTargets(state, ui.selected.key, state.towers[ui.selected.key].h + 1);
    if (targets.length) {
      // close enough to tap the rings; arrows at the screen edge point to any out of view
      if (!wasCapturing) view.frameTiles([G.parseKey(ui.selected.key), ...targets.map((c) => G.parseKey(c.key))], 150, 50);
      ui.capturing = true;
      for (const c of targets) {
        ui.ghosts.push({ key: c.key, fi: c.fi, k: c.k, p: c.p, type: 'capture', act: c, selected: !!ui.capture && sameCapture(ui.capture, c),
          label: c.p === state.current ? `Take your ${KIND_NAME[c.k]} back` : `Capture ${state.players[c.p].name}'s ${KIND_NAME[c.k]}` });
      }
    }
  }
  view.setVM({ ghosts: ui.ghosts, ghostColor: colorOf(cur()), showLabels: false,
    reach: ui.capturing ? { key: ui.selected.key, h: state.towers[ui.selected.key].h + 1 } : null });
  updateActionDock();
}

// Bring the choices on screen (the portal, fairy and towers can be anywhere).
function frameGhosts() {
  const pts = (ui.ghosts || []).map((g) => G.parseKey(g.key));
  if (state.last) pts.push(G.parseKey(state.last));
  // with lots of portal choices keep the tiles big enough to tap; drag to see the rest
  if (pts.length) view.frameTiles(pts, 150, pts.length > 14 ? 58 : 36);
}

function recallLabel() {
  const o = ui.options.find((q) => q.kind === 'recall');
  if (!o) return PIECE_LABEL.recall;
  const [x, y] = G.parseKey(o.key);
  return `Abbot home +${1 + G.monasteryNeighbours(state.board, x, y)}`;
}

function pickerFor() {
  const groups = [...new Set(ui.options.map(optGroup))].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  return {
    active: ui.group,
    items: groups.map((g) => ({ id: g, kind: groupKind(g), icon: GROUP_ICON[g] || (g.startsWith('portal') ? '🌀' : g.startsWith('towerTop') ? '🏰' : ''), label: g === 'recall' ? recallLabel() : PIECE_LABEL[g] || g })),
    onPick: (g) => { ui.group = g; ui.selected = null; ui.capture = null; view.setVM({ highlight: null }); showGhosts(); frameGhosts(); },
  };
}

const GROUP_HELP = {
  bridge: '🌉 Bridge: tap one to build it, tap again to take it back',
  abbot: '⛪ Abbot: only on a monastery or a garden. Later you can call him home early for points. Tap a ghost',
  large: '🍺 Big meeple: it counts as two meeples when deciding who wins. Tap a ghost',
  builder: '🔨 Builder: on a road or city where you have a meeple. Extend it later to play two tiles in one turn. Tap a ghost',
  pig: '🐖 Pig: in a field where you have a farmer. Each finished city there is worth 4 to you at the end. Tap a ghost',
  fairy: '🧚 Tap a fairy to move her next to one of your figures: <b>+1</b> each turn, <b>+3</b> when it scores, and the dragon can\'t come near',
  princess: '👸 Tap a knight to send it home (you place nothing else this turn)',
  recall: '⤴️ Tap your abbot to bring him home and score his monastery or garden now',
  floor: '🏰 Tap a tower to add a floor, then you may capture one figure in range',
  'towerTop:meeple': '🏰 Tap a tower to close it with your meeple on top: nobody can build it higher',
  'towerTop:large': '🏰 Tap a tower to close it with your big meeple on top: nobody can build it higher',
};

function updateActionDock(info = '') {
  const sup = cur().supply;
  const left = `<small>(♟${sup.meeple} left${sup.large ? ' + big meeple' : ''})</small>`;
  let instruction;
  const volcano = state.dragon === state.last ? '🌋 No figures on the volcano tile this turn. ' : '';
  if (ui.capturing) {
    const c = ui.capture;
    const reach = state.towers[ui.selected.key].h + 1;
    instruction = c ? `${c.p === state.current ? `Your ${KIND_NAME[c.k]} goes home` : `Capture ${escapeHtml(state.players[c.p].name)}'s ${KIND_NAME[c.k]}`}. Press ✓`
      : `🏰 Reaches ${reach} tile${reach === 1 ? '' : 's'} straight out: tap a <b style="color:#c62b1d">red</b> ring to capture, or ✓ to just build`;
  } else if (ui.selected) instruction = `${info}. Tap again or ✓`;
  else if (GROUP_HELP[ui.group]) instruction = `${GROUP_HELP[ui.group]}, or ✓ to skip`;
  else if (ui.group?.startsWith('portal')) instruction = '🌀 Magic portal: tap a ghost <b>anywhere on the map</b> to place there, or ✓ to skip';
  else instruction = `Tap a <b>ghost</b> to claim it, or ✓ to skip ${left}`;
  setDock({ instruction: volcano + instruction + bonusToggle(), confirm: true, undo: !!ui.snapshot, pulse: !!ui.selected, picker: pickerFor() });
}

function selectOption(opt) {
  ui.selected = opt;
  ui.capture = null;
  for (const g of ui.ghosts || []) g.selected = sameOpt(g.act, opt);
  sfx.meeple();
  let highlight = null;
  let info = '';
  if (opt && opt.kind === 'follower') {
    const tile = state.board[opt.key];
    const feat = G.featuresOf(tile)[opt.fi];
    if (opt.portal) view.ensureVisible(...G.parseKey(opt.key));
    if (feat.type === 'monastery' || feat.type === 'garden') {
      highlight = { nodes: [[opt.key, opt.fi]] };
      info = feat.type === 'garden' ? `${TYPE_ICON.garden} Abbot in the garden: 9 points when surrounded` : `${TYPE_ICON.monastery} ${opt.k === 'abbot' ? 'Abbot' : 'Monk'} in the monastery: 9 points when surrounded`;
    } else {
      const g = G.getGroup(state.board, opt.key, opt.fi);
      highlight = { nodes: g.nodes, color: feat.type === 'field' ? '#b6ff6a' : '#ffe680' };
      if (opt.k === 'builder') info = '🔨 Builder: extend this again on a later turn to play a second tile';
      else if (opt.k === 'pig') info = '🐖 Pig: if you win this field at the end, each finished city gives you 4 instead of 3';
      else if (feat.type === 'field') {
        const done = G.fieldCities(state.board, g).filter((c) => c.complete).length;
        info = `${TYPE_ICON.field} Farmer (stays all game): ${done * 3} pts so far`;
      } else if (feat.type === 'road') {
        info = `${TYPE_ICON.road} Thief on a ${g.tiles.size}-tile road${g.inn ? ' with an inn 🍺' : ''}${g.complete ? ' — finished' : ''}`;
      } else {
        info = `${TYPE_ICON.city} Knight in a ${g.tiles.size}-tile city${g.pennants ? ` with ${g.pennants} 🛡️` : ''}${g.cathedral ? ' and a cathedral' : ''}${g.complete ? ' — finished' : ''}`;
      }
      if (opt.portal) info = `🌀 ${info}`;
    }
  } else if (opt && opt.kind === 'princess') {
    const g = G.getGroup(state.board, opt.key, opt.fi);
    highlight = { nodes: g.nodes, color: '#ff9ad0' };
    info = `👸 ${escapeHtml(state.players[opt.p].name)}'s ${KIND_NAME[opt.k]} goes home`;
  } else if (opt && opt.kind === 'fairy') {
    info = '🧚 The fairy will stand by this figure';
  } else if (opt && opt.kind === 'recall') {
    info = '⤴️ Your abbot comes home and scores now';
  } else if (opt && opt.kind === 'towerTop') {
    info = '🏰 Closed: nobody can build this tower higher while your figure is on top (another tower can still capture it)';
  } else if (opt && opt.kind === 'floor') {
    info = `🏰 Tower goes up to ${state.towers[opt.key].h + 1}`;
  }
  view.setVM({ highlight });
  showGhosts();
  if (opt) updateActionDock(info);
}

function onUndo() {
  if (!ui.snapshot || ui.busy || state.phase !== 'action') return;
  sfx.tap();
  const snap = restoreSnapshot();
  setTentative(snap.tentative.x, snap.tentative.y, snap.tentative.r, false);
}

// Take back the tile placed this turn (not yet confirmed).
function restoreSnapshot() {
  const snap = ui.snapshot;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, snap.state);
  ui.snapshot = null; ui.ghosts = null; ui.selected = null; ui.placedAt = null; ui.capture = null; ui.capturing = false;
  view.setState(state);
  view.setVM({ ghosts: null, highlight: null, lastKey: state.last });
  drawPreview();
  return snap;
}

function onHint() {
  if (!state || ui.busy || !isLocal()) return;
  sfx.tap();
  if (state.phase === 'place') {
    const mv = suggestMove(state);
    if (!mv) return;
    if (mv.discard) {
      // Bridges, Castles & Bazaars: the best thing to do with this tile is throw it away
      toast('💡 This tile only fits with a bridge: throwing it away (🗑) may be best');
      const b = document.getElementById('btn-discard');
      if (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
      return;
    }
    ui.hint = mv;
    setTentative(mv.x, mv.y, mv.r, false);
    view.ensureVisible(mv.x, mv.y);
    toast('💡 How about here?');
  } else if (state.phase === 'action' && ui.options?.length) {
    const best = ui.hint?.act && ui.options.find((o) => sameOpt(o, ui.hint.act));
    if (best) {
      ui.group = optGroup(best); showGhosts(); selectOption(best);
      if (ui.hint.act.capture) { ui.capture = ui.hint.act.capture; showGhosts(); }
    } else toast('💡 Keeping your follower might be smart');
  }
}

// ---------- committing a turn ----------
// Send a move made on this phone (by a person here or a bot run here), just before it is
// recorded. It is a move on our copy as it stands, so it carries the number of moves
// before it and a fingerprint of the last one: the room refuses it if its list has
// moved on, and sends us its copy instead.
function sendMove(action, over = false) {
  if (!session.online) return;
  const seq = applied.length;
  sent.add(seq);
  cursor = Math.max(cursor, seq + 1);
  session.net.send({ type: 'action', seq, prev: fingerprint(seq ? applied[seq - 1] : ''), action, over });
}

// Switch a seat between person and bot. It doesn't depend on the board, so it goes
// after every move we know of, and is played here in that order.
function sendKind(action) {
  if (!session.online) return;
  const seq = cursor++;
  const last = pending.length ? JSON.stringify(pending[pending.length - 1]) : applied[applied.length - 1] ?? '';
  sent.add(seq);
  session.net.send({ type: 'action', seq, prev: fingerprint(seq ? last : ''), action, over: false });
  pending.push(action);
  pump();
}

// A bot here found the room had moved on while it was thinking: catch up first.
function catchUp() {
  if (!pending.length && cursor !== applied.length) { cursor = applied.length; session.net?.send({ type: 'resync' }); }
  startTurn();
}

// The local player (or a bot on this phone) finishes the turn.
async function completeTurn(act, placedAt) {
  const token = turnToken;
  ui.busy = true;
  const placer = state.current;
  const k = state.last;
  const noBonus = !!(ui.noBonus && state.bonus);
  const action = { t: 'turn', x: placedAt.x, y: placedAt.y, r: placedAt.r, ...(placedAt.bridge ? { bridge: placedAt.bridge } : {}), act: act || null, ...(noBonus ? { noBonus: true } : {}) };
  const events = G.finishTurn(state, act, noBonus);
  ui.noBonus = false; ui.bonusTold = false;
  state.seq = (state.seq || 0) + 1;
  if (!placedAt.resumed) sendMove(action, state.phase === 'over');
  record(action);
  await afterTurnAnimation(events, act, k, placer, token);
}

async function afterTurnAnimation(events, act, k, placer, token) {
  view.setVM({ ghosts: null, highlight: null });
  ui.ghosts = null;
  setDock({ instruction: '…', seat: placer });
  const returning = events.flatMap((e) => e.meeples || []);
  view.setVM({ extraMeeples: returning.map((m) => ({ ...m })) });
  if (act && act.kind === 'follower') {
    if (act.portal) { view.ensureVisible(...G.parseKey(act.key)); sfx.magic(); }
    view.addEffect({ type: 'pop', key: act.key, f: act.fi, dur: 500 });
    sfx.meeple();
    await sleep(420);
  } else if (act && (act.kind === 'floor' || act.kind === 'towerTop')) {
    view.ensureVisible(...G.parseKey(act.key));
    sfx.place();
    // say what a bot or another player did to a tower (a capture has its own banner)
    const told = !(session.online && controlOf(placer) === 'local') && !act.capture;
    if (told) {
      const who = escapeHtml(state.players[placer].name);
      const h = state.towers?.[act.key]?.h || 0;
      banner(act.kind === 'floor' ? `🏰 ${who} builds a tower up to ${h} floor${h === 1 ? '' : 's'}` : `🏰 ${who} closes a tower with a ${KIND_NAME[act.k] || 'figure'} on top`, 1700);
    }
    await sleep(ui.fast ? 0 : told ? 1100 : 380);
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
  record(a); // counts as applied from now on, even while it is still being animated
  ui.previewRot = a.r; ui.previewRotDeg = a.r * 90; drawPreview();
  view.ensureVisible(a.x, a.y);
  view.setVM({ tentative: { x: a.x, y: a.y, r: a.r, t: state.drawn, ok: true } });
  await sleep(ui.fast ? 0 : 550);
  if (token !== turnToken) return;
  const placer = state.current;
  const aside = state.setAside?.length || 0;
  G.placeTile(state, a.x, a.y, a.r, a.bridge || null);
  if (aside && !state.setAside.length) toast(`🌋 The dragon has arrived! The ${aside} dragon tile${aside > 1 ? 's' : ''} put aside go${aside > 1 ? '' : 'es'} back into the pile`);
  view.setVM({ tentative: null, lastKey: state.last, lastColor: colorOf(p).light });
  view.addEffect({ type: 'drop', key: state.last, dur: 380 });
  sfx.place();
  drawPreview();
  await sleep(ui.fast ? 0 : 420);
  if (token !== turnToken) return;
  [...$('players').children].forEach((c) => c.classList.remove('thinking'));
  const k = state.last;
  const events = G.finishTurn(state, a.act || null, !!a.noBonus);
  state.seq = (state.seq || 0) + 1;
  await afterTurnAnimation(events, a.act, k, placer, token);
}

async function aiTurn(token) {
  ui.busy = true;
  const p = cur();
  await sleep(350);
  if (token !== turnToken) return;
  // another phone runs the computer players now, or the room has moved on: catch up instead
  const stale = () => controlOf(state.current) !== 'bot' || !caughtUp();
  if (stale()) { ui.busy = false; catchUp(); return; }
  const ro = chooseRansom(state, p.level);
  if (ro) {
    const action = { t: 'ransom', from: ro.from, k: ro.k };
    sendMove(action);
    const events = G.applyAction(state, action);
    record(action);
    showRansom(events[0]);
    await sleep(900);
    if (token !== turnToken) return;
  }
  const t0 = performance.now();
  const mv = chooseMove(state, p.level);
  await sleep(Math.max(0, 450 - (performance.now() - t0)));
  if (token !== turnToken) return;
  if (stale()) { ui.busy = false; catchUp(); return; }
  if (mv.discard) {
    // Bridges, Castles & Bazaars: throw away a tile that only fits with a bridge
    await playSimple({ t: 'discard' }, token, true);
    return;
  }
  const action = { t: 'turn', x: mv.x, y: mv.y, r: mv.r, ...(mv.bridge ? { bridge: mv.bridge } : {}), act: mv.act || null };
  sendMove(action);
  await playTurnAction(action, token);
}

// ---------- remote actions ----------
async function pump() {
  if (pumping || !state) return;
  pumping = true;
  try {
    await pumpLoop();
  } catch (e) {
    // our copy can't take the room's next move: start again from the room's copy
    console.error('Could not apply a move from the room; rebuilding', e);
    forceRebuild = true;
    pending.length = 0;
    ui.busy = false;
    session.net?.send({ type: 'resync' });
  } finally {
    pumping = false;
  }
}

async function pumpLoop() {
  while (pending.length && state && state.phase !== 'over') {
    if (ui.busy) break;
    const a = pending[0];
    // the room's list is the truth: its next move comes before a tile placed here but not
    // yet confirmed (a seat here can only meet one if another phone let a bot play it)
    if (state.phase === 'action') {
      if (!ui.snapshot) throw new Error('A move arrived in the middle of a turn');
      restoreSnapshot();
    }
    if (a.t === 'turn') {
      if (state.phase !== 'place') throw new Error(`A tile move arrived in the ${state.phase} phase`);
      pending.shift();
      await playTurnAction(a, turnToken);
    } else if (a.t === 'dragon') {
      if (state.phase !== 'dragon') throw new Error(`A dragon move arrived in the ${state.phase} phase`);
      pending.shift();
      await playDragonMove(a.key, turnToken);
    } else if (a.t === 'castle' || a.t === 'bazaar' || a.t === 'discard') {
      const phase = a.t === 'discard' ? 'place' : a.t;
      if (state.phase !== phase) throw new Error(`A ${a.t} move arrived in the ${state.phase} phase`);
      pending.shift();
      await playSimple(a, turnToken);
    } else if (a.t === 'ransom') {
      pending.shift();
      const events = G.applyAction(state, a);
      record(a);
      showRansom(events[0]);
      const c = controlOf(state.current);
      if (c === 'remote') remoteWaiting();
      else if (c === 'bot') startTurn();
    } else {
      pending.shift();
      G.applyAction(state, a);
      record(a);
      renderPlayers();
      startTurn();
    }
  }
}

export function onNetMessage(msg) {
  if (!session.online) return;
  if (msg.type === 'room') {
    session.room = msg.room;
    noteOnline();
    if (!state) return;
    renderPlayers();
    updateNetBadge();
    kick();
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
    if (msg.room) { session.room = msg.room; noteOnline(); }
    resyncFrom(msg.init, msg.actions || []);
    return;
  }
  if (msg.type === 'emote') {
    const who = Object.entries(session.room?.clients || {}).find(([id]) => id === msg.from)?.[1]?.name || '';
    banner(`${escapeHtml(who)} ${escapeHtml(msg.emoji)}`, 1400);
  }
}

// Bring this phone in line with the server's list of actions.
export function resyncFrom(init, actions, sess = session) {
  const keys = actions.map((a) => JSON.stringify(a));
  // a new connection to the room (rejoining after a reload or after leaving): start from its copy
  let agree = !forceRebuild && !!state && state.gameId === init.gameId && sess === session;
  forceRebuild = false;
  session = sess;
  for (let i = 0; agree && i < Math.min(applied.length, keys.length); i++) if (applied[i] !== keys[i]) agree = false;
  if (agree && keys.length >= applied.length) {
    // the room is ahead of us (or level): play the moves we haven't seen yet
    pending.length = 0;
    for (let i = applied.length; i < actions.length; i++) pending.push(actions[i]);
    cursor = actions.length;
    sent.clear();
    renderPlayers();
    kick();
    return;
  }
  if (agree) {
    // we are ahead: our latest moves have not reached the room yet, so send them (again);
    // a copy that arrives twice is simply refused by the room
    pending.length = 0;
    for (let i = keys.length; i < applied.length; i++) {
      sent.add(i);
      session.net.send({ type: 'action', seq: i, prev: fingerprint(i ? applied[i - 1] : ''), action: JSON.parse(applied[i]), over: i === applied.length - 1 && state.phase === 'over' });
    }
    cursor = applied.length;
    return;
  }
  // our copy went its own way (a move the room never accepted): rebuild from the room's list
  session.net?.dropActions?.();
  const s = G.cloneState(init);
  try {
    for (const a of actions) G.applyAction(s, a);
  } catch (e) {
    console.error('The room\'s list of moves does not replay', e);
    toast('This online game got out of step. Please start a new game.');
    return;
  }
  startGame(s, session, actions);
}

// When we are idle, get going again: play the room's moves we haven't shown yet, start
// a computer player this phone now runs (the job moves between phones as they come and
// go), or show who we are waiting for.
function kick() {
  if (!state || state.phase === 'over' || ui.busy || pumping) return;
  if (pending.length) { pump(); return; }
  if (state.phase === 'action') return; // a person here is in the middle of their turn
  const c = controlOf(actingSeat());
  if (c === 'bot') startTurn();
  else if (c === 'remote') remoteWaiting();
}

// remember when each phone went offline (a bot may take its seat after a while)
function noteOnline() {
  const now = Date.now();
  for (const [id, c] of Object.entries(session.room?.clients || {})) {
    if (c.online) delete offlineSince[id];
    else if (!(id in offlineSince)) offlineSince[id] = now;
  }
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
export function netStatus() {
  updateNetBadge();
  if (!state) return;
  renderPlayers();
  // show "reconnecting…" (or the usual waiting line again) while another phone decides
  if (session.online && state.phase !== 'over' && !ui.busy && controlOf(actingSeat()) === 'remote') remoteWaiting();
}

// ---------- scoring animations ----------
async function animateEvents(events, placer, final = false, token = turnToken) {
  const wait = (ms) => (ui.fast ? Promise.resolve() : sleep(ms));
  for (const e of events) {
    if (token !== turnToken) return;
    const nodes = e.nodes || [];
    if (await animateSpecial(e, wait)) continue;
    if (!nodes.length) { for (const m of e.meeples || []) flyHome(m); continue; }
    const tiles = [...new Set(nodes.map(([k]) => k))].map(G.parseKey);
    const cx = tiles.reduce((a, [x]) => a + x, 0) / tiles.length;
    const cy = tiles.reduce((a, [, y]) => a + y, 0) / tiles.length;
    if (final && !e.points && e.winners.length && (e.inn || e.cathedral) && (e.kind === 'road' || e.kind === 'city')) {
      // Inns & Cathedrals: an unfinished inn road or cathedral city is worth nothing
      view.ensureVisible(cx, cy);
      view.addEffect({ type: 'glow', nodes, dur: 1600, color: '#ff8a7a' });
      view.addEffect({ type: 'float', x: cx, y: cy, text: '0', sub: e.inn ? '🍺 Inn road not finished!' : '⛪ Cathedral city not finished!', color: '#ffb0a0', dur: 1900 });
      if (!ui.fast) sfx.error();
      await wait(1200);
      for (const m of e.meeples || []) flyHome(m);
      await wait(450);
      continue;
    }
    if (!e.winners.length || (final && !e.points)) {
      if (!final) view.addEffect({ type: 'glow', nodes, dur: 900, color: '#ffffff' });
      for (const m of e.meeples || []) flyHome(m);
      continue;
    }
    view.ensureVisible(cx, cy);
    const winnerColor = colorOf(state.players[e.winners[0]]);
    const what = { road: 'Road', city: 'City', monastery: 'Monastery', field: 'Farm', garden: 'Garden' }[e.kind] || e.kind;
    const sub = e.label || (final ? (e.kind === 'field' ? `${e.cityCount ?? e.points / 3} finished cit${(e.cityCount ?? e.points / 3) === 1 ? 'y' : 'ies'}` : `Unfinished ${what.toLowerCase()}`)
      : e.kind === 'road' && e.inn ? 'Road with an inn: ×2!' : e.kind === 'city' && e.cathedral ? 'Cathedral city: ×3!' : `${what} complete!`);
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
      const big = ms.some((m) => m.k === 'large') ? ' (the big meeple counts 2)' : '';
      banner(losers.length ? `⚔️ ${escapeHtml(state.players[e.winners[0]].name)} wins the ${what.toLowerCase()} from ${losers.map((p) => escapeHtml(state.players[p].name)).join(' & ')}!${big}` : `🤝 Shared ${what.toLowerCase()}! +${e.points} each`, 2200);
    } else if (!final && e.kind === 'recall') {
      banner(`⤴️ ${escapeHtml(state.players[e.winners[0]].name)}'s abbot comes home: +${e.points}!`, 1800);
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

// World position of a figure (f 'top' = standing on a tower).
function figureWorld(m) {
  const tile = state.board[m.key];
  const [x, y] = G.parseKey(m.key);
  if (m.f === 'top' || m.f === null || m.f === undefined) {
    const f = m.f === 'top' ? TILE_TYPES[tile.t].foundation || [0.5, 0.5] : [0.5, 0.5];
    const [rx, ry] = rotUnit(f[0], f[1], tile.r);
    return [x + rx - 0.5, y + ry - 0.5 - (m.f === 'top' ? 0.3 : 0)];
  }
  if (m.f === 'castle') return castleWorld(state.castles.find((c) => c.id === m.c) || state.castles.find((c) => c.key === m.key)); // on a castle
  if (m.f === G.bridgeFeature(tile)) return tile.bridge === 0 ? [x, y - 0.22] : [x + 0.22, y]; // standing on a bridge
  const [ax, ay] = getTileArt(tile.t).anchors[m.f];
  const [rx, ry] = besideBridge(tile.bridge, ...rotUnit(ax, ay, tile.r));
  return [x + rx - 0.5, y + ry - 0.5];
}

// Bridges, Castles & Bazaars: the top of a castle (it stands on the edge between its tiles).
function castleWorld(c) {
  const [ax, ay] = G.parseKey(c.tiles[0]), [bx, by] = G.parseKey(c.tiles[1]);
  return [(ax + bx) / 2, (ay + by) / 2 - 0.28];
}

function flyHome(m, to = m.p) {
  const tile = state.board[m.key];
  if (!tile) return;
  const extra = (view.vm.extraMeeples || []).filter((q) => !(q.key === m.key && q.f === m.f && q.k === m.k && q.p === m.p));
  view.setVM({ extraMeeples: extra });
  view.addEffect({ type: 'fly', from: figureWorld(m), to: chipCenter(to), color: colorOf(state.players[m.p]), kind: m.k, dur: 700 });
}

// Events of the expansions that are not a feature being scored.
async function animateSpecial(e, wait) {
  const name = (i) => escapeHtml(state.players[i].name);
  switch (e.kind) {
    case 'bonus':
      banner(`🔨 ${name(e.player)}'s builder: play another tile!`, 1800);
      await wait(600);
      return true;
    case 'fairyMove': {
      const [wx, wy] = figureWorld({ key: e.key, f: state.fairy?.f ?? null });
      view.addEffect({ type: 'sparkle', x: wx, y: wy, dur: 900, n: 24, colors: ['#e6f3ff', '#bfe0ff', '#fff'] });
      sfx.magic();
      await wait(500);
      return true;
    }
    case 'fairy':
      if (e.nodes?.length) return false; // the +3 shows like a scored feature
      {
        const [wx, wy] = figureWorld({ key: e.key, f: null });
        view.ensureVisible(wx, wy);
        view.addEffect({ type: 'float', x: wx + 0.2, y: wy, text: `+${e.points}`, sub: '🧚 Fairy', color: colorOf(state.players[e.winners[0]]).light, dur: 1500 });
        view.addEffect({ type: 'sparkle', x: wx + 0.2, y: wy, dur: 900, n: 18, colors: ['#e6f3ff', '#bfe0ff', '#fff'] });
        sfx.magic();
        await wait(700);
        for (const w of e.winners) { ui.shown[w] += e.points; bumpChip(w); }
        renderPlayers();
        await wait(300);
      }
      return true;
    case 'floor':
      return true;
    case 'capture': {
      const c = e.captured;
      view.ensureVisible(...figureWorld(c));
      sfx.capture();
      if (e.own) banner(`🏰 ${name(e.captor)} takes back their own ${KIND_NAME[c.k]}`, 1700);
      else if (e.exchange) banner(`🏰 ${name(e.captor)} captures ${name(c.p)}'s ${KIND_NAME[c.k]}: prisoners swapped straight back!`, 2200);
      else banner(`🏰 ${name(e.captor)} captures ${name(c.p)}'s ${KIND_NAME[c.k]}!`, 1900);
      flyHome(c, e.own || e.exchange ? c.p : e.captor);
      await wait(1300);
      renderPlayers();
      return true;
    }
    case 'princess': {
      const m = e.meeples[0];
      view.ensureVisible(...figureWorld(m));
      view.addEffect({ type: 'glow', nodes: e.nodes, dur: 900, color: '#ff9ad0' });
      banner(`👸 The princess sends ${name(m.p)}'s knight home`, 1800);
      sfx.magic();
      await wait(500);
      flyHome(m);
      await wait(600);
      return true;
    }
    case 'dragon':
      for (const m of e.meeples) flyHome(m);
      if (e.meeples.length) await wait(650);
      return true;
    case 'return':
      for (const m of e.meeples) flyHome(m);
      if (e.meeples.length) await wait(450);
      return true;
    case 'ransom':
      return true;
    case 'dragonStuck':
      banner('🐉 The dragon is boxed in and can\'t fly this time', 1800);
      await wait(900);
      return true;
    case 'dragonLands':
      banner(`🐉 Nowhere left to fly: the dragon lands after ${e.steps} step${e.steps === 1 ? '' : 's'}`, 1800);
      await wait(900);
      return true;
    case 'goods': {
      const ICON = { wine: '🍷', grain: '🌾', cloth: '🧵' };
      if (e.player !== undefined) {
        const got = Object.entries(e.goods).map(([g, n]) => `${n} ${ICON[g] || g}`).join(' ');
        banner(`📦 ${name(e.player)} takes the city's goods: ${got}`, 1800);
        await wait(700);
        return true;
      }
      banner(`${ICON[e.good] || '📦'} Most ${e.good}: ${e.winners.map(name).join(' & ')} +${e.points}`, 1800);
      sfx.score(true);
      for (const w of e.winners) { ui.shown[w] += e.points; bumpChip(w); }
      renderPlayers();
      await wait(1300);
      return true;
    }
    // ---------- Bridges, Castles & Bazaars ----------
    case 'discard':
      if (!(session.online && controlOf(e.player) === 'local')) toast(`🗑 ${name(e.player)} throws away a tile that only fitted with a bridge`);
      await wait(500);
      return true;
    case 'castleBuilt': {
      const c = state.castles[e.castle];
      const [wx, wy] = castleWorld(c);
      view.ensureVisible(wx, wy);
      view.addEffect({ type: 'glow', nodes: e.nodes, dur: 1200, color: '#ffd84a' });
      view.addEffect({ type: 'sparkle', x: wx, y: wy + 0.2, dur: 900, n: 26, colors: ['#ffe27a', '#fff', colorOf(state.players[e.player]).light] });
      sfx.place();
      banner(`🏰 ${name(e.player)} builds a castle!`, 1700);
      await wait(1100);
      return true;
    }
    case 'castle': {
      const c = state.castles[e.castle];
      const [wx, wy] = castleWorld(c);
      const col = colorOf(state.players[e.winners[0]]);
      view.ensureVisible(wx, wy);
      view.addEffect({ type: 'glow', nodes: e.nodes, dur: 1600, color: '#ffd84a' });
      const from = { road: 'a road', city: 'a city', monastery: 'a monastery', garden: 'a garden', castle: 'another castle' }[e.from] || 'its neighbour';
      view.addEffect({ type: 'float', x: wx, y: wy, text: `+${e.points}`, sub: `🏰 Castle, from ${from}`, color: col.light, dur: 1900 });
      view.addEffect({ type: 'sparkle', x: wx, y: wy, dur: 1100, n: Math.min(60, 14 + e.points * 2), colors: ['#ffe27a', '#fff', col.light] });
      if (!ui.fast) sfx.score(e.points >= 8);
      await wait(700);
      for (const w of e.winners) { ui.shown[w] += e.points; bumpChip(w); }
      renderPlayers();
      for (const m of e.meeples) flyHome(m);
      await wait(750);
      return true;
    }
    case 'castleEnd': {
      const m = e.meeples[0];
      const [wx, wy] = figureWorld(m);
      view.ensureVisible(wx, wy);
      view.addEffect({ type: 'float', x: wx, y: wy - 0.4, text: '0', sub: '🏰 Castle never scored', color: '#ffb0a0', dur: 1500 });
      await wait(700);
      flyHome(m);
      await wait(450);
      return true;
    }
    case 'bazaarSkip':
      toast('🛒 Not enough tiles left for a bazaar');
      await wait(400);
      return true;
    case 'bazaarOpen':
      sfx.coins();
      renderBazaar();
      banner(state.options.bcb?.auction !== false ? `🛒 Bazaar! ${e.tiles.length} tiles go up for auction` : `🛒 Bazaar! Everyone takes one of ${e.tiles.length} tiles`, 1900);
      await wait(1300);
      return true;
    case 'bazaarPick':
      banner(`🛒 ${name(e.p)} picks a tile and bids ${e.bid}`, 1500);
      await wait(800);
      return true;
    case 'bazaarBid':
      banner(`🛒 ${name(e.p)} bids ${e.bid}`, 1300);
      sfx.tap();
      await wait(650);
      return true;
    case 'bazaarPass':
      banner(`🛒 ${name(e.p)} passes`, 1100);
      await wait(450);
      return true;
    case 'bazaarDeal': {
      const txt = e.how === 'free' ? `🛒 ${name(e.owner)} gets the last tile for free`
        : e.how === 'bank' ? (e.price ? `🛒 ${name(e.owner)} pays ${e.price} and keeps the tile` : `🛒 Nobody bids: ${name(e.owner)} keeps the tile for free`)
          : e.how === 'buy' ? `🛒 ${name(e.owner)} keeps the tile and pays ${name(e.payee)} ${e.price}`
            : `🛒 ${name(e.chooser)} sells the tile to ${name(e.owner)} for ${e.price}`;
      banner(txt, 1900);
      if (e.price) {
        sfx.coins();
        ui.shown[e.owner] -= e.price; bumpChip(e.owner);
        if (e.payee !== null) { ui.shown[e.payee] += e.price; bumpChip(e.payee); }
        renderPlayers();
      }
      await wait(1200);
      return true;
    }
    case 'bazaarRound':
      banner('🛒 Bazaar round: everyone plays the tile they got', 1800);
      await wait(1000);
      return true;
    case 'bazaarTurn':
      if (e.replaced) banner(`🛒 ${name(e.seat)}'s bazaar tile fits nowhere: they draw another`, 1800);
      else banner(`🛒 ${name(e.seat)} plays the tile from the bazaar`, 1500);
      await wait(600);
      return true;
    case 'bazaarEnd':
      toast('🛒 The bazaar is over');
      await wait(300);
      return true;
    default:
      return false;
  }
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
    const SECTION = { garden: 'monastery', pig: 'field' };
    for (const e of events) {
      const sec = SECTION[e.kind] || e.kind;
      if (sec !== lastKind && e.kind !== 'fairy' && !ui.fast) {
        lastKind = sec;
        const title = e.section || { castleEnd: '🏰 Castles still waiting (0 points)', road: '🛣️ Unfinished roads', city: '🏯 Unfinished cities', monastery: '⛪ Monasteries & gardens', field: '🌾 Farms', goods: '📦 Trade goods' }[sec];
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

const SCORE_COLUMNS = [['road', '🛣️'], ['city', '🏯'], ['monastery', '⛪'], ['field', '🌾'], ['goods', '📦'], ['fairy', '🧚'], ['castle', '🏰'], ['bazaar', '🛒'], ['tower', '⛓️']];

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
      ${cols.map(([k]) => `<td${(p.breakdown[k] || 0) < 0 ? ' class="neg"' : ''}>${String(p.breakdown[k] || 0).replace('-', '−')}</td>`).join('')}<td class="total${p.score < 0 ? ' neg' : ''}">${String(p.score).replace('-', '−')}</td></tr>`;
  }
  html += '</table>';
  const legend = { road: 'roads', city: 'cities', monastery: 'monasteries & gardens', field: 'farms', goods: 'goods', fairy: 'fairy', castle: 'castles', bazaar: 'bazaar bids', tower: 'tower ransom' };
  html += `<p class="score-legend">${cols.map(([k, icon]) => `${icon} ${legend[k]}`).join(' · ')}</p>`;
  if (!isFinal) html += `<p style="text-align:center;margin:0 0 6px;font-size:13px">${$('deck-count').textContent} tiles left${state.discarded.length ? ` · ${state.discarded.length} thrown out` : ''}</p>`;
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
  clearTimeout(waitTimer);
  $('seat-back').hidden = true;
  hooks.onLeave?.();
  show('home');
}

export function stopGame() {
  turnToken++;
  state = null;
  ui.busy = false;
  pending.length = 0;
  clearTimeout(waitTimer);
  $('scores-modal').hidden = true;
  $('seat-back').hidden = true;
}

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
