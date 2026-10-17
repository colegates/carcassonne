// Plays games through the real UI (emulated iPhone) with expansions on:
// one human seat driven by this script plus computer players.
// usage: node dev/ui-expansions.mjs [outDir] [baseUrl] [expansions,comma,list] [turns]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || '/tmp/claude-0/ui-exp';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
const exps = (process.argv[4] || 'river,abbot,inns,traders,dragon,tower').split(',').filter(Boolean);
const turns = +(process.argv[5] || 40);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { console.log('console:', m.type(), m.text()); if (m.type() === 'error') errors.push(m.text()); } });
p.on('pageerror', (e) => { console.log('pageerror:', e.message); errors.push(e.message); });
await p.goto(base); await p.waitForTimeout(1200);
await p.evaluate((exps) => {
  const c = window.__carc;
  const expansions = Object.fromEntries(exps.map((e) => [e, true]));
  const s = c.G.newGame([
    { name: 'Tester', color: 'red', kind: 'human' },
    { name: 'Bot A', color: 'blue', kind: 'ai', level: 'hard' },
    { name: 'Bot B', color: 'green', kind: 'ai', level: 'medium' },
  ], { expansions });
  c.startGame(s);
}, exps);
const tapWorld = async (x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [x, y]);
  await p.touchscreen.tap(sx, sy);
};
let shots = 0, myTurns = 0;
const seen = new Set();
for (let i = 0; i < 400 && myTurns < turns; i++) {
  const st = await p.evaluate(() => {
    const c = window.__carc, s = c.state;
    if (!s) return { phase: 'none' };
    const mover = s.phase === 'dragon' ? c.G.dragonMover(s) : s.current;
    return { phase: s.phase, human: s.players[mover].kind === 'human', busy: !!c.ui.busy, turn: s.turn };
  });
  if (st.phase === 'over') break;
  if (!st.human || st.busy) { await p.waitForTimeout(300); continue; }
  if (st.phase === 'dragon') {
    const k = await p.evaluate(() => { const c = window.__carc; const m = c.G.dragonMoves(c.state); const k = m[Math.floor(Math.random() * m.length)]; const [x, y] = k.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null; return [x, y]; });
    if (!seen.has('dragon')) { seen.add('dragon'); await p.screenshot({ path: `${out}/dragon-${shots++}.png` }); }
    await tapWorld(k[0], k[1]); await p.waitForTimeout(400);
    continue;
  }
  if (st.phase === 'place') {
    myTurns++;
    const pl = await p.evaluate(() => { const c = window.__carc; const pl = c.ui.placements[Math.floor(Math.random() * c.ui.placements.length)]; c.view.cam.x = pl.x; c.view.cam.y = pl.y; c.view.camTarget = null; return pl; });
    await tapWorld(pl.x, pl.y); await p.waitForTimeout(250);
    await p.tap('#btn-confirm'); await p.waitForTimeout(500);
    // pick a random group and a random ghost
    const info = await p.evaluate(() => {
      const c = window.__carc;
      const groups = [...document.querySelectorAll('#picker .pick')].map((b) => b.textContent);
      return { groups, ghosts: (c.ui.ghosts || []).length };
    });
    const picks = await p.$$('#picker .pick');
    if (picks.length && Math.random() < 0.7) {
      const pick = picks[Math.floor(Math.random() * picks.length)];
      const label = await pick.textContent();
      await pick.tap(); await p.waitForTimeout(250);
      if (!seen.has(label)) { seen.add(label); await p.screenshot({ path: `${out}/group-${label.replace(/[^a-z]/gi, '')}-${shots++}.png` }); }
    }
    const ghost = await p.evaluate(() => {
      const c = window.__carc; const gs = (c.ui.ghosts || []).filter((g) => g.type !== 'capture');
      if (!gs.length || Math.random() < 0.15) return null;
      const g = gs[Math.floor(Math.random() * gs.length)];
      const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
      return { g: { key: g.key, fi: g.fi, type: g.type } };
    });
    if (ghost) {
      await p.waitForTimeout(100);
      const pos = await p.evaluate((g) => window.__carc.view.ghostScreenPos(window.__carc.ui.ghosts.find((q) => q.key === g.key && q.fi === g.fi && q.type === g.type)), ghost.g);
      await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(250);
      // captures
      const cap = await p.evaluate(() => { const c = window.__carc; const cs = (c.ui.ghosts || []).filter((g) => g.type === 'capture'); if (!cs.length) return null; const g = cs[0]; return window.__carc.view.ghostScreenPos(g); });
      if (cap) { await p.touchscreen.tap(cap[0], cap[1]); await p.waitForTimeout(200); if (!seen.has('capture')) { seen.add('capture'); await p.screenshot({ path: `${out}/capture-${shots++}.png` }); } }
    }
    await p.tap('#btn-confirm'); await p.waitForTimeout(600);
    if (myTurns % 12 === 0) await p.screenshot({ path: `${out}/turn-${myTurns}.png` });
  }
}
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/final.png` });
const summary = await p.evaluate(() => { const s = window.__carc.state; return { phase: s.phase, turn: s.turn, tiles: Object.keys(s.board).length, scores: s.players.map((q) => q.score), dragon: s.dragon, towers: Object.keys(s.towers).length }; });
console.log(JSON.stringify(summary), 'myTurns', myTurns, 'errors', errors.length, [...seen].join(' | '));
await b.close();
