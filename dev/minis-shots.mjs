// Screenshots of the miniature board at several zoom levels (emulated iPhone 13).
// usage: node dev/minis-shots.mjs [outDir] [baseUrl] [assetFolder|off] [tiles] [expansions,comma]
// e.g.   node dev/minis-shots.mjs /tmp/claude-0/minis-shots http://127.0.0.1:5174/public/ '' 60 river,inns,traders,dragon,tower,bridges,abbot
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2] || '/tmp/claude-0/minis-shots';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
const minis = process.argv[4] || '';
const nTiles = +(process.argv[5] || 60);
const exps = (process.argv[6] || 'river,inns,traders,abbot').split(',').filter(Boolean);
const zooms = (process.env.ZOOMS || '40,90,160,300').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => { console.log('pageerror:', e.message); errors.push(e.message); });
p.on('console', (m) => { if (m.type() === 'error') { console.log('console error:', m.text()); errors.push(m.text()); } });
const url = base + (minis ? `?minis=${encodeURIComponent(minis)}` : '');
await p.goto(url); await p.waitForTimeout(1200);
await p.evaluate(async ({ nTiles, exps }) => {
  const c = window.__carc;
  let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const s = c.G.newGame([{ name: 'A', color: 'red', kind: 'human' }, { name: 'B', color: 'blue', kind: 'human' }], { expansions: Object.fromEntries(exps.map((e) => [e, true])) }, rnd);
  c.startGame(s);
  const st = c.state;
  for (let i = 0; i < nTiles && st.phase !== 'over'; i++) {
    if (st.phase !== 'place') break;
    const vp = c.G.validPlacements(st);
    if (!vp.length) break;
    vp.sort((a, b) => Math.hypot(a.x, a.y * 1.3) - Math.hypot(b.x, b.y * 1.3));
    const pl = vp[Math.floor(rnd() * Math.min(3, vp.length))];
    c.G.placeTile(st, pl.x, pl.y, pl.rots[Math.floor(rnd() * pl.rots.length)]);
    const o = c.G.followerOptions(st);
    c.G.finishTurn(st, o.length && rnd() < 0.3 ? o[Math.floor(rnd() * o.length)] : null);
  }
  c.view.setState(st);
  c.view.setVM({ candidates: null, tentative: null, ghosts: null });
}, { nTiles, exps });
const phase = await p.evaluate(() => window.__carc.state.phase);
console.log('phase', phase, 'tiles', await p.evaluate(() => Object.keys(window.__carc.state.board).length));
// FOCUS=treb|butts|bazaar|monastery|mill|river|princess: centre on a tile showing that
const focus = process.env.FOCUS ? await p.evaluate(async (f) => {
  const { getScene } = await import(new URL('js/minis/scene.js', location.href));
  const c = window.__carc, v = c.view;
  for (const [k, t] of Object.entries(c.state.board)) {
    const sc = getScene(t.t, t.r, v.minis.variant(k));
    const hit = f === 'treb' ? sc.vign.treb : f === 'butts' ? sc.vign.butts : f === 'bazaar' ? sc.marks.bazaar : f === 'monastery' ? sc.marks.monasteryAt : f === 'mill' ? sc.marks.mill : f === 'river' ? sc.rivers.length : f === 'princess' ? sc.cities.some((q) => q.princess) : null;
    if (hit) { const [x, y] = k.split(',').map(Number); return [x, y]; }
  }
  return null;
}, process.env.FOCUS) : null;
if (process.env.FOCUS) console.log('focus', process.env.FOCUS, focus);
for (const z of zooms) {
  await p.evaluate(([z, f]) => { const v = window.__carc.view; v.camTarget = null; v.cam = f ? { x: f[0], y: f[1] - 0.1, z } : { x: 0.3, y: 0.2, z }; v.dirty = true; }, [z, focus]);
  // let the grounds and composites build
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(250);
    const st = await p.evaluate(() => window.__carc.view.minis.stats);
    if (i > 4 && st && st.jobs === 0) break;
  }
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${process.env.FOCUS || 'z'}${process.env.FOCUS ? '-z' : ''}${z}.png` });
  console.log('z', z, JSON.stringify(await p.evaluate(() => window.__carc.view.minis.stats)));
}
console.log('errors', errors.length);
await b.close();
