// App shell: home screen, menu, rules, boot.
import { TILE_TYPES } from './tiles.js';
import * as G from './game.js';
import { getTileArt, drawPiece, getTableTexture, rotUnit, getTileBack } from './art.js';
import { buildRules } from './rules.js';
import { sfx, unlockAudio, soundOn, setSound } from './sound.js';
import { $, store, show, onScreen, previousScreen, ask } from './ui.js';
import * as C from './controller.js';
import { openSetup, openJoin, rejoin, hasOnlineSave, leaveOnline } from './lobby.js';

document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
  sfx.tap();
  show(b.dataset.back === 'prev' ? previousScreen() : b.dataset.back);
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
      const vp = G.validPlacements(s);
      vp.sort((a, b) => Math.hypot(a.x, a.y * 1.4) - Math.hypot(b.x, b.y * 1.4));
      const p = vp[Math.floor(Math.random() * Math.min(3, vp.length))];
      G.placeTile(s, p.x, p.y, p.rots[Math.floor(Math.random() * p.rots.length)]);
      const o = G.followerOptions(s);
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
    for (const pc of t.pieces) {
      const [x, y] = G.parseKey(k);
      const [ax, ay] = getTileArt(t.t).anchors[pc.f];
      const [rx, ry] = rotUnit(ax, ay, t.r);
      drawPiece(ctx, pc.k, cx + (x + rx - 0.5) * z, cy + (y + ry - 0.5) * z, z * 0.3, G.PLAYER_COLORS[homeTiles.players[pc.p].color], { lying: TILE_TYPES[t.t].features[pc.f].type === 'field' });
    }
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const saved = store.get('carc-save');
  const online = hasOnlineSave();
  $('btn-continue').hidden = !(saved?.phase && saved.phase !== 'over');
  $('btn-rejoin').hidden = !online;
  if (online) $('btn-rejoin').textContent = `Rejoin Online Game ${online}`;
}
onScreen('home', drawHome);
window.addEventListener('resize', () => { if ($('home').classList.contains('active')) drawHome(); });

$('btn-new').addEventListener('click', () => { sfx.tap(); openSetup(); });
$('btn-join-home').addEventListener('click', () => { sfx.tap(); openJoin(); });
$('btn-rules').addEventListener('click', () => { sfx.tap(); openRules(); });
$('btn-continue').addEventListener('click', () => {
  sfx.tap();
  const s = store.get('carc-save');
  if (s) C.startGame(s);
});
$('btn-rejoin').addEventListener('click', () => {
  sfx.tap();
  const code = hasOnlineSave();
  if (code) rejoin(code);
});

function openRules() {
  const body = $('rules-body');
  if (!body.childElementCount) buildRules(body);
  show('rules');
  body.parentElement.scrollTop = 0;
}

// ---------------- menu ----------------
$('btn-menu').addEventListener('click', () => {
  sfx.tap();
  $('m-sound').textContent = `Sound: ${soundOn() ? 'On' : 'Off'}`;
  $('m-emotes').hidden = !C.getSession().online;
  $('menu').hidden = false;
});
$('m-resume').addEventListener('click', () => { $('menu').hidden = true; });
$('m-rules').addEventListener('click', () => { $('menu').hidden = true; openRules(); });
$('m-sound').addEventListener('click', () => { setSound(!soundOn()); $('m-sound').textContent = `Sound: ${soundOn() ? 'On' : 'Off'}`; sfx.tap(); });
$('m-scores').addEventListener('click', () => { $('menu').hidden = true; C.showScores(); });
$('m-quit').addEventListener('click', async () => {
  $('menu').hidden = true;
  if (C.getSession().online) {
    const ok = await ask('Leave the game?', 'The game carries on for the others. You can rejoin from the home screen.', [
      { label: 'Leave', value: true, cls: 'red' }, { label: 'Stay', value: false },
    ]);
    if (!ok) return;
    leaveOnline();
  }
  C.leaveGame();
});
document.querySelectorAll('#m-emotes button').forEach((b) => b.addEventListener('click', () => {
  $('menu').hidden = true; C.emote(b.textContent);
}));
$('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') $('menu').hidden = true; });
$('scores-modal').addEventListener('click', (e) => { if (e.target.id === 'scores-modal' && C.getState()?.phase !== 'over') $('scores-modal').hidden = true; });

// ---------------- boot ----------------
document.querySelector('#deck .stack').style.backgroundImage = `url(${getTileBack().toDataURL()})`;
if (document.fonts?.ready) document.fonts.ready.then(() => { if ($('home').classList.contains('active')) drawHome(); });
drawHome();
// invite links: https://…/#join=ABCD
const joinMatch = location.hash.match(/join=([A-Za-z]{4})/);
if (joinMatch) {
  history.replaceState(null, '', location.pathname);
  openJoin(joinMatch[1].toUpperCase());
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// debugging / automated testing hook
window.__carc = {
  get state() { return C.getState(); }, G, view: C.view, startGame: C.startGame,
  get ui() { return C.getUI(); }, get session() { return C.getSession(); },
};
