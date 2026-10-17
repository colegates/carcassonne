import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import * as G from '../public/js/game.js';
const BASE = 'http://127.0.0.1:8787';
const b = await chromium.launch();
async function phone(name) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(name, 'pageerror:', e.message, e.stack.split('\n').slice(0,4).join(' | ')));
  p.on('websocket', (ws) => {
    ws.on('framesent', (f) => { if (/"action"|"start"/.test(f.payload)) console.log(name, 'SENT', String(f.payload).slice(0, 160)); });
    ws.on('framereceived', (f) => { if (/"type":"(action|resync|started)"/.test(f.payload)) console.log(name, 'RECV', String(f.payload).slice(0, 120)); });
  });
  await p.goto(BASE); await p.waitForTimeout(600);
  return p;
}
const dad = await phone('dad'), sam = await phone('sam');
await dad.tap('#btn-new'); await dad.tap('#mode-seg button[data-mode="online"]'); await dad.fill('#me-name', 'Dad'); await dad.tap('#btn-start');
await dad.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector('#lobby-code')?.textContent || ''));
const code = await dad.textContent('#lobby-code');
await dad.waitForTimeout(500); await dad.tap('#lobby-add-bot');
await sam.tap('#btn-join-home'); await sam.fill('#join-code', code); await sam.fill('#join-name', 'Sam'); await sam.tap('#btn-join');
await sam.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 3);
await dad.waitForTimeout(400); await dad.tap('#lobby-start');
await Promise.all([dad, sam].map((p) => p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'))));
const snap = (p) => p.evaluate(() => ({ seq: window.__carc.state.seq, drawn: window.__carc.state.drawn, cur: window.__carc.state.current, phase: window.__carc.state.phase, busy: window.__carc.ui.busy, keys: Object.entries(window.__carc.state.board).map(([k,t])=>k+':'+t.t+t.r).join(' '), deckTail: window.__carc.state.deck.slice(-4).join('') }));
for (let i = 0; i < 6; i++) {
  await dad.waitForTimeout(2500);
  console.log('dad', JSON.stringify(await snap(dad)));
  console.log('sam', JSON.stringify(await snap(sam)));
  for (const p of [dad, sam]) {
    const mine = await p.evaluate(() => { const c = window.__carc; const s = c.state; return s.phase === 'place' && !c.ui.busy && s.players[s.current].owner === c.session.net.id; });
    if (!mine) continue;
    const pl = await p.evaluate(() => { const c = window.__carc; const pl = c.ui.placements[0]; c.view.cam.x = pl.x; c.view.cam.y = pl.y; c.view.camTarget = null; return pl; });
    const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [pl.x, pl.y]);
    await p.touchscreen.tap(sx, sy); await p.waitForTimeout(250);
    await p.tap('#btn-confirm'); await p.waitForTimeout(400);
    await p.tap('#btn-confirm');
    console.log('played by', p === dad ? 'dad' : 'sam', JSON.stringify(pl));
  }
}
// server log
const log = await new Promise((resolve) => {
  const ws = new WebSocket(`ws://127.0.0.1:8787/api/rooms/${code}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', clientId: 'spectator-x', name: 'spec' }));
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'welcome') { resolve(m); ws.close(); } };
});
console.log('server actions', JSON.stringify(log.actions));
const s = G.cloneState(log.init);
for (const a of log.actions) { try { G.applyAction(s, a); } catch (e) { console.log('replay error', e.message, JSON.stringify(a)); break; } }
console.log('replayed', Object.entries(s.board).map(([k,t])=>k+':'+t.t+t.r).join(' '), 'seq', s.seq, 'initDrawn', log.init.drawn, 'initTail', log.init.deck.slice(-4).join(''));
await b.close();
