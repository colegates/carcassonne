// App shell: home screen, menu, rules, boot.
import { TILE_TYPES } from './tiles.js';
import * as G from './game.js';
import { getTileArt, getTileThumb, drawPiece, getTableTexture, rotUnit, getTileBack } from './art.js';
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
// The backdrop is a photograph of a miniature Carcassonne (CSS background, see style.css).
// In portrait a short seamless loop of the same scene fades in over it once it can play;
// skipped for reduced motion and data saver, and paused whenever home is hidden.
const homeVideoOk = () => matchMedia('(orientation: portrait)').matches
  && !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
function homeVideo(play) {
  const v = $('home-video');
  if (!play || !homeVideoOk()) { if (!v.paused) v.pause(); return; }
  if (!v.getAttribute('src')) {
    v.addEventListener('playing', () => v.classList.add('on'), { once: true });
    v.src = v.canPlayType('video/mp4; codecs="avc1.640028"') ? 'assets/ui/home-loop.mp4' : 'assets/ui/home-loop.webm';
  }
  v.play()?.catch(() => {});
}
new MutationObserver(() => homeVideo($('home').classList.contains('active'))).observe($('home'), { attributes: true, attributeFilter: ['class'] });
window.addEventListener('load', () => setTimeout(() => homeVideo($('home').classList.contains('active')), 400));
function drawHome() {
  const saved = store.get('carc-save');
  const online = hasOnlineSave();
  $('btn-continue').hidden = !(saved?.phase && saved.phase !== 'over');
  $('btn-rejoin').hidden = !online;
  if (online) $('btn-rejoin').textContent = `Rejoin Online Game ${online}`;
}
onScreen('home', drawHome);
window.addEventListener('resize', () => { if ($('home').classList.contains('active')) { drawHome(); homeVideo(true); } });

$('btn-new').addEventListener('click', () => { sfx.tap(); openSetup(); });
$('btn-join-home').addEventListener('click', () => { sfx.tap(); openJoin(); });
$('btn-rules').addEventListener('click', () => { sfx.tap(); openRules(); });
$('btn-continue').addEventListener('click', () => {
  sfx.tap();
  const s = store.get('carc-save');
  if (s) C.startGame(s);
});
$('btn-rejoin').addEventListener('click', async () => {
  sfx.tap();
  const code = hasOnlineSave();
  if (code && !(await rejoin(code))) drawHome();
});

function openRules(section = null) {
  const body = $('rules-body');
  if (!body.childElementCount) buildRules(body);
  show('rules');
  body.parentElement.scrollTop = 0;
  const el = section && document.getElementById(`rules-${section}`);
  if (el) requestAnimationFrame(() => { body.parentElement.scrollTop = el.offsetTop - 8; });
}
// "Rules ›" next to an expansion on the setup screens
window.addEventListener('open-rules', (e) => openRules(e.detail));

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
document.querySelector('#deck .stack').style.backgroundImage = `url(assets/ui/tile-back-base.webp), url(${getTileBack().toDataURL()})`;
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
