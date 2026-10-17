// Two phones + a bot play a whole online game with expansions through the
// local wrangler dev server; checks both phones end up with identical states.
// usage: node dev/online-exp.mjs [base] [outDir] [maxActions] [exp,list]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '/tmp/claude-0/online-exp';
const MAX = +(process.argv[4] || 400);
const EXPS = (process.argv[5] || 'river,abbot,inns,traders,dragon,tower').split(',');
const DROP = +(process.argv[6] || 0); // every DROP actions, cut one phone's connection
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const errors = [];
async function phone(name) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log(name, 'pageerror:', e.message); errors.push(e.message); });
  p.on('console', (m) => { if (m.type() === 'error') { console.log(name, 'console:', m.text()); errors.push(m.text()); } });
  await p.goto(BASE); await p.waitForTimeout(800);
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
console.log('code', code);
await dad.waitForTimeout(500);
// switch the expansions on in the lobby
const ids = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower'];
for (const id of EXPS) {
  const idx = ids.indexOf(id);
  const rows = await dad.$$('#lobby-exp label.toggle');
  const on = await rows[idx].$eval('input', (i) => i.checked);
  if (!on) { await rows[idx].tap(); await dad.waitForTimeout(350); }
}
await dad.tap('#lobby-add-bot');
await sam.tap('#btn-join-home');
await sam.fill('#join-code', code);
await sam.fill('#join-name', 'Sam');
await sam.tap('#btn-join');
await sam.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 3, null, { timeout: 10000 });
await sam.waitForTimeout(600);
await sam.screenshot({ path: `${OUT}/1-sam-lobby.png` });
await dad.tap('#lobby-start');
await Promise.all([dad, sam].map((p) => p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 10000 })));
console.log('started with', JSON.stringify(await dad.evaluate(() => window.__carc.state.options.expansions)));

async function whatToDo(p) {
  return p.evaluate(() => {
    const c = window.__carc; const s = c.state, ui = c.ui;
    if (!s) return 'none';
    if (s.phase === 'over') return 'over';
    if (ui.busy) return 'busy';
    const me = c.session.net.id;
    if (s.phase === 'dragon') { const m = c.G.dragonMover(s); return s.players[m].owner === me ? 'dragon' : 'wait'; }
    if (s.players[s.current].owner !== me) return 'wait';
    return s.phase;
  });
}
const tapWorld = async (p, x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => { const v = window.__carc.view; v.cam.x = x; v.cam.y = y; v.camTarget = null; return v.toScreen(x, y); }, [x, y]);
  await p.touchscreen.tap(sx, sy);
};
const stats = { place: 0, dragon: 0, capture: 0, ransom: 0, groups: {} };
async function step(p) {
  const w = await whatToDo(p);
  if (w === 'dragon') {
    const k = await p.evaluate(() => { const c = window.__carc; const m = c.G.dragonMoves(c.state); return m[Math.floor(Math.random() * m.length)]; });
    const [x, y] = k.split(',').map(Number);
    await tapWorld(p, x, y); stats.dragon++;
    await p.waitForTimeout(300);
    return true;
  }
  if (w === 'place') {
    // sometimes buy a prisoner back first
    const canRansom = await p.evaluate(() => !document.getElementById('btn-ransom').hidden);
    if (canRansom && Math.random() < 0.5) {
      await p.tap('#btn-ransom'); await p.waitForTimeout(250);
      await p.tap('#ask-actions button.red'); await p.waitForTimeout(500); stats.ransom++;
    }
    const pl = await p.evaluate(() => { const c = window.__carc; return c.ui.placements[Math.floor(Math.random() * c.ui.placements.length)]; });
    await tapWorld(p, pl.x, pl.y); await p.waitForTimeout(200);
    await p.tap('#btn-confirm'); await p.waitForTimeout(400);
    const picks = await p.$$('#picker .pick');
    if (picks.length && Math.random() < 0.6) {
      const pick = picks[Math.floor(Math.random() * picks.length)];
      const label = (await pick.textContent()).trim();
      stats.groups[label] = (stats.groups[label] || 0) + 1;
      await pick.tap(); await p.waitForTimeout(200);
    }
    const pos = await p.evaluate(() => {
      const c = window.__carc; const gs = (c.ui.ghosts || []).filter((g) => g.type !== 'capture');
      if (!gs.length || Math.random() < 0.2) return null;
      const g = gs[Math.floor(Math.random() * gs.length)];
      const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
      return c.view.ghostScreenPos(g);
    });
    if (pos) {
      await p.waitForTimeout(80);
      await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(200);
      const cap = await p.evaluate(() => { const c = window.__carc; const g = (c.ui.ghosts || []).find((q) => q.type === 'capture'); return g ? c.view.ghostScreenPos(g) : null; });
      if (cap && Math.random() < 0.8) { await p.touchscreen.tap(cap[0], cap[1]); await p.waitForTimeout(150); stats.capture++; }
    }
    await p.tap('#btn-confirm'); stats.place++;
    await p.waitForTimeout(300);
    return true;
  }
  return false;
}
let n = 0, idle = 0;
const t0 = Date.now();
while (n < MAX && idle < 300) {
  const a = await step(dad);
  const c = await step(sam);
  if (a || c) { n++; idle = 0; } else { idle++; await dad.waitForTimeout(150); }
  if (DROP && (a || c) && n % DROP === 0) {
    const who = (n / DROP) % 2 ? dad : sam;
    await who.evaluate(() => { try { window.__carc.session.net.ws.close(); } catch { /* ignore */ } });
    stats.drops = (stats.drops || 0) + 1;
  }
  const over = await dad.evaluate(() => window.__carc.state.phase === 'over');
  if (over) break;
  if (n % 40 === 39) await sam.screenshot({ path: `${OUT}/sam-${n}.png` });
}
await dad.waitForTimeout(4000);
const snap = (p) => p.evaluate(() => { const s = window.__carc.state; return JSON.stringify({ board: s.board, players: s.players.map((q) => ({ score: q.score, supply: q.supply, prisoners: q.prisoners, floors: q.floors, goods: q.goods })), dragon: s.dragon, fairy: s.fairy, towers: s.towers, seq: s.seq, phase: s.phase, deck: s.deck.length }); });
const [sd, ss] = [await snap(dad), await snap(sam)];
console.log('actions', n, 'idle', idle, 'secs', Math.round((Date.now() - t0) / 1000));
console.log('phase', JSON.parse(sd).phase, 'seq', JSON.parse(sd).seq, JSON.parse(ss).seq, 'deck', JSON.parse(sd).deck);
console.log('identical:', sd === ss);
if (sd !== ss) { fs.writeFileSync(`${OUT}/dad.json`, sd); fs.writeFileSync(`${OUT}/sam.json`, ss); }
console.log('stats', JSON.stringify(stats), 'errors', errors.length);
await dad.screenshot({ path: `${OUT}/dad-final.png` });
await sam.screenshot({ path: `${OUT}/sam-final.png` });
await b.close();
