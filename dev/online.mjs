// Two phones + a bot play online through the local wrangler dev server.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '/tmp/claude-0/online';
const TURNS = +(process.argv[4] || 8);
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
async function phone(name) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(name, 'pageerror:', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log(name, 'console:', m.text()); });
  await p.goto(BASE); await p.waitForTimeout(800);
  return p;
}
const dad = await phone('dad');
const sam = await phone('sam');
// Dad hosts
await dad.tap('#btn-new');
await dad.tap('#mode-seg button[data-mode="online"]');
await dad.fill('#me-name', 'Dad');
await dad.tap('#btn-start');
await dad.waitForFunction(() => document.querySelector('#lobby-code')?.textContent?.length === 4 && /[A-Z]{4}/.test(document.querySelector('#lobby-code').textContent));
const code = await dad.textContent('#lobby-code');
console.log('code', code);
await dad.waitForTimeout(600);
await dad.tap('#lobby-add-bot');
// Sam joins
await sam.tap('#btn-join-home');
await sam.fill('#join-code', code);
await sam.fill('#join-name', 'Sam');
await sam.tap('#btn-join');
await sam.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 3, null, { timeout: 10000 });
await dad.waitForTimeout(500);
await dad.screenshot({ path: `${OUT}/1-dad-lobby.png` });
await sam.screenshot({ path: `${OUT}/2-sam-lobby.png` });
await dad.tap('#lobby-start');
await Promise.all([dad, sam].map((p) => p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 10000 })));
console.log('started; current =', await dad.evaluate(() => window.__carc.state.current));
async function playIfMine(p, who) {
  return p.evaluate(() => {
    const c = window.__carc;
    const s = c.state, ui = c.ui;
    if (!s || s.phase !== 'place' || ui.busy) return false;
    const me = c.session.net.id;
    if (s.players[s.current].owner !== me) return false;
    return true;
  });
}
async function takeTurn(p) {
  const pl = await p.evaluate(() => { const c = window.__carc; const pl = c.ui.placements[0]; c.view.cam.x = pl.x; c.view.cam.y = pl.y; c.view.camTarget = null; return pl; });
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [pl.x, pl.y]);
  await p.touchscreen.tap(sx, sy); await p.waitForTimeout(250);
  await p.tap('#btn-confirm'); await p.waitForTimeout(450);
  const g = await p.evaluate(() => { const c = window.__carc; const g = (c.ui.ghosts || [])[0]; return g ? c.view.ghostScreenPos(g) : null; });
  if (g && Math.random() < 0.6) { await p.touchscreen.tap(g[0], g[1]); await p.waitForTimeout(250); }
  await p.tap('#btn-confirm');
}
let turns = 0, guard = 0;
while (turns < TURNS && guard++ < 400) {
  for (const [p, who] of [[dad, 'dad'], [sam, 'sam']]) {
    if (await playIfMine(p, who)) { await takeTurn(p); turns++; console.log('turn by', who); }
  }
  await dad.waitForTimeout(300);
}
await dad.waitForTimeout(3500);
const sd = await dad.evaluate(() => ({ seq: window.__carc.state.seq, board: Object.keys(window.__carc.state.board).length, scores: window.__carc.state.players.map((p) => p.score), deck: window.__carc.state.deck.length }));
const ss = await sam.evaluate(() => ({ seq: window.__carc.state.seq, board: Object.keys(window.__carc.state.board).length, scores: window.__carc.state.players.map((p) => p.score), deck: window.__carc.state.deck.length }));
console.log('dad', JSON.stringify(sd)); console.log('sam', JSON.stringify(ss));
const same = await (async () => {
  const a = await dad.evaluate(() => JSON.stringify(window.__carc.state.board));
  const c = await sam.evaluate(() => JSON.stringify(window.__carc.state.board));
  return a === c;
})();
console.log('boards identical:', same);
await dad.screenshot({ path: `${OUT}/3-dad-game.png` });
await sam.screenshot({ path: `${OUT}/4-sam-game.png` });
// Sam reloads mid-game and rejoins
await sam.reload(); await sam.waitForTimeout(1200);
await sam.tap('#btn-rejoin');
await sam.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 10000 });
await sam.waitForTimeout(1500);
const ss2 = await sam.evaluate(() => ({ seq: window.__carc.state.seq, board: Object.keys(window.__carc.state.board).length }));
console.log('sam after rejoin', JSON.stringify(ss2));
await sam.screenshot({ path: `${OUT}/5-sam-rejoined.png` });
await b.close();
