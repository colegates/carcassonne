// Screenshots of a hand-made miniature board: any tiles at any positions and rotations, so seams,
// walls and expansion tiles can be checked up close (no game rules involved).
// usage: node dev/minis-board.mjs <outDir> <spec> [baseUrl]
//   spec: a preset name (seams | walls | cities | expansions) or JSON:
//         { tiles: [[x, y, 'TYPE', r], ...], shots: [{ name, x, y, z, w?, h? }] }
//   env:  T=<seconds> fixes the animation clock (default: live); DPR=<n> device pixel ratio
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const out = process.argv[2] || '/tmp/claude-0/minis-shots2/board';
const specArg = process.argv[3] || 'seams';
const base = process.argv[4] || 'http://127.0.0.1:5174/public/';
fs.mkdirSync(out, { recursive: true });

function preset(name) {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const tiles = [];
  const shots = [];
  if (name === 'seams') {
    // meadow-heavy tiles in every rotation; roads, rivers and cities crossing edges
    const pool = ['B', 'B', 'A', 'V', 'U', 'W', 'B', 'E', 'K', 'J', 'X', 'BA/RrG', 'DG/F.v'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) tiles.push([x, y, pool[Math.floor(rnd() * pool.length)], Math.floor(rnd() * 4)]);
    shots.push({ name: 'seams-mid', x: 1.5, y: 1.5, z: 170 }, { name: 'seams-close', x: 1.5, y: 1.5, z: 420 }, { name: 'seams-close2', x: 2.5, y: 0.5, z: 420 }, { name: 'seams-far', x: 1.5, y: 1.5, z: 80 });
  } else if (name === 'walls') {
    // cities joined across edges and corners, at all rotations
    const pool = ['N', 'R', 'E', 'H', 'I', 'F', 'G', 'P', 'M', 'C', 'Q', 'J'];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) tiles.push([x, y, pool[(x + 3 * y) % pool.length], Math.floor(rnd() * 4)]);
    shots.push({ name: 'walls-mid', x: 1, y: 1, z: 200 }, { name: 'walls-close', x: 1, y: 1, z: 450 }, { name: 'walls-close2', x: 0.5, y: 0.5, z: 450 }, { name: 'walls-close3', x: 1.5, y: 1.5, z: 450 });
  } else if (name === 'walls2' || name === 'meadows' || name === 'rivers' || name === 'mixed') {
    // edge-matched boards (filled in the page with the game's own edge rules)
    const pools = {
      walls2: ['N', 'R', 'E', 'H', 'I', 'F', 'G', 'P', 'M', 'C', 'Q', 'J', 'K', 'L', 'D', 'O', 'T'],
      meadows: ['B', 'A', 'V', 'U', 'W', 'B', 'E', 'K', 'J', 'X', 'DG/F.v', 'V', 'U'],
      rivers: ['RI.1/II', 'RI.1/IIG', 'RI.1/IFI', 'RI.1/RIrI', 'RI.1/LIRI', 'RI.1/CICI', 'RI.1/CIRI', 'RI.1/RrII', 'RI.1/CcII', 'B', 'V', 'U', 'E', 'A', 'W', 'K', 'J', 'D'],
      mixed: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'IC/CCC', 'IC/LRFR', 'TB/CcR.cG', 'DG/C.v', 'TO/RRG', 'BB/CFR.b', 'BA/RrG'],
    };
    return { gen: { w: 4, h: 4, pool: pools[name], seed: +(process.env.SEED || 3) }, tiles: [], shots: [{ name: `${name}-mid`, x: 1.5, y: 1.5, z: 200 }, { name: `${name}-close`, x: 1.5, y: 1.5, z: 450 }, { name: `${name}-close2`, x: 1, y: 1, z: 450 }, { name: `${name}-close3`, x: 2, y: 2, z: 450 }] };
  } else if (name === 'cities') {
    // one big walled town over four tiles
    tiles.push([0, 0, 'R', 1], [1, 0, 'R', 2], [0, 1, 'R', 0], [1, 1, 'R', 3]);
    shots.push({ name: 'city-mid', x: 0.5, y: 0.5, z: 220 }, { name: 'city-close', x: 0.5, y: 0.5, z: 480 });
  }
  return { tiles, shots };
}
const spec = specArg.startsWith('{') ? JSON.parse(specArg) : preset(specArg);

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: +(process.env.W || 900), height: +(process.env.H || 900) }, deviceScaleFactor: +(process.env.DPR || 2) });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => { console.log('pageerror:', e.message); errors.push(e.message); });
p.on('console', (m) => { if (m.type() === 'error') { console.log('console error:', m.text()); errors.push(m.text()); } });
await p.goto(base); await p.waitForTimeout(1200);
await p.evaluate(({ tiles, T, gen }) => {
  const c = window.__carc;
  if (gen) {
    // fill a w x h grid with pool tiles whose edges match the neighbours already placed
    let s = gen.seed * 9973 + 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const board = {};
    for (let y = 0; y < gen.h; y++) for (let x = 0; x < gen.w; x++) {
      const tries = [];
      for (const t of gen.pool) for (let r = 0; r < 4; r++) tries.push([t, r, rnd()]);
      tries.sort((a, b) => a[2] - b[2]);
      for (const [t, r] of tries) {
        const tile = { t, r };
        const ok = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]].every(([dx, dy, side]) => { const nb = board[`${x + dx},${y + dy}`]; return !nb || c.G.edgeType(tile, side) === c.G.edgeType(nb, (side + 2) % 4); });
        if (ok) { board[`${x},${y}`] = tile; tiles.push([x, y, t, r]); break; }
      }
    }
  }
  const s = c.G.newGame([{ name: 'A', color: 'red', kind: 'human' }, { name: 'B', color: 'blue', kind: 'human' }], { expansions: { river: true, inns: true, traders: true, abbot: true, dragon: true, tower: true, bridges: true } }, Math.random);
  c.startGame(s);
  const st = c.state;
  st.board = {};
  let n = 0;
  for (const [x, y, t, r] of tiles) st.board[`${x},${y}`] = { t, r, pieces: [], n: n++ };
  st.drawn = null; st.phase = 'over';
  c.view.setState(st);
  c.view.setVM({ candidates: null, tentative: null, ghosts: null });
  // hide the interface chrome so the board is unobstructed
  for (const el of document.querySelectorAll('body > *:not(canvas)')) if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
  if (T) { const now = performance.now.bind(performance); window.__fixT = T; }
}, { tiles: spec.tiles, T: process.env.T ? +process.env.T : 0, gen: spec.gen || null });
for (const s of spec.shots) {
  await p.evaluate((s) => { const v = window.__carc.view; v.camTarget = null; v.cam = { x: s.x, y: s.y, z: s.z }; v.dirty = true; }, s);
  for (let i = 0; i < 80; i++) {
    await p.waitForTimeout(250);
    await p.evaluate((s) => { const v = window.__carc.view; v.camTarget = null; v.cam = { x: s.x, y: s.y, z: s.z }; v.dirty = true; }, s);
    const st = await p.evaluate(() => window.__carc.view.minis.stats);
    if (i > 4 && st && st.jobs === 0) break;
  }
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${s.name}.png` });
  console.log(s.name, JSON.stringify(await p.evaluate(() => window.__carc.view.minis.stats)));
}
console.log('errors', errors.length);
await b.close();
