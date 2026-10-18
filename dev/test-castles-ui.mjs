// Castle UI checks on an emulated iPhone 13 (Bridges, Castles & Bazaars, MASTER H.4): the castle
// decision in the dock, the highlighted small city and its six area squares, the castle on its shared
// edge with the castellan, the scoring animation, final scoring with a waiting castle, the fairy by a
// castellan, the score table's castle column, pass-and-play with a non-active owner, a computer player
// deciding, and a reload in the middle of a decision. Prints PASS/FAIL lines and saves screenshots.
// usage: node dev/test-castles-ui.mjs [outDir] [baseUrl]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const OUT = process.argv[2] || '/tmp/claude-0/test-castles';
const BASE = process.argv[3] || 'http://127.0.0.1:5174/public/';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
async function newPage() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  await p.goto(BASE);
  await p.waitForTimeout(900);
  return p;
}
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` });

// Start a game from a hand-made state. spec: { players, exps, board: [[k, t, r]], pieces: [[k, p, f, kind]],
// steps: [{ drawn, current, action }] (engine actions applied before the UI starts), drawn, current, deck, fairy }
async function start(p, spec) {
  await p.evaluate((spec) => {
    const c = window.__carc;
    const s = c.G.newGame(spec.players, { expansions: spec.exps, ...(spec.bcb ? { bcb: spec.bcb } : {}) });
    s.board = {}; s.towers = {}; s.setAside = []; s.discarded = [];
    spec.board.forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
    s.placed = spec.board.length;
    for (const [k, pl, f, kind = 'meeple'] of spec.pieces || []) { s.board[k].pieces.push({ p: pl, f, k: kind }); s.players[pl].supply[kind]--; }
    s.deck = Array(30).fill('B');
    for (const st of spec.steps || []) {
      if (st.action.t === 'turn') { s.drawn = st.drawn; s.current = st.current; s.phase = 'place'; s.part = 1; s.bonus = false; }
      c.G.applyAction(s, st.action);
      if (st.after) for (const [k, pl, f, kind = 'meeple'] of st.after) { s.board[k].pieces.push({ p: pl, f, k: kind }); s.players[pl].supply[kind]--; }
    }
    if (spec.fairy) s.fairy = spec.fairy;
    s.deck = spec.deck.slice();
    if (!spec.keepPhase) { s.drawn = spec.drawn; s.current = spec.current || 0; s.phase = 'place'; s.part = 1; s.bonus = false; }
    s.turn = 5;
    c.startGame(s);
  }, spec);
  await p.waitForTimeout(700);
}
const until = (p, fn, arg, timeout = 15000) => p.waitForFunction(fn, arg, { timeout, polling: 40 });
const idleFor = (p, seat, phase = 'place') => until(p, ([seat, phase]) => { const c = window.__carc; return c.state.phase === phase && c.G.actingSeat(c.state) === seat && !c.ui.busy; }, [seat, phase]);
async function tapWorld(p, x, y) {
  await p.evaluate(([x, y]) => { const c = window.__carc; c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null; c.view.dirty = true; }, [x, y]);
  await p.waitForTimeout(100);
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [x, y]);
  await p.touchscreen.tap(sx, sy);
}
// place the drawn tile at (x, y) turned r, then finish without a figure
async function place(p, x, y, r) {
  await tapWorld(p, x, y);
  await p.waitForTimeout(300);
  for (let k = 0; k < 4; k++) {
    const cur = await p.evaluate(() => window.__carc.ui.tentative?.r);
    if (cur === r) break;
    await p.tap('#btn-rotate'); await p.waitForTimeout(200);
  }
  const t = await p.evaluate(() => window.__carc.ui.tentative);
  if (!t || t.x !== x || t.y !== y || t.r !== r) throw new Error(`could not set the tile at ${x},${y} r${r}: ${JSON.stringify(t)}`);
  await p.tap('#btn-confirm'); await p.waitForTimeout(500);
  await p.tap('#btn-confirm');
}
const dock = (p) => p.evaluate(() => ({
  name: document.getElementById('turn-name').textContent,
  instruction: document.getElementById('instruction').textContent,
  extraHidden: document.getElementById('dock-extra').hidden,
  build: document.getElementById('castle-build')?.textContent || null,
  points: document.getElementById('castle-points')?.textContent || null,
  note: document.querySelector('#dock-extra .dock-note')?.textContent || null,
}));
// is an element's text cut off (overflowing its box)?
const clipped = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => ({ sel, text: el.textContent.trim().slice(0, 60), over: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 })).filter((x) => x.over), sel);
// are the castle area squares fully on screen, between the top bar and the dock?
const areaOnScreen = (p) => p.evaluate(() => {
  const c = window.__carc, v = c.view;
  const area = v.vm.castleArea || [];
  const top = document.getElementById('topbar').getBoundingClientRect().bottom;
  const dockTop = document.getElementById('dock').getBoundingClientRect().top;
  const z = v.cam.z;
  return area.map((k) => { const [x, y] = k.split(',').map(Number); const [sx, sy] = v.toScreen(x, y); return { k, ok: sy - z / 2 >= top - 1 && sy + z / 2 <= dockTop + 1 && sx - z / 2 >= -1 && sx + z / 2 <= v.w + 1 }; });
});
// record the board effects and chip classes while an animation runs, until cond holds or time is up
async function watch(p, ms) {
  return p.evaluate((ms) => new Promise((res) => {
    const c = window.__carc, seen = [], t0 = performance.now();
    const tick = () => {
      for (const e of c.view.effects) if (!seen.some((x) => x.ref === e)) seen.push({ ref: e, type: e.type, text: e.text, sub: e.sub, color: e.color, nodes: e.nodes?.length, kind: e.kind, at: Math.round(performance.now() - t0) });
      const chips = [...document.getElementById('players').children].map((ch) => ch.classList.contains('bump'));
      if (chips.some(Boolean)) seen.push({ type: 'chipBump', chips, at: Math.round(performance.now() - t0) });
      if (performance.now() - t0 > ms) res(seen.map(({ ref, ...rest }) => rest)); else requestAnimationFrame(tick);
    };
    tick();
  }), ms);
}

const RED_BLUE = [{ name: 'Red', color: 'red', kind: 'human' }, { name: 'Blue', color: 'blue', kind: 'human' }];

// ---------------------------------------------------------------------------------------------
// 1. Red closes his own small city: the decision in the dock; build; the castle on its edge;
//    Blue then finishes a road in the area: the castle scores (2 humans, pass-and-play).
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true },
    board: [['0,0', 'E', 2], ['1,-1', 'A', 0], ['1,0', 'U', 0], ['-1,0', 'B', 0]],
    pieces: [['0,0', 0, 0], ['-1,0', 1, 0]], // Red's knight on the cap; Blue's monk on the monastery west of it
    drawn: 'E', deck: Array(10).fill('B').concat(['A']),
  });
  await idleFor(p, 0);
  await place(p, 0, 1, 0);
  await idleFor(p, 0, 'castle');
  await p.waitForTimeout(900); // the camera frames the area
  const d = await dock(p);
  check('1 decision: build and points buttons in the dock', d.build?.includes('Build a castle') && d.build.includes('3 left') && d.points === 'Take 4 points', JSON.stringify({ build: d.build, points: d.points }));
  check('1 decision: instruction explains the castle', /castle/i.test(d.instruction), d.instruction);
  check('1 decision: "In reach" lists the unfinished road', /In reach: .*2-tile road/.test(d.note || ''), d.note);
  check('1 decision: "In reach" lists the occupied monastery in the area (BC23: occupied or not)', /monastery/.test(d.note || ''), d.note);
  const vm = await p.evaluate(() => { const v = window.__carc.view.vm; return { hl: v.highlight?.nodes?.map(([k, f]) => `${k}#${f}`).sort(), color: v.highlight?.color, area: (v.castleArea || []).slice().sort() }; });
  check('1 decision: small city highlighted in gold', JSON.stringify(vm.hl) === JSON.stringify(['0,0#0', '0,1#0']) && vm.color === '#ffd84a', JSON.stringify(vm));
  check('1 decision: the 6 area squares outlined', JSON.stringify(vm.area) === JSON.stringify(['-1,0', '-1,1', '0,0', '0,1', '1,0', '1,1']));
  const onScr = await areaOnScreen(p);
  check('1 decision: all 6 area squares visible between top bar and dock', onScr.length === 6 && onScr.every((x) => x.ok), JSON.stringify(onScr.filter((x) => !x.ok)));
  const cut = await clipped(p, '#dock-extra button, #dock-extra .dock-note, #instruction');
  check('1 decision: no clipped text in the dock', !cut.length, JSON.stringify(cut));
  const btns = await p.evaluate(() => ({ rotate: document.getElementById('btn-rotate').disabled, confirm: document.getElementById('btn-confirm').disabled, hint: document.getElementById('btn-hint').hidden }));
  check('1 decision: rotate/confirm disabled, hint hidden', btns.rotate && btns.confirm && btns.hint, JSON.stringify(btns));
  await shot(p, '01-decision-dock');
  await p.tap('#castle-build');
  await p.waitForTimeout(700);
  await shot(p, '02-castle-built-anim');
  await idleFor(p, 1);
  await p.waitForTimeout(300);
  const geo = await p.evaluate(() => {
    const c = window.__carc, v = c.view, cs = c.state.castles[0];
    const [mx, my] = v.toScreen(0, 0.5);
    const [bx, by] = v.castleBase(cs); const [tx, ty] = v.castleTop(cs);
    return { k: cs.k, key: cs.key, mid: [mx, my], base: [bx, by], top: [tx, ty], z: v.cam.z, pieces: c.state.board['0,0'].pieces.length };
  });
  check('1 built: castle drawn at the middle of the shared edge', Math.abs(geo.base[0] - geo.mid[0]) < 1 && Math.abs(geo.base[1] - geo.mid[1]) < geo.z * 0.2, JSON.stringify(geo));
  check('1 built: castellan on top of the castle, not on the tile', geo.k === 'meeple' && geo.pieces === 0 && geo.top[1] < geo.base[1]);
  await p.evaluate(() => { const c = window.__carc; c.view.animateCam({ x: 0, y: 0.5, z: 150 }); });
  await p.waitForTimeout(700);
  await shot(p, '03-castle-with-castellan');
  // Blue finishes the road (1,-1)-(1,0)-(1,1): the castle scores 3
  await place(p, 1, 1, 2);
  const watching = watch(p, 4200);
  for (let i = 0; i < 80; i++) {
    const up = await p.evaluate(() => window.__carc.view.effects.some((e) => e.type === 'float' && /Castle/.test(e.sub || '')));
    if (up) { await p.waitForTimeout(350); await shot(p, '04-castle-scoring-anim'); break; }
    await p.waitForTimeout(40);
  }
  const fx = await watching;
  await p.waitForTimeout(100);
  const float = fx.find((e) => e.type === 'float' && /Castle/.test(e.sub || ''));
  check('2 scoring: floating "+3 · 🏰 Castle"', float && float.text === '+3' && /🏰 Castle/.test(float.sub), JSON.stringify(float));
  check('2 scoring: the castle glows', fx.some((e) => e.type === 'glow' && e.color === '#ffd84a' && e.nodes === 2));
  check('2 scoring: the castellan flies home', fx.some((e) => e.type === 'fly' && e.kind === 'meeple'));
  check('2 scoring: Red\'s chip bumps', fx.some((e) => e.type === 'chipBump' && e.chips[0]));
  await idleFor(p, 0);
  const after = await p.evaluate(() => { const c = window.__carc; return { k: c.state.castles[0].k, score: c.state.players[0].score, chip: document.querySelector('#players .pchip .pscore').textContent }; });
  check('2 scoring: castle stays without a figure; Red has 3', after.k === null && after.score === 3 && after.chip === '3', JSON.stringify(after));
  await p.evaluate(() => { const c = window.__carc; c.view.animateCam({ x: 0.5, y: 0.5, z: 120 }); });
  await p.waitForTimeout(700);
  await shot(p, '05-castle-after-scoring');
  // the score table
  await p.tap('#players .pchip');
  await p.waitForSelector('#scores-modal:not([hidden])');
  const tbl = await p.evaluate(() => {
    const t = document.querySelector('#scores-table table');
    const head = [...t.rows[0].cells].map((c) => c.textContent);
    const i = head.indexOf('🏰');
    const red = [...t.rows].find((r) => r.textContent.includes('Red'));
    return { head, castle: i >= 0 ? red.cells[i].textContent : null, legend: document.querySelector('#scores-table .score-legend')?.textContent };
  });
  check('3 score table: 🏰 column with Red\'s 3 castle points', tbl.castle === '3' && /🏰 castles/.test(tbl.legend || ''), JSON.stringify(tbl));
  await shot(p, '06-score-table');
  await p.evaluate(() => { document.getElementById('scores-modal').hidden = true; });
  check('1-3 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 4. Pass-and-play: Red closes Blue's small city; Blue decides (banner + dock for Blue). Then a
//    reload in the middle of the decision resumes it.
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true },
    board: [['0,0', 'E', 2]], pieces: [['0,0', 1, 0]], drawn: 'E', deck: Array(10).fill('B'),
  });
  await idleFor(p, 0);
  await place(p, 0, 1, 0);
  let bannerText = '';
  for (let i = 0; i < 60 && !/castle/i.test(bannerText); i++) { bannerText = await p.evaluate(() => { const b = document.getElementById('banner'); return b.classList.contains('show') ? b.textContent : ''; }); await p.waitForTimeout(40); }
  check('4 pass-and-play: banner "👉 Blue: decide about your castle"', bannerText.includes('👉 Blue: your small city is finished'), bannerText);
  await shot(p, '07-pass-and-play-banner');
  await idleFor(p, 1, 'castle');
  const d = await dock(p);
  check('4 pass-and-play: the dock names Blue and shows Blue\'s buttons', d.name.includes('Blue') && !!d.build && !!d.points, JSON.stringify(d));
  const active = await p.evaluate(() => [...document.getElementById('players').children].map((c) => c.classList.contains('active')));
  check('4 pass-and-play: Blue\'s chip is the active one', active[1] && !active[0], JSON.stringify(active));
  await p.waitForTimeout(1200);
  await shot(p, '08-pass-and-play-dock');
  // reload in the middle of the decision: Continue resumes it
  await p.reload(); await p.waitForTimeout(900);
  const cont = await p.$('#btn-continue:not([hidden])');
  check('4 reload: a saved game in the castle phase can be continued', !!cont);
  if (cont) {
    await cont.tap(); await p.waitForTimeout(1200);
    const d2 = await dock(p);
    const ph = await p.evaluate(() => window.__carc.state.phase);
    check('4 reload: the castle decision is back in the dock', ph === 'castle' && !!d2.build && d2.name.includes('Blue'), JSON.stringify({ ph, ...d2 }));
    await shot(p, '09-after-reload');
    await p.tap('#castle-points');
    await idleFor(p, 1);
    const sc = await p.evaluate(() => window.__carc.state.players.map((q) => q.score));
    check('4 reload: taking the points gives Blue 4', sc[1] === 4, JSON.stringify(sc));
  }
  check('4 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 5. A computer player decides about its castle (a big unfinished city in reach: it builds)
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: [{ name: 'Red', color: 'red', kind: 'human' }, { name: 'Bot', color: 'blue', kind: 'ai', level: 'hard' }],
    exps: { bridges: true },
    board: [['0,0', 'E', 2], ['1,0', 'E', 1], ['2,0', 'F', 0], ['3,0', 'G', 0], ['4,0', 'G', 0]],
    pieces: [['0,0', 1, 0]], drawn: 'E', deck: Array(60).fill('B'),
  });
  await idleFor(p, 0);
  await place(p, 0, 1, 0);
  await until(p, () => window.__carc.state.phase === 'castle');
  await p.waitForTimeout(250);
  const d = await dock(p);
  check('5 bot: dock says the bot is deciding, no buttons', /Bot is deciding about a castle/.test(d.instruction) && !d.build, JSON.stringify(d));
  await shot(p, '10-bot-deciding');
  let b = '';
  for (let i = 0; i < 100 && !/builds a castle/.test(b); i++) { b = await p.evaluate(() => document.getElementById('banner').textContent); await p.waitForTimeout(50); }
  check('5 bot: the bot builds ("🏰 Bot builds a castle!")', /🏰 Bot builds a castle!/.test(b), b);
  await p.waitForTimeout(500);
  await shot(p, '11-bot-built');
  const cs = await p.evaluate(() => window.__carc.state.castles.map((c) => [c.owner, c.k]));
  check('5 bot: castle entry for the bot', JSON.stringify(cs) === JSON.stringify([[1, 'meeple']]), JSON.stringify(cs));
  check('5 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 6. The fairy by a castellan; 7. final scoring with a castle still waiting
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true, dragon: true },
    board: [['0,0', 'E', 2], ['-1,1', 'B', 0]], pieces: [['0,0', 0, 0]],
    steps: [
      { drawn: 'E', current: 1, action: { t: 'turn', x: 0, y: 1, r: 0, act: null } },
      { action: { t: 'castle', fi: 0, build: true } },
    ],
    fairy: { key: '0,0', f: 'castle', c: 0, k: 'meeple', p: 0 },
    drawn: 'B', deck: [], current: 1,
  });
  await idleFor(p, 1);
  const fz = await p.evaluate(() => {
    const c = window.__carc, v = c.view, cs = c.state.castles[0];
    const [fx, fy] = v.fairyPos(cs.key, 'castle', cs.id); const [tx, ty] = v.castleTop(cs);
    return { d: Math.hypot(fx - tx, fy - ty) / v.cam.z };
  });
  check('6 fairy: drawn right beside the castellan', fz.d < 0.4, JSON.stringify(fz));
  await p.evaluate(() => { const c = window.__carc; c.view.animateCam({ x: 0, y: 0.5, z: 160 }); });
  await p.waitForTimeout(700);
  await shot(p, '12-fairy-by-castellan');
  // Blue places the last tile: the game ends with Red's castle still waiting
  await place(p, 1, 1, 0);
  let sawBanner = false, sawFloat = null;
  const t0 = Date.now();
  let shotTaken = false;
  while (Date.now() - t0 < 20000) {
    const st = await p.evaluate(() => {
      const c = window.__carc; const b = document.getElementById('banner');
      const f = c.view.effects.find((e) => e.type === 'float' && e.text === '0');
      return { banner: b.classList.contains('show') ? b.textContent : '', float: f ? { text: f.text, sub: f.sub } : null, modal: !document.getElementById('scores-modal').hidden };
    });
    if (st.banner.includes('Castles still waiting')) sawBanner = st.banner;
    if (st.float && !sawFloat) sawFloat = st.float;
    if (st.float && !shotTaken) { shotTaken = true; await shot(p, '13-final-castle-not-scored'); }
    if (st.modal) break;
    await p.waitForTimeout(60);
  }
  check('7 final: banner "🏰 Castles still waiting (0 points)"', sawBanner && sawBanner.includes('🏰 Castles still waiting (0 points)'), String(sawBanner));
  check('7 final: the castellan lifted off with "0"', sawFloat && /Castle never scored/.test(sawFloat.sub), JSON.stringify(sawFloat));
  const fin = await p.evaluate(() => { const s = window.__carc.state; return { phase: s.phase, k: s.castles[0].k, fairy: s.fairy, red: s.players[0].score, first: s.finalEvents[0]?.kind }; });
  check('7 final: castellan home, no fairy bonus, castleEnd first', fin.phase === 'over' && fin.k === null && fin.red === 0 && fin.first === 'castleEnd', JSON.stringify(fin));
  await p.waitForTimeout(500);
  await shot(p, '14-final-scores');
  check('6-7 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 8. Looks: a horizontal castle (tiles side by side), and two castles next to each other
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true },
    board: [['0,0', 'E', 1], ['0,1', 'E', 2]], pieces: [['0,0', 0, 0], ['0,1', 1, 0]],
    steps: [
      { drawn: 'E', current: 1, action: { t: 'turn', x: 1, y: 0, r: 3, act: null } },
      { action: { t: 'castle', fi: 0, build: true } },
      { drawn: 'E', current: 0, action: { t: 'turn', x: 0, y: 2, r: 0, act: null } },
      { action: { t: 'castle', fi: 0, build: true } },
    ],
    drawn: 'B', deck: Array(5).fill('B'), current: 0,
  });
  await idleFor(p, 0);
  await p.evaluate(() => { const c = window.__carc; c.view.animateCam({ x: 0.5, y: 1, z: 130 }); });
  await p.waitForTimeout(700);
  await shot(p, '15-horizontal-and-vertical-castles');
  check('8 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 9. One tile closes two small cities (Red's and Blue's): two decisions, Red first (the active
//    player), then Blue with the pass-the-phone banner; the highlight and area follow
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true },
    board: [['-1,0', 'E', 1], ['1,0', 'E', 3]], pieces: [['-1,0', 1, 0], ['1,0', 0, 0]],
    drawn: 'H', deck: Array(10).fill('B'),
  });
  await idleFor(p, 0);
  await place(p, 0, 0, 0);
  await idleFor(p, 0, 'castle');
  await p.waitForTimeout(800);
  let vm = await p.evaluate(() => (window.__carc.view.vm.castleArea || []).slice().sort());
  let d = await dock(p);
  check('9 two cities: Red decides first, about the east city', d.name.includes('Red') && !!d.build && JSON.stringify(vm) === JSON.stringify(['0,-1', '0,0', '0,1', '1,-1', '1,0', '1,1']), JSON.stringify({ name: d.name, vm }));
  await shot(p, '16-two-cities-first');
  await p.tap('#castle-build');
  let bannerText = '';
  for (let i = 0; i < 100 && !/Blue: your small city/.test(bannerText); i++) { bannerText = await p.evaluate(() => { const b = document.getElementById('banner'); return b.classList.contains('show') ? b.textContent : ''; }); await p.waitForTimeout(40); }
  check('9 two cities: then the banner hands the phone to Blue', bannerText.includes('👉 Blue: your small city is finished'), bannerText);
  await idleFor(p, 1, 'castle');
  await p.waitForTimeout(800);
  vm = await p.evaluate(() => (window.__carc.view.vm.castleArea || []).slice().sort());
  d = await dock(p);
  check('9 two cities: Blue decides about the west city; Red\'s new castle is already standing', d.name.includes('Blue') && !!d.build && JSON.stringify(vm) === JSON.stringify(['-1,-1', '-1,0', '-1,1', '0,-1', '0,0', '0,1']), JSON.stringify({ name: d.name, vm }));
  await shot(p, '17-two-cities-second');
  await p.tap('#castle-points');
  await idleFor(p, 1);
  const sc = await p.evaluate(() => ({ scores: window.__carc.state.players.map((q) => q.score), castles: window.__carc.state.castles.length }));
  check('9 two cities: Blue takes 4, Red keeps his castle', sc.scores[1] === 4 && sc.castles === 1, JSON.stringify(sc));
  check('9 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 10. A computer player closes the human's small city: the human decides during the bot's turn
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: [{ name: 'Red', color: 'red', kind: 'human' }, { name: 'Bot', color: 'blue', kind: 'ai', level: 'medium' }],
    exps: { bridges: true },
    board: [['0,0', 'E', 2]], pieces: [['0,0', 0, 0]],
    steps: [{ drawn: 'E', current: 1, action: { t: 'turn', x: 0, y: 1, r: 0, act: null } }],
    deck: Array(10).fill('B'), keepPhase: true,
  });
  await until(p, () => { const c = window.__carc; return c.state.phase === 'castle' && !c.ui.busy && !!document.getElementById('castle-build'); });
  await p.waitForTimeout(500);
  const d = await dock(p);
  const st = await p.evaluate(() => ({ current: window.__carc.state.current, acting: window.__carc.G.actingSeat(window.__carc.state), active: [...document.getElementById('players').children].map((c) => c.classList.contains('active')) }));
  check('10 bot closes: Red gets the buttons during the bot\'s turn', d.name.includes('Red') && !!d.build && st.current === 1 && st.acting === 0 && st.active[0], JSON.stringify({ ...d, ...st }));
  await shot(p, '18-bot-closed-my-city');
  await p.tap('#castle-build');
  await idleFor(p, 0);
  const cs = await p.evaluate(() => window.__carc.state.castles.map((c) => [c.owner, c.k]));
  check('10 bot closes: Red\'s castle is built and play goes on with Red', JSON.stringify(cs) === JSON.stringify([[0, 'meeple']]), JSON.stringify(cs));
  check('10 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

// ---------------------------------------------------------------------------------------------
// 11. Two castellans of Red whose knights stood on the same tile (H with a knight on each cap; in
//     play the second knight comes through the magic portal). H.2.4: fairy options differ by the
//     castle id c, and the controller's sameOpt must compare it. Tap the fairy ghost by castle 1,
//     then the one by castle 0: the fairy must not end up by castle 1.
// ---------------------------------------------------------------------------------------------
{
  const p = await newPage();
  await start(p, {
    players: RED_BLUE, exps: { bridges: true, dragon: true },
    board: [['0,0', 'H', 0]], pieces: [['0,0', 0, 0], ['0,0', 0, 1]],
    steps: [
      { drawn: 'E', current: 1, action: { t: 'turn', x: 1, y: 0, r: 3, act: null } },
      { action: { t: 'castle', fi: 0, build: true } },
      { drawn: 'E', current: 1, action: { t: 'turn', x: -1, y: 0, r: 1, act: null } },
      { action: { t: 'castle', fi: 0, build: true } },
    ],
    drawn: 'B', deck: Array(10).fill('B'), current: 0,
  });
  await idleFor(p, 0);
  const keys = await p.evaluate(() => window.__carc.state.castles.map((c) => [c.id, c.key, c.owner, c.k]));
  check('11 setup: two castles of Red with the same knight tile', JSON.stringify(keys) === JSON.stringify([[0, '0,0', 0, 'meeple'], [1, '0,0', 0, 'meeple']]), JSON.stringify(keys));
  await tapWorld(p, 0, 1); await p.waitForTimeout(300);
  await p.tap('#btn-confirm'); await p.waitForTimeout(600);
  const fairyBtn = p.locator('#picker .pick', { hasText: 'Fairy' });
  if (await fairyBtn.count()) { await fairyBtn.first().tap(); await p.waitForTimeout(300); }
  const ghosts = await p.evaluate(() => (window.__carc.ui.ghosts || []).filter((g) => g.type === 'fairy').map((g) => ({ c: g.act.c, pos: window.__carc.view.ghostScreenPos(g) })));
  check('11 fairy ghosts: one by each castellan', ghosts.length === 2 && ghosts[0].c !== ghosts[1].c, JSON.stringify(ghosts));
  if (ghosts.length === 2) {
    const g1 = ghosts.find((g) => g.c === 1), g0 = ghosts.find((g) => g.c === 0);
    await p.touchscreen.tap(g1.pos[0], g1.pos[1]); await p.waitForTimeout(300);
    const sel = await p.evaluate(() => (window.__carc.ui.ghosts || []).filter((g) => g.type === 'fairy').map((g) => [g.act.c, g.selected]));
    check('11 fairy ghosts: tapping castle 1 selects only castle 1', JSON.stringify(sel.filter(([, s]) => s).map(([c]) => c)) === '[1]', JSON.stringify(sel));
    await shot(p, '19-fairy-ghosts-two-castellans');
    await p.touchscreen.tap(g0.pos[0], g0.pos[1]); await p.waitForTimeout(400);
    // a second tap on the same ghost confirms; let any confirmation finish
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ phase: window.__carc.state.phase, fairy: window.__carc.state.fairy, selected: window.__carc.ui.selected }));
    check('11 fairy ghosts: tapping castle 0 next does not put the fairy by castle 1', !(st.fairy && st.fairy.f === 'castle' && st.fairy.c === 1), JSON.stringify(st));
  }
  check('11 no page errors', !p.errors.length, p.errors.join(' | '));
  await p.context().close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed; screenshots in ${OUT}`);
for (const f of failed) console.log(`  FAILED: ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
