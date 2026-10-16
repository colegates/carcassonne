import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto('http://localhost:5173/'); await p.waitForTimeout(800);
await p.tap('#btn-new'); await p.tap('#btn-start'); await p.waitForTimeout(1200);
await p.evaluate(() => {
  const { G, view } = window.__carc; const s = window.__carc.state;
  for (let i = 0; i < 26; i++) {
    const vp = G.validPlacements(s.board, s.drawn);
    vp.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    const pl = vp[Math.floor(Math.random() * Math.min(4, vp.length))];
    G.placeTile(s, pl.x, pl.y, pl.rots[0]);
    const o = G.meepleOptions(s);
    G.finishTurn(s, o.length && Math.random() < 0.35 ? o[Math.floor(Math.random() * o.length)] : null);
  }
  view.setVM({ candidates: null });
  view.fit(false); view.cam.z = 95; view.dirty = true;
});
await p.waitForTimeout(600);
await p.screenshot({ path: '/tmp/claude-0/board.png' });
await b.close();
