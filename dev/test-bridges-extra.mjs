// Bridges in the real UI, part 2 (emulated iPhone 13): screenshots of what is said right after a bridge-only
// tile is thrown away (by a person and by a computer player), and throwing away a bought bridge-only tile
// in a bazaar round (strip + dock + toast together).
// usage: node dev/test-bridges-extra.mjs [outDir] [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const out = process.argv[2] || '/tmp/claude-0/test-bridges';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let page, errors = [];
const results = [];
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); return `${out}/${name}.png`; };
const toastText = () => page.evaluate(() => document.querySelector('#toast-layer .toast')?.textContent || '');

async function start(spec) {
  if (page) await page.context().close();
  page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base); await wait(900);
  await page.evaluate((spec) => {
    const c = window.__carc;
    const s = c.G.newGame(spec.players, { expansions: { bridges: true }, ...(spec.bcb ? { bcb: spec.bcb } : {}), hints: true }, () => 0.5);
    s.board = {};
    spec.board.forEach(([k, t, r, extra], i) => { s.board[k] = { t, r, pieces: [], n: i, ...(extra || {}) }; });
    s.placed = spec.board.length; s.drawn = spec.drawn; s.phase = 'place'; s.current = spec.current || 0;
    s.setAside = []; s.discarded = []; s.deck = spec.deck.slice(); delete s.river;
    for (const [k, p, f, kind = 'meeple'] of spec.pieces || []) { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; }
    for (const a of spec.actions || []) c.G.applyAction(s, a);
    c.startGame(s);
  }, spec);
  await wait(1200);
}
// wait (up to ms) for a toast starting with prefix and take a screenshot while it shows
async function shotWhenToast(prefix, name, ms = 4000) {
  for (let t = 0; t < ms; t += 50) {
    const txt = await toastText();
    if (txt.startsWith(prefix)) { const f = await shot(name); return { txt, f }; }
    await wait(50);
  }
  return null;
}
const HUMAN = { name: 'Tester', color: 'red', kind: 'human' };
const FRIEND = { name: 'Friend', color: 'blue', kind: 'human' };

// A. a person throws a bridge-only tile away: what does the screen say afterwards?
{
  await start({ players: [HUMAN, FRIEND], board: [['0,0', 'X', 0]], drawn: 'B', deck: Array(9).fill('U') });
  await page.tap('#btn-discard'); await wait(300);
  await page.locator('#ask-actions button', { hasText: 'Throw it away' }).tap();
  const first = await shotWhenToast('🗑', '22-human-throw-toast-1');
  const second = await shotWhenToast('Fits nowhere', '23-human-throw-toast-2-misleading');
  results.push({ name: 'human throw-away toasts', first: first?.txt, second: second?.txt, errors: errors.slice() });
}

// B. a computer player throws a bridge-only tile away while the person watches
{
  await start({ players: [HUMAN, { name: 'Bot', color: 'blue', kind: 'ai', level: 'hard' }], current: 1, bcb: { bazaars: false }, board: [['0,0', 'X', 0]], drawn: 'BB/F.b',
    deck: [...Array(8).fill('E'), 'U'], pieces: [['0,0', 0, 0], ['0,0', 0, 1], ['0,0', 0, 2], ['0,0', 0, 3]] });
  const first = await shotWhenToast('🗑', '24-bot-throw-toast-1', 6000);
  const second = await shotWhenToast('Fits nowhere', '25-bot-throw-toast-2-misleading');
  const st = await page.evaluate(() => ({ discarded: window.__carc.state.discarded }));
  results.push({ name: 'bot throw-away toasts', first: first?.txt, second: second?.txt, discarded: st.discarded, errors: errors.slice() });
}

// C. a bought tile that only fits with a bridge, in the bazaar round: strip, toast, dock button, confirmation
{
  await start({ players: [HUMAN, FRIEND], current: 1, board: [['-1,0', 'X', 0], ['0,0', 'X', 0], ['1,0', 'X', 0]], drawn: 'BB/RFR.b', deck: ['U', 'B'],
    actions: [{ t: 'turn', x: 0, y: 1, r: 0, act: null }, { t: 'bazaar', pick: 0, bid: 0 }, { t: 'bazaar', pass: true }] });
  await wait(600);
  const info = await page.evaluate(() => { const c = window.__carc, s = c.state; return { phase: s.phase, current: s.current, drawn: s.drawn, canDiscard: c.G.canDiscard(s), bazaar: !!s.bazaar,
    strip: document.getElementById('bazaar')?.innerText || '', extra: document.getElementById('dock-extra')?.innerText || '', instruction: document.getElementById('instruction')?.innerText || '' }; });
  const f1 = await shot('26-bazaar-round-bridge-only');
  const toastAtStart = await toastText();
  let ask = null;
  if (await page.$('#btn-discard')) {
    await page.tap('#btn-discard'); await wait(300);
    ask = await page.evaluate(() => document.getElementById('ask-body').innerText);
    await shot('27-bazaar-round-throw-confirm');
    await page.locator('#ask-actions button', { hasText: 'Throw it away' }).tap();
  }
  const seen = [];
  for (let t = 0; t < 4000; t += 80) { const x = await toastText(); if (x && seen[seen.length - 1] !== x) seen.push(x); await wait(80); }
  const after = await page.evaluate(() => { const s = window.__carc.state; return { phase: s.phase, current: s.current, drawn: s.drawn, discarded: s.discarded, bazaar: !!s.bazaar }; });
  await shot('28-bazaar-round-after-throw');
  results.push({ name: 'bazaar round: throw a bought bridge-only tile away', info, toastAtStart, ask, toastsAfter: seen, after, shots: [f1], errors: errors.slice() });
}

// D. tapping the ghost of a monastery / city that a bridge crosses: which option gets selected?
async function tapGhostAndRead(fi, key) {
  const pos = await page.evaluate(([fi, key]) => { const c = window.__carc; const g = (c.ui.ghosts || []).find((q) => q.type === 'follower' && q.key === key && q.fi === fi); return g ? c.view.ghostScreenPos(g) : null; }, [fi, key]);
  if (!pos) return { pos: null };
  await page.touchscreen.tap(pos[0], pos[1]); await wait(350);
  const sel = await page.evaluate(() => { const s = window.__carc.ui.selected; return s ? { key: s.key, fi: s.fi, k: s.k } : null; });
  return { pos, sel };
}
{
  // monastery crossed by the bridge it needs (B east of D)
  await start({ players: [HUMAN, FRIEND], board: [['0,0', 'D', 0]], drawn: 'B', deck: Array(9).fill('U') });
  await page.evaluate(() => { const v = window.__carc.view; v.cam = { x: 1, y: 0, z: 120 }; v.camTarget = null; v.dirty = true; });
  await wait(300);
  const [sx, sy] = await page.evaluate(() => window.__carc.view.toScreen(1, 0));
  await page.touchscreen.tap(sx, sy); await wait(400);
  await page.tap('#btn-confirm'); await wait(800);
  await page.evaluate(() => { const v = window.__carc.view; v.cam = { x: 1, y: 0, z: 120 }; v.camTarget = null; v.dirty = true; });
  await wait(300);
  const mon = await tapGhostAndRead(0, '1,0');
  await shot('29-tap-monastery-ghost-under-bridge');
  // a city band crossed by an optional bridge (F between two caps), built through the 🌉 Bridge group
  await start({ players: [HUMAN, FRIEND], board: [['-1,0', 'E', 1], ['1,0', 'E', 3]], drawn: 'F', deck: Array(9).fill('U') });
  await page.evaluate(() => { const v = window.__carc.view; v.cam = { x: 0, y: 0, z: 120 }; v.camTarget = null; v.dirty = true; });
  await wait(300);
  const [cx, cy] = await page.evaluate(() => window.__carc.view.toScreen(0, 0));
  await page.touchscreen.tap(cx, cy); await wait(400);
  for (let i = 0; i < 4; i++) { const r = await page.evaluate(() => window.__carc.ui.tentative?.r); if (r === 0) break; await page.tap('#btn-rotate'); await wait(250); }
  await page.tap('#btn-confirm'); await wait(800);
  const picks = await page.$$('#picker .pick');
  for (const b of picks) if ((await b.innerText()).includes('Bridge')) { await b.tap(); await wait(300); break; }
  const okBridge = await page.evaluate(() => { const c = window.__carc; const g = (c.ui.ghosts || []).find((q) => q.type === 'bridge' && q.key === '0,0'); return g ? c.view.ghostScreenPos(g) : null; });
  if (okBridge) { await page.touchscreen.tap(okBridge[0], okBridge[1]); await wait(500); }
  for (const b of await page.$$('#picker .pick')) if ((await b.innerText()).includes('Meeple')) { await b.tap(); await wait(300); break; }
  await page.evaluate(() => { const v = window.__carc.view; v.cam = { x: 0, y: 0, z: 120 }; v.camTarget = null; v.dirty = true; });
  await wait(300);
  const bridgeAxis = await page.evaluate(() => window.__carc.state.board['0,0'].bridge);
  const city = await tapGhostAndRead(0, '0,0');
  await shot('30-tap-city-ghost-under-bridge');
  const bfs = await page.evaluate(() => ({ mon: 2, city: window.__carc.G.bridgeFeature(window.__carc.state.board['0,0']) }));
  results.push({ name: 'tap the ghost of a feature a bridge crosses', monastery: mon, cityBridgeAxis: bridgeAxis, city, bridgeFeatures: bfs, errors: errors.slice() });
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
