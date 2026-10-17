// Online situations that went wrong before: rejoining after a reload, leaving and
// rejoining, letting a bot play for a phone that went away (from any phone), taking
// the seat back, and the host leaving while a computer player is in the game.
// usage: node dev/online-scenarios.mjs [base]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const b = await chromium.launch();
const results = [];
const errors = [];
const check = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', name, extra); };

async function open(name, ctx = null) {
  ctx = ctx || await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log(name, 'pageerror:', e.message); errors.push(`${name}: ${e.message}`); });
  p.on('console', (m) => { if (m.type() === 'error') { console.log(name, 'console:', m.text()); errors.push(`${name}: ${m.text()}`); } });
  await p.goto(BASE, { timeout: 120000 });
  await p.waitForTimeout(600);
  return { name, ctx, p };
}
const ev = (ph, fn, arg) => ph.p.evaluate(fn, arg);
const gameOn = (ph) => ph.p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 20000 });
const seqOf = (ph) => ev(ph, () => window.__carc.state?.seq ?? -1);
const snap = (ph) => ev(ph, () => {
  const s = window.__carc.state;
  return JSON.stringify({ board: s.board, players: s.players.map((q) => [q.score, q.kind, q.supply]), seq: s.seq, deck: s.deck.length, current: s.current });
});

// one phone's move if it is its turn (place a random fitting tile, no follower)
async function step(ph) {
  const what = await ev(ph, () => {
    const c = window.__carc; const s = c.state;
    if (!s || s.phase === 'over' || c.ui.busy) return null;
    if (s.phase !== 'place' || s.players[s.current].owner !== c.session.net.id || s.players[s.current].kind !== 'human') return null;
    const pl = c.ui.placements[Math.floor(Math.random() * c.ui.placements.length)];
    const v = c.view; v.cam.x = pl.x; v.cam.y = pl.y; v.camTarget = null;
    return v.toScreen(pl.x, pl.y);
  });
  if (!what) return false;
  await ph.p.touchscreen.tap(what[0], what[1]); await ph.p.waitForTimeout(200);
  await ph.p.tap('#btn-confirm'); await ph.p.waitForTimeout(350);
  await ph.p.tap('#btn-confirm'); await ph.p.waitForTimeout(300);
  return true;
}
// play until cond() holds (or give up)
async function playUntil(phones, cond, maxMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await cond()) return true;
    let moved = false;
    for (const ph of phones) moved = (await step(ph)) || moved;
    if (!moved) await phones[0].p.waitForTimeout(250);
  }
  return cond();
}
async function settle(phones, ms = 2500) {
  await phones[0].p.waitForTimeout(ms);
  const s = await Promise.all(phones.map(snap));
  return s.every((x) => x === s[0]);
}
const whoseTurn = (ph) => ev(ph, () => { const s = window.__carc.state; return s.players[s.current].name; });

// ---------- set up: Dad hosts, a bot, Sam and Kim join ----------
const dad = await open('dad');
await dad.p.tap('#btn-new');
await dad.p.tap('#mode-seg button[data-mode="online"]');
await dad.p.fill('#me-name', 'Dad');
await dad.p.tap('#btn-start');
await dad.p.waitForFunction(() => /[A-Z]{4}/.test(document.querySelector('#lobby-code')?.textContent || ''));
const code = await dad.p.textContent('#lobby-code');
await dad.p.waitForTimeout(400);
await dad.p.tap('#lobby-add-bot');
async function join(name) {
  const ph = await open(name);
  await ph.p.tap('#btn-join-home');
  await ph.p.fill('#join-code', code);
  await ph.p.fill('#join-name', name);
  await ph.p.tap('#btn-join');
  await ph.p.waitForFunction((n) => [...document.querySelectorAll('#lobby-seats .prow')].some((r) => r.textContent.includes(n) || r.querySelector('input')?.value === n), name, { timeout: 15000 });
  return ph;
}
const sam = await join('Sam');
const kim = await join('Kim');
await dad.p.waitForTimeout(800);
await dad.p.tap('#lobby-start');
await Promise.all([dad, sam, kim].map(gameOn));
console.log('code', code, 'players', await ev(dad, () => window.__carc.state.players.map((p) => p.name).join(', ')));
let all = [dad, sam, kim];
await playUntil(all, async () => (await seqOf(dad)) >= 3);
check('three phones agree after a few moves', await settle(all));

// ---------- A: Sam reloads the page and taps Rejoin ----------
await sam.p.reload();
await sam.p.waitForTimeout(800);
const rejoinShown = await ev(sam, () => !document.getElementById('btn-rejoin').hidden);
check('A: home screen offers Rejoin after a reload', rejoinShown);
await sam.p.tap('#btn-rejoin');
await gameOn(sam);
await sam.p.waitForTimeout(1500);
check('A: rejoined phone is online (not a private copy)', await ev(sam, () => window.__carc.session.online && window.__carc.session.net.isOpen()));
let base = await seqOf(dad);
await playUntil(all, async () => (await seqOf(dad)) >= base + 4);
check('A: moves made after rejoining reach everyone', await settle(all), `seq ${await seqOf(dad)} ${await seqOf(sam)} ${await seqOf(kim)}`);

// ---------- B: Sam leaves from the menu and rejoins without reloading ----------
await sam.p.tap('#btn-menu'); await sam.p.waitForTimeout(250);
await sam.p.tap('#m-quit'); await sam.p.waitForTimeout(300);
await sam.p.tap('#ask-actions button.red'); await sam.p.waitForTimeout(600);
await sam.p.tap('#btn-rejoin');
await gameOn(sam);
await sam.p.waitForTimeout(1500);
check('B: rejoined after leaving, connection open', await ev(sam, () => window.__carc.session.online && window.__carc.session.net.isOpen()));
base = await seqOf(dad);
const samMoves = async () => ev(sam, () => window.__carc.state.seq);
await playUntil(all, async () => (await seqOf(dad)) >= base + 4);
check('B: everyone still agrees after Sam\'s next moves', await settle(all), `seq ${await seqOf(dad)} ${await samMoves()}`);

// ---------- C: Kim's phone goes away; Sam (not the host) lets a bot play ----------
const kimCtx = kim.ctx;
await kim.p.close();
all = [dad, sam];
await playUntil(all, async () => (await whoseTurn(dad)) === 'Kim', 90000);
check('C: reached Kim\'s turn', (await whoseTurn(dad)) === 'Kim');
let btn = null;
try { btn = await sam.p.waitForSelector('#take-over', { timeout: 30000 }); } catch { /* not shown */ }
check('C: "Let a bot play" offered to a phone that is not the host', !!btn);
if (btn) {
  await btn.tap();
  await sam.p.waitForTimeout(600);
  const kinds = await Promise.all(all.map((ph) => ev(ph, () => window.__carc.state.players.find((p) => p.name === 'Kim').kind)));
  check('C: Kim\'s seat is a bot on every phone', kinds.every((k) => k === 'ai'), kinds.join(','));
  const before = await seqOf(dad);
  await playUntil(all, async () => (await seqOf(dad)) > before + 1 && (await whoseTurn(dad)) !== 'Kim', 60000);
  check('C: the bot played Kim\'s turn', (await seqOf(dad)) > before + 1);
  check('C: phones agree', await settle(all));
}

// ---------- D: Kim comes back and takes the seat back ----------
const kim2 = await open('kim2', kimCtx);
const kimRejoin = await ev(kim2, () => !document.getElementById('btn-rejoin').hidden);
check('D: Kim\'s phone offers Rejoin', kimRejoin);
await kim2.p.tap('#btn-rejoin');
await gameOn(kim2);
await kim2.p.waitForTimeout(1500);
const backShown = await ev(kim2, () => !document.getElementById('seat-back').hidden && document.getElementById('seat-back').textContent);
check('D: "Take back" shown to Kim', !!backShown, backShown || '');
if (backShown) {
  await kim2.p.tap('#seat-back');
  await kim2.p.waitForTimeout(1500);
  all = [dad, sam, kim2];
  const kinds = await Promise.all(all.map((ph) => ev(ph, () => window.__carc.state.players.find((p) => p.name === 'Kim').kind)));
  check('D: Kim is a person again on every phone', kinds.every((k) => k === 'human'), kinds.join(','));
  const kimSeq = await seqOf(dad);
  await playUntil(all, async () => (await whoseTurn(dad)) === 'Kim', 90000);
  await playUntil(all, async () => (await whoseTurn(dad)) !== 'Kim' && (await seqOf(dad)) > kimSeq, 60000);
  check('D: Kim played her own turn again', (await seqOf(dad)) > kimSeq);
  check('D: phones agree', await settle(all));
}

// ---------- E: the host leaves; a bot takes the host's seat and the computer players run on Sam's phone ----------
await dad.p.close();
all = [sam, kim2];
const eSeq = await seqOf(sam);
let tookOver = false;
const tE = Date.now();
while (Date.now() - tE < 150000 && (await seqOf(sam)) < eSeq + 8) {
  for (const ph of all) await step(ph);
  const btnE = await sam.p.$('#take-over');
  if (btnE && await btnE.isVisible()) { await btnE.tap(); tookOver = true; }
  await sam.p.waitForTimeout(300);
}
check('E: Sam\'s phone runs the computer players after the host left', await ev(sam, () => window.__carc.session.room.botRunner === window.__carc.session.net.id));
check('E: a bot took the host\'s seat', tookOver && (await ev(sam, () => window.__carc.state.players.find((p) => p.name === 'Dad').kind)) === 'ai');
check('E: the game went on', (await seqOf(sam)) >= eSeq + 8, `seq ${eSeq} -> ${await seqOf(sam)}`);
check('E: remaining phones agree', await settle(all));

console.log(`\n${results.filter((r) => r[1]).length}/${results.length} passed, ${errors.length} page errors`);
await b.close();
