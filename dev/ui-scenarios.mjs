// Scripted UI checks of the expansion actions on an emulated iPhone.
// usage: node dev/ui-scenarios.mjs [outDir] [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || '/tmp/claude-0/ui-scen';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') { console.log('console:', m.text()); errors.push(m.text()); } });
p.on('pageerror', (e) => { console.log('pageerror:', e.message); errors.push(e.message); });
await p.goto(base); await p.waitForTimeout(1000);
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const tapWorld = async (x, y) => {
  const [sx, sy] = await p.evaluate(([x, y]) => { const v = window.__carc.view; v.cam.x = x; v.cam.y = y; v.camTarget = null; return v.toScreen(x, y); }, [x, y]);
  await p.touchscreen.tap(sx, sy);
};
const tapGhost = async (pred) => {
  const pos = await p.evaluate((src) => {
    const c = window.__carc; const f = new Function('g', `return (${src})(g)`);
    const g = (c.ui.ghosts || []).find(f);
    if (!g) return null;
    const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
    return c.view.ghostScreenPos(g);
  }, pred.toString());
  if (!pos) return false;
  await p.touchscreen.tap(pos[0], pos[1]); await p.waitForTimeout(250);
  return true;
};
const pickGroup = async (label) => {
  const btns = await p.$$('#picker .pick');
  for (const bt of btns) if ((await bt.textContent()).includes(label)) { await bt.tap(); await p.waitForTimeout(250); return true; }
  return false;
};
// build a state: players 0 human, 1-2 bots; board from a list
const setup = async (spec) => p.evaluate((spec) => {
  const c = window.__carc;
  const s = c.G.newGame([{ name: 'Kid', color: 'red', kind: 'human' }, { name: 'Bot A', color: 'blue', kind: 'ai', level: 'medium' }, { name: 'Bot B', color: 'green', kind: 'ai', level: 'medium' }], { expansions: spec.exp });
  s.board = {};
  for (const [x, y, t, r, pieces] of spec.tiles) s.board[`${x},${y}`] = { t, r, pieces: (pieces || []).map(([pp, f, k]) => ({ p: pp, f, k: k || 'meeple' })), n: 1 };
  for (const [x, y, t, r, pieces] of spec.tiles) for (const [pp, f, k] of pieces || []) s.players[pp].supply[k || 'meeple']--;
  s.setAside = []; s.deck = spec.deck || ['U', 'V', 'E', 'B', 'U', 'V', 'E', 'B', 'U', 'V', 'E', 'B'];
  s.drawn = spec.drawn; s.current = 0; s.phase = 'place';
  Object.assign(s, spec.extra || {});
  for (const [i, patch] of Object.entries(spec.players || {})) Object.assign(s.players[i], patch);
  c.startGame(s);
}, spec);
const waitHuman = async (ms = 20000) => p.waitForFunction(() => { const c = window.__carc; const s = c.state; const m = s.phase === 'dragon' ? c.G.dragonMover(s) : s.current; return s.players[m].kind === 'human' && !c.ui.busy; }, null, { timeout: ms });

// ---- 1. dragon flight ----
await setup({
  exp: { dragon: true },
  tiles: [[0, 0, 'D', 0], [1, 0, 'U', 1, [[1, 0]]], [2, 0, 'U', 1], [-1, 0, 'U', 1, [[2, 0]]], [0, 1, 'B', 0], [1, 1, 'B', 0, [[0, 0]]], [-2, 0, 'V', 1]],
  extra: { dragon: '0,1' }, drawn: 'DG/RFr.d',
});
await waitHuman();
await tapWorld(3, 0); await p.waitForTimeout(300);
await p.tap('#btn-confirm'); await p.waitForTimeout(600);
await p.tap('#btn-confirm'); await p.waitForTimeout(900);
let st = await p.evaluate(() => ({ phase: window.__carc.state.phase, moves: window.__carc.G.dragonMoves(window.__carc.state), mover: window.__carc.G.dragonMover(window.__carc.state) }));
check('dragon phase starts after a dragon tile', st.phase === 'dragon', JSON.stringify(st));
await p.screenshot({ path: `${out}/1-dragon-start.png` });
for (let i = 0; i < 12; i++) {
  st = await p.evaluate(() => { const c = window.__carc; const s = c.state; return { phase: s.phase, mover: s.phase === 'dragon' ? c.G.dragonMover(s) : null, busy: c.ui.busy, moves: c.G.dragonMoves(s) }; });
  if (st.phase !== 'dragon') break;
  if (st.mover === 0 && !st.busy && st.moves.length) {
    const [x, y] = st.moves[0].split(',').map(Number);
    await tapWorld(x, y); await p.waitForTimeout(400);
    if (i < 3) await p.screenshot({ path: `${out}/1-dragon-step${i}.png` });
  } else await p.waitForTimeout(400);
}
st = await p.evaluate(() => ({ phase: window.__carc.state.phase, dragon: window.__carc.state.dragon, flight: window.__carc.state.flight, sup: window.__carc.state.players.map((q) => q.supply.meeple) }));
check('dragon flight finishes', st.phase !== 'dragon' && !st.flight, JSON.stringify(st));

// ---- 2. tower floor + capture ----
await setup({
  exp: { tower: true },
  tiles: [[0, 0, 'D', 0, [[1, 0]]], [1, 0, 'U', 1]],
  drawn: 'TO/C',
});
await waitHuman();
await tapWorld(0, 1); await p.waitForTimeout(300);
let rot = await p.evaluate(() => window.__carc.ui.tentative);
for (let i = 0; i < 4 && rot && rot.r !== 2; i++) { await p.tap('#btn-rotate'); await p.waitForTimeout(150); rot = await p.evaluate(() => window.__carc.ui.tentative); }
await p.tap('#btn-confirm'); await p.waitForTimeout(600);
check('tower floor group offered', await pickGroup('Tower floor'));
check('tap tower floor ghost', await tapGhost((g) => g.type === 'floor'));
const capN = await p.evaluate(() => (window.__carc.ui.ghosts || []).filter((g) => g.type === 'capture').length);
check('capture targets shown', capN === 1, `n=${capN}`);
await p.screenshot({ path: `${out}/2-tower-capture.png` });
check('tap capture target', await tapGhost((g) => g.type === 'capture'));
await p.tap('#btn-confirm'); await p.waitForTimeout(1500);
st = await p.evaluate(() => ({ pris: window.__carc.state.players[0].prisoners, towers: window.__carc.state.towers }));
check('captured knight is a prisoner', st.pris.length === 1, JSON.stringify(st));
await p.screenshot({ path: `${out}/2-tower-after.png` });

// ---- 3. ransom ----
await setup({
  exp: { tower: true },
  tiles: [[0, 0, 'D', 0], [1, 0, 'U', 1]],
  drawn: 'U', players: { 0: { score: 10 }, 1: { prisoners: [{ p: 0, k: 'meeple' }] } },
  extra: {},
});
await p.evaluate(() => { const s = window.__carc.state; s.players[0].supply.meeple = 6; s.players[0].breakdown.city = 10; });
await waitHuman();
await p.evaluate(() => window.__carc.startGame(window.__carc.state));
await waitHuman();
const ransomVisible = await p.evaluate(() => !document.getElementById('btn-ransom').hidden);
check('ransom button shown', ransomVisible);
if (ransomVisible) {
  await p.tap('#btn-ransom'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/3-ransom-ask.png` });
  await p.tap('#ask-actions button.red'); await p.waitForTimeout(800);
  st = await p.evaluate(() => ({ score: window.__carc.state.players.map((q) => q.score), sup: window.__carc.state.players[0].supply.meeple, held: window.__carc.state.players[1].prisoners.length }));
  check('ransom paid', st.score[0] === 7 && st.score[1] === 3 && st.sup === 7 && st.held === 0, JSON.stringify(st));
}

// ---- 4. portal ----
await setup({
  exp: { dragon: true },
  tiles: [[0, 0, 'D', 0, [[1, 1]]], [0, -1, 'E', 2]],
  drawn: 'DG/CRr.g',
});
await waitHuman();
await tapWorld(1, 0); await p.waitForTimeout(300);
await p.tap('#btn-confirm'); await p.waitForTimeout(600);
check('portal group offered', await pickGroup('Portal'));
const portalGhosts = await p.evaluate(() => (window.__carc.ui.ghosts || []).map((g) => g.key));
check('portal ghosts on other tiles', portalGhosts.some((k) => k !== '1,0'), JSON.stringify(portalGhosts));
await p.screenshot({ path: `${out}/4-portal.png` });
check('tap portal ghost', await tapGhost((g) => g.key === '0,-1'));
await p.tap('#btn-confirm'); await p.waitForTimeout(1200);
st = await p.evaluate(() => window.__carc.state.board['0,-1'].pieces);
check('portal placed a meeple on another tile', st.length === 1, JSON.stringify(st));

// ---- 5. princess ----
await setup({
  exp: { dragon: true },
  tiles: [[0, 0, 'D', 0, [[1, 0]]]],
  drawn: 'DG/Ccc.p',
});
await waitHuman();
await tapWorld(0, -1); await p.waitForTimeout(300);
rot = await p.evaluate(() => window.__carc.ui.tentative);
for (let i = 0; i < 4 && rot && rot.r !== 2; i++) { await p.tap('#btn-rotate'); await p.waitForTimeout(150); rot = await p.evaluate(() => window.__carc.ui.tentative); }
await p.tap('#btn-confirm'); await p.waitForTimeout(600);
check('princess group offered', await pickGroup('Princess'));
check('tap knight to remove', await tapGhost((g) => g.type === 'princess'));
await p.screenshot({ path: `${out}/5-princess.png` });
await p.tap('#btn-confirm'); await p.waitForTimeout(1500);
st = await p.evaluate(() => ({ pieces: window.__carc.state.board['0,0'].pieces, sup: window.__carc.state.players[1].supply.meeple }));
check('princess removed the knight', st.pieces.length === 0 && st.sup === 7, JSON.stringify(st));

// ---- 6. fairy ----
await setup({
  exp: { dragon: true },
  tiles: [[0, 0, 'D', 0, [[0, 0]]], [1, 0, 'U', 1]],
  drawn: 'B',
});
await waitHuman();
await tapWorld(0, 1); await p.waitForTimeout(300);
await p.tap('#btn-confirm'); await p.waitForTimeout(600);
check('fairy group offered', await pickGroup('Fairy'));
check('tap fairy ghost', await tapGhost((g) => g.type === 'fairy'));
await p.screenshot({ path: `${out}/6-fairy.png` });
await p.tap('#btn-confirm'); await p.waitForTimeout(1200);
st = await p.evaluate(() => window.__carc.state.fairy);
check('fairy assigned', st && st.p === 0 && st.key === '0,0', JSON.stringify(st));
await p.screenshot({ path: `${out}/6-fairy-after.png` });

console.log(results.join('\n'));
console.log('errors:', errors.length);
await b.close();
