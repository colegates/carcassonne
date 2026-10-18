// Frame rate of the miniature board under 4x CPU throttling (emulated iPhone 13): pans the
// camera every frame at a few zoom levels and reports draws per second, the slowest frames,
// long tasks and the canvas cache size.
// usage: node dev/minis-perf.mjs [baseUrl] [assetFolder|off] [tiles] [zooms]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://127.0.0.1:5174/public/';
const minis = process.argv[3] || '';
const nTiles = +(process.argv[4] || 60);
const zooms = (process.argv[5] || '60,90,200').split(',').map(Number);
const rate = +(process.env.THROTTLE || 4);
const flags = process.env.FLAGS === undefined ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-accelerated-2d-canvas'] : process.env.FLAGS.split(' ').filter(Boolean);
const b = await chromium.launch({ args: flags, channel: process.env.CHANNEL || undefined });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(base + (minis ? `?minis=${encodeURIComponent(minis)}` : '')); await p.waitForTimeout(1500);
await p.evaluate(async ({ nTiles }) => {
  const c = window.__carc;
  let seed = 777; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const s = c.G.newGame([{ name: 'A', color: 'red', kind: 'human' }, { name: 'B', color: 'blue', kind: 'human' }], { expansions: { river: true, inns: true, traders: true, abbot: true } }, rnd);
  c.startGame(s);
  const st = c.state;
  for (let i = 0; i < nTiles && st.phase === 'place'; i++) {
    const vp = c.G.validPlacements(st); if (!vp.length) break;
    vp.sort((a, b) => Math.hypot(a.x, a.y * 1.3) - Math.hypot(b.x, b.y * 1.3));
    const pl = vp[Math.floor(rnd() * Math.min(3, vp.length))];
    c.G.placeTile(st, pl.x, pl.y, pl.rots[Math.floor(rnd() * pl.rots.length)]);
    const o = c.G.followerOptions(st);
    c.G.finishTurn(st, o.length && rnd() < 0.3 ? o[Math.floor(rnd() * o.length)] : null);
  }
  c.view.setState(st);
  c.view.setVM({ candidates: null, tentative: null, ghosts: null });
  // count draws and long tasks
  const v = c.view;
  const orig = v.draw.bind(v);
  window.__perf = { draws: 0, frames: [], long: [] };
  v.draw = (now) => { const t0 = performance.now(); orig(now); window.__perf.draws++; window.__perf.frames.push(performance.now() - t0); };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false });
}, { nTiles });
const cdp = await ctx.newCDPSession(p);
if (process.env.PROFILE) {
  await cdp.send('Profiler.enable');
  await p.exposeFunction('__profile', async (start) => {
    if (start) { await cdp.send('Profiler.start'); return; }
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const dt = profile.timeDeltas; const total = dt.reduce((a, b) => a + b, 0);
    profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + dt[i]); });
    console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / total * 100).toFixed(1)}% ${k}`).join('\n'));
  });
}
for (const z of zooms) {
  // warm up: let caches build unthrottled at this zoom while panning over the board
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.evaluate((z) => { const v = window.__carc.view; v.camTarget = null; v.cam = { x: 0, y: 0, z }; v.dirty = true; }, z);
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(200); const j = await p.evaluate(() => window.__carc.view.minis.stats?.jobs ?? 0); if (i > 5 && !j) break; }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const res = await p.evaluate(async (z) => {
    const v = window.__carc.view;
    const P = window.__perf; P.draws = 0; P.frames = []; P.long = [];
    let raf = 0; const t0 = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        raf++;
        const t = (now - t0) / 1000;
        v.cam.x = Math.sin(t * 0.6) * 1.2; v.cam.y = Math.cos(t * 0.45) * 0.8; v.dirty = true;
        if (now - t0 < 5000) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const secs = (performance.now() - t0) / 1000;
    const f = P.frames.slice().sort((a, b) => a - b);
    return { z, fps: +(P.draws / secs).toFixed(1), raf: +(raf / secs).toFixed(1), medianMs: +f[f.length >> 1]?.toFixed(1), p95Ms: +f[Math.floor(f.length * 0.95)]?.toFixed(1), maxMs: +f[f.length - 1]?.toFixed(1), long: P.long, stats: v.minis.stats };
  }, z);
  console.log(JSON.stringify(res));
  // the renderer's own main-thread cost, with a canvas that draws nothing (a GPU-backed
  // canvas, as on a phone, takes the pixels off the main thread)
  const js = await p.evaluate(async (z) => {
    const v = window.__carc.view;
    const real = v.ctx;
    const noop = new Proxy(real, { get(t, k) { const val = t[k]; if (typeof val === 'function') return k === 'createPattern' || k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'measureText' || k === 'getTransform' ? val.bind(t) : () => {}; return val; }, set() { return true; } });
    v.ctx = noop; v.minis.paused = true;
    const times = [];
    if (window.__profile) await window.__profile(true);
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) {
      const t = i / 30;
      v.cam.x = Math.sin(t * 0.6) * 1.2; v.cam.y = Math.cos(t * 0.45) * 0.8;
      const a = performance.now(); v.draw(t0 + i * 33); times.push(performance.now() - a);
    }
    if (window.__profile) await window.__profile(false);
    v.ctx = real; v.minis.paused = false; v.dirty = true;
    times.sort((a, b) => a - b);
    return { z, jsMedianMs: +times[30].toFixed(1), jsP95Ms: +times[57].toFixed(1), jsMaxMs: +times[59].toFixed(1) };
  }, z);
  console.log('  js-only', JSON.stringify(js));
  // idle animation (no panning): actors only, capped at 30 fps
  const idle = await p.evaluate(async () => {
    const P = window.__perf; P.draws = 0; P.frames = [];
    await new Promise((r) => setTimeout(r, 3000));
    const f = P.frames.slice().sort((a, b) => a - b);
    return { idleFps: +(P.draws / 3).toFixed(1), medianMs: +f[f.length >> 1]?.toFixed(1) };
  });
  console.log('  idle', JSON.stringify(idle));
}
await b.close();
