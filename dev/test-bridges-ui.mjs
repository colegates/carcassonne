// Bridges in the real UI (emulated iPhone 13): needed bridges (translucent bridge, dock text, 🌉 badge),
// the "🌉 Bridge" picker group (build, move, take back an optional bridge), a meeple on a new bridge,
// throwing a bridge-only tile away (toast, dock button, confirmation), the hint on such a tile, a computer
// player throwing a tile away, the bazaar card's "fits nowhere" flag, and bridges at several zoom levels.
// Each scenario starts its own hand-made game through window.__carc.startGame.
// usage: node dev/test-bridges-ui.mjs [outDir] [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const out = process.argv[2] || '/tmp/claude-0/test-bridges';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
let page;
let errors = [];

const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); return `${out}/${name}.png`; };
const wait = (ms) => page.waitForTimeout(ms);
const evalc = (fn, arg) => page.evaluate(fn, arg);

async function fresh() {
  if (page) await page.context().close();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  page = await ctx.newPage();
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await wait(900);
}

// Start a game from a hand-made spec (see the scenarios below).
async function start(spec) {
  await fresh();
  await evalc((spec) => {
    const c = window.__carc;
    const s = c.G.newGame(spec.players, { expansions: spec.exps, ...(spec.bcb ? { bcb: spec.bcb } : {}), hints: true }, () => 0.5);
    s.board = {};
    spec.board.forEach(([k, t, r, extra], i) => { s.board[k] = { t, r, pieces: [], n: i, ...(extra || {}) }; });
    s.placed = spec.board.length; s.drawn = spec.drawn; s.phase = 'place'; s.current = spec.current || 0;
    s.setAside = []; s.discarded = []; s.deck = spec.deck.slice(); delete s.river;
    for (const [k, p, f, kind = 'meeple'] of spec.pieces || []) { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; }
    for (const [p, n] of Object.entries(spec.bridges || {})) s.players[p].bridges = n;
    for (const a of spec.actions || []) c.G.applyAction(s, a);
    c.startGame(s);
  }, spec);
  await wait(1200);
}

const look = (x, y, z = 90) => evalc(([x, y, z]) => { const v = window.__carc.view; v.cam = { x, y, z }; v.camTarget = null; v.dirty = true; }, [x, y, z]);
async function tapWorld(x, y) {
  const [sx, sy] = await evalc(([x, y]) => window.__carc.view.toScreen(x, y), [x, y]);
  await page.touchscreen.tap(sx, sy);
}
async function tapGhost(pred) {
  const pos = await evalc((src) => {
    const c = window.__carc; const f = new Function('g', `return (${src})(g)`);
    const g = (c.ui.ghosts || []).find((q) => f(q));
    return g ? c.view.ghostScreenPos(g) : null;
  }, pred.toString());
  if (!pos) return false;
  await page.touchscreen.tap(pos[0], pos[1]);
  return true;
}
const dock = () => evalc(() => ({
  instruction: document.getElementById('instruction')?.innerText || '',
  extra: document.getElementById('dock-extra')?.hidden ? '' : document.getElementById('dock-extra')?.innerText || '',
  picks: [...document.querySelectorAll('#picker .pick')].map((b) => b.innerText.trim()),
  toast: document.querySelector('#toast-layer .toast')?.textContent || '',
}));
// every toast text shown during ms milliseconds, in order
async function toasts(ms, every = 80) {
  const seen = [];
  for (let t = 0; t < ms; t += every) {
    const txt = await evalc(() => document.querySelector('#toast-layer .toast')?.textContent || '');
    if (txt && seen[seen.length - 1] !== txt) seen.push(txt);
    await wait(every);
  }
  return seen;
}
async function pick(label) {
  const btns = await page.$$('#picker .pick');
  for (const b of btns) if ((await b.innerText()).includes(label)) { await b.tap(); await wait(250); return true; }
  return false;
}
const ST = () => evalc(() => { const s = window.__carc.state; return { phase: s.phase, current: s.current, drawn: s.drawn, bridges: s.players.map((p) => p.bridges), discarded: s.discarded.slice(), board: Object.fromEntries(Object.entries(s.board).map(([k, t]) => [k, { t: t.t, r: t.r, bridge: t.bridge, pieces: t.pieces }])) }; });
const ghosts = () => evalc(() => (window.__carc.ui.ghosts || []).map((g) => ({ key: g.key, fi: g.fi, type: g.type, label: g.label, selected: g.selected, axis: g.axis })));
const HUMAN = { name: 'Tester', color: 'red', kind: 'human' };
const BOT = (level = 'hard', name = 'Bot') => ({ name, color: 'blue', kind: 'ai', level });

async function scenario(name, fn) {
  const r = { name, ok: true, notes: [] };
  try { await fn(r); } catch (e) { r.ok = false; r.notes.push('EXCEPTION ' + e.message); }
  r.pageErrors = errors.slice();
  results.push(r);
  console.log(JSON.stringify(r, null, 1));
}

// 1. A tile that needs a bridge: 🌉 badges, translucent bridge, dock text, then a meeple on the new bridge.
await scenario('needed bridge on the new tile + meeple on it', async (r) => {
  await start({ players: [HUMAN, { ...BOT(), kind: 'human', name: 'Friend' }], exps: { bridges: true }, board: [['0,0', 'D', 0]], drawn: 'B', deck: Array(10).fill('U') });
  await look(0, 0.3, 90); await wait(400);
  const cands = await evalc(() => window.__carc.view.vm.candidates);
  r.notes.push('candidates ' + JSON.stringify(cands));
  r.shots = [await shot('01-needs-bridge-candidates')];
  await tapWorld(1, 0); await wait(500);
  const tent = await evalc(() => window.__carc.ui.tentative);
  r.notes.push('tentative ' + JSON.stringify(tent));
  r.dock1 = await dock();
  r.shots.push(await shot('02-needs-bridge-tentative'));
  await page.tap('#btn-confirm'); await wait(700);
  r.ghosts = await ghosts();
  r.dock2 = await dock();
  r.shots.push(await shot('03-needs-bridge-ghost-on-bridge'));
  const bf = await evalc(() => window.__carc.G.bridgeFeature(window.__carc.state.board['1,0']));
  const ok = await tapGhost(`(g) => g.key === '1,0' && g.fi === ${bf}`);
  r.notes.push('tapped bridge ghost: ' + ok);
  await wait(400);
  r.shots.push(await shot('04-needs-bridge-ghost-selected'));
  await page.tap('#btn-confirm'); await wait(1500);
  const st = await ST();
  r.after = { bridges: st.bridges, tile: st.board['1,0'] };
  r.ok = r.ok && st.board['1,0'].bridge === 1 && st.board['1,0'].pieces.some((pc) => pc.f === bf) && st.bridges[0] === 2;
  await look(0.5, 0, 140); await wait(400);
  r.shots.push(await shot('05-meeple-on-bridge'));
});

// 2. A tile whose road needs a bridge on the tile next door.
await scenario('needed bridge on the neighbour', async (r) => {
  await start({ players: [HUMAN, { ...BOT(), kind: 'human', name: 'Friend' }], exps: { bridges: true }, board: [['0,0', 'B', 0]], drawn: 'U', deck: Array(10).fill('U') });
  await look(0.5, 0, 110); await wait(300);
  await tapWorld(1, 0); await wait(400);
  for (let i = 0; i < 4; i++) {
    const t = await evalc(() => window.__carc.ui.tentative);
    if (t?.bridge && t.bridge.key === '0,0') break;
    await page.tap('#btn-rotate'); await wait(300);
  }
  r.tentative = await evalc(() => window.__carc.ui.tentative);
  r.dock = await dock();
  r.shots = [await shot('06-needs-bridge-next-door')];
  await page.tap('#btn-confirm'); await wait(700);
  r.ghosts = await ghosts();
  r.dock2 = await dock();
  r.shots.push(await shot('07-next-door-bridge-built'));
  r.ok = r.ok && r.tentative?.bridge?.key === '0,0' && !r.ghosts.some((g) => g.key === '0,0');
});

// 3. The "🌉 Bridge" group for an optional bridge: build on the new tile, meeple ghost on it, move it next door, take it back.
await scenario('optional bridge picker: build, meeple ghost, move, take back', async (r) => {
  await start({ players: [HUMAN, { ...BOT(), kind: 'human', name: 'Friend' }], exps: { bridges: true }, board: [['0,0', 'B', 0]], drawn: 'B', deck: Array(10).fill('U') });
  await look(0.5, 0, 110); await wait(300);
  await tapWorld(1, 0); await wait(400);
  await page.tap('#btn-confirm'); await wait(700);
  r.picks = (await dock()).picks;
  r.shots = [await shot('08-optional-picker')];
  const okPick = await pick('Bridge');
  r.notes.push('bridge group: ' + okPick);
  r.bridgeGhosts = await ghosts();
  r.dockBridge = await dock();
  r.shots.push(await shot('09-optional-bridge-ghosts'));
  await tapGhost("(g) => g.type === 'bridge' && g.key === '1,0'"); await wait(500);
  r.afterBuild = { st: (await ST()).board['1,0'], toast: (await dock()).toast, bridges: (await ST()).bridges };
  r.shots.push(await shot('10-optional-bridge-built'));
  await pick('Meeple');
  r.meepleGhosts = await ghosts();
  r.shots.push(await shot('11-optional-bridge-meeple-ghost'));
  await pick('Bridge');
  await tapGhost("(g) => g.type === 'bridge' && g.key === '0,0'"); await wait(500);
  const st2 = await ST();
  r.afterMove = { newTile: st2.board['1,0'].bridge, next: st2.board['0,0'].bridge, bridges: st2.bridges };
  r.shots.push(await shot('12-optional-bridge-moved'));
  await tapGhost("(g) => g.type === 'bridge' && g.key === '0,0'"); await wait(500);
  const st3 = await ST();
  r.afterBack = { newTile: st3.board['1,0'].bridge, next: st3.board['0,0'].bridge, bridges: st3.bridges };
  r.shots.push(await shot('13-optional-bridge-taken-back'));
  r.ok = r.ok && r.picks.some((p) => p.includes('Bridge')) && r.afterBuild.st.bridge === 0 && r.afterMove.next === 0 && r.afterMove.newTile === undefined
    && r.afterBack.next === undefined && r.afterBack.bridges[0] === 3;
});

// 4. Throwing a bridge-only tile away: toast, dock button, confirmation, and what is said afterwards.
await scenario('throw a bridge-only tile away (human)', async (r) => {
  await start({ players: [HUMAN, { ...BOT(), kind: 'human', name: 'Friend' }], exps: { bridges: true }, board: [['0,0', 'X', 0]], drawn: 'B', deck: [...Array(8).fill('U'), 'U'] });
  r.toastAtStart = (await dock()).toast;
  r.dock = await dock();
  r.shots = [await shot('14-bridge-only-tile')];
  await page.tap('#btn-discard'); await wait(400);
  r.ask = await evalc(() => ({ title: document.getElementById('ask-title').innerText, body: document.getElementById('ask-body').innerText, buttons: [...document.querySelectorAll('#ask-actions button')].map((b) => b.innerText) }));
  r.shots.push(await shot('15-throw-away-confirm'));
  // "Keep it" first: nothing happens
  await page.locator('#ask-actions button', { hasText: 'Keep it' }).tap(); await wait(300);
  r.afterKeep = (await ST()).drawn;
  await page.tap('#btn-discard'); await wait(400);
  await page.locator('#ask-actions button', { hasText: 'Throw it away' }).tap();
  r.toastsAfter = await toasts(3200);
  const st = await ST();
  r.after = { drawn: st.drawn, discarded: st.discarded, current: st.current, phase: st.phase };
  r.shots.push(await shot('16-after-throw-away'));
  r.ok = r.ok && r.afterKeep === 'B' && st.drawn === 'U' && st.discarded.includes('B');
  const misleading = r.toastsAfter.find((t) => t.startsWith('Fits nowhere'));
  if (misleading) r.notes.push(`MISLEADING toast after a voluntary throw-away: "${misleading}"`);
  // the score sheet line about thrown-out tiles
  await page.tap('#players .pchip'); await wait(500);
  r.scoresLine = await evalc(() => [...document.querySelectorAll('#scores-modal p')].map((p) => p.innerText).find((t) => t.includes('tiles left')) || '');
  r.shots.push(await shot('17-scores-thrown-out-line'));
});

// 5. The 💡 hint on a bridge-only tile that the hard evaluator would throw away.
await scenario('hint on a bridge-only tile', async (r) => {
  await start({ players: [HUMAN, { ...BOT(), kind: 'human', name: 'Friend' }], exps: { bridges: true }, bcb: { bazaars: false }, board: [['0,0', 'X', 0]], drawn: 'BB/F.b', deck: Array(8).fill('U'),
    pieces: [['0,0', 1, 0], ['0,0', 1, 1], ['0,0', 1, 2], ['0,0', 1, 3]] });
  const hintVisible = await evalc(() => { const b = document.getElementById('btn-hint'); return !!b && !b.hidden && b.offsetParent !== null; });
  r.notes.push('hint button visible: ' + hintVisible);
  const suggestion = await evalc(async () => { const AI = await import(new URL('js/ai.js', location.href)); return AI.suggestMove(window.__carc.G.cloneState(window.__carc.state)); });
  r.notes.push('suggestMove → ' + JSON.stringify(suggestion && (suggestion.discard ? suggestion : { x: suggestion.x, y: suggestion.y, r: suggestion.r })));
  const before = errors.length;
  await page.tap('#btn-hint'); await wait(800);
  r.hintErrors = errors.slice(before);
  r.dock = await dock();
  r.tentative = await evalc(() => window.__carc.ui.tentative);
  r.shots = [await shot('18-hint-on-bridge-only-tile')];
  r.ok = r.hintErrors.length === 0;
});

// 6. A computer player throws a bridge-only tile away.
await scenario('computer player throws a tile away', async (r) => {
  await start({ players: [HUMAN, BOT('hard', 'Bot')], current: 1, exps: { bridges: true }, bcb: { bazaars: false }, board: [['0,0', 'X', 0]], drawn: 'BB/F.b', deck: [...Array(8).fill('E'), 'U'],
    pieces: [['0,0', 0, 0], ['0,0', 0, 1], ['0,0', 0, 2], ['0,0', 0, 3]] });
  r.toasts = await toasts(5000);
  const st = await ST();
  r.after = { discarded: st.discarded, current: st.current, drawn: st.drawn, phase: st.phase };
  r.shots = [await shot('19-bot-after-throw-away')];
  r.ok = r.ok && st.discarded.includes('BB/F.b');
  const misleading = r.toasts.find((t) => t.startsWith('Fits nowhere'));
  if (misleading) r.notes.push(`MISLEADING toast after the bot threw a tile away: "${misleading}"`);
});

// 7. The bazaar card flag "fits nowhere now" for a revealed tile that only fits with a bridge.
await scenario('bazaar card flag with bridges', async (r) => {
  await start({ players: [HUMAN, { name: 'Friend', color: 'blue', kind: 'human' }], exps: { bridges: true }, board: [['-1,0', 'X', 0], ['0,0', 'X', 0], ['1,0', 'X', 0]], drawn: 'BB/RFR.b', deck: ['U', 'B'],
    bridges: { 0: 0 }, actions: [{ t: 'turn', x: 0, y: 1, r: 0, act: null }] });
  const info = await evalc(() => { const c = window.__carc, s = c.state; return { phase: s.phase, tiles: s.bazaar?.tiles.map((x) => x.t), host: s.bazaar?.host, chooser: s.bazaar?.chooser, bridges: s.players.map((p) => p.bridges),
    forChooser: (() => { const t = c.G.cloneState(s); t.current = s.bazaar.chooser; return s.bazaar.tiles.map((x) => c.G.validPlacements(t, x.t).length); })() }; });
  r.info = info;
  r.cards = await evalc(() => [...document.querySelectorAll('#bazaar .bz-card')].map((c) => c.innerText.trim()));
  r.shots = [await shot('20-bazaar-fits-nowhere-flag')];
  const flagged = r.cards.findIndex((t) => t.includes('fits nowhere'));
  if (flagged >= 0 && info.forChooser[flagged] > 0) { r.ok = false; r.notes.push(`card ${flagged} (${info.tiles[flagged]}) says "fits nowhere" but the chooser (seat ${info.chooser}, ${info.bridges[info.chooser]} bridges) can place it with a bridge`); }
});

// 8. Bridges on the map at several zoom levels (over a city with a knight, over a monastery with a monk,
//    a meeple on a bridge, a bridge next to a road, two bridges in a row).
await scenario('bridges at several zoom levels', async (r) => {
  await start({ players: [HUMAN, { name: 'Friend', color: 'blue', kind: 'human' }], exps: { bridges: true }, drawn: 'U', deck: Array(10).fill('U'),
    // a legal board: a road from A (-2,0) over the bridge across F's city, along D, over two bridges in a row to A (3,0);
    // a monk under the second bridge, a knight in F's city under the first, a meeple on the bridge at 1,0, and a
    // bridge at 2,1 running parallel to its neighbour (both ends on empty squares)
    board: [['0,0', 'D', 0], ['1,0', 'B', 0, { bridge: 1 }], ['2,0', 'B', 0, { bridge: 1 }], ['3,0', 'A', 1],
      ['-1,0', 'F', 1, { bridge: 1 }], ['-1,-1', 'E', 2], ['-1,1', 'E', 0], ['-2,0', 'A', 3], ['2,1', 'B', 0, { bridge: 1 }]],
    pieces: [['1,0', 0, 2], ['2,0', 1, 0], ['-1,0', 1, 0]] });
  r.shots = [];
  for (const z of [24, 34, 50, 90, 160, 260]) {
    await look(0.5, 0.2, z); await wait(350);
    r.shots.push(await shot(`21-zoom-${z}`));
  }
  r.pieces = (await ST()).board;
});

await browser.close();
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
console.log('SUMMARY', results.map((r) => `${r.ok ? 'ok ' : 'BAD'} ${r.name}${r.pageErrors.length ? ` (page errors: ${r.pageErrors.length})` : ''}`).join('\n'));
