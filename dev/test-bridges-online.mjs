// Bridges online (two emulated iPhone 13 phones through the local wrangler dev server): the host throws a
// bridge-only tile away, then places a tile with the bridge it needs and puts a meeple on that bridge; the
// other phone must show the throw-away and end with an identical state. The host's start message is rewritten
// so the game begins on a hand-made board (a crossroads, the host to play a monastery tile).
// usage: node dev/test-bridges-online.mjs [base] [outDir]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '/tmp/claude-0/test-bridges';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const errors = [];
async function phone(name) {
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await p.goto(BASE, { timeout: 120000 }); await p.waitForTimeout(800);
  return p;
}
const dad = await phone('dad');
const sam = await phone('sam');
await dad.tap('#btn-new');
await dad.tap('#mode-seg button[data-mode="online"]');
await dad.fill('#me-name', 'Dad');
await dad.tap('#btn-start');
await dad.waitForFunction(() => /[A-Z]{4}/.test(document.querySelector('#lobby-code')?.textContent || ''));
const code = await dad.textContent('#lobby-code');
await dad.waitForTimeout(500);
const ids = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower', 'bridges'];
for (const [i, row] of (await dad.$$('#lobby-exp label.toggle')).entries()) {
  const want = ids[i] === 'bridges';
  if ((await row.$eval('input', (x) => x.checked)) !== want) { await row.tap(); await dad.waitForTimeout(300); }
}
await sam.tap('#btn-join-home');
await sam.fill('#join-code', code);
await sam.fill('#join-name', 'Sam');
await sam.tap('#btn-join');
await sam.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 2, null, { timeout: 10000 });
await sam.waitForTimeout(500);
await dad.evaluate(() => {
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'start' && m.init) {
        const s = m.init;
        s.board = { '0,0': { t: 'X', r: 0, pieces: [], n: 0 } };
        s.placed = 1; s.drawn = 'B'; s.phase = 'place'; s.discarded = []; s.setAside = []; delete s.river;
        s.deck = [...Array(9).fill('U'), 'B']; // after the throw-away the host draws B again, then Sam gets U
        s.current = s.players.findIndex((p) => p.name === 'Dad');
        data = JSON.stringify(m);
      }
    } catch { /* not JSON */ }
    return orig.call(this, data);
  };
});
await dad.tap('#lobby-start');
await Promise.all([dad, sam].map((p) => p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 15000 })));
await dad.waitForTimeout(1500);
const view = (p) => p.evaluate(() => { const c = window.__carc, s = c.state; return { seq: s.seq, current: s.current, phase: s.phase, drawn: s.drawn, discarded: s.discarded, bridges: s.players.map((q) => q.bridges), canDiscard: c.G.canDiscard(s), board: s.board }; });
const same = async () => {
  const [a, z] = await Promise.all([dad, sam].map((p) => p.evaluate(() => JSON.stringify(window.__carc.state))));
  return a === z;
};
const out = { start: await view(dad) };
// 1. the host throws the bridge-only tile away; Sam's phone shows it
await dad.waitForSelector('#btn-discard', { timeout: 8000 });
await dad.tap('#btn-discard'); await dad.waitForTimeout(300);
await dad.locator('#ask-actions button', { hasText: 'Throw it away' }).tap();
const samToasts = [];
for (let t = 0; t < 3500; t += 80) {
  const x = await sam.evaluate(() => document.querySelector('#toast-layer .toast')?.textContent || '');
  if (x && samToasts[samToasts.length - 1] !== x) { samToasts.push(x); if (samToasts.length === 1) await sam.screenshot({ path: `${OUT}/31-online-other-phone-sees-throw-away.png` }); }
  await sam.waitForTimeout(80);
}
out.afterDiscard = { dad: await view(dad), sam: await view(sam), identical: await same(), samToasts };
// 2. the host places B east of the crossroads with its bridge and puts a meeple on the bridge
await dad.evaluate(() => { const v = window.__carc.view; v.cam = { x: 1, y: 0, z: 110 }; v.camTarget = null; v.dirty = true; });
await dad.waitForTimeout(300);
const [sx, sy] = await dad.evaluate(() => window.__carc.view.toScreen(1, 0));
await dad.touchscreen.tap(sx, sy); await dad.waitForTimeout(400);
await dad.tap('#btn-confirm'); await dad.waitForTimeout(700);
await dad.evaluate(() => { const v = window.__carc.view; v.cam = { x: 1, y: 0, z: 110 }; v.camTarget = null; v.dirty = true; });
await dad.waitForTimeout(300);
const bf = await dad.evaluate(() => window.__carc.G.bridgeFeature(window.__carc.state.board['1,0']));
const pos = await dad.evaluate((bf) => { const c = window.__carc; const g = c.ui.ghosts.find((q) => q.key === '1,0' && q.fi === bf); return g ? c.view.ghostScreenPos(g) : null; }, bf);
// (a tap a little east of the bridge figure, away from the monastery's ghost at the centre)
if (pos) { await dad.touchscreen.tap(pos[0] + 6, pos[1]); await dad.waitForTimeout(300); }
out.dadSelected = await dad.evaluate(() => window.__carc.ui.selected);
await dad.tap('#btn-confirm'); await dad.waitForTimeout(2500);
await sam.waitForFunction((seq) => window.__carc.state.seq >= seq, out.afterDiscard.dad.seq + 1, { timeout: 10000 }).catch(() => {});
await sam.waitForTimeout(1500);
await sam.evaluate(() => { const v = window.__carc.view; v.cam = { x: 0.5, y: 0, z: 110 }; v.camTarget = null; v.dirty = true; });
await sam.waitForTimeout(400);
await sam.screenshot({ path: `${OUT}/32-online-other-phone-bridge-meeple.png` });
out.afterTurn = { dad: await view(dad), sam: await view(sam), identical: await same(), bf };
out.errors = errors;
console.log(JSON.stringify(out, (k, v) => (k === 'board' ? Object.fromEntries(Object.entries(v).map(([kk, t]) => [kk, `${t.t}/${t.r}${t.bridge !== undefined ? ` bridge ${t.bridge}` : ''} ${JSON.stringify(t.pieces)}`])) : v), 1));
await b.close();
