import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] || '/tmp/claude-0/shots';
const base = process.argv[3] || 'http://localhost:5173/';
import fs from 'fs'; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() !== 'log') console.log('console:', m.type(), m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(base); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/1-home.png` });
await p.tap('#btn-new'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/2-setup.png` });
// make player 2 a computer
await p.locator('.prow .kind').nth(1).tap(); await p.waitForTimeout(100);
await p.tap('#btn-start'); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/3-game.png` });
const tapWorld = async (x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [x, y]);
  await p.touchscreen.tap(sx, sy);
};
for (let turn = 0; turn < 6; turn++) {
  await p.waitForFunction(() => { const c = window.__carc; return c.state.phase === 'place' && c.state.players[c.state.current].kind === 'human' && !c.ui.busy; }, null, { timeout: 20000 });
  const pl = await p.evaluate(() => { const c = window.__carc; const pl = c.ui.placements[Math.floor(Math.random() * c.ui.placements.length)]; c.view.cam.x = pl.x; c.view.cam.y = pl.y; c.view.camTarget = null; return pl; });
  await tapWorld(pl.x, pl.y); await p.waitForTimeout(300);
  if (turn === 0) await p.screenshot({ path: `${out}/4-tentative.png` });
  await p.tap('#btn-confirm'); await p.waitForTimeout(500);
  const ghosts = await p.evaluate(() => (window.__carc.ui.ghosts || []).map(g => g.fi));
  if (ghosts.length) {
    const g = await p.evaluate(() => { const c = window.__carc; const t = c.state.board[c.state.last]; return { key: c.state.last, fi: c.ui.ghosts[0].fi }; });
    // tap the ghost via its anchor
    const pos = await p.evaluate((g) => { const c = window.__carc; const t = c.state.board[g.key]; const [x, y] = g.key.split(',').map(Number); const [sx, sy] = c.view.toScreen(x, y); return c.view.anchorScreen(t.t, t.r, g.fi, sx, sy); }, g);
    await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(400);
    if (turn === 0) await p.screenshot({ path: `${out}/5-meeple.png` });
  }
  await p.tap('#btn-confirm'); await p.waitForTimeout(300);
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/6-later.png` });
await p.tap('#btn-menu'); await p.tap('#m-rules'); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/7-rules.png`, fullPage: false });
const rulesH = await p.evaluate(() => document.querySelector('#rules .panel-scroll').scrollHeight);
for (let i = 1; i < 6; i++) { await p.evaluate((y) => document.querySelector('#rules .panel-scroll').scrollTop = y, i * 700); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/7-rules-${i}.png` }); }
console.log('rules height', rulesH);
await b.close();
