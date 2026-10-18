// Three phones + one computer player play Bridges, Castles & Bazaars online through the local
// wrangler dev server (MASTER H.5 ON1, ON2). Each phone acts only when G.actingSeat(state) is a
// seat it owns, through the real UI (taps on the board, the dock and the bazaar sheet).
//
// The host rewrites the start message so the game opens with known tiles:
//   Dad: W below the start tile → every open square faces a road or a city
//   Sam: B (fits only with a bridge) → thrown away; then the bazaar meadow BB/F.b, placed with its bridge
//   auction 1 (hosted by Sam): Kim picks, the bot, Dad raises, Sam passes, Kim decides — four city caps (E)
//   bazaar round: Kim lays a cap with her knight; the next phone completes it → Kim decides the castle
//                 while someone else is the active player
//   Kim's next tile: a bazaar (auction 2, hosted by Kim) → Kim's phone goes away on her own bid;
//                 the others see "phone is offline", then "Let a bot play"; Kim rejoins mid-auction and
//                 takes her seat back
// then everyone plays to the end on a trimmed pile; all phones must end identical, the room's action
// list must replay on a fresh page to the same state, and a reloaded phone must rebuild the same state.
//
// usage: node dev/test-online-bcb3.mjs [base] [outDir] [pileSize] [otherExpansions]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '/tmp/claude-0/test-online';
const PILE = +(process.argv[4] || 30);
const OTHERS = (process.argv[5] || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const notes = [];
const check = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(ok ? 'PASS' : 'FAIL', name, extra); };
const log = (...a) => console.log('  ·', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();

async function open(name, ctx = null) {
  ctx = ctx || await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log(name, 'pageerror:', e.message); errors.push(`${name}: ${e.message}`); });
  p.on('console', (m) => { if (m.type() === 'error') { console.log(name, 'console:', m.text()); errors.push(`${name}: ${m.text()}`); } });
  await p.goto(BASE, { timeout: 120000 });
  await p.waitForTimeout(700);
  return { name, ctx, p };
}
let shotN = 0;
const shot = async (ph, what) => { const f = `${OUT}/${String(++shotN).padStart(2, '0')}-${ph.name}-${what}.png`; await ph.p.screenshot({ path: f }); return f; };
const ev = (ph, fn, arg) => ph.p.evaluate(fn, arg);
const gameOn = (ph) => ph.p.waitForFunction(() => window.__carc?.state && document.querySelector('#game').classList.contains('active'), null, { timeout: 30000 });

// ---------- lobby: Dad hosts, Sam and Kim join, then Dad adds a bot (seats 0 Dad, 1 Sam, 2 Kim, 3 bot) ----------
const dad = await open('dad');
await dad.p.tap('#btn-new');
await dad.p.tap('#mode-seg button[data-mode="online"]');
await dad.p.fill('#me-name', 'Dad');
await dad.p.tap('#btn-start');
await dad.p.waitForFunction(() => /[A-Z]{4}/.test(document.querySelector('#lobby-code')?.textContent || ''));
const code = await dad.p.textContent('#lobby-code');
await dad.p.waitForTimeout(500);
const ids = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower', 'bridges'];
for (const id of ['bridges', ...OTHERS]) {
  const rows = await dad.p.$$('#lobby-exp label.toggle');
  const row = rows[ids.indexOf(id)];
  if (!(await row.$eval('input', (i) => i.checked))) { await row.tap(); await dad.p.waitForTimeout(400); }
}
async function join(name) {
  const ph = await open(name.toLowerCase());
  await ph.p.tap('#btn-join-home');
  await ph.p.fill('#join-code', code);
  await ph.p.fill('#join-name', name);
  await ph.p.tap('#btn-join');
  await ph.p.waitForFunction((n) => [...document.querySelectorAll('#lobby-seats .prow')].some((r) => r.textContent.includes(n) || r.querySelector('input')?.value === n), name, { timeout: 15000 });
  await ph.p.waitForTimeout(500);
  return ph;
}
const sam = await join('Sam');
const kim = await join('Kim');
await dad.p.waitForTimeout(600);
await dad.p.tap('#lobby-add-bot');
await dad.p.waitForFunction(() => document.querySelectorAll('#lobby-seats .prow').length >= 4, null, { timeout: 10000 });
await dad.p.waitForTimeout(600);

// rewrite the start message: Dad first, known opening tiles, trimmed pile
await dad.p.evaluate(async (pile) => {
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      const m = JSON.parse(data);
      if (m.type === 'start' && m.init) {
        const all = [...m.init.deck, m.init.drawn];
        const take = (t) => { const i = all.indexOf(t); if (i < 0) throw new Error(`no ${t} in the pile`); all.splice(i, 1); return t; };
        const first = take('W');
        const top = ['B', 'BB/F.b', 'E', 'E', 'E', 'E', 'BB/R.bi'].map(take); // in drawing order
        const rest = all.filter((t) => !t.startsWith('BB/')).slice(0, pile); // no more bazaars: a short game
        m.init.deck = [...rest, ...top.reverse()];
        m.init.drawn = first;
        m.init.current = 0;
        m.init.deckSize = m.init.deck.length + 1;
        data = JSON.stringify(m);
        WebSocket.prototype.send = orig;
      }
    } catch (e) { console.error('start rewrite failed', e); }
    return orig.call(this, data);
  };
}, PILE);
await dad.p.tap('#lobby-start');
let phones = [dad, sam, kim];
await Promise.all(phones.map(gameOn));
const seats = await ev(dad, () => window.__carc.state.players.map((p) => `${p.name}:${p.kind}`).join(', '));
console.log('room', code, 'seats', seats);
check('seats are Dad, Sam, Kim and a bot', /^Dad:human, Sam:human, Kim:human, [^,]+:ai$/.test(seats), seats);
const SEAT = { dad: 0, sam: 1, kim: 2, bot: 3 };

// ---------- helpers ----------
const info = (ph) => ev(ph, () => {
  const c = window.__carc; const s = c.state;
  if (!s || !c.session?.net) return { none: true };
  const seat = c.G.actingSeat(s);
  const pl = seat === null ? null : s.players[seat];
  return {
    phase: s.phase, seq: s.seq, busy: !!c.ui.busy, seat, current: s.current, stage: s.bazaar?.stage || null,
    mine: !!pl && pl.kind === 'human' && pl.owner === c.session.net.id,
    canDiscard: c.G.canDiscard(s), drawn: s.drawn, instr: document.getElementById('instruction')?.innerText || '',
    castleBtns: !!document.getElementById('castle-build'), bzCtrl: !!document.querySelector('#bazaar .bz-ctrl'),
    discardBtn: !!document.getElementById('btn-discard'), online: c.session.net.isOpen(),
  };
});
const stateJson = (ph) => ev(ph, () => JSON.stringify(window.__carc.state));
async function quiet(list = phones, ms = 30000) { // every phone idle on the same move
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await Promise.all(list.map(info));
    if (s.every((x) => !x.none && !x.busy && x.seq === s[0].seq)) { await sleep(250); const t = await Promise.all(list.map(info)); if (t.every((x) => !x.busy && x.seq === s[0].seq)) return t; }
    await sleep(200);
  }
  return null;
}
async function same(list = phones, label = '') {
  await quiet(list);
  const s = await Promise.all(list.map(stateJson));
  const ok = s.every((x) => x === s[0]);
  if (!ok) {
    const objs = s.map((x) => JSON.parse(x));
    const keys = Object.keys(objs[0]).filter((k) => objs.some((o) => JSON.stringify(o[k]) !== JSON.stringify(objs[0][k])));
    notes.push(`states differ ${label}: keys ${keys.join(',')}`);
  }
  return ok;
}
const tapWorld = async (ph, x, y) => {
  const [sx, sy] = await ev(ph, ([x, y]) => { const v = window.__carc.view; v.cam.x = x; v.cam.y = y; v.camTarget = null; return v.toScreen(x, y); }, [x, y]);
  await ph.p.touchscreen.tap(sx, sy);
};
const tapSel = async (ph, sel) => { const el = await ph.p.$(sel); if (!el) return false; await el.tap(); return true; };
const whose = (i) => ['dad', 'sam', 'kim', 'bot'][i];
const phoneOf = (seat) => phones.find((ph) => SEAT[ph.name.replace(/2$/, '')] === seat);

// Plan a placement on the phone (in the page): complete a small city of another phone's knight,
// lay a city cap with a knight, or anything legal.
const plan = (ph, want) => ev(ph, (want) => {
  const c = window.__carc, G = c.G, s = c.state;
  const me = s.current, t = s.drawn;
  const isCap = (f) => f.type === 'city' && f.sides.length === 1 && !f.noCastle;
  const opts = [];
  for (const pl of c.ui.placements) for (const r of pl.rots) opts.push({ x: pl.x, y: pl.y, r, bridge: pl.needsBridge?.[r]?.[0] || null });
  const sim = (o) => { const st = G.cloneState(s); G.placeTile(st, o.x, o.y, o.r, o.bridge); return st; };
  if (want.at) return opts.find((o) => o.x === want.at[0] && o.y === want.at[1] && o.r === want.at[2]) || null;
  if (want.bridgeOnly) return opts.find((o) => o.bridge) || null;
  if (want.complete !== false) {
    for (const o of opts) {
      const st = sim(o); const k = G.key(o.x, o.y);
      for (const [fi, f] of G.featuresOf(st.board[k]).entries()) {
        if (!isCap(f)) continue;
        const g = G.getGroup(st.board, k, fi);
        if (!g.complete || g.nodes.length !== 2 || g.tiles.size !== 2 || !g.nodes.every(([nk, nf]) => isCap(G.featuresOf(st.board[nk])[nf]))) continue;
        const fol = g.meeples.filter((m) => m.k === 'meeple' || m.k === 'large');
        const q = fol[0]?.p;
        if (fol.length === 1 && q !== me && s.players[q].kind === 'human' && s.players[q].owner && s.players[q].castles > 0) return { ...o, why: `completes ${s.players[q].name}'s small city` };
      }
    }
  }
  if (want.cap !== false && s.players[me].supply.meeple > 0) {
    for (const o of opts) {
      if (o.bridge) continue;
      const st = sim(o); const k = G.key(o.x, o.y);
      const fo = G.followerOptions(st).find((q) => q.kind === 'follower' && q.k === 'meeple' && q.key === k && isCap(G.featuresOf(st.board[k])[q.fi]) && G.getGroup(st.board, k, q.fi).nodes.length === 1);
      if (fo) return { ...o, follower: { key: k, fi: fo.fi }, why: 'lays a cap with a knight' };
    }
  }
  const o = opts[Math.floor(Math.random() * opts.length)];
  // sometimes a follower anywhere on the new tile
  return { ...o, why: 'any', anyFollower: Math.random() < 0.5 };
}, want);

async function place(ph, pl) {
  await tapWorld(ph, pl.x, pl.y); await ph.p.waitForTimeout(220);
  for (let k = 0; k < 5; k++) {
    const r = await ev(ph, () => window.__carc.ui.tentative?.r);
    if (r === pl.r) break;
    if (r === undefined) { await tapWorld(ph, pl.x, pl.y); await ph.p.waitForTimeout(200); continue; }
    await tapSel(ph, '#btn-rotate'); await ph.p.waitForTimeout(150);
  }
  const t = await ev(ph, () => window.__carc.ui.tentative);
  if (!t || t.x !== pl.x || t.y !== pl.y || t.r !== pl.r) { notes.push(`${ph.name}: could not set the tile at ${pl.x},${pl.y} r${pl.r}`); return false; }
  await ph.p.tap('#btn-confirm'); await ph.p.waitForTimeout(350);
  const ghost = await ev(ph, ({ f, any }) => {
    const c = window.__carc;
    const gs = (c.ui.ghosts || []).filter((g) => g.type === 'follower');
    const g = f ? gs.find((q) => q.key === f.key && q.fi === f.fi && q.k === 'meeple') : any && gs.length ? gs[Math.floor(Math.random() * gs.length)] : null;
    if (!g) return null;
    const [x, y] = g.key.split(',').map(Number); c.view.cam.x = x; c.view.cam.y = y; c.view.camTarget = null;
    return { key: g.key, fi: g.fi, k: g.k };
  }, { f: pl.follower || null, any: !!pl.anyFollower });
  if (ghost) {
    await ph.p.waitForTimeout(100);
    const pos = await ev(ph, (g) => window.__carc.view.ghostScreenPos(window.__carc.ui.ghosts.find((q) => q.key === g.key && q.fi === g.fi && q.k === g.k)), ghost);
    if (pos) { await ph.p.touchscreen.tap(pos[0], pos[1]); await ph.p.waitForTimeout(200); }
    if (pl.follower && !(await ev(ph, () => !!window.__carc.ui.selected))) notes.push(`${ph.name}: the knight ghost did not respond`);
  }
  await ph.p.tap('#btn-confirm'); await ph.p.waitForTimeout(450);
  return true;
}
async function discard(ph) {
  if (!(await tapSel(ph, '#btn-discard'))) return false;
  await ph.p.waitForTimeout(300);
  await shot(ph, 'discard-ask');
  const btn = ph.p.locator('#ask-actions button', { hasText: 'Throw it away' });
  if (!(await btn.count())) return false;
  await btn.tap(); await ph.p.waitForTimeout(500);
  return true;
}
// bazaar actions through the sheet
async function bazaar(ph, a) {
  if (a.pick !== undefined || a.take !== undefined) {
    const i = a.pick ?? a.take;
    const card = await ph.p.$(`#bazaar .bz-card.can[data-i="${i}"]`) || (await ph.p.$$('#bazaar .bz-card.can'))[0];
    if (!card) { notes.push(`${ph.name}: no bazaar card to tap`); return false; }
    await card.tap(); await ph.p.waitForTimeout(200);
    if (a.take !== undefined) return true;
    for (let k = 0; k < (a.bid || 0); k++) { await tapSel(ph, '#bazaar [data-bz="plus"]'); await ph.p.waitForTimeout(60); }
    return tapSel(ph, '#bazaar [data-bz="pick"]');
  }
  if (a.raise !== undefined) { for (let k = 0; k < a.raise; k++) { await tapSel(ph, '#bazaar [data-bz="plus"]'); await ph.p.waitForTimeout(60); } return tapSel(ph, '#bazaar [data-bz="raise"]'); }
  if (a.pass) return tapSel(ph, '#bazaar [data-bz="pass"]');
  if (a.sell !== undefined) return tapSel(ph, a.sell ? '#bazaar [data-bz="sell"]' : '#bazaar [data-bz="buy"]');
  return false;
}
// wait until one of the phones must act; returns [phone, info]
async function nextTurn(ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await Promise.all(phones.map(info));
    if (s.every((x) => x.phase === 'over')) return [null, s[0]];
    const i = s.findIndex((x) => x.mine && !x.busy);
    if (i >= 0 && s.every((x) => x.seq === s[i].seq)) { await sleep(150); const again = await info(phones[i]); if (again.mine && !again.busy && again.seq === s[i].seq) return [phones[i], again]; }
    await sleep(200);
  }
  return [undefined, null];
}

// ---------- ON1: Dad lays W below the start tile ----------
let [ph, st] = await nextTurn();
check('Dad starts, with W', ph === dad && st.drawn === 'W', `${ph?.name} ${st?.drawn}`);
await place(dad, await plan(dad, { at: [0, 1, 0] }));
await quiet();
// ---------- Sam: B fits only with a bridge → throw it away ----------
[ph, st] = await nextTurn();
check('Sam draws B, which fits only with a bridge', ph === sam && st.drawn === 'B' && st.canDiscard, `${ph?.name} ${st?.drawn} canDiscard=${st?.canDiscard}`);
await sam.p.waitForTimeout(400);
const samInfo = await info(sam);
check('Sam\'s dock offers "Throw this tile away"', samInfo.discardBtn);
const othersNoDiscard = (await Promise.all([dad, kim].map(info))).every((x) => !x.discardBtn);
check('the other phones show no discard button', othersNoDiscard);
await shot(sam, 'bridge-only-tile');
check('Sam throws B away', await discard(sam));
await quiet();
[ph, st] = await nextTurn();
check('Sam draws the bazaar meadow next, again bridge-only', ph === sam && st.drawn === 'BB/F.b' && st.canDiscard, `${st?.drawn}`);
const disc = await ev(dad, () => window.__carc.state.discarded.slice());
check('B is out of the game on every phone', disc.includes('B') && (await ev(kim, () => window.__carc.state.discarded.includes('B'))));
const bPlan = await plan(sam, { bridgeOnly: true });
log('Sam places BB/F.b with its bridge', JSON.stringify(bPlan));
await place(sam, bPlan);
await quiet();
check('the bridge is on the board for everyone', (await Promise.all(phones.map((x) => ev(x, () => Object.values(window.__carc.state.board).filter((t) => t.bridge === 0 || t.bridge === 1).length)))).every((n) => n === 1));

// ---------- auction 1 (host Sam): every phone acts ----------
[ph, st] = await nextTurn();
check('auction 1: Kim chooses first (host\'s left)', ph === kim && st.phase === 'bazaar' && st.stage === 'pick', `${ph?.name} ${st?.phase}/${st?.stage}`);
const watching = await Promise.all([dad, sam].map(info));
check('auction 1: only Kim\'s phone has bazaar controls', st.bzCtrl && watching.every((x) => !x.bzCtrl), `kim ${st.bzCtrl}, others ${watching.map((x) => x.bzCtrl)}`);
await shot(kim, 'auction-pick');
await shot(dad, 'auction-watching');
await bazaar(kim, { pick: 0, bid: 1 });
const lap = ['kim:pick'];
let deals = 0;
// the first lap is scripted for the phones; the bot does what it likes
for (let guard = 0; guard < 40; guard++) {
  [ph, st] = await nextTurn();
  if (!ph || st.phase !== 'bazaar') break;
  const bz = await ev(ph, () => { const s = window.__carc.state; return { high: s.bazaar.high, stage: s.bazaar.stage, chooser: s.bazaar.chooser, owned: s.bazaar.tiles.filter((x) => x.owner !== null).length }; });
  if (bz.owned > deals) deals = bz.owned;
  lap.push(`${ph.name}:${st.stage}`);
  const others = await Promise.all(phones.filter((x) => x !== ph).map(info));
  if (others.some((x) => x.bzCtrl)) notes.push(`another phone shows bazaar controls while ${ph.name} decides`);
  if (st.stage === 'bid') {
    if (ph === dad && deals === 0) { await shot(dad, 'auction-raise'); await bazaar(dad, { raise: 0 }); }
    else if (ph === sam && deals === 0) await bazaar(sam, { pass: true });
    else await bazaar(ph, Math.random() < 0.5 ? { pass: true } : { raise: 0 });
  } else if (st.stage === 'decide') {
    await shot(ph, 'auction-decide');
    await bazaar(ph, { sell: deals === 0 ? true : Math.random() < 0.5 });
  } else if (st.stage === 'pick') await bazaar(ph, { pick: -1, bid: Math.floor(Math.random() * 2) });
  await ph.p.waitForTimeout(300);
}
const lapLog = await ev(dad, () => window.__carc.state.bazaar ? 'round' : 'none');
log('auction 1 decisions', lap.join(' '), lapLog);
check('auction 1: Kim, Dad and Sam each acted (pick, raise, pass, decide)', ['kim:pick', 'dad:bid', 'sam:bid', 'kim:decide'].every((n) => lap.includes(n)), lap.join(' '));
check('phones agree after auction 1', await same(phones, 'after auction 1'));

// ---------- bazaar round 1: castles ----------
let nonActiveCastle = null;
let carry = null;
for (let guard = 0; guard < 12; guard++) {
  [ph, st] = await nextTurn(90000);
  if (!ph) break;
  if (!(await ev(ph, () => !!window.__carc.state.bazaar))) { carry = [ph, st]; break; } // the round is over
  if (st.phase === 'castle') {
    const o = await ev(ph, () => { const s = window.__carc.state; return { seat: window.__carc.G.actingSeat(s), current: s.current, name: s.players[s.current].name }; });
    const others = await Promise.all(phones.filter((x) => x !== ph).map(info));
    const activePhone = phoneOf(o.current);
    if (o.seat !== o.current && !nonActiveCastle) {
      nonActiveCastle = `${ph.name} decides while ${o.name} is the active player`;
      await shot(ph, 'castle-decision-nonactive');
      if (activePhone) await shot(activePhone, 'castle-waiting-active');
      check('castle: buttons only on the deciding (non-active) phone', st.castleBtns && others.every((x) => !x.castleBtns));
      check('castle: the others are told whom they wait for', others.every((x) => /decide about a castle/.test(x.instr)), others.map((x) => x.instr).join(' | '));
    }
    await tapSel(ph, '#castle-build');
    await ph.p.waitForTimeout(500);
    continue;
  }
  if (st.phase === 'place') {
    const want = ph === kim ? { complete: false } : {};
    const pl = await plan(ph, want);
    log(`${ph.name} places ${st.drawn}: ${pl.why} at ${pl.x},${pl.y} r${pl.r}`);
    await place(ph, pl);
  }
}
check('castle decided on a phone that is not the active player\'s', !!nonActiveCastle, nonActiveCastle || 'did not come up');
check('phones agree after bazaar round 1', await same(phones, 'after round 1'));

// ---------- auction 2 (host Kim): Kim's phone goes away on her own bid ----------
[ph, st] = carry || await nextTurn();
check('Kim draws the second bazaar', ph === kim && st.drawn === 'BB/R.bi', `${ph?.name} ${st?.drawn}`);
if (ph === kim) await place(kim, await plan(kim, { complete: false, cap: false }));
let offlineDone = false;
for (let guard = 0; guard < 30 && !offlineDone; guard++) {
  [ph, st] = await nextTurn(30000);
  if (!ph) { await sleep(500); continue; }
  if (ph === kim && st.phase === 'bazaar') {
    // Kim must act in the auction now: her phone goes away
    await shot(kim, `auction2-kim-${st.stage}`);
    log('Kim\'s phone goes away at stage', st.stage);
    await kim.p.close();
    phones = [dad, sam];
    offlineDone = true;
    break;
  }
  if (st.phase === 'bazaar') {
    if (st.stage === 'bid') await bazaar(ph, { raise: 0 });
    else if (st.stage === 'decide') await bazaar(ph, { sell: false });
    else if (st.stage === 'pick') await bazaar(ph, { pick: -1, bid: 0 });
  } else if (st.phase === 'castle') await tapSel(ph, '#castle-build');
  else if (st.phase === 'place') await place(ph, await plan(ph, {}));
  await sleep(300);
}
check('ON2: Kim\'s phone closed on her own auction turn', offlineDone);
if (offlineDone) {
  let seen = false;
  for (let k = 0; k < 20 && !seen; k++) { await sleep(500); seen = (await Promise.all([dad, sam].map(info))).every((x) => /Kim.*phone is offline/.test(x.instr)); }
  check('ON2: the other phones say "Kim\'s phone is offline"', seen, (await info(sam)).instr);
  await shot(sam, 'offline-waiting');
  await shot(dad, 'offline-waiting');
  let btn = null;
  const t0 = Date.now();
  try { btn = await sam.p.waitForSelector('#take-over', { timeout: 30000 }); } catch { /* not shown */ }
  const after = Math.round((Date.now() - t0) / 1000);
  check('ON2: "Let a bot play" appears after about 15 s', !!btn, `after ~${after + 5} s offline`);
  await shot(sam, 'takeover-offer');
  if (btn) {
    const seq0 = (await info(sam)).seq;
    await btn.tap();
    await sleep(1500);
    const kinds = await Promise.all([dad, sam].map((x) => ev(x, () => window.__carc.state.players[2].kind)));
    check('ON2: Kim\'s seat is a bot on both phones', kinds.every((k) => k === 'ai'), kinds.join(','));
    let moved = false;
    for (let k = 0; k < 20 && !moved; k++) { await sleep(500); moved = (await info(dad)).seq > seq0 + 1; }
    check('ON2: the bot made Kim\'s auction move', moved);
    await shot(dad, 'bot-plays-kim');
  }
  // Kim rejoins mid-auction from the home screen
  const kim2 = await open('kim2', kim.ctx);
  const rejoin = await ev(kim2, () => !document.getElementById('btn-rejoin').hidden && document.getElementById('btn-rejoin').textContent);
  check('ON2: Kim\'s phone offers Rejoin', !!rejoin, rejoin || '');
  await kim2.p.tap('#btn-rejoin');
  await gameOn(kim2);
  await kim2.p.waitForTimeout(2000);
  const midAuction = await ev(kim2, () => window.__carc.state.phase);
  phones = [dad, sam, kim2];
  check('ON2: Kim rejoined while the auction is still on', midAuction === 'bazaar', midAuction);
  check('ON2: Kim\'s rebuilt game equals the others', await same(phones, 'after rejoin'));
  const back = await ev(kim2, () => !document.getElementById('seat-back').hidden && document.getElementById('seat-back').textContent);
  check('ON2: Kim sees "Take back"', !!back, back || '');
  await shot(kim2, 'take-back-offer');
  if (back) {
    const cover = await ev(kim2, () => {
      const btn = document.getElementById('seat-back'); const r = btn.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return el === btn || btn.contains(el) ? null : `${el.closest('[id]')?.id || el.tagName}`;
    });
    check('BUG: ON2: "Take back" can be tapped while the auction is on (not covered)', !cover, cover ? `covered by #${cover}` : '');
    if (cover) await ev(kim2, () => document.getElementById('seat-back').click()); // carry on with the scenario
    else await kim2.p.tap('#seat-back');
    await sleep(1500);
    const kinds = await Promise.all(phones.map((x) => ev(x, () => window.__carc.state.players[2].kind)));
    check('ON2: Kim is a person again on every phone', kinds.every((k) => k === 'human'), kinds.join(','));
  }
}

// ---------- play to the end ----------
const counts = { place: 0, castle: 0, bazaar: 0, discard: 0 };
for (let guard = 0; guard < 400; guard++) {
  [ph, st] = await nextTurn(120000);
  if (ph === null) break;
  if (ph === undefined) { notes.push('stuck: nobody could move for 2 minutes'); break; }
  if (st.phase === 'place') {
    if (st.canDiscard && Math.random() < 0.5 && await discard(ph)) { counts.discard++; continue; }
    await place(ph, await plan(ph, {})); counts.place++;
  } else if (st.phase === 'castle') { await tapSel(ph, Math.random() < 0.7 ? '#castle-build' : '#castle-points'); counts.castle++; }
  else if (st.phase === 'bazaar') {
    counts.bazaar++;
    if (st.stage === 'pick') await bazaar(ph, { pick: -1, bid: Math.floor(Math.random() * 3) });
    else if (st.stage === 'bid') await bazaar(ph, Math.random() < 0.5 ? { pass: true } : { raise: Math.floor(Math.random() * 2) });
    else if (st.stage === 'decide') await bazaar(ph, { sell: Math.random() < 0.5 });
    else await bazaar(ph, { take: -1 });
  }
  await sleep(250);
}
await sleep(3000);
const over = await Promise.all(phones.map((x) => ev(x, () => window.__carc.state.phase)));
check('the game reached the end on every phone', over.every((x) => x === 'over'), over.join(','));
check('all phones end with identical states', await same(phones, 'at the end'));
for (const x of phones) await shot(x, 'end');

// the room's action list replays on a fresh page (a new client that only listens)
const fresh = await open('fresh');
const replay = await ev(fresh, async (code) => {
  const G = await import('/js/game.js');
  const msg = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${location.host}/api/rooms/${code}/ws`);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', clientId: `replay${Date.now()}`, name: 'Replay' }));
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.type === 'welcome') { ws.close(); resolve(m); } };
    ws.onerror = reject;
  });
  const s = G.cloneState(msg.init);
  for (const a of msg.actions) G.applyAction(s, a);
  return { json: JSON.stringify(s), actions: msg.actions.length, kinds: [...new Set(msg.actions.map((a) => a.t))].join(',') };
}, code);
const dadJson = await stateJson(dad);
check('the room\'s action list replays on a fresh page to the same state', replay.json === dadJson, `${replay.actions} actions (${replay.kinds})`);
// a reloaded phone rebuilds the same state
await sam.p.reload();
await sam.p.waitForTimeout(800);
await sam.p.tap('#btn-rejoin');
await gameOn(sam);
await sam.p.waitForTimeout(2500);
check('a reloaded phone (Sam) rebuilds the same final state', (await stateJson(sam)) === dadJson);

console.log('counts', JSON.stringify(counts));
console.log('notes', notes.length, notes.slice(0, 15));
console.log(`\n${results.filter((r) => r[1]).length}/${results.length} passed, ${errors.length} page errors`, errors.slice(0, 10));
await b.close();
