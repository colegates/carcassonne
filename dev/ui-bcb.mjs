// Plays a Bridges, Castles & Bazaars game through the real UI (emulated iPhone 13): the
// human seat is driven by this script (tiles, bridges, throwing tiles away, castle
// decisions, bazaar picks, bids and sales) against computer players. Bazaar tiles and
// small-city caps are moved to the top of the pile so they come up early. Saves a
// screenshot of each new kind of moment.
// usage: node dev/ui-bcb.mjs [outDir] [baseUrl] [otherExpansions,comma,list] [turns] [noAuction]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || '/tmp/claude-0/ui-bcb';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
const others = (process.argv[4] || '').split(',').filter(Boolean);
const turns = +(process.argv[5] || 999); // stop after this many of our own turns (the game can't finish then)
const noAuction = process.argv[6] === 'noAuction';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { console.log('console:', m.type(), m.text()); if (m.type() === 'error') errors.push(m.text()); } });
p.on('pageerror', (e) => { console.log('pageerror:', e.message); errors.push(e.message); });
await p.goto(base); await p.waitForTimeout(1200);
let shots = 0;
const seen = new Set();
const shot = async (name) => { if (seen.has(name)) return; seen.add(name); await p.screenshot({ path: `${out}/${String(shots++).padStart(2, '0')}-${name}.png` }); };

// the setup screen with the expansion's parts
await p.tap('#btn-new'); await p.waitForTimeout(300);
const row = p.locator('#exp-list .toggle.exp', { hasText: 'Bridges, Castles' });
if (!(await row.locator('input').isChecked())) await row.locator('.slider').tap();
await p.waitForTimeout(200);
await row.scrollIntoViewIfNeeded();
await shot('setup');
await p.evaluate(() => document.querySelector('[data-back="home"]').click());
await p.waitForTimeout(300);

await p.evaluate(async ({ others, noAuction }) => {
  const c = window.__carc;
  const { TILE_TYPES } = await import(new URL('js/tiles.js', location.href));
  const expansions = Object.fromEntries(['bridges', ...others].map((e) => [e, true]));
  const s = c.G.newGame([
    { name: 'Tester', color: 'red', kind: 'human' },
    { name: 'Bot A', color: 'blue', kind: 'ai', level: 'hard' },
    { name: 'Bot B', color: 'green', kind: 'ai', level: 'medium' },
  ], { expansions, ...(noAuction ? { bcb: { auction: false } } : {}) });
  // bazaars and one-edge city caps first (the pile is drawn from the end)
  const early = (t) => (TILE_TYPES[t].tags || []).includes('bazaar') || t === 'E' || t === 'I' || t === 'H';
  const firstOnes = s.deck.filter(early).slice(0, 12);
  s.deck = s.deck.filter((t) => !firstOnes.includes(t) || firstOnes.splice(firstOnes.indexOf(t), 0) === null);
  const pick = s.deck.filter(early);
  const rest = s.deck.filter((t) => !early(t));
  s.deck = [...rest, ...pick.reverse()];
  c.startGame(s);
}, { others, noAuction });

const tapWorld = async (x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [x, y]);
  await p.touchscreen.tap(sx, sy);
};
const tapSel = async (sel) => { const el = await p.$(sel); if (!el) return false; await el.tap(); return true; };
let myTurns = 0, steps = 0;
const tally = { castleAsk: 0, built: 0, bazaar: 0, discards: 0, bridgeTurns: 0 };
for (let i = 0; i < 6000 && myTurns < turns; i++) {
  const st = await p.evaluate(() => {
    const c = window.__carc, s = c.state;
    if (!s) return { phase: 'none' };
    const seat = c.G.actingSeat(s) ?? s.current;
    return { phase: s.phase, human: s.players[seat].kind === 'human', busy: !!c.ui.busy, stage: s.bazaar?.stage || null, round: !!s.bazaar && s.phase !== 'bazaar', castles: (s.castles || []).length, canDiscard: c.G.canDiscard(s) };
  });
  if (st.phase === 'over') break;
  if (st.round) await shot('bazaar-round');
  if (st.castles) await shot('castle-on-board');
  if (!st.human || st.busy) { await p.waitForTimeout(250); continue; }
  steps++;
  if (st.phase === 'dragon') {
    const k = await p.evaluate(() => { const c = window.__carc; const m = c.G.dragonMoves(c.state); const k = m[Math.floor(Math.random() * m.length)]; const [x, y] = k.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null; return [x, y]; });
    await tapWorld(k[0], k[1]); await p.waitForTimeout(400);
    continue;
  }
  if (st.phase === 'castle') {
    tally.castleAsk++;
    await p.waitForTimeout(300);
    await shot('castle-decision');
    const build = Math.random() < 0.75;
    if (build) tally.built++;
    if (!(await tapSel(build ? '#castle-build' : '#castle-points'))) { console.log('no castle buttons!'); errors.push('castle buttons missing'); await p.waitForTimeout(500); }
    await p.waitForTimeout(400);
    continue;
  }
  if (st.phase === 'bazaar') {
    tally.bazaar++;
    await p.waitForTimeout(200);
    await shot(`bazaar-${st.stage}`);
    if (st.stage === 'pick' || st.stage === 'take') {
      const cards = await p.$$('#bazaar .bz-card.can');
      if (!cards.length) { console.log('no cards to pick!'); errors.push('no bazaar cards'); await p.waitForTimeout(500); continue; }
      await cards[Math.floor(Math.random() * cards.length)].tap(); await p.waitForTimeout(200);
      if (st.stage === 'pick') {
        const ups = Math.floor(Math.random() * 4);
        for (let k = 0; k < ups; k++) { await tapSel('#bazaar [data-bz="plus"]'); await p.waitForTimeout(60); }
        await shot('bazaar-pick-chosen');
        if (!(await tapSel('#bazaar [data-bz="pick"]'))) { errors.push('no pick button'); }
      }
    } else if (st.stage === 'bid') {
      if (Math.random() < 0.5) await tapSel('#bazaar [data-bz="pass"]');
      else {
        const ups = Math.floor(Math.random() * 3);
        for (let k = 0; k < ups; k++) { await tapSel('#bazaar [data-bz="plus"]'); await p.waitForTimeout(60); }
        await tapSel('#bazaar [data-bz="raise"]');
      }
    } else if (st.stage === 'decide') {
      await tapSel(Math.random() < 0.5 ? '#bazaar [data-bz="buy"]' : '#bazaar [data-bz="sell"]');
    }
    await p.waitForTimeout(400);
    continue;
  }
  if (st.phase === 'place') {
    if (st.canDiscard) {
      await shot('bridge-only-tile');
      if (Math.random() < 0.5) {
        await tapSel('#btn-discard'); await p.waitForTimeout(300);
        await shot('discard-ask');
        const btn = p.locator('#ask-actions button', { hasText: 'Throw it away' });
        if (await btn.count()) { await btn.tap(); tally.discards++; }
        await p.waitForTimeout(600);
        continue;
      }
    }
    myTurns++;
    const pl = await p.evaluate(() => {
      const c = window.__carc;
      const list = c.ui.placements;
      const withBridge = list.filter((q) => q.needsBridge);
      const pl = withBridge.length && Math.random() < 0.4 ? withBridge[Math.floor(Math.random() * withBridge.length)] : list[Math.floor(Math.random() * list.length)];
      c.view.cam.x = pl.x; c.view.cam.y = pl.y; c.view.camTarget = null;
      const r = pl.needsBridge ? +Object.keys(pl.needsBridge)[0] : pl.rots[0];
      return { x: pl.x, y: pl.y, r, rots: pl.rots, bridge: !!pl.needsBridge?.[r] };
    });
    await tapWorld(pl.x, pl.y); await p.waitForTimeout(250);
    // turn it until it shows the rotation we want
    for (let k = 0; k < 4; k++) {
      const r = await p.evaluate(() => window.__carc.ui.tentative?.r);
      if (r === pl.r || r === undefined) break;
      await tapSel('#btn-rotate'); await p.waitForTimeout(150);
    }
    const tent = await p.evaluate(() => window.__carc.ui.tentative);
    if (tent?.bridge) { tally.bridgeTurns++; await shot('bridge-needed'); }
    await p.tap('#btn-confirm'); await p.waitForTimeout(500);
    const picks = await p.$$('#picker .pick');
    if (picks.length && Math.random() < 0.6) {
      const pick = picks[Math.floor(Math.random() * picks.length)];
      const label = await pick.textContent();
      await pick.tap(); await p.waitForTimeout(250);
      if (label.includes('Bridge')) await shot('bridge-choice');
    }
    const ghost = await p.evaluate(() => {
      const c = window.__carc; const gs = (c.ui.ghosts || []).filter((g) => g.type !== 'capture');
      if (!gs.length || Math.random() < 0.15) return null;
      const g = gs[Math.floor(Math.random() * gs.length)];
      const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
      return { key: g.key, fi: g.fi, type: g.type };
    });
    if (ghost) {
      await p.waitForTimeout(100);
      const pos = await p.evaluate((g) => window.__carc.view.ghostScreenPos(window.__carc.ui.ghosts.find((q) => q.key === g.key && q.fi === g.fi && q.type === g.type)), ghost);
      await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(250);
      const cap = await p.evaluate(() => { const c = window.__carc; const cs = (c.ui.ghosts || []).filter((g) => g.type === 'capture'); return cs.length ? c.view.ghostScreenPos(cs[0]) : null; });
      if (cap) { await p.touchscreen.tap(cap[0], cap[1]); await p.waitForTimeout(200); }
    }
    await p.tap('#btn-confirm'); await p.waitForTimeout(600);
    continue;
  }
  if (st.phase === 'action') {
    // resumed mid-turn: just finish
    await tapSel('#btn-confirm'); await p.waitForTimeout(400);
    continue;
  }
  await p.waitForTimeout(250);
}
// let the bots finish and skip the final scoring
for (let i = 0; i < 600; i++) {
  const ph = await p.evaluate(() => window.__carc.state.phase);
  if (ph === 'over') break;
  await p.waitForTimeout(250);
}
await p.waitForTimeout(1500);
await p.touchscreen.tap(195, 420);
await p.waitForSelector('#scores-modal:not([hidden])', { timeout: 90000 }).catch(() => errors.push('no final scores'));
await p.waitForTimeout(600);
await shot('final-scores');
const summary = await p.evaluate(() => { const s = window.__carc.state; return { phase: s.phase, turn: s.turn, tiles: Object.keys(s.board).length, scores: s.players.map((q) => q.score), castles: (s.castles || []).length, bridges: Object.values(s.board).filter((t) => t.bridge !== undefined && t.bridge !== null).length, breakdown: s.players.map((q) => q.breakdown) }; });
console.log(JSON.stringify(summary));
console.log('myTurns', myTurns, 'tally', JSON.stringify(tally), 'errors', errors.length, [...seen].join(' | '));
await b.close();
