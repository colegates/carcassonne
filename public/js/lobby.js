// New-game setup (one phone or online), joining a game, and the online lobby.
import * as G from './game.js';
import { EXPANSIONS, maxPlayers } from './expansions.js';
import { Net, createRoom, roomInfo } from './net.js';
import * as C from './controller.js';
import { sfx } from './sound.js';
import { $, store, escapeHtml, show, pieceIcon, toast, ask } from './ui.js';

const COLOR_ORDER = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const BOT_NAMES = ['Sir Lancelot', 'Lady Brienne', 'Brother Tuck', 'Baron Bruno', 'Dame Matilda', 'Count Roland'];

let setup = store.get('carc-setup') || {};
setup = {
  mode: 'local',
  players: [
    { name: 'Player 1', color: 'red', kind: 'human' },
    { name: 'Player 2', color: 'blue', kind: 'human' },
  ],
  farmers: true, hints: true, expansions: {}, bcb: {}, myName: '', myColor: 'red',
  ...setup,
};
setup.players.forEach((p) => { if (!COLOR_ORDER.includes(p.color)) p.color = 'pink'; });
const saveSetup = () => store.set('carc-setup', setup);

let session = null; // online session { online, code, net, room }

// ---------------- setup screen ----------------
export function openSetup() { renderSetup(); show('setup'); }

function readyExpansions() { return EXPANSIONS.filter((e) => e.ready); }
function activeExpansions() {
  const out = {};
  for (const e of readyExpansions()) if (setup.expansions[e.id]) out[e.id] = true;
  return out;
}

function renderSetup() {
  document.querySelectorAll('#mode-seg button').forEach((b) => b.classList.toggle('active', b.dataset.mode === setup.mode));
  $('local-players').hidden = setup.mode !== 'local';
  $('online-me').hidden = setup.mode !== 'online';
  $('btn-start').textContent = setup.mode === 'online' ? 'Create Online Game' : 'Start Game';
  $('online-help').hidden = setup.mode !== 'online';
  renderLocalPlayers();
  renderOnlineMe();
  renderExpansionToggles($('exp-list'), setup.expansions, (id, on) => { setup.expansions[id] = on; saveSetup(); renderLocalPlayers(); }, false,
    { values: setup.bcb || {}, onChange: (part, on) => { setup.bcb = { ...setup.bcb, [part]: on }; saveSetup(); } });
  $('opt-farmers').checked = setup.farmers;
  $('opt-hints').checked = setup.hints;
}

// parts: the sub-options of an expansion ({ values, onChange(part, on) }), shown under its switch while it is on
export function renderExpansionToggles(box, values, onChange, readOnly = false, parts = null) {
  box.innerHTML = '';
  const list = readyExpansions();
  if (!list.length) {
    box.innerHTML = '<p class="muted">Expansions are coming soon.</p>';
    return;
  }
  for (const e of list) {
    const row = document.createElement('label');
    row.className = 'toggle exp';
    row.innerHTML = `<input type="checkbox" ${values[e.id] ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span class="slider"></span>
      <span class="tlabel"><b>${e.icon} ${escapeHtml(e.name)}</b><small>${escapeHtml(e.blurb)} <button type="button" class="exp-info">Rules ›</button></small></span>`;
    let sub = null;
    if (e.parts && parts) {
      sub = document.createElement('div');
      sub.className = 'exp-parts';
      sub.hidden = !values[e.id];
      const draw = () => {
        sub.innerHTML = '';
        for (const [part, label, hint] of e.parts) {
          const on = parts.values[part] !== false;
          const row = document.createElement('label');
          row.className = 'toggle exp-part';
          row.innerHTML = `<input type="checkbox" ${on ? 'checked' : ''}><span class="slider"></span><span class="tlabel"><b>${label}</b><small>${hint}</small></span>`;
          const input = row.querySelector('input');
          input.disabled = readOnly || (part === 'auction' && parts.values.bazaars === false);
          input.addEventListener('change', () => {
            sfx.tap();
            parts.values = { ...parts.values, [part]: input.checked };
            parts.onChange(part, input.checked);
            draw();
          });
          sub.appendChild(row);
        }
      };
      draw();
    }
    row.querySelector('input').addEventListener('change', (ev) => {
      sfx.tap();
      if (sub) sub.hidden = !ev.target.checked;
      onChange(e.id, ev.target.checked);
    });
    row.querySelector('.exp-info').addEventListener('click', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      sfx.tap();
      window.dispatchEvent(new CustomEvent('open-rules', { detail: e.id }));
    });
    box.appendChild(row);
    if (sub) box.appendChild(sub);
  }
}

function renderLocalPlayers() {
  const rows = $('player-rows');
  rows.innerHTML = '';
  const max = maxPlayers(activeExpansions());
  if (setup.players.length > max) {
    while (setup.players.length > max) setup.players.pop();
    toast('The 6th player needs Inns & Cathedrals (it adds the pink figures)');
  }
  setup.players.forEach((p, i) => {
    const row = document.createElement('div'); row.className = 'prow';
    const icon = pieceIcon(p.color); icon.title = 'Tap to change colour';
    icon.addEventListener('click', () => {
      const used = new Set(setup.players.map((q) => q.color));
      let idx = COLOR_ORDER.indexOf(p.color);
      for (let n = 0; n < COLOR_ORDER.length; n++) {
        idx = (idx + 1) % COLOR_ORDER.length;
        if (!used.has(COLOR_ORDER[idx])) break;
      }
      p.color = COLOR_ORDER[idx]; sfx.meeple(); renderLocalPlayers();
    });
    const input = document.createElement('input');
    input.value = p.name; input.maxLength = 14; input.autocomplete = 'off';
    input.addEventListener('input', () => { p.name = input.value; });
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    const kind = document.createElement('button');
    kind.className = 'kind' + (p.kind === 'ai' ? ' bot' : '');
    kind.textContent = p.kind === 'ai' ? `🤖 ${LEVEL_NAMES[p.level || 'medium']}` : '🙂 Person';
    kind.addEventListener('click', () => {
      const seq = [['human'], ['ai', 'easy'], ['ai', 'medium'], ['ai', 'hard']];
      const cur = seq.findIndex(([k, l]) => k === p.kind && (k === 'human' || l === (p.level || 'medium')));
      const [k, l] = seq[(cur + 1) % seq.length];
      p.kind = k; if (l) p.level = l;
      if (k === 'ai' && /^Player \d$/.test(p.name)) p.name = botName(setup.players);
      sfx.tap(); renderLocalPlayers();
    });
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Remove player');
    del.disabled = setup.players.length <= 2; del.style.opacity = del.disabled ? 0.25 : 1;
    del.addEventListener('click', () => { if (setup.players.length > 2) { setup.players.splice(i, 1); sfx.tap(); renderLocalPlayers(); } });
    row.append(icon, input, kind, del);
    rows.appendChild(row);
  });
  $('add-human').disabled = $('add-bot').disabled = setup.players.length >= max;
  const hint = $('players-hint');
  hint.hidden = !(setup.players.length >= max && max < 6);
  hint.textContent = 'Up to 5 players. Switch on Inns & Cathedrals below for a 6th.';
}

function renderOnlineMe() {
  const box = $('me-icon');
  box.innerHTML = '';
  const icon = pieceIcon(setup.myColor || 'red');
  icon.addEventListener('click', () => {
    const idx = COLOR_ORDER.indexOf(setup.myColor);
    setup.myColor = COLOR_ORDER[(idx + 1) % COLOR_ORDER.length]; sfx.meeple(); saveSetup(); renderOnlineMe();
  });
  box.appendChild(icon);
  $('me-name').value = setup.myName || '';
}

function botName(list) {
  const used = new Set(list.map((p) => p.name));
  return BOT_NAMES.find((n) => !used.has(n)) || 'Knight';
}

function addPlayer(kind) {
  const max = maxPlayers(activeExpansions());
  if (setup.players.length >= max) return;
  const used = new Set(setup.players.map((p) => p.color));
  const color = COLOR_ORDER.find((c) => !used.has(c));
  setup.players.push(kind === 'ai' ? { name: botName(setup.players), color, kind: 'ai', level: 'medium' } : { name: `Player ${setup.players.length + 1}`, color, kind: 'human' });
  sfx.tap(); renderLocalPlayers();
}

document.querySelectorAll('#mode-seg button').forEach((b) => b.addEventListener('click', () => {
  sfx.tap(); setup.mode = b.dataset.mode; saveSetup(); renderSetup();
}));
$('add-human').addEventListener('click', () => addPlayer('human'));
$('add-bot').addEventListener('click', () => addPlayer('ai'));
$('opt-farmers').addEventListener('change', (e) => { setup.farmers = e.target.checked; saveSetup(); });
$('opt-hints').addEventListener('change', (e) => { setup.hints = e.target.checked; saveSetup(); });
$('me-name').addEventListener('input', (e) => { setup.myName = e.target.value; saveSetup(); });
$('me-name').addEventListener('pointerdown', (e) => e.stopPropagation());

function gameOptions(src = setup) {
  const out = { farmers: src.farmers !== false, hints: src.hints !== false, expansions: { ...activeExpansionsFrom(src.expansions) } };
  // Bridges, Castles & Bazaars: the parts in play
  if (out.expansions.bridges) out.bcb = bcbOptions(src.bcb);
  return out;
}
function bcbOptions(b = {}) {
  return { bridges: b.bridges !== false, castles: b.castles !== false, bazaars: b.bazaars !== false, auction: b.auction !== false };
}
function activeExpansionsFrom(exp = {}) {
  const out = {};
  for (const e of readyExpansions()) if (exp[e.id]) out[e.id] = true;
  return out;
}

$('btn-start').addEventListener('click', async () => {
  sfx.tap();
  if (setup.mode === 'online') { await hostOnline(); return; }
  setup.players.forEach((p, i) => { if (!p.name.trim()) p.name = `Player ${i + 1}`; });
  saveSetup();
  const state = G.newGame(setup.players, gameOptions());
  state.current = Math.floor(Math.random() * state.players.length); // random start player
  state.gameId = Math.random().toString(36).slice(2);
  C.startGame(state);
});

// ---------------- online: host / join ----------------
function myName() {
  const n = (setup.myName || '').trim();
  return n || 'Player';
}

async function hostOnline() {
  if (!(setup.myName || '').trim()) { toast('Type your name first'); $('me-name').focus(); return; }
  let code;
  try {
    $('btn-start').disabled = true;
    code = await createRoom();
  } catch (e) {
    toast(e.message || 'Could not create a game');
    return;
  } finally {
    $('btn-start').disabled = false;
  }
  connect(code, true);
}

export function openJoin(code = '') {
  $('join-code').value = code || '';
  $('join-name').value = setup.myName || '';
  renderJoinIcon();
  show('join');
}

function renderJoinIcon() {
  const box = $('join-icon');
  box.innerHTML = '';
  const icon = pieceIcon(setup.myColor || 'blue');
  icon.addEventListener('click', () => {
    const idx = COLOR_ORDER.indexOf(setup.myColor);
    setup.myColor = COLOR_ORDER[(idx + 1) % COLOR_ORDER.length]; sfx.meeple(); saveSetup(); renderJoinIcon();
  });
  box.appendChild(icon);
}

$('join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
$('join-code').addEventListener('pointerdown', (e) => e.stopPropagation());
$('join-name').addEventListener('pointerdown', (e) => e.stopPropagation());
$('join-name').addEventListener('input', (e) => { setup.myName = e.target.value; saveSetup(); });
$('btn-join').addEventListener('click', async () => {
  sfx.tap();
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 4) { toast('The game code has 4 letters'); return; }
  if (!(setup.myName || '').trim()) { toast('Type your name first'); return; }
  try {
    const info = await roomInfo(code);
    if (!info.exists) { toast(`No game called ${code} — check the code`); return; }
  } catch (e) { toast(e.message); return; }
  connect(code, false);
});

function connect(code, hosting) {
  if (session?.net) session.net.close();
  session = { online: true, code, room: null, hosting, joinedSeat: false };
  session.net = new Net(code, myName(), {
    onMessage: (m) => onMessage(m),
    onStatus: () => { C.netStatus(); if ($('lobby').classList.contains('active')) renderLobby(); },
  });
  store.set('carc-online', { code });
  $('lobby-code').textContent = code;
  renderLobby();
  show('lobby');
}

// Back to the online game saved on this phone (if the room still exists).
export async function rejoin(code) {
  try {
    const info = await roomInfo(code);
    if (!info.exists) { store.del('carc-online'); toast(`Game ${code} has ended`); return false; }
  } catch (e) { toast(e.message); return false; }
  connect(code, false);
  return true;
}
export function hasOnlineSave() { return store.get('carc-online')?.code || null; }

function onMessage(msg) {
  if (!session) return;
  if (msg.type === 'error') {
    toast(msg.error);
    if (/exist/.test(msg.error)) {
      // the room has gone (games are forgotten after two weeks): back to the home screen
      store.del('carc-online');
      leaveOnline();
      C.stopGame();
      show('home');
    }
    return;
  }
  if (msg.type === 'welcome') {
    session.room = msg.room;
    if (msg.room.phase !== 'lobby' && msg.init) {
      C.resyncFrom(msg.init, msg.actions || [], session);
      ensureGameSession();
      return;
    }
    // (a game this phone was showing has ended and the host started a new one meanwhile)
    if ($('game').classList.contains('active')) C.stopGame();
    ensureSeat();
    renderLobby();
    if (!$('lobby').classList.contains('active')) show('lobby');
    return;
  }
  if (msg.type === 'room') {
    session.room = msg.room;
    if (msg.room.phase === 'lobby') {
      ensureSeat();
      if ($('game').classList.contains('active')) { C.stopGame(); show('lobby'); }
      renderLobby();
    }
    C.onNetMessage(msg);
    return;
  }
  if (msg.type === 'started') {
    session.room = msg.room;
    C.startGame(G.cloneState(msg.init), session);
    return;
  }
  C.onNetMessage(msg);
}

function ensureGameSession() {
  if (!$('game').classList.contains('active')) show('game');
}

// Make sure this phone has a seat in the lobby.
function ensureSeat() {
  const r = session.room;
  if (!r || r.phase !== 'lobby' || session.joinedSeat) return;
  if (r.seats.some((s) => s.owner === session.net.id)) { session.joinedSeat = true; return; }
  if (r.seats.length >= 6) return;
  session.joinedSeat = true;
  session.net.send({ type: 'lobby', op: 'join', name: myName(), color: setup.myColor });
}

// ---------------- lobby screen ----------------
const isHost = () => session?.room?.hostId === session?.net?.id;

function renderLobby() {
  if (!session) return;
  const r = session.room;
  const up = session.net?.isOpen();
  $('lobby-status').textContent = up ? '' : 'Connecting…';
  $('lobby-code').textContent = session.code;
  drawQR(`${location.origin}/#join=${session.code}`);
  const box = $('lobby-seats');
  box.innerHTML = '';
  if (!r) return;
  r.seats.forEach((seat, i) => {
    const row = document.createElement('div'); row.className = 'prow lobby-row';
    const mine = seat.owner === session.net.id;
    const icon = pieceIcon(seat.color);
    if (mine || (isHost() && seat.kind === 'ai')) {
      icon.title = 'Tap to change colour';
      icon.addEventListener('click', () => {
        const used = new Set(r.seats.map((q) => q.color));
        let idx = COLOR_ORDER.indexOf(seat.color);
        for (let n = 0; n < COLOR_ORDER.length; n++) { idx = (idx + 1) % COLOR_ORDER.length; if (!used.has(COLOR_ORDER[idx])) break; }
        sfx.meeple();
        if (mine) { setup.myColor = COLOR_ORDER[idx]; saveSetup(); }
        session.net.send({ type: 'lobby', op: 'update', seat: i, color: COLOR_ORDER[idx] });
      });
    }
    const name = document.createElement(mine ? 'input' : 'div');
    if (mine) {
      name.value = seat.name; name.maxLength = 14;
      name.addEventListener('pointerdown', (e) => e.stopPropagation());
      name.addEventListener('change', () => session.net.send({ type: 'lobby', op: 'update', seat: i, name: name.value }));
    } else {
      name.className = 'seat-name';
      name.textContent = seat.name;
    }
    const status = document.createElement('button');
    status.className = 'kind' + (seat.kind === 'ai' ? ' bot' : '');
    if (seat.kind === 'ai') {
      status.textContent = `🤖 ${LEVEL_NAMES[seat.level] || 'Medium'}`;
      if (isHost()) status.addEventListener('click', () => {
        const order = ['easy', 'medium', 'hard'];
        sfx.tap();
        session.net.send({ type: 'lobby', op: 'kind', seat: i, kind: 'ai', level: order[(order.indexOf(seat.level) + 1) % 3] });
      });
    } else {
      const online = r.clients[seat.owner]?.online;
      status.textContent = mine ? '📱 You' : online ? '📱 Joined' : '💤 Away';
      status.disabled = true;
    }
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕';
    const canRemove = isHost() ? seat.owner !== session.net.id || r.seats.filter((s) => s.owner === session.net.id).length > 1 : mine && r.seats.filter((s) => s.owner === session.net.id).length > 1;
    del.style.opacity = canRemove ? 1 : 0.2;
    del.disabled = !canRemove;
    del.addEventListener('click', () => {
      sfx.tap();
      session.net.send({ type: 'lobby', op: mine ? 'leave' : 'remove', seat: i });
    });
    row.append(icon, name, status, del);
    box.appendChild(row);
  });
  const max = maxPlayers(activeExpansionsFrom(r.options?.expansions));
  $('lobby-add-bot').hidden = !isHost();
  $('lobby-add-bot').disabled = r.seats.length >= max;
  $('lobby-add-local').disabled = r.seats.length >= max;
  // options
  const opts = r.options && Object.keys(r.options).length ? r.options : gameOptions();
  renderExpansionToggles($('lobby-exp'), opts.expansions || {}, (id, on) => {
    const next = { ...opts, expansions: { ...(opts.expansions || {}), [id]: on } };
    session.net.send({ type: 'lobby', op: 'options', options: next });
  }, !isHost(), { values: opts.bcb || {}, onChange: (part, on) => {
    const next = { ...opts, bcb: { ...bcbOptions(opts.bcb), [part]: on } };
    session.net.send({ type: 'lobby', op: 'options', options: next });
  } });
  $('lobby-farmers').checked = opts.farmers !== false;
  $('lobby-farmers').disabled = !isHost();
  $('lobby-hints').checked = opts.hints !== false;
  $('lobby-hints').disabled = !isHost();
  if (isHost() && (!r.options || !Object.keys(r.options).length)) session.net.send({ type: 'lobby', op: 'options', options: opts });
  const hostName = r.clients[r.hostId]?.name || 'the host';
  $('lobby-start').hidden = !isHost();
  $('lobby-start').disabled = r.seats.length < 2 || r.seats.length > max;
  $('lobby-wait').hidden = isHost();
  $('lobby-wait').textContent = `Waiting for ${hostName} to start the game…`;
  $('lobby-hint').textContent = r.seats.length < 2 ? 'Share the code, or add a computer player, to start.'
    : r.seats.length > max ? `${r.seats.length} players need Inns & Cathedrals (it adds the 6th colour).` : '';
}

$('lobby-farmers').addEventListener('change', (e) => sendOpt({ farmers: e.target.checked }));
$('lobby-hints').addEventListener('change', (e) => sendOpt({ hints: e.target.checked }));
function sendOpt(patch) {
  const r = session?.room; if (!r || !isHost()) return;
  session.net.send({ type: 'lobby', op: 'options', options: { ...gameOptions(), ...r.options, ...patch } });
}
$('lobby-add-bot').addEventListener('click', () => {
  sfx.tap();
  const r = session.room;
  session.net.send({ type: 'lobby', op: 'add', seatData: { name: botName(r.seats), kind: 'ai', level: 'medium' } });
});
$('lobby-add-local').addEventListener('click', () => {
  sfx.tap();
  const n = session.room.seats.length + 1;
  session.net.send({ type: 'lobby', op: 'join', extra: true, name: `Player ${n}` });
});
$('lobby-share').addEventListener('click', async () => {
  sfx.tap();
  const url = `${location.origin}/#join=${session.code}`;
  const text = `Join my Carcassonne game! Code ${session.code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Carcassonne', text, url });
    else { await navigator.clipboard.writeText(url); toast('Invite link copied'); }
  } catch { /* cancelled */ }
});
$('lobby-start').addEventListener('click', () => {
  sfx.tap();
  const r = session.room;
  if (!r || r.seats.length < 2) return;
  if (r.seats.length > maxPlayers(activeExpansionsFrom(r.options?.expansions))) { toast('6 players need Inns & Cathedrals'); return; }
  const opts = { ...gameOptions(), ...r.options };
  opts.expansions = activeExpansionsFrom(opts.expansions);
  if (opts.expansions.bridges) opts.bcb = bcbOptions(opts.bcb); else delete opts.bcb;
  const init = G.newGame(r.seats.map((s) => ({ name: s.name, color: s.color, kind: s.kind, level: s.level })), opts);
  init.players.forEach((p, i) => { p.owner = r.seats[i].owner || null; });
  init.current = Math.floor(Math.random() * init.players.length);
  init.gameId = Math.random().toString(36).slice(2);
  session.net.send({ type: 'start', init });
});
$('lobby-leave').addEventListener('click', async () => {
  sfx.tap();
  const ok = await ask('Leave this game?', 'You can come back with the same code.', [
    { label: 'Leave', value: true, cls: 'red' }, { label: 'Stay', value: false },
  ]);
  if (!ok) return;
  leaveOnline();
  show('home');
});

export function leaveOnline() {
  if (session?.net) session.net.close();
  session = null;
}

// rematch from the results screen (host)
C.hooks.onRematch = () => { if (session?.net) session.net.send({ type: 'rematch' }); };
C.hooks.onLeave = () => { if (session) { session.net?.close(); session = null; } };

// ---------------- QR code (optional, loaded on demand) ----------------
let qrLib = null;
function loadQR() {
  if (qrLib) return qrLib;
  qrLib = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => resolve(window.qrcode || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return qrLib;
}
async function drawQR(text) {
  const c = $('lobby-qr');
  if (c.dataset.text === text) return;
  c.dataset.text = text;
  const qrcode = await loadQR();
  if (!qrcode) { c.hidden = true; return; }
  const qr = qrcode(0, 'M');
  qr.addData(text); qr.make();
  const n = qr.getModuleCount();
  const scale = 5, pad = 3;
  c.width = c.height = (n + pad * 2) * scale;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#2b1a0c';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
  c.hidden = false;
}
