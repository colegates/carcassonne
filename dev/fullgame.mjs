import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone SE'] })).newPage();
p.on('pageerror', e => console.log('pageerror:', e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
await p.goto('http://localhost:5173/'); await p.waitForTimeout(800);
await p.tap('#btn-new');
// players: human + bot; human turns auto-played via hint
await p.locator('.prow .kind').nth(1).tap();
await p.tap('#btn-start');
let turns = 0;
while (true) {
  const st = await p.evaluate(() => { const c = window.__carc; return { phase: c.state.phase, human: c.state.players[c.state.current].kind === 'human', busy: c.ui.busy, sel: c.ui.selected, ghosts: !!c.ui.ghosts }; });
  if (st.phase === 'over') break;
  if (st.human && !st.busy && st.phase === 'place') {
    await p.tap('#btn-hint'); await p.waitForTimeout(150);
    await p.tap('#btn-confirm'); await p.waitForTimeout(300);
    const box = await p.locator('#btn-confirm').boundingBox();
    if (box.y + box.height > 568) console.log('confirm off-screen', box);
    if (turns === 3) await p.screenshot({ path: '/tmp/claude-0/se-meeple.png' });
    await p.tap('#btn-confirm');
    turns++;
  }
  await p.waitForTimeout(250);
}
console.log('human turns', turns);
await p.waitForTimeout(2000);
await p.touchscreen.tap(160, 300); // skip final scoring
await p.waitForSelector('#scores-modal:not([hidden])', { timeout: 60000 });
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/claude-0/se-final.png' });
console.log(await p.evaluate(() => window.__carc.state.players.map(p => p.name + ':' + p.score).join(' ')));
await b.close();
