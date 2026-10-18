// Bazaar UI checks on an emulated iPhone 13 (MASTER H.4, H.5 BZ1–BZ10, ON3): the auction sheet in every stage,
// status / "Still to choose" lines, the "fits nowhere" mark, banners, chip bumps, negative scores, the strip during
// the bazaar round (and the candidate squares around it), the deck counter, the 🛒 score column, the no-bidding
// variant and pass-and-play with three people on one phone. Prints PASS/FAIL lines and saves screenshots.
// usage: node dev/test-bazaars-ui.mjs [outDir] [baseUrl] [scenario,list]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const out = process.argv[2] || '/tmp/claude-0/test-bazaars';
const base = process.argv[3] || 'http://127.0.0.1:5174/public/';
const only = (process.argv[4] || '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const browser = await chromium.launch();
let shotNo = 0;

async function newPage() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base);
  await p.waitForTimeout(700);
  // log every banner, toast and score-chip bump with a timestamp
  await p.evaluate(() => {
    window.__log = [];
    const t0 = performance.now();
    const log = (kind, text) => {
      const last = window.__log[window.__log.length - 1];
      if (last && last.kind === kind && last.text === text && performance.now() - t0 - last.t < 60) return;
      window.__log.push({ kind, text, t: Math.round(performance.now() - t0) });
    };
    const banner = document.getElementById('banner');
    new MutationObserver(() => { if (banner.classList.contains('show')) log('banner', banner.textContent); })
      .observe(banner, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('toast')) log('toast', n.textContent); })
      .observe(document.getElementById('toast-layer'), { childList: true });
    new MutationObserver((ms) => {
      for (const m of ms) {
        const el = m.target;
        if (el.classList?.contains('pchip') && el.classList.contains('bump')) log('bump', `${[...el.parentNode.children].indexOf(el)}:${el.querySelector('.pscore').textContent}`);
      }
    }).observe(document.getElementById('players'), { attributes: true, subtree: true, attributeFilter: ['class'] });
    // when the acting seat's controls (cards to tap, buttons) appear on the sheet
    let had = false;
    new MutationObserver(() => {
      const now = !!document.querySelector('#bazaar [data-bz], #bazaar .bz-card.can');
      if (now && !had) log('controls', document.querySelector('#bazaar .bz-status')?.textContent || '');
      had = now;
    }).observe(document.getElementById('bazaar'), { childList: true, subtree: true });
  });
  return { p, ctx, errors };
}
const shot = async (p, name) => {
  const f = `${out}/${String(++shotNo).padStart(2, '0')}-${name}.png`;
  await p.screenshot({ path: f });
  return f;
};
const takeLog = async (p) => p.evaluate(() => window.__log.splice(0));
const info = (p) => p.evaluate(() => {
  const c = window.__carc, s = c.state;
  const box = document.getElementById('bazaar');
  return {
    phase: s.phase, stage: s.bazaar?.stage ?? null, acting: c.G.actingSeat(s), current: s.current, busy: !!c.ui.busy,
    scores: s.players.map((q) => q.score), sheet: !box.hidden && !box.classList.contains('strip'), strip: !box.hidden && box.classList.contains('strip'),
    status: box.querySelector('.bz-status')?.textContent ?? null, order: box.querySelector('.bz-order')?.textContent ?? null,
    head: box.querySelector('.bz-head')?.textContent ?? null, ctrl: box.querySelector('.bz-ctrl')?.textContent ?? null,
    cards: [...box.querySelectorAll('.bz-card')].map((el) => ({ i: +el.dataset.i, can: el.classList.contains('can'), sel: el.classList.contains('sel'), who: el.querySelector('.bz-who').textContent })),
    buttons: [...box.querySelectorAll('[data-bz]')].map((b) => `${b.dataset.bz}:${b.textContent}`),
    deckCount: document.getElementById('deck-count').textContent,
    turnName: document.getElementById('turn-name').textContent, instruction: document.getElementById('instruction').textContent,
    chips: [...document.querySelectorAll('#players .pchip')].map((ch) => ({ score: ch.querySelector('.pscore').textContent, neg: ch.classList.contains('neg'), active: ch.classList.contains('active'), color: getComputedStyle(ch.querySelector('.pscore')).color })),
    rotateDisabled: document.getElementById('btn-rotate').disabled, confirmDisabled: document.getElementById('btn-confirm').disabled,
    hintHidden: document.getElementById('btn-hint').hidden, ransomHidden: document.getElementById('btn-ransom').hidden,
  };
});
const idle = async (p, timeout = 20000) => {
  await p.waitForFunction(() => { const c = window.__carc; return c.state && !c.ui.busy; }, null, { timeout, polling: 50 });
  await p.waitForTimeout(120);
  // several people on one phone: the next one taps "👉 …: tap when you have the phone" first
  const ready = await p.$('#bazaar [data-bz="ready"]');
  if (ready) {
    await p.evaluate(() => window.__log.push({ kind: 'handover', text: document.querySelector('#bazaar [data-bz="ready"]').textContent, t: 0 }));
    await ready.tap();
    await p.waitForTimeout(120);
  }
};
const waitState = (p, fn, arg, timeout = 25000) => p.waitForFunction(fn, arg, { timeout, polling: 50 });
const tapSel = async (p, sel) => { const el = await p.$(sel); if (!el) return false; await el.tap(); return true; };
// start a crafted game on the page: build(G) runs in the page and returns the state
async function start(p, build, arg) {
  await p.evaluate(async ({ src, arg }) => {
    const c = window.__carc;
    const fn = new Function('G', 'arg', `return (${src})(G, arg);`);
    const s = fn(c.G, arg);
    c.startGame(s);
  }, { src: build.toString(), arg });
  await p.waitForTimeout(400);
}
// place the drawn tile through the UI (first legal spot, its needed bridge comes automatically), no figure
async function placeViaUI(p, want = null) {
  await idle(p);
  const pl = await p.evaluate((want) => {
    const c = window.__carc;
    const list = c.ui.placements;
    const pick = (want && list.find((q) => q.x === want.x && q.y === want.y)) || list.find((q) => q.rots.some((r) => !q.needsBridge?.[r])) || list[0];
    c.view.cam.x = pick.x; c.view.cam.y = pick.y; c.view.camTarget = null; c.view.dirty = true;
    return { x: pick.x, y: pick.y };
  }, want);
  await p.waitForTimeout(150);
  const [sx, sy] = await p.evaluate(([x, y]) => window.__carc.view.toScreen(x, y), [pl.x, pl.y]);
  await p.touchscreen.tap(sx, sy);
  await p.waitForTimeout(250);
  await p.tap('#btn-confirm');
  await waitState(p, () => window.__carc.state.phase === 'action');
  await p.waitForTimeout(250);
  await p.tap('#btn-confirm');
  await p.waitForTimeout(200);
  return pl;
}
const banners = (log) => log.filter((e) => e.kind === 'banner').map((e) => e.text);
const toasts = (log) => log.filter((e) => e.kind === 'toast').map((e) => e.text);
const bumps = (log) => [...new Set(log.filter((e) => e.kind === 'bump').map((e) => e.text))];
const has = (list, re) => list.some((t) => re.test(t));

// ===================================================================== scenario 1: ON3 pass-and-play, 3 people
async function passAndPlay() {
  console.log('\n== ON3: three people on one phone, an auction with pick, bid, pass, decide, buy, sell ==');
  const { p, ctx, errors } = await newPage();
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }, { name: 'Cat', color: 'green', kind: 'human' }], { expansions: { bridges: true } });
    s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } }; s.placed = 1;
    s.deck = ['B', 'B', 'B', 'B', 'U', 'V', 'E']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    return s;
  });
  await idle(p);
  await takeLog(p);
  await placeViaUI(p, { x: 0, y: 1 });
  await waitState(p, () => window.__carc.state.phase === 'bazaar');
  await idle(p);
  let log = await takeLog(p);
  let s = await info(p);
  check('bazaarOpen banner', has(banners(log), /Bazaar! 3 tiles go up for auction/), banners(log).join(' | '));
  check('👉 banner for the chooser (Ben)', has(banners(log), /👉 Ben: your turn in the bazaar/));
  check('sheet shown in the pick stage', s.sheet && s.stage === 'pick' && s.acting === 1, JSON.stringify({ sheet: s.sheet, stage: s.stage }));
  check('sheet header names the host', /Bazaar\s*·\s*hosted by\s*●\s*Ann/.test(s.head), s.head);
  check('status line: Ben chooses', /Ben chooses a tile to auction/.test(s.status), s.status);
  check('"Still to choose" lists Ben ▸ Cat ▸ Ann', /Still without a tile: ● Ben ▸ ● Cat ▸ ● Ann/.test(s.order), s.order);
  check('hand-over: Ben taps "tap when you have the phone" before his controls show', log.some((e) => e.kind === 'handover' && /👉 Ben: tap when you have the phone/.test(e.text)), JSON.stringify(log.filter((e) => e.kind === 'handover')));
  check('pick tip and three tappable cards', /Tap the tile you want to auction/.test(s.ctrl) && s.cards.filter((c) => c.can).length === 3, s.ctrl);
  check('dock: turn name is the acting seat (Ben)', /Ben/.test(s.turnName), s.turnName);
  check('active chip = acting seat', s.chips[1].active && !s.chips[0].active, JSON.stringify(s.chips.map((c) => c.active)));
  const deck = await p.evaluate(() => window.__carc.state.deck.length);
  check('deck counter = pile + 3 unplayed bazaar tiles', +s.deckCount === deck + 3, `${s.deckCount} vs ${deck}+3`);
  check('during the auction: rotate/✓ disabled, hint and ransom hidden', s.rotateDisabled && s.confirmDisabled && s.hintHidden && s.ransomHidden);
  // the board does nothing during the auction
  const before = await p.evaluate(() => JSON.stringify(window.__carc.state));
  await p.touchscreen.tap(195, 330); await p.tap('#btn-confirm', { force: true }).catch(() => {}); await p.waitForTimeout(250);
  check('board taps and ✓ do nothing during the auction', before === await p.evaluate(() => JSON.stringify(window.__carc.state)));
  await shot(p, 'on3-pick-ben');
  // pick: tap card 0, + + − + → 2
  await tapSel(p, '#bazaar .bz-card.can[data-i="0"]'); await p.waitForTimeout(150);
  for (const op of ['plus', 'plus', 'minus', 'plus']) { await tapSel(p, `#bazaar [data-bz="${op}"]`); await p.waitForTimeout(80); }
  s = await info(p);
  check('stepper after + + − +: "Pick & bid 2"', s.buttons.includes('pick:Pick & bid 2') && s.cards[0].sel, s.buttons.join(', '));
  await tapSel(p, '#bazaar [data-bz="minus"]'); await tapSel(p, '#bazaar [data-bz="minus"]'); await tapSel(p, '#bazaar [data-bz="minus"]'); await p.waitForTimeout(80);
  s = await info(p);
  check('stepper never goes below 0', s.buttons.includes('pick:Pick & bid 0'), s.buttons.join(', '));
  await tapSel(p, '#bazaar [data-bz="plus"]'); await tapSel(p, '#bazaar [data-bz="plus"]'); await p.waitForTimeout(80);
  await shot(p, 'on3-pick-chosen');
  await tapSel(p, '#bazaar [data-bz="pick"]');
  await p.waitForTimeout(100);
  s = await info(p);
  check('no controls while the pick is animated', s.buttons.length === 0 && s.busy, JSON.stringify({ busy: s.busy, b: s.buttons }));
  await waitState(p, () => window.__carc.state.bazaar?.stage === 'bid'); await idle(p);
  log = await takeLog(p); s = await info(p);
  check('banner: Ben picks a tile and bids 2', has(banners(log), /Ben picks a tile and bids 2/), banners(log).join(' | '));
  {
    const ctl = log.find((e) => e.kind === 'controls' && /Cat/.test(e.text));
    const ban = log.find((e) => e.kind === 'banner' && /👉 Cat/.test(e.text));
    const pickAt = log.find((e) => e.kind === 'banner' && /Ben picks/.test(e.text));
    console.log(`INFO hand-over: "Ben picks…" banner at ${pickAt?.t} ms, Cat's controls at ${ctl?.t} ms, "👉 Cat" banner at ${ban?.t} ms (controls ${ctl && ban ? ctl.t - ban.t : '?'} ms after the 👉 banner)`);
  }
  check('👉 banner for Cat (bid)', has(banners(log), /👉 Cat: your turn in the bazaar/));
  check('status: Cat bids more than 2 or passes', /Cat: bid more than 2, or pass/.test(s.status), s.status);
  check('card shows the high bid', /Bid 2\s*·\s*●\s*Ben/.test(s.cards[0].who), s.cards[0].who);
  check('bid controls: "Bid 3" and Pass', s.buttons.includes('raise:Bid 3') && s.buttons.includes('pass:Pass'), s.buttons.join(', '));
  await tapSel(p, '#bazaar [data-bz="minus"]'); await p.waitForTimeout(80);
  s = await info(p);
  check('bid stepper never goes below high + 1', s.buttons.includes('raise:Bid 3'), s.buttons.join(', '));
  await shot(p, 'on3-bid-cat');
  await tapSel(p, '#bazaar [data-bz="pass"]');
  await waitState(p, () => window.__carc.G.actingSeat(window.__carc.state) === 0); await idle(p);
  log = await takeLog(p);
  check('banner: Cat passes, then 👉 Ann', has(banners(log), /Cat passes/) && has(banners(log), /👉 Ann: your turn in the bazaar/), banners(log).join(' | '));
  await tapSel(p, '#bazaar [data-bz="plus"]'); await p.waitForTimeout(80);
  await tapSel(p, '#bazaar [data-bz="raise"]');
  await waitState(p, () => window.__carc.state.bazaar?.stage === 'decide'); await idle(p);
  log = await takeLog(p); s = await info(p);
  check('banner: Ann bids 4, then 👉 Ben', has(banners(log), /Ann bids 4/) && has(banners(log), /👉 Ben: your turn in the bazaar/), banners(log).join(' | '));
  check('decide status', /Ben: keep the tile \(pay Ann 4\) or sell it to Ann/.test(s.status), s.status);
  check('decide buttons', s.buttons.includes('buy:Keep it (pay Ann 4)') && s.buttons.includes('sell:Sell it (Ann pays you 4)'), s.buttons.join(', '));
  await shot(p, 'on3-decide-ben');
  await tapSel(p, '#bazaar [data-bz="buy"]');
  await waitState(p, () => window.__carc.state.bazaar?.stage === 'pick' && window.__carc.G.actingSeat(window.__carc.state) === 2); await idle(p);
  log = await takeLog(p); s = await info(p);
  check('banner: Ben keeps the tile and pays Ann 4', has(banners(log), /Ben keeps the tile and pays Ann 4/), banners(log).join(' | '));
  check('chips of Ben and Ann bump', bumps(log).some((b) => b.startsWith('1:')) && bumps(log).some((b) => b.startsWith('0:')), bumps(log).join(' '));
  check('Ben\'s score shows "−4" in red', s.chips[1].score === '−4' && s.chips[1].neg && /rgb\(255, 157, 134\)/.test(s.chips[1].color), JSON.stringify(s.chips[1]));
  check('next chooser Cat (👉), "Still without a tile: Cat ▸ Ann"', has(banners(log), /👉 Cat/) && /Still without a tile: ● Cat ▸ ● Ann/.test(s.order), s.order);
  check('owned card shows owner and price', /Ben\s*·\s*paid 4/.test(s.cards[0].who) && !s.cards[0].can, s.cards[0].who);
  const stateBefore = await p.evaluate(() => JSON.stringify(window.__carc.state));
  await tapSel(p, '#bazaar .bz-card[data-i="0"]'); await p.waitForTimeout(150);
  check('tapping an owned card does nothing', stateBefore === await p.evaluate(() => JSON.stringify(window.__carc.state)) && !(await info(p)).buttons.some((b) => b.startsWith('pick:')));
  await shot(p, 'on3-pick-cat');
  // Cat picks 1 for 0, Ann raises to 1, Cat sells
  await tapSel(p, '#bazaar .bz-card.can[data-i="1"]'); await p.waitForTimeout(120);
  await tapSel(p, '#bazaar [data-bz="pick"]');
  await waitState(p, () => window.__carc.state.bazaar?.stage === 'bid'); await idle(p);
  await tapSel(p, '#bazaar [data-bz="raise"]');
  await waitState(p, () => window.__carc.state.bazaar?.stage === 'decide'); await idle(p);
  await takeLog(p);
  await tapSel(p, '#bazaar [data-bz="sell"]');
  await p.waitForTimeout(500);
  const midLog = await p.evaluate(() => window.__log.slice());
  await waitState(p, () => window.__carc.state.phase === 'place'); await idle(p);
  log = await takeLog(p); s = await info(p);
  const bl = banners(log);
  check('banner: Cat sells the tile to Ann for 1', has(bl, /Cat sells the tile to Ann for 1/), bl.join(' | '));
  check('banner: Cat gets the last tile for free', has(bl, /Cat gets the last tile for free/));
  check('banner: bazaar round', has(bl, /Bazaar round: everyone plays the tile they got/));
  check('banner: Ben plays the tile from the bazaar', has(bl, /Ben plays the tile from the bazaar/) || has(bl, /Ben's turn/), bl.join(' | '));
  check('scores Ann 3, Ben −4, Cat 1', s.scores.join() === '3,-4,1' && s.chips.map((c) => c.score).join() === '3,−4,1', s.chips.map((c) => c.score).join());
  void midLog;
  // the strip
  check('strip shown during the round', s.strip && !s.sheet, JSON.stringify({ strip: s.strip, sheet: s.sheet }));
  check('strip header', /everyone plays their tile in turn/.test(s.head), s.head);
  const deck2 = await p.evaluate(() => window.__carc.state.deck.length);
  check('deck counter in the round = pile + drawn + 2 unplayed', +s.deckCount === deck2 + 1 + 2, `${s.deckCount} vs ${deck2}+1+2`);
  const geo = await stripGeometry(p);
  check('strip sits above the dock', geo.strip.bottom <= geo.dock.top + 1, JSON.stringify({ strip: geo.strip, dock: geo.dock }));
  check('no candidate square hidden under the strip or the dock', geo.hidden.length === 0, `${geo.hidden.length} of ${geo.total} hidden: ${JSON.stringify(geo.hidden)}`);
  await shot(p, 'on3-round-strip');
  // play the three bazaar turns
  for (const who of ['Ben', 'Cat', 'Ann']) {
    s = await info(p);
    check(`round: ${who}'s turn`, new RegExp(who).test(s.turnName) && s.phase === 'place', s.turnName);
    await placeViaUI(p);
    await waitState(p, (w) => { const st = window.__carc.state; return st.phase !== 'action'; }, who);
    await idle(p);
  }
  log = await takeLog(p); s = await info(p);
  check('toast: the bazaar is over; strip gone; Ben (host+1) plays next', has(toasts(log), /The bazaar is over/) && !s.strip && !s.sheet && s.current === 1, `${toasts(log).join(' | ')} current=${s.current}`);
  // the scores table
  await p.evaluate(() => document.querySelector('#players .pchip').click());
  await p.waitForSelector('#scores-modal:not([hidden])');
  const table = await p.evaluate(() => {
    const t = document.querySelector('#scores-table table');
    const head = [...t.querySelectorAll('tr:first-child th')].map((x) => x.textContent);
    const rows = [...t.querySelectorAll('tr')].slice(1).map((r) => [...r.children].map((x) => ({ text: x.textContent.trim(), color: getComputedStyle(x).color })));
    return { head, rows, legend: document.querySelector('.score-legend')?.textContent };
  });
  const col = table.head.indexOf('🛒');
  check('score table has the 🛒 column', col > 0, table.head.join(' '));
  const benRow = table.rows.find((r) => /Ben/.test(r[0].text));
  check('Ben\'s 🛒 cell and total show "−4"', benRow && benRow[col].text === '−4' && benRow[benRow.length - 1].text === '−4', JSON.stringify(benRow?.map((c) => c.text)));
  check('negative total in the table is red (H.4)', benRow && /rgb\((1[5-9]\d|2\d\d), (\d|[1-9]\d), (\d|[1-9]\d)\)/.test(benRow[benRow.length - 1].color), benRow?.[benRow.length - 1].color);
  check('legend explains 🛒', /🛒 bazaar bids/.test(table.legend), table.legend);
  await shot(p, 'on3-scores');
  check('no page errors (ON3)', !errors.length, errors.join(' | '));
  await ctx.close();
}

// geometry of the strip, the dock and the candidate squares on screen
async function stripGeometry(p) {
  return p.evaluate(() => {
    const c = window.__carc;
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
    const strip = r(document.getElementById('bazaar'));
    const dock = r(document.getElementById('dock'));
    const z = c.view.cam.z;
    const hidden = [];
    const list = c.ui.placements || [];
    for (const q of list) {
      const [sx, sy] = c.view.toScreen(q.x, q.y);
      const box = { left: sx - z / 2, right: sx + z / 2, top: sy - z / 2, bottom: sy + z / 2 };
      if (box.right < 0 || box.left > c.view.w || box.bottom < 0 || box.top > c.view.h) continue; // off screen (can be panned to)
      const under = (o) => box.left < o.right && box.right > o.left && box.top < o.bottom && box.bottom > o.top;
      const visible = Math.max(0, Math.min(box.bottom, strip.top) - Math.max(box.top, 0));
      if ((under(strip) || under(dock)) && visible < z * 0.5) hidden.push({ x: q.x, y: q.y, sy: Math.round(sy), z: Math.round(z) });
    }
    return { strip, dock, hidden, total: list.length, z };
  });
}

// ===================================================================== scenario 2: the no-bidding variant
async function variant() {
  console.log('\n== BZ10: the no-bidding variant (three people) ==');
  const { p, ctx, errors } = await newPage();
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }, { name: 'Cat', color: 'green', kind: 'human' }], { expansions: { bridges: true }, bcb: { auction: false } });
    s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } }; s.placed = 1;
    s.deck = ['B', 'B', 'B', 'B', 'U', 'V', 'E']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    return s;
  });
  await idle(p); await takeLog(p);
  await placeViaUI(p, { x: 0, y: 1 });
  await waitState(p, () => window.__carc.state.phase === 'bazaar'); await idle(p);
  let log = await takeLog(p); let s = await info(p);
  check('variant: open banner "Everyone takes one of 3 tiles"', has(banners(log), /Everyone takes one of 3 tiles/), banners(log).join(' | '));
  check('variant: 👉 Ben in the take stage', s.stage === 'take' && s.acting === 1 && has(banners(log), /👉 Ben/));
  check('variant: status "Ben takes a tile", tip, no "Still to choose", no stepper', /Ben takes a tile/.test(s.status) && /Tap the tile you want/.test(s.ctrl) && !s.order && !s.buttons.length, `${s.status} | ${s.ctrl} | ${s.order}`);
  await shot(p, 'variant-take-ben');
  await tapSel(p, '#bazaar .bz-card.can[data-i="2"]');
  await waitState(p, () => window.__carc.state.phase === 'place'); await idle(p);
  s = await info(p);
  check('variant: Ben plays his tile at once, strip shown', s.current === 1 && s.strip, JSON.stringify({ cur: s.current, strip: s.strip }));
  await shot(p, 'variant-ben-plays');
  await placeViaUI(p);
  await waitState(p, () => window.__carc.state.phase === 'bazaar'); await idle(p);
  log = await takeLog(p); s = await info(p);
  check('variant: then 👉 Cat takes', s.acting === 2 && s.cards.filter((c) => c.can).length === 2 && has(banners(log), /👉 Cat/), banners(log).join(' | '));
  await tapSel(p, '#bazaar .bz-card.can');
  await waitState(p, () => window.__carc.state.phase === 'place'); await idle(p);
  await placeViaUI(p);
  await waitState(p, () => window.__carc.state.current === 0 && window.__carc.state.phase === 'place'); await idle(p);
  s = await info(p);
  check('variant: the host gets the last tile automatically', s.current === 0 && s.phase === 'place' && s.strip, JSON.stringify({ cur: s.current, phase: s.phase }));
  await placeViaUI(p);
  await waitState(p, () => !window.__carc.state.bazaar); await idle(p);
  s = await info(p);
  check('variant: no payments, play resumes with Ben', s.scores.join() === '0,0,0' && s.current === 1, s.scores.join());
  check('no page errors (variant)', !errors.length, errors.join(' | '));
  await ctx.close();
}

// ===================================================================== scenario 3: "⚠ fits nowhere now" (H.4: for anyone)
async function fitsNowhere() {
  console.log('\n== H.4: the "fits nowhere" mark ==');
  const { p, ctx, errors } = await newPage();
  // the hole of four W tiles is filled with the bazaar tile: a monastery now fits only with a bridge; a river tile nowhere
  const build = (G, hostBridges) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }, { name: 'Cat', color: 'green', kind: 'human' }], { expansions: { bridges: true } });
    s.board = {}; [['0,-1', 'W', 2], ['1,0', 'W', 3], ['0,1', 'W', 0], ['-1,0', 'W', 1]].forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
    s.placed = 4; s.deck = ['U', 'U', 'RI.1/II', 'U', 'B']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    G.applyAction(s, { t: 'turn', x: 0, y: 0, r: 0, act: null });
    s.players[0].bridges = hostBridges;
    return s;
  };
  await start(p, build, 0);
  await idle(p);
  let s = await info(p);
  const fit = await p.evaluate(() => {
    const c = window.__carc, st = c.state;
    return st.bazaar.tiles.map((x) => st.players.map((pl, i) => { const k = st.current; st.current = i; const n = c.G.validPlacements(st, x.t).length; st.current = k; return n; }));
  });
  console.log('   tiles', JSON.stringify(await p.evaluate(() => window.__carc.state.bazaar.tiles.map((x) => x.t))), 'placements per seat', JSON.stringify(fit));
  const river = s.cards.find((c) => c.i === 2);
  check('river tile marked "⚠ fits nowhere now"', /fits nowhere now/.test(river.who), river.who);
  check('a monastery that fits for Ben and Cat (with a bridge) is not marked, host without bridges', !/fits nowhere/.test(s.cards[0].who), `card 0 (B): "${s.cards[0].who}"`);
  await shot(p, 'fits-nowhere-host-without-bridges');
  check('no page errors (fits nowhere)', !errors.length, errors.join(' | '));
  await ctx.close();
}

// ===================================================================== scenario 4: a raise when the bid is already 99
async function maxBid() {
  console.log('\n== BAZAAR_MAX_BID: a bidder facing 99 ==');
  const { p, ctx, errors } = await newPage();
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }, { name: 'Cat', color: 'green', kind: 'human' }], { expansions: { bridges: true } });
    s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } }; s.placed = 1;
    s.deck = ['B', 'B', 'B', 'B', 'U', 'V', 'E']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    G.applyAction(s, { t: 'turn', x: 0, y: 1, r: 0, act: null });
    G.applyAction(s, { t: 'bazaar', pick: 0, bid: 99 });
    return s;
  });
  await idle(p); await takeLog(p);
  let s = await info(p);
  console.log('   bid controls at 99:', s.buttons.join(', '));
  check('no raise above 99 is offered (only Pass)', !s.buttons.some((b) => /^raise:Bid (100|99)$/.test(b)), s.buttons.join(', '));
  await shot(p, 'bid-at-99');
  if (await tapSel(p, '#bazaar [data-bz="raise"]')) {
    await p.waitForTimeout(700);
    const log = await takeLog(p);
    s = await info(p);
    console.log('   after tapping it:', toasts(log).join(' | '), 'stage', s.stage, 'acting', s.acting);
  }
  check('no page errors (max bid)', !errors.length, errors.join(' | '));
  await ctx.close();
}

// ===================================================================== scenario 5: with bots, a busier board, 6 players
async function withBots(n) {
  console.log(`\n== bots: ${n} players, a mid-game board, the strip and its candidates ==`);
  const { p, ctx, errors } = await newPage();
  await start(p, (G, n) => {
    const names = ['Tess', 'Bot A', 'Bot B', 'Bot C', 'Bot D', 'Bot E'];
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
    const s = G.newGame(names.slice(0, n).map((name, i) => ({ name, color: colors[i], kind: i ? 'ai' : 'human', level: ['easy', 'medium', 'hard'][i % 3] })),
      { expansions: { bridges: true, inns: true, traders: true }, bcb: { castles: false } });
    // forty random tiles first (no figures), bazaar tiles kept back
    const bz = (t) => G.validPlacements(s, t) && ['BB/Cccc.b', 'BB/CFc.b', 'BB/CFR.b', 'BB/F.b', 'BB/R.bi', 'BB/RFR.b', 'BB/RFR.bi'].includes(t);
    let rng = 7; const R = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x80000000; };
    for (let i = 0; i < 40 && s.phase === 'place'; i++) {
      if (bz(s.drawn)) { const j = s.deck.findIndex((t) => !bz(t)); [s.deck[j], s.drawn] = [s.drawn, s.deck[j]]; }
      const vp = G.validPlacements(s); const pl = vp[Math.floor(R() * vp.length)]; const r = pl.rots.find((q) => !pl.needsBridge?.[q]) ?? pl.rots[0];
      G.applyAction(s, { t: 'turn', x: pl.x, y: pl.y, r, bridge: pl.needsBridge?.[r]?.[0] || null, act: null });
    }
    // the person hosts a bazaar now
    s.current = 0; s.part = 1; s.bonus = false;
    const j = s.deck.findIndex((t) => t === 'BB/F.b');
    [s.deck[j], s.drawn] = [s.drawn, s.deck[j]];
    return s;
  }, n);
  await idle(p); await takeLog(p);
  await placeViaUI(p);
  const seen = new Set();
  let stripChecked = false;
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => { const c = window.__carc, s = c.state; return { phase: s.phase, stage: s.bazaar?.stage, acting: c.G.actingSeat(s), human: s.players[c.G.actingSeat(s) ?? s.current].kind === 'human', busy: c.ui.busy, bazaar: !!s.bazaar, current: s.current }; });
    if (!st.bazaar && seen.size) break;
    if (st.busy || !st.human) {
      if (st.phase === 'bazaar' && !seen.has(`bot-${st.stage}`)) { seen.add(`bot-${st.stage}`); await shot(p, `bots${n}-sheet-${st.stage}`); }
      await p.waitForTimeout(150); continue;
    }
    if (st.phase === 'bazaar') {
      seen.add(st.stage);
      if (!seen.has(`shot-${st.stage}`)) { seen.add(`shot-${st.stage}`); await shot(p, `bots${n}-you-${st.stage}`); }
      if (st.stage === 'pick') { await tapSel(p, '#bazaar .bz-card.can'); await p.waitForTimeout(120); await tapSel(p, '#bazaar [data-bz="plus"]'); await tapSel(p, '#bazaar [data-bz="pick"]'); }
      else if (st.stage === 'bid') await tapSel(p, '#bazaar [data-bz="raise"]');
      else if (st.stage === 'decide') await tapSel(p, '#bazaar [data-bz="sell"]');
      await p.waitForTimeout(300); continue;
    }
    if (st.phase === 'place' && st.bazaar) {
      seen.add('round');
      if (!stripChecked) {
        stripChecked = true;
        await idle(p);
        const geo = await stripGeometry(p);
        const s = await info(p);
        check(`${n} players: strip above the dock`, geo.strip.bottom <= geo.dock.top + 1, JSON.stringify({ strip: geo.strip, dock: geo.dock }));
        check(`${n} players: no candidate square hidden under the strip/dock`, geo.hidden.length === 0, `${geo.hidden.length} of ${geo.total}: ${JSON.stringify(geo.hidden.slice(0, 4))}`);
        const over = await p.evaluate(() => { const b = document.getElementById('bazaar'); return [...b.querySelectorAll('.bz-card')].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }); });
        check(`${n} players: strip cards inside the screen`, over.every(([l, r]) => l >= 0 && r <= 390), JSON.stringify(over));
        const deck = await p.evaluate(() => { const s = window.__carc.state; return s.deck.length + (s.drawn ? 1 : 0) + (s.setAside?.length || 0) + s.bazaar.tiles.filter((x) => !x.played).length; });
        check(`${n} players: deck counter in the round`, +s.deckCount === deck, `${s.deckCount} vs ${deck}`);
        await shot(p, `bots${n}-round-strip-your-turn`);
      }
      await placeViaUI(p);
      continue;
    }
    await p.waitForTimeout(150);
  }
  const log = await takeLog(p);
  console.log(`   banners seen (${n}p): ${[...new Set(banners(log))].slice(0, 30).join(' | ')}`);
  check(`${n} players: the auction finished and the round was played`, seen.has('round'), [...seen].join(','));
  check(`no page errors (bots ${n})`, !errors.length, errors.join(' | '));
  await ctx.close();
}

// ===================================================================== scenario 6: side tools during one's bazaar turn
async function sideTools() {
  console.log('\n== the side tools (centre map, hint, ransom) during a bazaar turn ==');
  const { p, ctx, errors } = await newPage();
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }], { expansions: { bridges: true, tower: true } });
    s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } }; s.placed = 1;
    s.deck = ['B', 'B', 'B', 'U', 'V']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    s.players[0].prisoners.push({ p: 1, k: 'meeple' }); s.players[1].supply.meeple--; // Ann holds Ben's meeple
    s.players[1].score = 6; s.players[1].breakdown.road = 6;
    G.applyAction(s, { t: 'turn', x: 0, y: 1, r: 0, act: null });
    G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 }); G.applyAction(s, { t: 'bazaar', pass: true }); // the round: Ben first
    return s;
  });
  await idle(p);
  const tools = await p.evaluate(() => ['btn-center', 'btn-hint', 'btn-ransom'].map((id) => {
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { id, hidden: el.hidden, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hit: hit ? (hit.closest('#bazaar') ? '#bazaar strip' : hit.closest('button')?.id || hit.id || hit.tagName) : null };
  }));
  const st = await info(p);
  console.log('   ', JSON.stringify(tools));
  check('Ben\'s bazaar turn with the strip shown, ransom offered', st.strip && st.current === 1 && !tools[2].hidden, JSON.stringify({ strip: st.strip, cur: st.current }));
  for (const t of tools) if (!t.hidden) check(`${t.id} can be tapped during a bazaar turn (not under the strip)`, t.hit === t.id, `a tap at its centre hits ${t.hit}`);
  await shot(p, 'side-tools-under-strip');
  if (!tools[2].hidden) {
    await p.touchscreen.tap(tools[2].rect[0] + tools[2].rect[2] / 2, tools[2].rect[1] + tools[2].rect[3] / 2);
    await p.waitForTimeout(400);
    const asked = await p.evaluate(() => !document.getElementById('ask-modal').hidden);
    check('tapping the ransom button opens the ransom dialog', asked);
  }
  check('no page errors (side tools)', !errors.length, errors.join(' | '));
  await ctx.close();
}

// ===================================================================== scenario 7: skip toast, swapped bought tile toast
async function toastsScenario() {
  console.log('\n== toasts: too few tiles for a bazaar; a bought tile that fits nowhere ==');
  let { p, ctx, errors } = await newPage();
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }, { name: 'Cat', color: 'green', kind: 'human' }], { expansions: { bridges: true } });
    s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } }; s.placed = 1;
    s.deck = ['U', 'V']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    return s;
  });
  await idle(p); await takeLog(p);
  await placeViaUI(p, { x: 0, y: 1 });
  await waitState(p, () => window.__carc.state.current === 1); await idle(p);
  let log = await takeLog(p);
  check('toast: not enough tiles for a bazaar (2 left, 3 players)', has(toasts(log), /Not enough tiles left for a bazaar/), toasts(log).join(' | '));
  await ctx.close();
  ({ p, ctx, errors } = await newPage());
  await start(p, (G) => {
    const s = G.newGame([{ name: 'Ann', color: 'red', kind: 'human' }, { name: 'Ben', color: 'blue', kind: 'human' }], { expansions: { bridges: true } });
    s.board = {}; [['0,-1', 'W', 2], ['1,0', 'W', 3], ['0,1', 'W', 0], ['-1,0', 'W', 1]].forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
    s.placed = 4; s.deck = ['B', 'BB/RFR.b', 'B', 'B']; s.drawn = 'BB/F.b'; s.current = 0; s.phase = 'place'; s.setAside = [];
    s.players[1].bridges = 0; // a monastery fits nowhere for Ben once the hole is filled
    G.applyAction(s, { t: 'turn', x: 0, y: 0, r: 0, act: null });
    G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 }); // Ben picks a monastery; Ann (the host) to bid
    return s;
  });
  await idle(p); await takeLog(p);
  await tapSel(p, '#bazaar [data-bz="pass"]');
  await waitState(p, () => window.__carc.state.phase === 'place'); await idle(p);
  log = await takeLog(p);
  const s = await info(p);
  check('banner when a bought tile fits nowhere and is swapped for a drawn one (and a toast naming it)', has(banners(log), /bazaar tile fits nowhere: they draw another/) && has(toasts(log), /Fits nowhere, put aside: Monastery/), `${banners(log).join(' | ')} || ${toasts(log).join(' | ')}`);
  check('Ben now plays the drawn tile (BB/RFR.b)', s.current === 1 && await p.evaluate(() => window.__carc.state.drawn) === 'BB/RFR.b');
  await shot(p, 'bought-tile-swapped');
  check('no page errors (toasts)', !errors.length, errors.join(' | '));
  await ctx.close();
}

const scenarios = { passAndPlay, variant, fitsNowhere, maxBid, sideTools, toasts: toastsScenario, bots4: () => withBots(4), bots6: () => withBots(6) };
for (const [name, fn] of Object.entries(scenarios)) {
  if (only.length && !only.includes(name)) continue;
  try { await fn(); } catch (e) { check(`scenario ${name} ran`, false, e.message.split('\n')[0]); }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed; screenshots in ${out}`);
for (const f of failed) console.log(`  FAIL ${f.name} — ${f.detail}`);
