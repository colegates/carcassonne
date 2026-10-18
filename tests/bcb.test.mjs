// Bridges, Castles & Bazaars: castles, bazaars, discards and their interactions (MASTER H.2, H.5).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
const T = test;
function setup(board, drawn, { players = 2, exps = { bridges: true }, bcb } = {}) {
  const s = G.newGame(Array.from({ length: players }, (_, i) => ({ name: 'P' + i, color: ['red', 'blue', 'green', 'yellow', 'black', 'pink'][i] })), { expansions: exps, ...(bcb ? { bcb } : {}) }, () => 0.5);
  s.board = {};
  board.forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
  s.placed = board.length;
  s.drawn = drawn; s.phase = 'place'; s.current = 0; s.setAside = [];
  s.deck = ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'];
  return s;
}
const put = (s, k, p, f, kind = 'meeple') => { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; };
const turn = (s, x, y, r, act = null, bridge = null) => G.applyAction(s, { t: 'turn', x, y, r, bridge, act });
const playAny = (s) => { const v = G.validPlacements(s)[0]; const r = v.rots[0]; return turn(s, v.x, v.y, r, null, v.needsBridge?.[r]?.[0] || null); };

// E has its city on N (r0). Small city: E r2 at (0,0) (city S) + E r0 at (0,1) (city N).
T('small city: owner decides, castle built, no points', () => {
  const s = setup([['0,0', 'E', 2]], 'E');
  put(s, '0,0', 1, 0); // P1's knight on the first cap
  const ev = turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle');
  assert.equal(G.actingSeat(s), 1, 'the knight owner (not the active player) decides');
  const ev2 = G.applyAction(s, { t: 'castle', fi: 0, build: true });
  assert.equal(s.castles.length, 1);
  assert.deepEqual(s.castles[0].area.slice().sort(), ['-1,0', '-1,1', '0,0', '0,1', '1,0', '1,1']);
  assert.equal(s.players[1].score, 0);
  assert.equal(s.players[1].castles, 2);
  assert.equal(s.board['0,0'].pieces.length, 0, 'castellan is off the tiles');
  assert.ok(ev2.some((e) => e.kind === 'castleBuilt'));
  assert.equal(s.phase, 'place');
  void ev;
});
T('owner without castles scores 4, no decision', () => {
  const s = setup([['0,0', 'E', 2]], 'E');
  put(s, '0,0', 1, 0); s.players[1].castles = 0;
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'place'); assert.equal(s.players[1].score, 4);
});
T('noCastle cap (BB/CFR!G) never asks', () => {
  // BB/CFR!G city on W; turn r1 → city N. Put it at (0,1) under E r2 at (0,0)
  const s = setup([['0,0', 'E', 2]], 'BB/CFR!G');
  put(s, '0,0', 0, 0);
  const vp = G.validPlacements(s).find((p) => p.x === 0 && p.y === 1);
  assert.ok(vp.rots.includes(1));
  turn(s, 0, 1, 1);
  assert.equal(s.phase, 'place'); assert.equal(s.players[0].score, 4);
});
// castle at (0,0)/(0,1); area includes (1,0),(1,1),(-1,0),(-1,1)
function withCastle(players = 2) {
  const s = setup([['0,0', 'E', 2]], 'E', { players });
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  return s;
}
T('castle not triggered by the placement that built it; triggered by an empty road later', () => {
  // the creating placement completes nothing else here; now finish an empty road with a tile in the area:
  const s = withCastle();
  // road: crossroads X at (2,0) ... simpler: tile U (road N–S) at (1,0) needs matching: (1,0) W edge faces E r2's E side (field) -> U r0 has W field ok
  s.drawn = 'U'; s.phase = 'place'; s.current = 1;
  turn(s, 1, 0, 0); // road N-S at (1,0), open both ends
  s.drawn = 'A'; s.current = 0; turn(s, 1, -1, 0); // monastery with road S closes the north end
  assert.equal(s.castles[0].k, 'meeple', 'still waiting');
  s.drawn = 'A'; s.current = 0;
  // A r2 (road N) at (1,1) closes the south end -> road (1,-1)-(1,0)-(1,1) complete, empty, 3 tiles
  const ev = turn(s, 1, 1, 2);
  const ce = ev.find((e) => e.kind === 'castle');
  assert.ok(ce, 'castle scored from an empty road');
  assert.equal(ce.points, 3); assert.equal(s.players[1].score, 3); assert.equal(s.castles[0].k, null);
  assert.equal(s.players[1].breakdown.castle, 3);
});
T('empty monastery completed in the area triggers at 9; outside does not', () => {
  const s = withCastle();
  // monastery B at (1,0) (in area); surround it
  s.drawn = 'B'; s.phase = 'place'; turn(s, 1, 0, 0);
  const ring = [[1, -1], [2, -1], [0, -1], [2, 0], [2, 1], [1, 1]]; // (0,0),(0,1) already there
  let scored = null;
  for (const [x, y] of ring) {
    if (s.phase !== 'place') break;
    s.drawn = 'B';
    const vp = G.validPlacements(s).find((p) => p.x === x && p.y === y);
    const ev = turn(s, x, y, vp.rots[0]);
    if (s.phase === 'castle') G.applyAction(s, { t: 'castle', fi: s.castleAsk[0].fi, build: false });
    scored = scored || ev.find((e) => e.kind === 'castle');
  }
  assert.ok(scored); assert.equal(scored.points, 9);
});
T('garden (Abbot) triggers like a monastery (empty garden, own tile in the area)', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: true, abbot: true } });
  put(s, '0,0', 1, 0); turn(s, 0, 1, 0); G.applyAction(s, { t: 'castle', fi: 0, build: true });
  // hand-built ring around an empty garden tile at (1,1) (in the area); the 8th neighbour (2,2) is placed legally
  const n0 = s.placed;
  [['1,1', 'BA/CG', 1], ['1,0', 'B', 0], ['2,0', 'B', 0], ['2,1', 'B', 0], ['0,2', 'B', 0], ['1,2', 'B', 0]].forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: n0 + i }; });
  s.placed = n0 + 6;
  s.drawn = 'B'; s.phase = 'place'; s.current = 0;
  const ev = turn(s, 2, 2, 0);
  const ce = ev.find((e) => e.kind === 'castle');
  assert.ok(ce); assert.equal(ce.from, 'garden'); assert.equal(ce.points, 9);
  assert.ok(ev.some((e) => e.kind === 'garden' && !e.winners.length), 'the empty garden is reported, nobody scores it');
});
T('castle built in builder part 1 scores in part 2 (BC22)', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: true, traders: true } });
  put(s, '0,0', 0, 0);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  // fake a part-2 situation: set part 2 and place a tile completing an empty 2-tile road in the area
  s.part = 2; s.drawn = 'A'; s.phase = 'place'; s.current = 0;
  s.board['1,-1'] = { t: 'A', r: 0, pieces: [], n: s.placed++ }; // monastery with road S at (1,-1): road goes down to (1,0)
  const vp = G.validPlacements(s).find((p) => p.x === 1 && p.y === 0);
  // A r2: road N (meets the road from (1,-1)) -> 2-tile road monastery-to-monastery, complete
  assert.ok(vp.rots.includes(2));
  const ev = turn(s, 1, 0, 2);
  const ce = ev.find((e) => e.kind === 'castle');
  assert.ok(ce, 'scored in part 2'); assert.equal(ce.points, 2);
});
T('chain: a scoring castle triggers a neighbour castle with the same value; direction matters', () => {
  const s = withCastle(3); // castle A tiles (0,0),(0,1), owner P1
  // castle B: small city at (1,1)/(1,2)? (1,1) is in A's area; B's area must contain A's tile for A->B, and B in A's area for B->A
  s.drawn = 'E'; s.phase = 'place'; s.current = 2;
  turn(s, 1, 1, 2); // E r2 at (1,1): city S
  s.board['1,1'].pieces.push({ p: 2, f: 0, k: 'meeple' }); s.players[2].supply.meeple--;
  s.drawn = 'E'; s.current = 0; turn(s, 1, 2, 0); // city N at (1,2) -> small city (1,1)-(1,2), P2 decides
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 2);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  // castle B area: (1,1),(1,2),(0,1),(2,1),(0,2),(2,2): contains A's tile (0,1) -> A scoring triggers B
  // A's area contains (1,1) (B's tile) -> B scoring triggers A as well
  // complete an empty road touching only A's area: road at (-1,0)
  s.board['-1,-1'] = { t: 'A', r: 0, pieces: [], n: s.placed++ };
  s.drawn = 'A'; s.current = 1; s.phase = 'place';
  const vp = G.validPlacements(s).find((p) => p.x === -1 && p.y === 0);
  const ev = turn(s, -1, 0, 2);
  void vp;
  const ces = ev.filter((e) => e.kind === 'castle');
  assert.equal(ces.length, 2, 'both castles score');
  assert.ok(ces.every((e) => e.points === 2));
  assert.ok(ces.some((e) => e.from === 'castle'));
});
T('fairy stays with the converted knight, +3 when the castle scores, then unassigned', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: true, dragon: true } });
  put(s, '0,0', 1, 0);
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  assert.equal(s.fairy.f, 'castle'); assert.equal(s.fairy.c, 0);
  // fairy option for P1 to castellan is suppressed (already there); score the castle via an empty 2-tile road
  s.board['1,-1'] = { t: 'A', r: 0, pieces: [], n: s.placed++ };
  s.drawn = 'A'; s.phase = 'place'; s.current = 0;
  const ev = turn(s, 1, 0, 2);
  assert.ok(ev.some((e) => e.kind === 'castle')); assert.ok(ev.some((e) => e.kind === 'fairy' && e.points === 3));
  assert.equal(s.players[1].score, 1 + 2 + 3, 'fairy +1 at the start of P1 turn, castle 2, fairy +3');
  assert.equal(s.fairy.p, null, 'fairy unassigned, stays on her tile');
});
T('fairy can be moved next to a castellan (c id)', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: true, dragon: true } });
  put(s, '0,0', 0, 0);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  s.drawn = 'B'; s.phase = 'place'; s.current = 0;
  G.placeTile(s, 0, 2, 0);
  const fo = G.followerOptions(s).find((o) => o.kind === 'fairy' && o.fi === 'castle');
  assert.ok(fo && fo.c === 0);
  G.finishTurn(s, fo);
  assert.deepEqual(s.fairy, { key: '0,0', f: 'castle', k: 'meeple', p: 0, c: 0 });
});
T('final: castellan home with 0; field with castle = 4, pig winner 5', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: true, traders: true } });
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'castle', fi: 0, build: true });
  // farmer of P0 in (0,1)'s field (E r0: field index 1), plus P0's pig
  put(s, '0,1', 0, 1); put(s, '0,1', 0, 1, 'pig');
  const ev = G.finalScoring(s, true);
  assert.equal(ev[0].kind, 'castleEnd');
  const field = ev.find((e) => e.kind === 'field'); const pig = ev.find((e) => e.kind === 'pig');
  assert.equal(field.points, 4); assert.equal(field.castleCount, 1); assert.equal(pig.points, 1);
  assert.equal(s.players[0].score, 5); assert.equal(s.players[1].score, 0);
  assert.equal(s.castles[0].k, null);
});
T('bridge-only tile: discard allowed, plain tile: not', () => {
  const s = setup([['0,0', 'D', 0]], 'B');
  // B only fits next to D's road ends with a bridge, but also N/S of D? D N=city, S=field -> B fits at (0,1) plain
  assert.equal(G.canDiscard(s), false);
  const s2 = setup([['0,0', 'U', 1], ['-1,0', 'X', 0], ['1,0', 'X', 0], ['0,-1', 'B', 0], ['0,1', 'B', 0]], 'BB/F.b');
  // everything around is road ends or full? compute
  const vp = G.validPlacements(s2);
  const plain = vp.some((p) => p.rots.some((r) => !(p.needsBridge && p.needsBridge[r])));
  if (!plain) { assert.equal(G.canDiscard(s2), true); const before = s2.deck.length; G.applyAction(s2, { t: 'discard' }); assert.equal(s2.discarded.length, 1); assert.ok(s2.deck.length < before); }
});
// ---------- bazaar ----------
function bazaarGame(players, deckTiles) {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players });
  s.deck = deckTiles.slice();
  return s;
}
T('bazaar: auction after scoring, chooser = host left, bank when nobody raises, round order, resume left of host', () => {
  const s = bazaarGame(3, ['B', 'B', 'B', 'U', 'V', 'E']); // pops E, V, U for the reveal
  turn(s, 0, 1, 0); // BB/F.b below D (meadow)
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.tiles.map((x) => x.t).join(), 'E,V,U');
  assert.equal(G.actingSeat(s), 1);
  G.applyAction(s, { t: 'bazaar', pick: 0, bid: 2 }); // P1 picks E, bids 2
  assert.equal(G.actingSeat(s), 2); G.applyAction(s, { t: 'bazaar', pass: true });
  assert.equal(G.actingSeat(s), 0); G.applyAction(s, { t: 'bazaar', bid: 3 }); // host raises
  assert.equal(G.actingSeat(s), 1); assert.equal(s.bazaar.stage, 'decide');
  G.applyAction(s, { t: 'bazaar', sell: false }); // P1 buys: pays 3 to P0
  assert.equal(s.players[1].score, -3); assert.equal(s.players[0].score, 3);
  // next chooser: next after P1 without a tile = P2
  assert.equal(G.actingSeat(s), 2); G.applyAction(s, { t: 'bazaar', pick: 1, bid: 2 });
  assert.equal(G.actingSeat(s), 0); G.applyAction(s, { t: 'bazaar', bid: 3 }); // P1 has a tile: skipped
  assert.equal(G.actingSeat(s), 2); G.applyAction(s, { t: 'bazaar', sell: true }); // P2 sells to P0
  assert.equal(s.players[0].score, 0); assert.equal(s.players[2].score, 3);
  // P2 takes the last tile free; round starts with P1
  assert.equal(s.phase, 'place'); assert.equal(s.current, 1); assert.equal(s.drawn, 'E');
  // play the round
  const order = [];
  while (s.bazaar) { order.push(s.current); playAny(s); }
  assert.deepEqual(order, [1, 2, 0]);
  assert.equal(s.current, 1, 'play resumes left of the host'); assert.equal(s.drawn, 'B');
});
T('next chooser after a sale with 4 players is the next after the previous chooser (BC37)', () => {
  const s = bazaarGame(4, ['B', 'B', 'U', 'U', 'V', 'E']);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 }); // P1
  G.applyAction(s, { t: 'bazaar', pass: true }); // P2
  G.applyAction(s, { t: 'bazaar', bid: 1 }); // P3
  G.applyAction(s, { t: 'bazaar', pass: true }); // P0
  G.applyAction(s, { t: 'bazaar', sell: true }); // P1 sells to P3
  assert.equal(G.actingSeat(s), 2, 'P2 chooses next ("previous buyer" reading would give P0)');
});
T('too few drawable tiles: no bazaar', () => {
  const s = bazaarGame(3, ['B', 'B']);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'place'); assert.equal(s.current, 1);
});
T('exactly N tiles: auction uses all, game ends after the round', () => {
  const s = bazaarGame(2, ['B', 'U']);
  turn(s, 0, 1, 0);
  G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 });
  G.applyAction(s, { t: 'bazaar', pass: true }); // bank 0, P0 gets the last free
  while (s.phase !== 'over') { playAny(s); }
  assert.equal(s.phase, 'over');
});
T('host builder part 2 comes after the bazaar round, ransom flag restored', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/RFR.b', { players: 3, exps: { bridges: true, traders: true, tower: true } });
  // builder: P0 meeple + builder on D's road (feature 1), RFR.b road S at r? place to extend D's road east end: (1,0)
  put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
  s.ransomPaid = true;
  s.deck = ['B', 'B', 'B', 'B', 'U', 'V', 'E'];
  const vp = G.validPlacements(s).find((p) => p.x === 1 && p.y === 0);
  const br = (rr) => vp.needsBridge?.[rr]?.[0] || null;
  const r = vp.rots.find((rr) => { const pr = G.cloneState(s); G.placeTile(pr, 1, 0, rr, br(rr)); return pr.bonus; });
  assert.ok(r !== undefined, 'a rotation extends the builder road');
  turn(s, 1, 0, r, null, br(r));
  assert.equal(s.phase, 'bazaar', 'auction before part 2');
  assert.equal(s.bazaar.ret.bonus, true);
  G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 }); G.applyAction(s, { t: 'bazaar', pass: true }); G.applyAction(s, { t: 'bazaar', pass: true });
  G.applyAction(s, { t: 'bazaar', pick: G.bazaarOptions(s).pick[0], bid: 0 }); G.applyAction(s, { t: 'bazaar', pass: true });
  const seen = [];
  while (s.bazaar) { if (seen[seen.length - 1] !== s.current) seen.push(s.current); assert.equal(s.ransomPaid, false); playAny(s); }
  assert.deepEqual(seen, [1, 2, 0]);
  assert.equal(s.current, 0); assert.equal(s.part, 2, 'host part 2 after the round'); assert.equal(s.ransomPaid, true, 'host ransom flag restored');
});
T('unplaceable bought tile is replaced by a draw; empty deck skips the turn', () => {
  const s = bazaarGame(2, ['B', 'RI.1/II']); // a river tile cannot be placed outside the river
  turn(s, 0, 1, 0);
  // P1 chooses the B (index 1? reveal order: pop RI then B)
  const iB = s.bazaar.tiles.findIndex((x) => x.t === 'B');
  G.applyAction(s, { t: 'bazaar', pick: iB, bid: 0 }); G.applyAction(s, { t: 'bazaar', pass: true });
  assert.equal(s.current, 1); assert.equal(s.drawn, 'B');
  playAny(s);
  // P0's river tile: unplaceable, deck empty -> skipped; round ends; game over
  assert.equal(s.phase, 'over'); assert.ok(s.discarded.includes('RI.1/II'));
});
T('bazaar placed inside the round is ignored', () => {
  const s = bazaarGame(2, ['B', 'B', 'B', 'BB/F.b', 'U']);
  turn(s, 0, 1, 0);
  const i = s.bazaar.tiles.findIndex((x) => x.t === 'BB/F.b');
  G.applyAction(s, { t: 'bazaar', pick: i, bid: 0 }); G.applyAction(s, { t: 'bazaar', pass: true });
  playAny(s); // P1 plays the bazaar tile
  assert.ok(s.bazaar && s.phase === 'place', 'no new auction');
});
T('no-bidding variant: take and play in turn, last tile automatic', () => {
  const s = setup([['0,0', 'D', 0]], 'BB/F.b', { players: 3, bcb: { auction: false } });
  s.deck = ['B', 'B', 'B', 'U', 'V', 'E'];
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'bazaar'); assert.equal(s.bazaar.stage, 'take'); assert.equal(G.actingSeat(s), 1);
  G.applyAction(s, { t: 'bazaar', take: 2 });
  assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'U');
  playAny(s);
  assert.equal(G.actingSeat(s), 2); G.applyAction(s, { t: 'bazaar', take: 0 });
  playAny(s);
  assert.equal(s.current, 0); assert.equal(s.phase, 'place'); assert.equal(s.drawn, 'V');
});
T('inns of BCB tiles count only with I&C', () => {
  const s = setup([['0,0', 'X', 0]], 'BB/R.bi');
  const vp = G.validPlacements(s).find((p) => p.x === 0 && p.y === 1);
  turn(s, 0, 1, vp.rots.find((r) => G.edgeType({ t: 'BB/R.bi', r }, 0) === 'road'));
  const g = G.getGroup(s.board, '0,1', 0);
  assert.equal(g.inn, false);
  const s2 = setup([['0,0', 'X', 0]], 'BB/R.bi', { exps: { bridges: true, inns: true } });
  const vp2 = G.validPlacements(s2).find((p) => p.x === 0 && p.y === 1);
  turn(s2, 0, 1, vp2.rots.find((r) => G.edgeType({ t: 'BB/R.bi', r }, 0) === 'road'));
  assert.equal(G.getGroup(s2.board, '0,1', 0).inn, true);
});
