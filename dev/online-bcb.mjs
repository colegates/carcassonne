// Two phones + a bot play an online game with Bridges, Castles & Bazaars (plus any other
// expansions) through the local wrangler dev server. Bazaar tiles and small-city caps are
// moved to the top of the pile so auctions and castle decisions happen early; each phone
// acts only when the decision is its own (castle owner, bidder, chooser). Checks that the
// bazaar sheet shows controls only on the deciding phone and that both phones end with
// identical states.
// usage: node dev/online-bcb.mjs [base] [outDir] [maxSteps] [otherExpansions] [noAuction]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '/tmp/claude-0/online-bcb';
const MAX = +(process.argv[4] || 600);
const OTHERS = (process.argv[5] || '').split(',').filter(Boolean);
const NO_AUCTION = process.argv[6] === 'noAuction';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const errors = [];
const problems = [];
async function phone(name) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log(name, 'pageerror:', e.message); errors.push(`${name}: ${e.message}`); });
  p.on('console', (m) => { if (m.type() === 'error') { console.log(name, 'console:', m.text()); errors.push(`${name}: ${m.text()}`); } });
  await p.goto(BASE, { timeout: 120000 }); await p.waitForTimeout(800);
  p.label = name;
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
const ids = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower', 'bridges'];
for (const id of ['bridges', ...OTHERS]) {
  const rows = await dad.$$('#lobby-exp label.toggle');
  const row = rows[ids.indexOf(id)];
  if (!(await row.$eval('input', (i) => i.checked))) { await row.tap(); await dad.waitForTimeout(400); }
}
if (NO_AUCTION) {
  const btn = dad.locator('#lobby-exp .exp-part', { hasText: 'Bidding' });
  await btn.tap(); await dad.waitForTimeout(400);
}
await dad.tap('#lobby-add-bot');
await sam.tap('#btn-join-home');
await sam.fill('#join-code', code);
await sam.fill('#join-name', 'Sam');
await sam.tap('#btn-join');
await sam.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 3, null, { timeout: 10000 });
await sam.waitForTimeout(600);
await sam.screenshot({ path: `${OUT}/0-sam-lobby.png` });
// bazaars and small-city caps first: rewrite the pile in the host's start message
await dad.evaluate(async () => {
  const { TILE_TYPES } = await import('/js/tiles.js');
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'start' && m.init) {
        const early = (t) => (TILE_TYPES[t].tags || []).includes('bazaar') || t === 'E' || t === 'H' || t === 'I';
        const pick = m.init.deck.filter(early);
        m.init.deck = [...m.init.deck.filter((t) => !early(t)), ...pick];
        data = JSON.stringify(m);
      }
    } catch { /* not JSON */ }
    return orig.call(this, data);
  };
});
await dad.tap('#lobby-start');
await Promise.all([dad, sam].map((p) => p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 15000 })));
console.log('started with', JSON.stringify(await dad.evaluate(() => [window.__carc.state.options.expansions, window.__carc.state.options.bcb])));

async function whatToDo(p) {
  return p.evaluate(() => {
    const c = window.__carc; const s = c.state, ui = c.ui;
    if (!s) return { w: 'none' };
    if (s.phase === 'over') return { w: 'over' };
    if (ui.busy) return { w: 'busy' };
    const me = c.session.net.id;
    const seat = c.G.actingSeat(s);
    const sheet = document.getElementById('bazaar');
    const controls = !!sheet.querySelector('.bz-ctrl');
    if (s.players[seat].owner !== me) return { w: 'wait', phase: s.phase, controls, stage: s.bazaar?.stage };
    return { w: s.phase, stage: s.bazaar?.stage, controls, canDiscard: c.G.canDiscard(s) };
  });
}
const tapWorld = async (p, x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => { const v = window.__carc.view; v.cam.x = x; v.cam.y = y; v.camTarget = null; return v.toScreen(x, y); }, [x, y]);
  await p.touchscreen.tap(sx, sy);
};
const tapSel = async (p, sel) => { const el = await p.$(sel); if (!el) return false; await el.tap(); return true; };
const stats = { place: 0, bridges: 0, discard: 0, castle: 0, build: 0, pick: 0, bid: 0, pass: 0, decide: 0, take: 0, dragon: 0 };
const seen = new Set();
const shot = async (p, name) => { if (seen.has(name)) return; seen.add(name); await p.screenshot({ path: `${OUT}/${seen.size}-${p.label}-${name}.png` }); };
async function step(p, other) {
  const st = await whatToDo(p);
  if (st.w === 'wait' && st.phase === 'bazaar' && st.controls) problems.push(`${p.label} shows bazaar controls while waiting`);
  if (st.w === 'dragon') {
    const k = await p.evaluate(() => { const c = window.__carc; const m = c.G.dragonMoves(c.state); return m[Math.floor(Math.random() * m.length)]; });
    const [x, y] = k.split(',').map(Number);
    await tapWorld(p, x, y); stats.dragon++;
    await p.waitForTimeout(300);
    return true;
  }
  if (st.w === 'castle') {
    await shot(p, 'castle');
    await shot(other, 'castle-waiting');
    const build = Math.random() < 0.7;
    if (!(await tapSel(p, build ? '#castle-build' : '#castle-points'))) { problems.push(`${p.label}: castle buttons missing`); return false; }
    stats.castle++; if (build) stats.build++;
    await p.waitForTimeout(300);
    return true;
  }
  if (st.w === 'bazaar') {
    if (!st.controls && st.stage !== 'take' && st.stage !== 'pick') problems.push(`${p.label}: no bazaar controls on the deciding phone (${st.stage})`);
    await shot(p, `bazaar-${st.stage}`);
    await shot(other, `bazaar-${st.stage}-watching`);
    if (st.stage === 'pick' || st.stage === 'take') {
      const cards = await p.$$('#bazaar .bz-card.can');
      if (!cards.length) { problems.push(`${p.label}: no bazaar cards to pick`); return false; }
      await cards[Math.floor(Math.random() * cards.length)].tap(); await p.waitForTimeout(150);
      if (st.stage === 'pick') {
        const ups = Math.floor(Math.random() * 3);
        for (let k = 0; k < ups; k++) { await tapSel(p, '#bazaar [data-bz="plus"]'); await p.waitForTimeout(50); }
        if (!(await tapSel(p, '#bazaar [data-bz="pick"]'))) { problems.push(`${p.label}: no pick button`); return false; }
        stats.pick++;
      } else stats.take++;
    } else if (st.stage === 'bid') {
      if (Math.random() < 0.5) { await tapSel(p, '#bazaar [data-bz="pass"]'); stats.pass++; } else { await tapSel(p, '#bazaar [data-bz="raise"]'); stats.bid++; }
    } else if (st.stage === 'decide') {
      await tapSel(p, Math.random() < 0.5 ? '#bazaar [data-bz="buy"]' : '#bazaar [data-bz="sell"]'); stats.decide++;
    }
    await p.waitForTimeout(300);
    return true;
  }
  if (st.w === 'place') {
    if (st.canDiscard && Math.random() < 0.4) {
      await tapSel(p, '#btn-discard'); await p.waitForTimeout(250);
      const btn = p.locator('#ask-actions button', { hasText: 'Throw it away' });
      if (await btn.count()) { await btn.tap(); stats.discard++; }
      await p.waitForTimeout(400);
      return true;
    }
    const pl = await p.evaluate(() => {
      const c = window.__carc; const list = c.ui.placements;
      const wb = list.filter((q) => q.needsBridge);
      const pl = wb.length && Math.random() < 0.35 ? wb[Math.floor(Math.random() * wb.length)] : list[Math.floor(Math.random() * list.length)];
      return { x: pl.x, y: pl.y, r: pl.needsBridge ? +Object.keys(pl.needsBridge)[0] : pl.rots[0] };
    });
    await tapWorld(p, pl.x, pl.y); await p.waitForTimeout(200);
    for (let k = 0; k < 4; k++) {
      const r = await p.evaluate(() => window.__carc.ui.tentative?.r);
      if (r === pl.r || r === undefined) break;
      await tapSel(p, '#btn-rotate'); await p.waitForTimeout(120);
    }
    if (await p.evaluate(() => !!window.__carc.ui.tentative?.bridge)) stats.bridges++;
    await p.tap('#btn-confirm'); await p.waitForTimeout(350);
    // a follower sometimes
    const ghost = await p.evaluate(() => {
      const c = window.__carc; const gs = (c.ui.ghosts || []).filter((g) => g.type === 'follower' || g.type === 'bridge');
      if (!gs.length || Math.random() < 0.4) return null;
      const g = gs[Math.floor(Math.random() * gs.length)];
      const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
      return { key: g.key, fi: g.fi, type: g.type };
    });
    if (ghost) {
      await p.waitForTimeout(80);
      const pos = await p.evaluate((g) => window.__carc.view.ghostScreenPos(window.__carc.ui.ghosts.find((q) => q.key === g.key && q.fi === g.fi && q.type === g.type)), ghost);
      if (pos) { await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(200); }
    }
    await p.tap('#btn-confirm'); stats.place++;
    await p.waitForTimeout(400);
    return true;
  }
  return false;
}
let steps = 0, idle = 0;
while (steps < MAX) {
  const [a, c] = await Promise.all([whatToDo(dad), whatToDo(sam)]);
  if (a.w === 'over' && c.w === 'over') break;
  const did = (await step(dad, sam)) || (await step(sam, dad));
  if (did) { steps++; idle = 0; } else { idle++; await dad.waitForTimeout(250); }
  if (idle > 400) { problems.push('stuck: nobody can move for 100 s'); break; }
}
await dad.waitForTimeout(3000);
const snap = (p) => p.evaluate(() => {
  const s = window.__carc.state;
  return JSON.stringify({ board: s.board, players: s.players.map((q) => [q.score, q.supply, q.bridges, q.castles, q.breakdown]), castles: s.castles, bazaar: s.bazaar, seq: s.seq, deck: s.deck, phase: s.phase });
});
const [s1, s2] = await Promise.all([snap(dad), snap(sam)]);
await dad.screenshot({ path: `${OUT}/z-dad-end.png` });
await sam.screenshot({ path: `${OUT}/z-sam-end.png` });
const info = await dad.evaluate(() => { const s = window.__carc.state; return { phase: s.phase, seq: s.seq, scores: s.players.map((q) => q.score), castles: s.castles.length }; });
console.log(JSON.stringify(info), 'steps', steps, JSON.stringify(stats));
console.log(s1 === s2 ? 'SAME STATE on both phones' : 'STATES DIFFER');
if (s1 !== s2) problems.push('states differ');
console.log('problems', problems.length, problems.slice(0, 10));
console.log('errors', errors.length, errors.slice(0, 10));
await b.close();
