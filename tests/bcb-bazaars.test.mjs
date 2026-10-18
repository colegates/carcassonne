// Bridges, Castles & Bazaars — the bazaars: MASTER H.5 BZ1–BZ10, the triple combination CI3
// (Traders & Builders × Princess & Dragon × BCB) and the computer players' bazaar decisions
// (ai.js chooseBazaarAction: legality in every stage, sensible bids, speed).
// A test whose title starts with "BUG:" encodes MASTER H and fails because the app deviates.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
import { chooseBazaarAction } from '../public/js/ai.js';
import { hasTag } from '../public/js/tiles.js';

const T = test;
const COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
function setup(board, drawn, { players = 2, exps = { bridges: true }, bcb, deck = ['B', 'B', 'B', 'B', 'B', 'B'] } = {}) {
  const s = G.newGame(Array.from({ length: players }, (_, i) => ({ name: 'P' + i, color: COLORS[i] })), { expansions: exps, ...(bcb ? { bcb } : {}) }, () => 0.5);
  s.board = {};
  board.forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
  s.placed = board.length;
  s.drawn = drawn; s.phase = 'place'; s.current = 0; s.setAside = [];
  s.deck = deck.slice();
  return s;
}
const put = (s, k, p, f, kind = 'meeple') => { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; };
const turn = (s, x, y, r, act = null, bridge = null, extra = {}) => G.applyAction(s, { t: 'turn', x, y, r, bridge, act, ...extra });
const bz = (s, a) => G.applyAction(s, { t: 'bazaar', ...a });
const kinds = (ev) => ev.map((e) => e.kind);
const scores = (s) => s.players.map((p) => p.score);
// finish a dragon flight (first legal move) and castle decisions (take the points)
function settle(s, events = []) {
  for (let i = 0; i < 60 && (s.phase === 'dragon' || s.phase === 'castle'); i++) {
    if (s.phase === 'dragon') events.push(...G.applyAction(s, { t: 'dragon', key: G.dragonMoves(s)[0] }));
    else events.push(...G.applyAction(s, { t: 'castle', fi: s.castleAsk[0].fi, build: false }));
  }
  return events;
}
// place the drawn tile at the first legal spot (a spot without a bridge first), no figure
function playFirst(s, where = () => true) {
  const c = [];
  for (const p of G.validPlacements(s)) for (const r of p.rots) c.push({ x: p.x, y: p.y, r, bridge: p.needsBridge?.[r]?.[0] || null });
  const ok = c.filter(where).sort((a, b) => (a.bridge ? 1 : 0) - (b.bridge ? 1 : 0));
  assert.ok(ok.length, `no placement for ${s.drawn}`);
  return settle(s, turn(s, ok[0].x, ok[0].y, ok[0].r, null, ok[0].bridge));
}
// MASTER H.2.11: tiles and figures are conserved
const countTiles = (s) => Object.keys(s.board).length + s.discarded.length + s.setAside.length + s.deck.length + (s.drawn ? 1 : 0)
  + (s.bazaar ? s.bazaar.tiles.filter((x) => !x.played).length : 0);
const countFigures = (s) => Object.values(s.board).reduce((a, t) => a + t.pieces.length, 0)
  + s.players.reduce((a, p) => a + Object.values(p.supply).reduce((x, y) => x + y, 0) + p.prisoners.length, 0)
  + Object.values(s.towers).filter((t) => t.top).length + (s.castles || []).filter((c) => c.k).length;
const breakdownOK = (s) => s.players.every((p) => Object.values(p.breakdown).reduce((a, b) => a + b, 0) === p.score);
// the engine's seeded random numbers (game.js rand), to predict where set-aside tiles go back
function nextRand(rng) {
  const a = (rng + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
// Four W tiles (three roads, a field edge) around a hole at (0,0): every frontier square outside the
// hole touches roads only, so once the hole is filled a monastery (B) fits only with a bridge.
const W_HOLE = [['0,-1', 'W', 2], ['1,0', 'W', 3], ['0,1', 'W', 0], ['-1,0', 'W', 1]];

// ---------------------------------------------------------------- BZ1 start
T('BZ1: the auction waits for the castle decision and the scoring of the part with the bazaar tile', () => {
  // E r2 at (0,0) is a one-edge cap facing S with P1's knight; BB/CFR.b r0 below it closes a small city
  const s = setup([['0,0', 'E', 2]], 'BB/CFR.b', { players: 2, deck: ['B', 'B', 'B', 'U', 'V'] });
  put(s, '0,0', 1, 0);
  const ev1 = turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle', 'castle decision first');
  assert.equal(s.bazaar, null, 'no auction before the castle decision');
  assert.ok(!kinds(ev1).includes('bazaarOpen'));
  assert.equal(G.actingSeat(s), 1);
  const built = G.cloneState(s);
  const ev2 = G.applyAction(s, { t: 'castle', fi: 0, build: false });
  const k = kinds(ev2);
  assert.ok(k.includes('city') && k.indexOf('city') < k.indexOf('bazaarOpen'), `the city scores before the bazaar opens: ${k}`);
  assert.equal(s.players[1].score, 4, 'points are in before the auction');
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.host, 0); assert.equal(G.actingSeat(s), 1);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['V', 'U']);
  const ev3 = G.applyAction(built, { t: 'castle', fi: 0, build: true });
  assert.ok(kinds(ev3).indexOf('castleBuilt') < kinds(ev3).indexOf('bazaarOpen'));
  assert.equal(built.castles.length, 1); assert.equal(built.phase, 'bazaar');
});

T('BZ1: a bazaar tile thrown away because it only fits with a bridge holds no bazaar; placed with its bridge it does', () => {
  const s = setup([['0,0', 'X', 0]], 'BB/F.b', { players: 2, deck: ['B', 'B', 'U', 'V', 'E'] });
  assert.equal(G.canDiscard(s), true, 'next to the crossroads every spot needs a bridge');
  const keep = G.cloneState(s);
  const ev = G.applyAction(s, { t: 'discard' });
  assert.deepEqual(kinds(ev), ['discard']);
  assert.ok(s.discarded.includes('BB/F.b'));
  assert.equal(s.bazaar, null); assert.equal(s.phase, 'place'); assert.equal(s.current, 0, 'same player draws again');
  assert.equal(s.drawn, 'E');
  const vp = G.validPlacements(keep).find((p) => p.x === 0 && p.y === 1);
  const r = vp.rots[0];
  const ev2 = turn(keep, 0, 1, r, null, vp.needsBridge[r][0]);
  assert.ok(kinds(ev2).includes('bazaarOpen')); assert.equal(keep.phase, 'bazaar'); assert.equal(keep.players[0].bridges, 2);
});

T('BZ1: with bcb.bazaars off a bazaar tile holds no auction', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, bcb: { bazaars: false }, deck: ['B', 'U', 'V', 'E'] });
  const ev = turn(s, 0, 1, 0);
  assert.ok(!kinds(ev).some((k) => k.startsWith('bazaar')));
  assert.equal(s.bazaar, null); assert.equal(s.phase, 'place'); assert.equal(s.current, 1);
});

T('BZ1/BC34: fewer drawable tiles than players → skipped; dragon tiles count only once the dragon is in play', () => {
  const exps = { bridges: true, dragon: true };
  const deck = ['DG/Rr.d', 'B', 'DG/RFr.d']; // one drawable tile before the first volcano, three after
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, exps, deck });
  assert.equal(G.drawableCount(s), 1);
  const ev = turn(s, 0, 1, 0);
  assert.ok(kinds(ev).includes('bazaarSkip'));
  assert.equal(s.bazaar, null); assert.equal(s.current, 1); assert.equal(s.drawn, 'B');
  assert.deepEqual(s.setAside, ['DG/RFr.d'], 'the next draw set the dragon tile aside');
  const s2 = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, exps, deck });
  s2.dragon = '0,0';
  assert.equal(G.drawableCount(s2), 3);
  turn(s2, 0, 1, 0);
  assert.equal(s2.phase, 'bazaar');
  assert.deepEqual(s2.bazaar.tiles.map((x) => x.t), ['DG/RFr.d', 'B'], 'with the dragon in play a dragon tile is revealed normally');
});

T('BZ1/BZ9: exactly as many tiles as players: all go up, the round is played out, and only then the game ends', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, deck: ['U', 'V', 'B'] });
  const tiles0 = countTiles(s);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'bazaar'); assert.equal(s.deck.length, 0);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['B', 'V', 'U']);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true }); // P1 pays the bank 0
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true }); // P2 pays the bank 0, P0 gets the last tile
  const order = [];
  while (s.bazaar) {
    assert.notEqual(s.phase, 'over', 'never over inside the round');
    assert.equal(countTiles(s), tiles0);
    order.push(s.current);
    playFirst(s);
  }
  assert.deepEqual(order, [1, 2, 0]);
  assert.equal(s.phase, 'over'); assert.ok(Array.isArray(s.finalEvents));
});

T('BZ1: a bazaar tile bought at the bazaar and placed in the round holds no new auction (no chain reaction)', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, deck: ['B', 'B', 'U', 'BB/RFR.b'] });
  turn(s, 0, 1, 0);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['BB/RFR.b', 'U']);
  bz(s, { pick: 0, bid: 1 }); bz(s, { pass: true }); // P1 buys the bazaar tile from the bank
  assert.equal(s.drawn, 'BB/RFR.b');
  const ev = playFirst(s);
  assert.ok(!kinds(ev).includes('bazaarOpen')); assert.equal(s.bazaarDue, false);
  assert.equal(s.current, 0); assert.equal(s.bazaar.host, 0, 'still the first bazaar');
  playFirst(s);
  assert.equal(s.bazaar, null); assert.equal(s.current, 1); assert.equal(s.phase, 'place');
});

// ---------------------------------------------------------------- BZ2 reveal
T('BZ2: the reveal pops one tile per player from the top in order, sets dragon tiles aside before the first volcano, checks no fit', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, exps: { bridges: true, dragon: true }, deck: ['A', 'U', 'DG/RrC.d', 'RI.1/II', 'DG/Rr.d', 'E'] });
  const ev = turn(s, 0, 1, 0);
  assert.deepEqual(ev.find((e) => e.kind === 'bazaarOpen').tiles, ['E', 'RI.1/II', 'U']);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['E', 'RI.1/II', 'U'], 'a tile that fits nowhere is revealed too');
  assert.deepEqual(s.setAside, ['DG/Rr.d', 'DG/RrC.d']);
  assert.deepEqual(s.deck, ['A']);
  assert.ok(s.bazaar.tiles.every((x) => x.owner === null && x.price === 0 && x.how === null && x.played === false));
  assert.equal(s.bazaar.chooser, 1); assert.equal(s.bazaar.stage, 'pick');
});

// ---------------------------------------------------------------- BZ3 auction
T('BZ3: 2 players — host+1 chooses, the host raises, a sale makes the host pay; last tile free; a pass means paying the bank', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, deck: ['B', 'B', 'U', 'V'] });
  turn(s, 0, 1, 0);
  const s2 = G.cloneState(s);
  assert.equal(G.actingSeat(s), 1);
  bz(s, { pick: 1, bid: 2 });
  assert.equal(s.bazaar.stage, 'bid'); assert.equal(G.actingSeat(s), 0, 'the host bids');
  bz(s, { bid: 5 });
  assert.equal(s.bazaar.stage, 'decide'); assert.equal(G.actingSeat(s), 1);
  const ev = bz(s, { sell: true });
  assert.deepEqual(scores(s), [-5, 5]);
  assert.deepEqual(ev.filter((e) => e.kind === 'bazaarDeal').map((d) => [d.how, d.owner, d.payee, d.price]), [['sell', 0, 1, 5], ['free', 1, null, 0]]);
  assert.equal(s.bazaar.tiles[1].owner, 0); assert.equal(s.bazaar.tiles[0].owner, 1);
  assert.equal(s.phase, 'place'); assert.equal(s.current, 1); assert.equal(s.drawn, 'V');
  bz(s2, { pick: 0, bid: 3 });
  const ev2 = bz(s2, { pass: true });
  assert.deepEqual(scores(s2), [0, -3]);
  assert.deepEqual(ev2.filter((e) => e.kind === 'bazaarDeal').map((d) => [d.how, d.owner, d.payee, d.price]), [['bank', 1, null, 3], ['free', 0, null, 0]]);
  assert.equal(s2.players[1].breakdown.bazaar, -3); assert.ok(breakdownOK(s2));
});

T('BZ3: 4 players — the lap skips seats with a tile; next chooser after a buy and after a sale follows the previous chooser (BC37)', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 4, deck: ['B', 'B', 'A', 'U', 'V', 'E'] });
  turn(s, 0, 1, 0);
  const seats = [];
  const act = (a) => { seats.push(G.actingSeat(s)); bz(s, a); };
  // auction 1: P1 chooses; P2 raises, P3 passes, the host raises; P1 buys
  act({ pick: 0, bid: 1 }); act({ bid: 2 }); act({ pass: true }); act({ bid: 3 }); act({ sell: false });
  assert.deepEqual(seats.splice(0), [1, 2, 3, 0, 1]);
  assert.deepEqual(scores(s), [3, -3, 0, 0]);
  // auction 2: P2 chooses (next after P1); P3 raises, P0 raises, P1 is skipped; P2 sells to P0
  assert.equal(G.actingSeat(s), 2);
  act({ pick: 1, bid: 0 }); act({ bid: 1 }); act({ bid: 2 }); act({ sell: true });
  assert.deepEqual(seats.splice(0), [2, 3, 0, 2]);
  assert.deepEqual(scores(s), [1, -3, 2, 0]);
  // auction 3: P3 chooses — next after the previous chooser P2 ("after the previous buyer" P0 would give P2 again)
  assert.equal(G.actingSeat(s), 3);
  act({ pick: 2, bid: 0 }); act({ pass: true });
  assert.deepEqual(seats.splice(0), [3, 2], 'only P2 is left to bid');
  assert.deepEqual(s.bazaar.tiles.map((x) => [x.owner, x.how, x.price]), [[1, 'buy', 3], [0, 'sell', 2], [3, 'bank', 0], [2, 'free', 0]]);
  assert.equal(s.phase, 'place'); assert.equal(s.current, 1);
  assert.equal(scores(s).reduce((a, b) => a + b, 0), 0); assert.ok(breakdownOK(s));
});

T('BZ3: 6 players hosted by P4 — chooser P5, laps, choosers, last tile free, round order 5,0,1,2,3,4', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 6, exps: { bridges: true, inns: true }, deck: ['B', 'B', 'B', 'B', 'B', 'B', 'A', 'U', 'V', 'E', 'U', 'V'] });
  s.current = 4;
  turn(s, 0, 1, 0);
  assert.equal(s.bazaar.host, 4); assert.equal(s.bazaar.tiles.length, 6);
  const seats = [];
  const act = (a) => { seats.push(G.actingSeat(s)); bz(s, a); };
  act({ pick: 0, bid: 0 }); for (let i = 0; i < 5; i++) act({ pass: true }); // everyone passes: P5 pays the bank 0
  assert.deepEqual(seats.splice(0), [5, 0, 1, 2, 3, 4]);
  act({ pick: 1, bid: 1 }); act({ pass: true }); act({ bid: 2 }); act({ pass: true }); act({ bid: 3 }); act({ sell: true }); // P0 sells to P4
  assert.deepEqual(seats.splice(0), [0, 1, 2, 3, 4, 0]);
  act({ pick: 2, bid: 0 }); act({ pass: true }); act({ bid: 1 }); act({ bid: 2 }); act({ sell: false }); // P1 buys from P0
  assert.deepEqual(seats.splice(0), [1, 2, 3, 0, 1]);
  act({ pick: 3, bid: 4 }); act({ pass: true }); act({ pass: true }); // P2 pays the bank 4
  assert.deepEqual(seats.splice(0), [2, 3, 0]);
  act({ pick: 4, bid: 0 }); act({ bid: 1 }); act({ sell: true }); // P3 sells to P0; P3 gets the last tile
  assert.deepEqual(seats.splice(0), [3, 0, 3]);
  assert.deepEqual(s.bazaar.tiles.map((x) => [x.owner, x.how, x.price]), [[5, 'bank', 0], [4, 'sell', 3], [1, 'buy', 2], [2, 'bank', 4], [0, 'sell', 1], [3, 'free', 0]]);
  assert.deepEqual(scores(s), [4, -2, -4, 1, -3, 0]);
  assert.deepEqual(s.bazaar.queue, [0, 1, 2, 3, 4], 'P5 is playing, then 0…4');
  const order = [];
  while (s.bazaar) { order.push(s.current); playFirst(s); }
  assert.deepEqual(order, [5, 0, 1, 2, 3, 4]);
  assert.equal(s.current, 5, 'play resumes left of the host'); assert.ok(breakdownOK(s));
});

T('BZ3: illegal bazaar actions throw and leave the state unchanged', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, exps: { bridges: true, tower: true }, deck: ['B', 'B', 'B', 'U', 'V', 'E'] });
  s.players[2].prisoners.push({ p: 0, k: 'meeple' }); s.players[0].supply.meeple--; s.players[0].score = 9; s.players[0].breakdown.road = 9;
  turn(s, 0, 1, 0);
  const refused = (a, why) => {
    const before = JSON.stringify(s);
    assert.throws(() => G.applyAction(s, a), undefined, `${why}: ${JSON.stringify(a)}`);
    assert.equal(JSON.stringify(s), before, `state changed by ${JSON.stringify(a)}`);
  };
  // stage pick
  for (const a of [{ bid: 1 }, { pick: 0 }, { pick: 0, bid: -1 }, { pick: 0, bid: 100 }, { pick: 0, bid: 1.5 }, { pick: 0, bid: '1' }, { pick: 0, bid: NaN },
    { pick: 3, bid: 0 }, { pick: -1, bid: 0 }, { pass: true }, { sell: true }, { take: 0 }]) refused({ t: 'bazaar', ...a }, 'pick stage');
  refused({ t: 'turn', x: 1, y: 1, r: 0, act: null }, 'no tile during the auction');
  refused({ t: 'discard' }, 'no discard during the auction');
  refused({ t: 'ransom', from: 2, k: 'meeple' }, 'no ransom during the auction');
  refused({ t: 'castle', fi: 0, build: true }, 'no castle phase');
  refused({ t: 'dragon', key: '0,0' }, 'no dragon');
  assert.doesNotThrow(() => G.applyAction(G.cloneState(s), { t: 'bazaar', pick: 2, bid: 99 }), '99 is the highest bid');
  bz(s, { pick: 0, bid: 2 });
  // stage bid
  for (const a of [{ bid: 2 }, { bid: 1 }, { bid: 100 }, { bid: 2.5 }, { bid: '5' }, { bid: null }, {}, { sell: true }, { take: 1 }]) refused({ t: 'bazaar', ...a }, 'bid stage');
  bz(s, { pass: true }); bz(s, { bid: 3 });
  // stage decide
  assert.equal(s.bazaar.stage, 'decide');
  for (const a of [{ bid: 9 }, { pass: true }, { sell: 'yes' }, { sell: 1 }, { take: 0 }]) refused({ t: 'bazaar', ...a }, 'decide stage');
  bz(s, { sell: false });
  // the owned tile can no longer be picked
  assert.equal(s.bazaar.stage, 'pick'); assert.equal(s.bazaar.tiles[0].owner, 1);
  refused({ t: 'bazaar', pick: 0, bid: 0 }, 'owned tile');
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true });
  // the round: no bazaar actions while tiles are played
  assert.equal(s.phase, 'place'); assert.ok(s.bazaar);
  refused({ t: 'bazaar', pick: 2, bid: 0 }, 'round');
  refused({ t: 'bazaar', take: 2 }, 'round');
});

T('BZ3: a pick-shaped action { pick, bid } sent in the bid stage is refused (wrong-stage actions throw)', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, deck: ['B', 'B', 'B', 'U', 'V', 'E'] });
  turn(s, 0, 1, 0);
  bz(s, { pick: 0, bid: 2 });
  assert.equal(s.bazaar.stage, 'bid');
  assert.throws(() => bz(G.cloneState(s), { pick: 1, bid: 5 }), undefined, 'a pick in the bid stage is a wrong-stage action');
});

T('BZ3: a pick index that is not an integer ("1", [1]) is refused', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, deck: ['B', 'B', 'B', 'U', 'V', 'E'] });
  turn(s, 0, 1, 0);
  for (const pick of ['1', [1]]) {
    const c = G.cloneState(s);
    let item = 'threw';
    try { bz(c, { pick, bid: 0 }); item = JSON.stringify(c.bazaar.item); } catch { /* refused: correct */ }
    assert.equal(item, 'threw', `pick ${JSON.stringify(pick)} was accepted, bazaar.item = ${item}`);
  }
});

T('BZ3: bazaarOptions and actingSeat describe every stage', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, deck: ['B', 'B', 'B', 'U', 'V', 'E'] });
  assert.equal(G.bazaarOptions(s), null);
  turn(s, 0, 1, 0);
  assert.deepEqual(G.bazaarOptions(s), { seat: 1, stage: 'pick', item: null, high: null, pick: [0, 1, 2], minBid: 0, maxBid: 99, canPass: false, canSell: false });
  bz(s, { pick: 2, bid: 4 });
  assert.deepEqual(G.bazaarOptions(s), { seat: 2, stage: 'bid', item: 2, high: { p: 1, bid: 4 }, pick: null, minBid: 5, maxBid: 99, canPass: true, canSell: false });
  bz(s, { bid: 6 }); bz(s, { pass: true });
  assert.deepEqual(G.bazaarOptions(s), { seat: 1, stage: 'decide', item: 2, high: { p: 2, bid: 6 }, pick: null, minBid: null, maxBid: 99, canPass: false, canSell: true });
  assert.equal(s.current, 0, 'the host stays the current player during the auction');
  bz(s, { sell: true });
  assert.deepEqual(G.bazaarOptions(s), { seat: 0, stage: 'pick', item: null, high: null, pick: [0, 1], minBid: 0, maxBid: 99, canPass: false, canSell: false });
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true });
  assert.equal(G.bazaarOptions(s), null, 'none during the round');
  assert.equal(G.actingSeat(s), s.current);
});

// ---------------------------------------------------------------- BZ4 scores and ransom
T('BZ4: bids may exceed the score, scores go negative, the bazaar breakdown sums; no ransom in the auction; a bazaar-turn ransom needs ≥ 3', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, exps: { bridges: true, tower: true }, deck: ['B', 'B', 'B', 'B', 'B', 'B'] });
  s.players[0].prisoners.push({ p: 1, k: 'meeple' }); s.players[1].supply.meeple--; // P0 holds P1's meeple
  s.players[2].prisoners.push({ p: 0, k: 'meeple' }); s.players[0].supply.meeple--; // P2 holds P0's meeple
  s.players[0].score = 10; s.players[0].breakdown.road = 10;
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'bazaar');
  assert.deepEqual(G.ransomOptions(s), [], 'the host has 10 points and a prisoner out, but not during the auction');
  assert.deepEqual(G.ransomOptions(s, 1), []);
  bz(s, { pick: 0, bid: 6 }); bz(s, { pass: true }); bz(s, { pass: true }); // P1 (0 points) bids 6 and pays the bank
  assert.equal(s.players[1].score, -6);
  bz(s, { pick: 1, bid: 0 }); bz(s, { bid: 1 }); bz(s, { sell: true }); // P2 sells to the host for 1
  assert.deepEqual(scores(s), [9, -6, 1]);
  assert.deepEqual(s.players.map((p) => p.breakdown.bazaar), [-1, -6, 1]);
  assert.ok(breakdownOK(s));
  // the round: P1 (−6) cannot buy his meeple back, the host can in his own bazaar turn
  assert.equal(s.current, 1); assert.equal(s.phase, 'place');
  assert.deepEqual(G.ransomOptions(s), [], 'a negative score cannot pay');
  assert.throws(() => G.applyAction(G.cloneState(s), { t: 'ransom', from: 0, k: 'meeple' }));
  const rich = G.cloneState(s); rich.players[1].score = 3;
  assert.deepEqual(G.ransomOptions(rich), [{ from: 0, k: 'meeple' }], 'exactly 3 can pay');
  playFirst(s); playFirst(s);
  assert.equal(s.current, 0); assert.equal(s.ransomPaid, false);
  assert.deepEqual(G.ransomOptions(s), [{ from: 2, k: 'meeple' }]);
  G.applyAction(s, { t: 'ransom', from: 2, k: 'meeple' });
  assert.deepEqual(scores(s), [6, -6, 4]); assert.ok(breakdownOK(s));
});

// ---------------------------------------------------------------- BZ5 the bazaar round
T('BZ5: round order host+1…host; the fairy gives +1 at the start of each bazaar turn of her follower\'s owner (the host twice in a row); play resumes at host+1', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, exps: { bridges: true, dragon: true }, deck: ['B', 'B', 'B', 'B', 'U', 'V', 'E'] });
  put(s, '0,0', 0, 3); // the host's farmer in D's south field
  s.fairy = { key: '0,0', f: 3, k: 'meeple', p: 0 };
  const events = [...turn(s, 0, 1, 0)];
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true });
  events.push(...bz(s, { pick: 1, bid: 0 }), ...bz(s, { pass: true }));
  const order = [];
  while (s.bazaar) { order.push(s.current); events.push(...playFirst(s)); }
  assert.deepEqual(order, [1, 2, 0]);
  const fairy = events.filter((e) => e.kind === 'fairy');
  assert.deepEqual(fairy.map((e) => [e.winners[0], e.points]), [[0, 1]], 'one +1, in the host\'s bazaar turn');
  assert.equal(s.players[0].score, 1);
  assert.equal(s.current, 1); assert.equal(s.part, 1);
  playFirst(s); playFirst(s); // P1 and P2's normal turns
  assert.equal(s.current, 0); assert.equal(s.players[0].score, 2, 'and +1 again at the host\'s next normal turn');
});

T('BZ5: every bazaar turn has a fresh ransom allowance and its own bridge (the host builds two around one round)', () => {
  const s = setup(W_HOLE, 'BB/F.b', { players: 2, exps: { bridges: true, tower: true }, deck: ['U', 'B', 'B'] });
  s.players[1].prisoners.push({ p: 0, k: 'meeple' }); s.players[0].supply.meeple--;
  s.players[0].prisoners.push({ p: 1, k: 'meeple' }); s.players[1].supply.meeple--;
  for (const p of s.players) { p.score = 10; p.breakdown.road = 10; }
  s.ransomPaid = true; // the host already paid a ransom this turn
  const spot = G.validPlacements(s).find((p) => p.x === 0 && p.y === -2);
  turn(s, 0, -2, 0, null, spot.needsBridge[0][0]); // the bazaar tile with the bridge it needs
  assert.equal(s.players[0].bridges, 2);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true });
  assert.equal(s.current, 1); assert.equal(s.ransomPaid, false);
  G.applyAction(s, { t: 'ransom', from: 0, k: 'meeple' });
  const b1 = G.validPlacements(s).find((p) => p.x === 2 && p.y === 0);
  assert.ok(b1.needsBridge, 'B next to a road end needs a bridge');
  turn(s, 2, 0, 0, null, b1.needsBridge[0][0]);
  assert.equal(s.players[1].bridges, 2);
  assert.equal(s.current, 0); assert.equal(s.ransomPaid, false, 'the host\'s bazaar turn has its own ransom');
  G.applyAction(s, { t: 'ransom', from: 1, k: 'meeple' });
  const b0 = G.validPlacements(s).find((p) => p.x === 0 && p.y === 2);
  turn(s, 0, 2, 0, null, b0.needsBridge[0][0]);
  assert.equal(s.players[0].bridges, 1, 'one bridge per tile placement: two for the host');
  assert.deepEqual(scores(s), [10, 10]); assert.ok(breakdownOK(s));
  assert.equal(s.bazaar, null); assert.equal(s.current, 1); assert.equal(s.drawn, 'U');
});

T('BZ5: a castle completed in a bazaar turn is decided by its owner, then the round goes on', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, deck: ['B', 'B', 'B', 'B', 'U', 'E'] });
  put(s, '0,0', 2, 0); // P2's knight in D's one-edge city
  turn(s, 0, 1, 0);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true }); // P1 gets E
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true }); // P2 gets U, the host B
  assert.equal(s.current, 1); assert.equal(s.drawn, 'E');
  turn(s, 0, -1, 2); // E r2 closes D's city: a small city with P2's knight
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 2); assert.equal(s.current, 1);
  assert.equal(G.bazaarOptions(s), null); assert.equal(s.bazaar.stage, 'round');
  G.applyAction(s, { t: 'castle', fi: s.castleAsk[0].fi, build: true });
  assert.equal(s.castles.length, 1); assert.equal(s.castles[0].owner, 2);
  assert.equal(s.phase, 'place'); assert.equal(s.current, 2, 'P2\'s bazaar turn follows');
});

T('BZ5/BZ8: a bought dragon tile (dragon in play) flies at once, movers starting with its player, before the next bazaar turn', () => {
  const s = setup([['0,0', 'D', 0], ['1,0', 'U', 1], ['2,0', 'U', 1]], 'BB/F.b', { players: 3, exps: { bridges: true, dragon: true }, deck: ['B', 'B', 'B', 'V', 'B', 'DG/RFr.d'] });
  s.dragon = '2,0';
  turn(s, 0, 1, 0);
  assert.equal(s.bazaar.tiles[0].t, 'DG/RFr.d');
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true }); // P1 gets the dragon tile
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true });
  assert.equal(s.current, 1); assert.equal(s.drawn, 'DG/RFr.d');
  turn(s, -1, 0, 0); // continues D's road westwards
  assert.equal(s.phase, 'dragon'); assert.equal(s.current, 1);
  assert.deepEqual(s.bazaar.queue, [2, 0], 'the next bazaar turns wait');
  const movers = [];
  while (s.phase === 'dragon') { movers.push(G.dragonMover(s)); G.applyAction(s, { t: 'dragon', key: G.dragonMoves(s)[0] }); }
  assert.ok(movers.length >= 2);
  movers.forEach((m, i) => assert.equal(m, (1 + i) % 3, 'movers go round from the bazaar player'));
  assert.equal(s.phase, 'place'); assert.equal(s.current, 2);
});

// ---------------------------------------------------------------- BZ6 builder
T('BZ6: the host\'s builder bazaar tile: auction and round first, then part 2 — no fairy +1, the host\'s ransom flag restored', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/RFR.b', { players: 3, exps: { bridges: true, traders: true, tower: true, dragon: true }, deck: ['B', 'B', 'U', 'B', 'B', 'B'] });
  put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
  s.fairy = { key: '0,0', f: 1, k: 'meeple', p: 0 };
  s.ransomPaid = true;
  turn(s, 1, 0, 1); // roads W–E: the west road joins D's road with the builder
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.ret.bonus, true); assert.equal(s.bonus, false);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true });
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true });
  const events = [];
  const order = [];
  while (s.bazaar) {
    order.push(s.current);
    assert.equal(s.ransomPaid, false);
    events.push(...playFirst(s, (c) => !(c.x === -1 && c.y === 0))); // keep the builder road open
  }
  assert.deepEqual(order, [1, 2, 0]);
  assert.equal(s.current, 0); assert.equal(s.part, 2); assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'U');
  assert.equal(s.ransomPaid, true, 'the host\'s part-1 ransom still counts');
  assert.deepEqual(events.filter((e) => e.kind === 'fairy').map((e) => e.winners[0]), [0], 'fairy +1 only in the host\'s bazaar turn');
  assert.ok(events.some((e) => e.kind === 'bonus'), 'part 2 announced');
  assert.equal(s.players[0].score, 1);
  playFirst(s);
  assert.equal(s.current, 1); assert.equal(s.part, 1); assert.equal(s.players[0].score, 1, 'no step 0 for part 2');
});

T('BZ6: a bought tile that extends its player\'s builder draws part 2 at once; a bazaar on that tile is ignored', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, exps: { bridges: true, traders: true }, deck: ['B', 'BB/RFR.b', 'B', 'U'] });
  put(s, '0,0', 1, 1); put(s, '0,0', 1, 1, 'builder'); // P1's road with builder
  turn(s, 0, 1, 0);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); // P1 gets U
  assert.equal(s.current, 1); assert.equal(s.drawn, 'U');
  const ev = turn(s, 1, 0, 1); // extends D's road
  assert.ok(kinds(ev).includes('bonus'));
  assert.equal(s.current, 1); assert.equal(s.part, 2); assert.equal(s.drawn, 'BB/RFR.b'); assert.deepEqual(s.bazaar.queue, [0]);
  const ev2 = playFirst(s);
  assert.ok(!kinds(ev2).includes('bazaarOpen'), 'no auction inside a bazaar round');
  assert.equal(s.bazaarDue, false);
  assert.equal(s.current, 0); assert.equal(s.part, 1); assert.equal(s.drawn, 'B'); assert.ok(s.bazaar);
});

T('BZ6/BZ9: with an empty pile a bought builder tile gets no part 2, the round goes on and the game ends after it', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, exps: { bridges: true, traders: true }, deck: ['B', 'U'] });
  put(s, '0,0', 1, 1); put(s, '0,0', 1, 1, 'builder');
  turn(s, 0, 1, 0);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true });
  turn(s, 1, 0, 1);
  assert.notEqual(s.phase, 'over'); assert.equal(s.current, 0); assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'B');
  playFirst(s);
  assert.equal(s.phase, 'over');
});

// ---------------------------------------------------------------- BZ7 unplaceable bought tiles
T('BZ7: an unplaceable bought tile is replaced by a draw (fairy +1 still due, a bazaar on it ignored); with an empty pile the turn is skipped without +1', () => {
  const mk = (deck) => {
    const s = setup(W_HOLE, 'BB/F.b', { players: 2, exps: { bridges: true, dragon: true }, deck });
    put(s, '0,-1', 1, 5); s.fairy = { key: '0,-1', f: 5, k: 'meeple', p: 1 };
    s.players[1].bridges = 0; // a monastery fits nowhere for P1 once the hole is filled
    turn(s, 0, 0, 0);
    bz(s, { pick: 0, bid: 0 });
    return [s, bz(s, { pass: true })];
  };
  const [s, ev] = mk(['B', 'BB/RFR.b', 'B', 'B']);
  const bt = ev.find((e) => e.kind === 'bazaarTurn');
  assert.deepEqual([bt.seat, bt.t, bt.replaced], [1, 'BB/RFR.b', true]);
  assert.ok(s.discarded.includes('B')); assert.equal(s.drawn, 'BB/RFR.b'); assert.equal(s.current, 1);
  assert.equal(s.players[1].score, 1, 'the player has a tile: step 0 runs');
  const ev2 = playFirst(s);
  assert.ok(!kinds(ev2).includes('bazaarOpen'), 'a bazaar drawn as a replacement is ignored');
  assert.equal(s.current, 0); assert.ok(s.bazaar);
  const [e, ev3] = mk(['B', 'B']);
  assert.ok(!ev3.some((x) => x.kind === 'bazaarTurn' && x.seat === 1), 'P1\'s turn is skipped');
  assert.ok(!ev3.some((x) => x.kind === 'fairy'));
  assert.equal(e.players[1].score, 0, 'no fairy +1 for a skipped turn');
  assert.equal(e.current, 0); assert.equal(e.phase, 'place'); assert.notEqual(e.phase, 'over');
});

T('BZ7/BZ9: a bought tile that only fits with a bridge may be thrown away; then a draw, or with an empty pile the next bazaar turn', () => {
  const mk = (deck) => {
    const s = setup(W_HOLE, 'BB/F.b', { players: 2, deck });
    turn(s, 0, 0, 0); // fill the hole
    bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true });
    return s;
  };
  const s = mk(['U', 'B', 'B']);
  assert.equal(s.current, 1); assert.equal(s.drawn, 'B'); assert.equal(G.canDiscard(s), true);
  G.applyAction(s, { t: 'discard' });
  assert.equal(s.current, 1); assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'U'); assert.ok(s.bazaar);
  const e = mk(['B', 'B']);
  const ev = G.applyAction(e, { t: 'discard' });
  assert.ok(kinds(ev).includes('bazaarTurn'));
  assert.notEqual(e.phase, 'over', 'the game does not end inside the round');
  assert.equal(e.current, 0); assert.equal(e.drawn, 'B'); assert.ok(e.bazaar);
  playFirst(e); // the host places his with a bridge
  assert.equal(e.phase, 'over');
});

// ---------------------------------------------------------------- BZ8 volcano
T('BZ8: a bought volcano calls the dragon; the set-aside tiles go back at positions from rand(state); replays agree', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 2, exps: { bridges: true, dragon: true }, deck: ['U', 'V', 'B', 'DG/Rr.d', 'DG/F.v', 'DG/RFr.d', 'E'] });
  turn(s, 0, 1, 0);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['E', 'DG/F.v']);
  assert.deepEqual(s.setAside, ['DG/RFr.d']);
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true });
  assert.equal(s.current, 1); assert.equal(s.drawn, 'DG/F.v');
  const copy = G.cloneState(s);
  // expected: each set-aside tile spliced in at floor(rand * (deck.length + 1))
  let rng = s.rng; const deck = s.deck.slice();
  for (const t of s.setAside) { const [r, a] = nextRand(rng); rng = a; deck.splice(Math.floor(r * (deck.length + 1)), 0, t); }
  turn(s, 1, 1, 0);
  assert.equal(s.dragon, '1,1'); assert.deepEqual(s.setAside, []);
  assert.deepEqual(s.deck, deck); assert.equal(s.rng, rng);
  turn(copy, 1, 1, 0);
  assert.equal(JSON.stringify(copy), JSON.stringify(s), 'deterministic');
  assert.equal(s.current, 0); assert.equal(s.drawn, 'E');
});

// ---------------------------------------------------------------- BZ10 no-bidding variant
T('BZ10: variant — from host+1 each player takes a tile and plays it at once; the host gets the last one; no payments', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 4, bcb: { auction: false }, exps: { bridges: true, tower: true }, deck: ['B', 'B', 'B', 'A', 'U', 'V', 'E'] });
  s.current = 2;
  s.players[0].prisoners.push({ p: 3, k: 'meeple' }); s.players[3].supply.meeple--; s.players[3].score = 5; s.players[3].breakdown.road = 5;
  const ev = turn(s, 0, 1, 0);
  assert.deepEqual(kinds(ev).filter((k) => k.startsWith('bazaar')), ['bazaarOpen', 'bazaarRound']);
  assert.deepEqual(ev.find((e) => e.kind === 'bazaarRound').order, [3, 0, 1, 2]);
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.stage, 'take'); assert.equal(G.actingSeat(s), 3); assert.equal(s.current, 3);
  assert.deepEqual(G.bazaarOptions(s), { seat: 3, stage: 'take', item: null, high: null, pick: [0, 1, 2, 3], minBid: null, maxBid: 99, canPass: false, canSell: false });
  assert.deepEqual(G.ransomOptions(s), [], 'no ransom while choosing');
  for (const a of [{ pick: 0, bid: 0 }, { bid: 1 }, { pass: true }, { sell: true }, { take: 4 }, {}]) assert.throws(() => bz(G.cloneState(s), a));
  const order = [];
  const tileOf = s.bazaar.tiles.map((x) => x.t);
  bz(s, { take: 1 });
  assert.equal(s.phase, 'place'); assert.equal(s.drawn, tileOf[1]);
  assert.deepEqual(G.ransomOptions(s), [{ from: 0, k: 'meeple' }], 'a ransom in one\'s bazaar turn');
  order.push(s.current); playFirst(s);
  assert.equal(G.actingSeat(s), 0); assert.equal(s.bazaar.stage, 'take');
  assert.throws(() => bz(G.cloneState(s), { take: 1 }), undefined, 'owned tile');
  bz(s, { take: 3 }); order.push(s.current); playFirst(s);
  bz(s, { take: 0 }); order.push(s.current); playFirst(s);
  assert.equal(s.phase, 'place', 'the host\'s tile is automatic'); assert.equal(s.current, 2); assert.equal(s.drawn, tileOf[2]);
  order.push(s.current); playFirst(s);
  assert.deepEqual(order, [3, 0, 1, 2]);
  assert.equal(s.bazaar, null); assert.equal(s.current, 3, 'play resumes left of the host');
  assert.deepEqual(scores(s), [0, 0, 0, 5]); assert.ok(s.players.every((p) => !p.breakdown.bazaar));
});

T('BZ10: variant with the host\'s builder — round first, then part 2; takers get their fairy +1', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/RFR.b', { players: 2, bcb: { auction: false }, exps: { bridges: true, traders: true, dragon: true }, deck: ['B', 'U', 'B', 'B'] });
  put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
  put(s, '0,0', 1, 3); s.fairy = { key: '0,0', f: 3, k: 'meeple', p: 1 };
  turn(s, 1, 0, 1);
  assert.equal(s.phase, 'bazaar'); assert.equal(G.actingSeat(s), 1);
  const ev = bz(s, { take: 0 });
  assert.ok(ev.some((e) => e.kind === 'fairy' && e.winners[0] === 1));
  playFirst(s, (c) => !(c.x === -1 && c.y === 0));
  assert.equal(s.current, 0); assert.equal(s.phase, 'place');
  playFirst(s, (c) => !(c.x === -1 && c.y === 0));
  assert.equal(s.current, 0); assert.equal(s.part, 2); assert.equal(s.drawn, 'U');
});

// ---------------------------------------------------------------- CI3
T('CI3: T&B × P&D × BCB — builder bazaar → auction → round with a dragon flight → host part 2 draws a bazaar → second auction', () => {
  const s = setup([['0,0', 'D', 0], ['0,1', 'B', 0]], 'BB/RFR.b', { players: 3, exps: { bridges: true, traders: true, dragon: true },
    deck: ['X', 'U', 'U', 'V', 'B', 'BB/F.b', 'E', 'U', 'DG/RFr.d'] });
  s.dragon = '0,1';
  put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
  const tiles0 = countTiles(s), figs0 = countFigures(s);
  const check = () => { assert.equal(countTiles(s), tiles0, 'tiles conserved'); assert.equal(countFigures(s), figs0, 'figures conserved'); assert.ok(breakdownOK(s)); };
  turn(s, 1, 0, 1); // extends the builder's road
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.ret.bonus, true);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['DG/RFr.d', 'U', 'E']);
  check();
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true }); // P1 takes the dragon tile from the bank for 0
  bz(s, { pick: 1, bid: 1 }); bz(s, { bid: 2 }); bz(s, { sell: true }); // P2 sells U to the host for 2; P2 gets E
  assert.deepEqual(scores(s), [-2, 0, 2]);
  assert.equal(s.current, 1); assert.equal(s.drawn, 'DG/RFr.d');
  turn(s, -1, 0, 0); // P1: the dragon tile (road W–E) west of D
  assert.equal(s.phase, 'dragon'); assert.equal(G.dragonMover(s), 1);
  const ev = [];
  ev.push(...G.applyAction(s, { t: 'dragon', key: '0,0' })); // P1 must fly onto D: the host's meeple and builder are eaten
  assert.equal(G.dragonMover(s), 2);
  ev.push(...G.applyAction(s, { t: 'dragon', key: '1,0' }));
  assert.ok(kinds(ev).includes('dragonLands'));
  assert.equal(s.board['0,0'].pieces.length, 0); assert.equal(s.players[0].supply.builder, 1);
  check();
  assert.equal(s.phase, 'place'); assert.equal(s.current, 2); assert.equal(s.drawn, 'E');
  playFirst(s);
  assert.equal(s.current, 0); assert.equal(s.drawn, 'U');
  const ev2 = playFirst(s);
  assert.ok(kinds(ev2).includes('bazaarEnd'));
  assert.equal(s.current, 0); assert.equal(s.part, 2, 'the host\'s part 2 still comes (triggered at placement)');
  assert.equal(s.drawn, 'BB/F.b'); assert.equal(s.bazaar, null);
  check();
  const ev3 = playFirst(s);
  assert.ok(kinds(ev3).includes('bazaarOpen'), 'the bazaar drawn in the host\'s part 2 is held');
  assert.equal(s.bazaar.host, 0); assert.equal(s.bazaar.ret.part, 2); assert.equal(G.actingSeat(s), 1);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['B', 'V', 'U']);
  bz(s, { pick: 0, bid: 0 }); bz(s, { pass: true }); bz(s, { pass: true });
  bz(s, { pick: 1, bid: 0 }); bz(s, { pass: true });
  const order = [];
  while (s.bazaar) { order.push(s.current); playFirst(s); }
  assert.deepEqual(order, [1, 2, 0]);
  assert.equal(s.current, 1); assert.equal(s.part, 1); assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'U');
  check();
});

// ---------------------------------------------------------------- the computer players (H.3)
const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const SHAPES = { pick: ['bid,pick,t'], bid: ['bid,t', 'pass,t'], decide: ['sell,t'], take: ['t,take'] };
const LEVELS = ['easy', 'medium', 'hard'];
const ALL = { abbot: true, inns: true, traders: true, dragon: true, tower: true, bridges: true };
// one random legal non-bazaar move
function randomMove(s, R) {
  const any = (a) => a[Math.floor(R() * a.length)];
  if (s.phase === 'dragon') return { t: 'dragon', key: any(G.dragonMoves(s)) };
  if (s.phase === 'castle') return { t: 'castle', fi: s.castleAsk[0].fi, build: R() < 0.6 };
  if (G.canDiscard(s) && R() < 0.3) return { t: 'discard' };
  const pl = any(G.validPlacements(s)); const r = any(pl.rots); const bridge = pl.needsBridge?.[r]?.[0] || null;
  const probe = G.cloneState(s); G.placeTile(probe, pl.x, pl.y, r, bridge);
  const fo = G.followerOptions(probe).filter((o) => o.kind === 'follower');
  return { t: 'turn', x: pl.x, y: pl.y, r, bridge, act: fo.length && R() < 0.5 ? any(fo) : null };
}

T('AI: chooseBazaarAction is legal in every stage and variant, leaves the state alone and is quick (random games, 2–6 players)', () => {
  const R = seeded(20261018);
  const worst = {}; const stages = new Set(); let calls = 0, maxBid = 0, minBazaar = 0;
  for (const [n, bcb] of [[2, {}], [3, {}], [4, {}], [5, {}], [6, {}], [3, { auction: false }], [5, { auction: false }]]) {
    const s = G.newGame(COLORS.slice(0, n).map((c) => ({ name: c, color: c, kind: 'ai' })), { expansions: ALL, bcb }, R);
    for (let guard = 0; s.phase !== 'over' && guard < 3000; guard++) {
      if (s.phase === 'place' && !s.bazaar && s.drawn && !hasTag(s.drawn, 'bazaar') && R() < 0.1) {
        // bring a bazaar tile forward (swap it with the drawn tile): auctions at every stage of the game
        const i = s.deck.findIndex((t) => hasTag(t, 'bazaar') && G.validPlacements(s, t).length);
        if (i >= 0) [s.deck[i], s.drawn] = [s.drawn, s.deck[i]];
      }
      if (s.phase !== 'bazaar') { G.applyAction(s, randomMove(s, R)); continue; }
      const o = G.bazaarOptions(s);
      stages.add(o.stage);
      const key = s.placed + 1e5 + calls++; // a key the AI's per-auction cache has not seen: the first call is cold
      const order = LEVELS.slice(calls % 3).concat(LEVELS.slice(0, calls % 3)); // each level takes its turn at the cold call
      order.forEach((lvl, j) => {
        const c = G.cloneState(s); c.placed = key;
        const before = JSON.stringify(c);
        const t0 = performance.now();
        const a = chooseBazaarAction(c, lvl, R);
        const ms = performance.now() - t0;
        if (j === 0) worst[`${lvl} ${o.stage}`] = Math.max(worst[`${lvl} ${o.stage}`] || 0, ms); // the first call on this key is cold
        assert.equal(JSON.stringify(c), before, `${lvl} ${o.stage}: the AI changed the state`);
        assert.ok(SHAPES[o.stage].includes(Object.keys(a).sort().join()), `${lvl} ${o.stage}: odd action ${JSON.stringify(a)}`);
        if (o.stage === 'bid' && !a.pass) { assert.equal(a.bid, o.minBid, 'bots raise by one'); maxBid = Math.max(maxBid, a.bid); }
        assert.doesNotThrow(() => G.applyAction(c, a), `${lvl} ${o.stage}: illegal ${JSON.stringify(a)}`);
      });
      G.applyAction(s, chooseBazaarAction(s, LEVELS[calls % 3], R));
    }
    assert.equal(s.phase, 'over');
    minBazaar = Math.min(minBazaar, ...s.players.map((p) => p.breakdown.bazaar));
  }
  const top = Math.max(...Object.values(worst));
  console.log(`# bazaar AI: ${calls} decisions × 3 levels; worst cold call ${top.toFixed(1)} ms; max bot raise ${maxBid}; lowest bazaar total ${minBazaar}`);
  console.log(`# ${Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · ')}`);
  assert.deepEqual([...stages].sort(), ['bid', 'decide', 'pick', 'take']);
  assert.ok(maxBid <= 10 && minBazaar >= -25, 'bots among themselves never bid up a storm');
  assert.ok(top < 400, `a bazaar decision took ${top} ms`);
});

T('AI: bazaar decisions on a late 6-player board where everyone still has bridges (worst case, timed)', () => {
  const R = seeded(3);
  const s = G.newGame(COLORS.map((c) => ({ name: c, color: c })), { expansions: ALL, bcb: { bazaars: false } }, R);
  while (s.phase !== 'over' && s.deck.length > 8) {
    if (s.phase !== 'place') { G.applyAction(s, randomMove(s, R)); continue; }
    const pl = G.validPlacements(s)[Math.floor(R() * G.validPlacements(s).length)];
    const r = pl.rots.find((q) => !pl.needsBridge?.[q]) ?? pl.rots[0];
    G.applyAction(s, { t: 'turn', x: pl.x, y: pl.y, r, bridge: pl.needsBridge?.[r]?.[0] || null, act: null });
  }
  for (const p of s.players) p.bridges = 2;
  s.options.bcb = {};
  const times = {};
  for (const stage of ['pick', 'bid', 'decide']) for (const lvl of LEVELS) {
    const c = G.cloneState(s); c.placed = 9e5 + Object.keys(times).length; c.phase = 'bazaar';
    c.bazaar = { host: 0, tiles: ['B', 'B', 'B', 'B', 'B', 'B'].map((t) => ({ t, owner: null, price: 0, how: null, played: false })), stage, chooser: 1,
      item: stage === 'pick' ? null : 0, high: stage === 'pick' ? null : { p: stage === 'bid' ? 1 : 3, bid: 1 }, bidder: stage === 'bid' ? 2 : null,
      queue: [], ret: { part: 1, bonus: false, ransomPaid: false } };
    const t0 = performance.now();
    const a = chooseBazaarAction(c, lvl, R);
    times[`${lvl} ${stage}`] = performance.now() - t0;
    assert.doesNotThrow(() => G.applyAction(c, a));
  }
  const top = Math.max(...Object.values(times));
  console.log(`# late 6-player board (${Object.keys(s.board).length} tiles, ${G.validPlacements(s, 'B').reduce((a, p) => a + p.rots.length, 0)} spots for B): ${Object.entries(times).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' · ')} ms`);
  assert.ok(top < 500, `${top} ms`);
});

// 3 players: P2's knight sits in D's one-edge city; the revealed E closes it (+4 for P2)
function cityAuction(players = 3) {
  const deck = players === 3 ? ['B', 'B', 'B', 'B', 'U', 'E'] : ['B', 'U', 'E'];
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players, deck });
  put(s, '0,0', players - 1, 0);
  turn(s, 0, 1, 0);
  return s;
}

T('AI: medium and hard bots bid for a tile they want, but only a little (never near or above its worth)', () => {
  const s = cityAuction(3);
  bz(s, { pick: 0, bid: 0 }); // P1 picks E, P2 (who wants it) bids next
  for (const lvl of ['medium', 'hard']) {
    assert.deepEqual(chooseBazaarAction(G.cloneState(s), lvl, () => 0.5), { t: 'bazaar', bid: 1 }, `${lvl} raises for its city`);
    let highest = 0;
    for (let h = 0; h < 30; h++) { const c = G.cloneState(s); c.bazaar.high.bid = h; if (!chooseBazaarAction(c, lvl, () => 0.5).pass) highest = h + 1; }
    assert.ok(highest <= 4, `${lvl} raised to ${highest} for a 4-point tile`);
  }
});

T('AI: an easy bot never raises past 0.5 × its surplus (H.3), so nobody can sell it a 4-point tile for 41', () => {
  const s = cityAuction(3);
  bz(s, { pick: 0, bid: 40 }); // a person opens at 40 on E; the easy bot P2 bids next
  const a = chooseBazaarAction(G.cloneState(s), 'easy', () => 0.1); // the bot's 30 % "raise" roll
  assert.ok(a.pass || a.bid <= 4, `easy bot answered ${JSON.stringify(a)} for a tile worth about 4 points to it`);
});

// 2 players: a 3-tile city with 2 pennants, open to the east; the knight's owner gets 12 points from the revealed E
function bigCityAuction(owner) {
  const s = setup([['-1,0', 'E', 1], ['0,0', 'F', 0], ['1,0', 'F', 0]], 'BB/F.b', { players: 2, deck: ['B', 'U', 'E'] });
  put(s, '0,0', owner, 0);
  turn(s, 0, 1, 0);
  assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['E', 'U']);
  return s;
}

T('AI: with two tiles left (every 2-player auction, the last auction of any game) medium/hard bots raise for and keep a 12-point tile (the fallback is the true median)', () => {
  // AI values (ai.js quickValue): E is worth 12.54 to the knight's owner and 1.60 to the other; U 0.48 to both.
  // H.3 with the median of the two values: bidder surplus (12.54 − 0.48) / 2 = 6.03 → raise to 1;
  // chooser swing 6.03 + (1.60 − 0.48) / 2 = 6.59 > 4 × 1 → buy. The code takes the larger value: surplus 0, swing ≤ 0.
  const got = [];
  for (const lvl of ['medium', 'hard']) {
    const s = bigCityAuction(0); // the host P0 is the bot with the knight; P1 picks E to deny it
    bz(s, { pick: 0, bid: 0 });
    const bid = chooseBazaarAction(G.cloneState(s), lvl, () => 0.5);
    const t = bigCityAuction(1); // P1 is the bot with the knight and chooses; a person raises to 1
    const pick = chooseBazaarAction(G.cloneState(t), lvl, () => 0.5);
    bz(t, pick); bz(t, { bid: 1 });
    const decide = chooseBazaarAction(G.cloneState(t), lvl, () => 0.5);
    got.push(`${lvl}: bidder ${JSON.stringify(bid)}, chooser picks ${pick.pick} then ${JSON.stringify(decide)}`);
    assert.equal(pick.pick, 0, 'the bot picks its 12-point tile');
    assert.ok(!bid.pass && decide.sell === false, got.join(' · '));
  }
});
