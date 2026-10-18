// Bridges, Castles & Bazaars — castles: MASTER H.5 CA1–CA11, the castle parts of CI4–CI6, and
// the computer players' castle decisions (ai.js chooseCastle). Every test encodes MASTER §H; a
// test whose title starts with "BUG:" fails because the app disagrees with MASTER §H.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
import { TILE_TYPES } from '../public/js/tiles.js';
import { chooseCastle, chooseMove, chooseBazaarAction, chooseDragonMove } from '../public/js/ai.js';

const T = test;
const COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];

// ---------- hand-made boards (the style of tests/bcb.test.mjs) ----------
// A game with the expansion on, the given tiles ([key, type, rotation]) on the board and seat 0 about
// to place `drawn`. The pile holds plain monasteries so the next draws are always placeable.
function setup(board, drawn, { players = 2, exps = {}, bcb, deck } = {}) {
  const s = G.newGame(Array.from({ length: players }, (_, i) => ({ name: 'P' + i, color: COLORS[i] })),
    { expansions: { bridges: true, ...exps }, ...(bcb ? { bcb } : {}) }, () => 0.5);
  s.board = {}; s.placed = 0; s.towers = {};
  add(s, board);
  s.drawn = drawn; s.phase = 'place'; s.current = 0; s.setAside = []; s.discarded = [];
  s.deck = deck ? deck.slice() : Array(12).fill('B');
  return s;
}
// put tiles on the board by hand (each gets the next placement number; tower tiles get an empty foundation)
function add(s, tiles) {
  for (const [k, t, r] of tiles) {
    s.board[k] = { t, r, pieces: [], n: s.placed++ };
    if (G.hasExp(s, 'tower') && TILE_TYPES[t].tags.includes('tower')) s.towers[k] = { h: 0, top: null };
  }
}
const put = (s, k, p, f, kind = 'meeple') => { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; };
const turn = (s, x, y, r, act = null, bridge = null) => G.applyAction(s, { t: 'turn', x, y, r, bridge, act });
// the next (hand-picked) turn: seat p places tile t
const next = (s, t, p) => { s.drawn = t; s.current = p; s.phase = 'place'; s.part = 1; s.bonus = false; };
const decide = (s, build) => G.applyAction(s, { t: 'castle', fi: s.castleAsk[0].fi, build });
const castleEvents = (ev) => ev.filter((e) => e.kind === 'castle');
const sorted = (a) => a.slice().sort();
function countPieces(s) {
  const onBoard = Object.values(s.board).reduce((a, t) => a + t.pieces.length, 0);
  const tops = Object.values(s.towers || {}).filter((t) => t.top).length;
  const hand = s.players.reduce((a, p) => a + Object.values(p.supply).reduce((x, y) => x + y, 0), 0);
  const held = s.players.reduce((a, p) => a + p.prisoners.length, 0);
  const cast = (s.castles || []).filter((c) => c.k).length;
  return onBoard + tops + hand + held + cast;
}
// E has its city on the north edge. The standard small city: E r2 at (0,0) (cap south, with the
// owner's knight) closed by seat 0 placing E r0 at (0,1) (cap north); the owner builds a castle.
// Its area is (0,0), (0,1) and the squares west and east of each.
const AREA = ['-1,0', '-1,1', '0,0', '0,1', '1,0', '1,1'];
function castleGame(opts = {}, { owner = 1, kind = 'meeple', extra = [] } = {}) {
  const s = setup([['0,0', 'E', 2], ...extra], 'E', opts);
  put(s, '0,0', owner, 0, kind);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle', 'the small city asks its owner');
  decide(s, true);
  assert.equal(s.castles.length, 1);
  return s;
}

// =====================================================================================
// CA1 Candidates
// =====================================================================================
T('CA1: a small city of two one-edge caps with one knight asks its owner; castleOptions describes it', () => {
  const s = setup([['0,0', 'E', 2]], 'E');
  put(s, '0,0', 1, 0);
  const ev = turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle');
  assert.deepEqual(s.castleAsk, [{ fi: 0, p: 1 }]);
  const o = G.castleOptions(s);
  assert.equal(o.seat, 1); assert.equal(o.fi, 0);
  assert.deepEqual(sorted(o.tiles), ['0,0', '0,1']);
  assert.deepEqual(sorted(o.nodes.map(([k, f]) => `${k}#${f}`)), ['0,0#0', '0,1#0']);
  assert.deepEqual(sorted(o.area), AREA);
  assert.ok(!ev.some((e) => e.kind === 'city'), 'nothing of the placement is scored before the decision');
  assert.equal(s.players[1].score, 0);
});

T('CA1: a knight put on the closing cap by the active player this turn also gets the choice', () => {
  const s = setup([['0,0', 'E', 2]], 'E');
  turn(s, 0, 1, 0, { kind: 'follower', key: '0,1', fi: 0, k: 'meeple' });
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 0);
  decide(s, true);
  assert.equal(s.castles[0].owner, 0); assert.equal(s.castles[0].key, '0,1', 'the castellan came from the new tile');
  assert.equal(s.board['0,1'].pieces.length, 0);
});

T('CA1: the pointed, wedge and band caps (BB/CFR!G, IC/C!, DG/CCc+.p) never become castles, first or closing', () => {
  // [type, rotation with the cap facing south, rotation with the cap facing north]
  for (const [t, rS, rN] of [['BB/CFR!G', 3, 1], ['IC/C!', 2, 0], ['DG/CCc+.p', 2, 0]]) {
    assert.equal(TILE_TYPES[t].features[0].noCastle, true, `${t} feature 0 is flagged noCastle`);
    const a = setup([['0,0', t, rS]], 'E');
    put(a, '0,0', 1, 0);
    turn(a, 0, 1, 0);
    assert.equal(a.phase, 'place', `${t} first: no decision`); assert.equal(a.players[1].score, 4); assert.equal(a.castles.length, 0);
    const b = setup([['0,0', 'E', 2]], t);
    put(b, '0,0', 1, 0);
    turn(b, 0, 1, rN);
    assert.equal(b.phase, 'place', `${t} closing: no decision`); assert.equal(b.players[1].score, 4); assert.equal(b.castles.length, 0);
  }
});

T('CA1: a three-tile city (cap, city bridge, cap) is never a castle', () => {
  const s = setup([['0,0', 'E', 2], ['0,1', 'G', 1]], 'E');
  put(s, '0,0', 1, 0);
  turn(s, 0, 2, 0);
  assert.equal(s.phase, 'place'); assert.equal(s.players[1].score, 6); assert.equal(s.castles.length, 0);
});

T('CA1: an empty small city is never a castle; it is a completed city worth 4 to nobody', () => {
  const s = setup([['0,0', 'E', 2]], 'E');
  const ev = turn(s, 0, 1, 0);
  assert.equal(s.phase, 'place');
  const c = ev.find((e) => e.kind === 'city');
  assert.ok(c); assert.equal(c.points, 4); assert.deepEqual(c.winners, []);
});

T('CA1: no token, castles switched off, or the expansion off: never asked, the city scores 4', () => {
  const a = setup([['0,0', 'E', 2]], 'E');
  put(a, '0,0', 1, 0); a.players[1].castles = 0;
  turn(a, 0, 1, 0);
  assert.equal(a.phase, 'place'); assert.equal(a.players[1].score, 4);
  const b = setup([['0,0', 'E', 2]], 'E', { bcb: { castles: false } });
  assert.ok(b.players.every((p) => p.castles === 0 && p.bridges === 3), 'castles off: no tokens, bridges still on');
  put(b, '0,0', 1, 0); b.players[1].castles = 3; // even a hand-edited supply does not switch the part back on
  turn(b, 0, 1, 0);
  assert.equal(b.phase, 'place'); assert.equal(b.players[1].score, 4); assert.equal(b.castles.length, 0);
  const c = setup([['0,0', 'E', 2]], 'E', { exps: { bridges: false } });
  assert.ok(c.players.every((p) => p.castles === 0));
  put(c, '0,0', 1, 0); c.players[1].castles = 3;
  turn(c, 0, 1, 0);
  assert.equal(c.phase, 'place'); assert.equal(c.players[1].score, 4);
});

// =====================================================================================
// CA2 Decisions
// =====================================================================================
T('CA2: the non-active owner decides (phase castle, actingSeat = owner); illegal actions throw', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { players: 3 });
  put(s, '0,0', 2, 0);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle'); assert.equal(s.current, 0); assert.equal(G.actingSeat(s), 2);
  assert.deepEqual(G.followerOptions(s), []);
  assert.deepEqual(G.ransomOptions(s), []);
  assert.throws(() => G.applyAction(s, { t: 'castle', fi: 1, build: true }), /castle/i);
  assert.throws(() => G.applyAction(s, { t: 'turn', x: 5, y: 5, r: 0 }));
  assert.throws(() => G.applyAction(s, { t: 'discard' }));
  decide(s, false);
  assert.equal(s.players[2].score, 4); assert.equal(s.phase, 'place'); assert.equal(s.current, 1);
  assert.throws(() => G.applyAction(s, { t: 'castle', fi: 0, build: true }), /castle/i, 'no decision is pending any more');
});

T('CA2: two small cities closed by one tile: one decision each, in seat order from the active player', () => {
  // H r0 = caps east (feature 0) and west (feature 1), placed between two caps
  const s = setup([['-1,0', 'E', 1], ['1,0', 'E', 3]], 'H', { players: 3 });
  put(s, '-1,0', 2, 0); put(s, '1,0', 1, 0);
  turn(s, 0, 0, 0);
  assert.deepEqual(s.castleAsk, [{ fi: 0, p: 1 }, { fi: 1, p: 2 }]);
  assert.equal(G.actingSeat(s), 1);
  decide(s, true);
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 2); assert.equal(G.castleOptions(s).fi, 1);
  decide(s, false);
  assert.equal(s.castles.length, 1); assert.equal(s.castles[0].owner, 1);
  assert.equal(s.players[2].score, 4); assert.equal(s.players[1].score, 0);
  // seat order beats feature order: P1 active, knights of P0 (feature 0 side) and P2 (feature 1 side)
  const t = setup([['-1,0', 'E', 1], ['1,0', 'E', 3]], 'H', { players: 3 });
  t.current = 1;
  put(t, '1,0', 0, 0); put(t, '-1,0', 2, 0);
  turn(t, 0, 0, 0);
  assert.deepEqual(t.castleAsk, [{ fi: 1, p: 2 }, { fi: 0, p: 0 }]);
});

T('CA2: one owner of both: feature order; after using his last castle the second is not asked, but he may build on either', () => {
  const s = setup([['-1,0', 'E', 1], ['1,0', 'E', 3]], 'H');
  put(s, '-1,0', 1, 0); put(s, '1,0', 1, 0); s.players[1].castles = 1;
  turn(s, 0, 0, 0);
  assert.deepEqual(s.castleAsk, [{ fi: 0, p: 1 }, { fi: 1, p: 1 }]);
  decide(s, true);
  assert.equal(s.phase, 'place', 'the second small city is not asked');
  assert.equal(s.players[1].castles, 0); assert.equal(s.players[1].score, 4);
  assert.deepEqual(sorted(s.castles[0].tiles), ['0,0', '1,0']);
  const t = setup([['-1,0', 'E', 1], ['1,0', 'E', 3]], 'H');
  put(t, '-1,0', 1, 0); put(t, '1,0', 1, 0); t.players[1].castles = 1;
  turn(t, 0, 0, 0);
  decide(t, false);
  assert.equal(t.phase, 'castle', 'declining the first keeps the token for the second');
  decide(t, true);
  assert.deepEqual(sorted(t.castles[0].tiles), ['-1,0', '0,0']);
  assert.equal(t.players[1].score, 4);
});

// =====================================================================================
// CA3 Building
// =====================================================================================
T('CA3: building: the knight leaves the tile for the castle entry, one token used, no points, no fairy +3', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { dragon: true } });
  put(s, '0,0', 1, 0);
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  const start = countPieces(s);
  const ev1 = turn(s, 0, 1, 0);
  const ev2 = decide(s, true);
  const c = s.castles[0];
  assert.deepEqual({ id: c.id, owner: c.owner, k: c.k, key: c.key, born: c.born }, { id: 0, owner: 1, k: 'meeple', key: '0,0', born: 1 });
  assert.deepEqual(sorted(c.tiles), ['0,0', '0,1']);
  assert.deepEqual(sorted(c.nodes.map(([k, f]) => `${k}#${f}`)), ['0,0#0', '0,1#0']);
  assert.deepEqual(sorted(c.area), AREA);
  assert.equal(s.board['0,0'].pieces.length, 0, 'the castellan is not in tile.pieces');
  assert.equal(s.players[1].castles, 2); assert.equal(s.players[1].supply.meeple, 6);
  assert.equal(countPieces(s), start, 'figures conserved');
  const all = [...ev1, ...ev2];
  assert.ok(all.some((e) => e.kind === 'castleBuilt' && e.castle === 0 && e.player === 1));
  assert.ok(!all.some((e) => e.kind === 'city'), 'the converted city is never scored');
  assert.ok(!all.some((e) => e.kind === 'fairy' && e.points === 3), 'no fairy +3 for a conversion');
  assert.equal(s.players[1].breakdown.city, 0);
  assert.equal(s.players[1].score, 1, 'only the fairy +1 at the start of P1\'s turn');
  assert.deepEqual(s.fairy, { key: '0,0', f: 'castle', c: 0, k: 'meeple', p: 1 }, 'the fairy stays with her knight');
});

T('CA3: the lonely-figure sweep after a conversion sends a builder left in the city home (hand-made board)', () => {
  // a builder can never be in a small city in play (BC31); the engine still sweeps after the conversion
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { traders: true } });
  put(s, '0,0', 1, 0); put(s, '0,0', 1, 0, 'builder');
  const start = countPieces(s);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle', 'a builder is not a follower: one knight, one owner');
  const ev = decide(s, true);
  assert.ok(ev.some((e) => e.kind === 'return' && e.meeples.some((m) => m.k === 'builder' && m.p === 1)));
  assert.equal(s.players[1].supply.builder, 1); assert.equal(s.board['0,0'].pieces.length, 0);
  assert.equal(countPieces(s), start);
});

// =====================================================================================
// CA4 Order: follower step and dragon flight come before the decision
// =====================================================================================
T('CA4: a princess removal of the knight (DG/CRRR.p closes the city) means no castle; without it the cap is a castle base', () => {
  const s = setup([['0,0', 'E', 2]], 'DG/CRRR.p', { exps: { dragon: true } });
  put(s, '0,0', 1, 0);
  const ev = turn(s, 0, 1, 0, { kind: 'princess', key: '0,0', fi: 0, k: 'meeple', p: 1 });
  assert.equal(s.phase, 'place'); assert.equal(s.castles.length, 0);
  const c = ev.find((e) => e.kind === 'city');
  assert.ok(c && c.points === 4 && !c.winners.length, 'the emptied small city is completed, nobody scores');
  assert.equal(s.players[1].supply.meeple, 7);
  const t = setup([['0,0', 'E', 2]], 'DG/CRRR.p', { exps: { dragon: true } });
  put(t, '0,0', 1, 0);
  turn(t, 0, 1, 0);
  assert.equal(t.phase, 'castle');
});

T('CA4: a tower capture of the knight in the follower step means no castle', () => {
  const s = setup([['0,0', 'E', 2], ['0,-1', 'TO/C', 0]], 'E', { exps: { tower: true } });
  put(s, '0,0', 1, 0);
  const ev = turn(s, 0, 1, 0, { kind: 'floor', key: '0,-1', capture: { key: '0,0', fi: 0, k: 'meeple', p: 1 } });
  assert.equal(s.phase, 'place'); assert.equal(s.castles.length, 0);
  assert.deepEqual(s.players[0].prisoners, [{ p: 1, k: 'meeple' }]);
  assert.ok(ev.some((e) => e.kind === 'city' && e.points === 4 && !e.winners.length));
});

T('CA4: a dragon tile closing the city: the flight comes first and a knight eaten means no castle', () => {
  const s = setup([['0,0', 'E', 2], ['1,0', 'B', 0]], 'DG/C.dG', { exps: { dragon: true } });
  s.dragon = '1,0';
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'dragon'); assert.deepEqual(s.castleAsk, []);
  assert.deepEqual(G.dragonMoves(s), ['0,0']);
  const ev1 = G.applyAction(s, { t: 'dragon', key: '0,0' });
  assert.ok(ev1[0].meeples.some((m) => m.p === 1), 'the knight is eaten');
  const ev2 = G.applyAction(s, { t: 'dragon', key: '0,1' });
  assert.equal(s.phase, 'place'); assert.equal(s.castles.length, 0);
  assert.ok(ev2.some((e) => e.kind === 'city' && e.points === 4 && !e.winners.length));
});

T('CA4: the castle decision waits until the dragon has landed', () => {
  const s = setup([['0,0', 'E', 2], ['1,1', 'B', 0], ['2,1', 'B', 0]], 'DG/C.dG', { exps: { dragon: true } });
  s.dragon = '1,1';
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'dragon');
  assert.deepEqual(sorted(G.dragonMoves(s)), ['0,1', '2,1']);
  const ev = G.applyAction(s, { t: 'dragon', key: '2,1' });
  assert.ok(ev.some((e) => e.kind === 'dragonLands'));
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 1);
  decide(s, true);
  assert.equal(s.castles[0].owner, 1); assert.equal(s.phase, 'place');
});

T('CA4/BC50: a volcano tile closing a small city: the dragon lands there and the knight on the other cap may still build', () => {
  const s = setup([['0,0', 'E', 2]], 'DG/C.v', { exps: { dragon: true } });
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  assert.equal(s.dragon, '0,1');
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 1);
  decide(s, true);
  assert.equal(s.castles[0].key, '0,0'); assert.equal(s.castles[0].k, 'meeple');
});

// =====================================================================================
// CA5 Area
// =====================================================================================
T('CA5: area keys of a vertical and a horizontal castle', () => {
  assert.deepEqual(sorted(G.castleArea(['0,0', '0,1'])), AREA);
  assert.deepEqual(sorted(G.castleArea(['0,1', '0,0'])), AREA);
  assert.deepEqual(sorted(G.castleArea(['3,-2', '4,-2'])), sorted(['3,-2', '4,-2', '3,-3', '3,-1', '4,-3', '4,-1']));
  const s = setup([['0,0', 'E', 1]], 'E'); // horizontal: cap east at (0,0), cap west at (1,0)
  put(s, '0,0', 1, 0);
  turn(s, 1, 0, 3);
  decide(s, true);
  assert.deepEqual(sorted(s.castles[0].area), sorted(['0,0', '1,0', '0,-1', '0,1', '1,-1', '1,1']));
});

T('CA5: squares empty when the castle was built count once filled; squares beyond the ends and corners never', () => {
  const s = castleGame();
  // a 3-tile road north of the castle, through (0,-1) (beyond its end) and the corner (-1,-1)
  add(s, [['-2,-1', 'A', 3], ['-1,-1', 'U', 1]]);
  next(s, 'A', 0);
  let ev = turn(s, 0, -1, 1);
  assert.ok(ev.some((e) => e.kind === 'road' && e.points === 3));
  assert.equal(castleEvents(ev).length, 0, 'outside the area: no trigger'); assert.equal(s.castles[0].k, 'meeple');
  // (1,0) and (1,1) were empty when the castle was built
  add(s, [['1,-1', 'A', 0]]);
  next(s, 'U', 1);
  ev = turn(s, 1, 0, 0);
  assert.equal(castleEvents(ev).length, 0);
  next(s, 'A', 0);
  ev = turn(s, 1, 1, 2);
  const ce = castleEvents(ev);
  assert.equal(ce.length, 1); assert.equal(ce[0].points, 3); assert.equal(ce[0].from, 'road');
  assert.equal(s.players[1].breakdown.castle, 3);
});

// =====================================================================================
// CA6 Triggers
// =====================================================================================
T('CA6: an empty road with a single tile in the area triggers, whoever completes it', () => {
  const s = castleGame();
  add(s, [['1,1', 'A', 3], ['2,1', 'U', 1]]); // road (1,1)-(2,1)-..., only (1,1) in the area
  next(s, 'A', 0);
  const ev = turn(s, 3, 1, 1);
  const ce = castleEvents(ev);
  assert.equal(ce.length, 1); assert.equal(ce[0].points, 3); assert.deepEqual(ce[0].winners, [1]);
  assert.equal(s.castles[0].k, null, 'the castellan went home'); assert.equal(s.players[1].supply.meeple, 7);
  assert.equal(s.players[0].score, 0);
});

T('CA6: an empty small city (4) triggers; a declined one (4) triggers; a converted one does not', () => {
  // small city (1,0)-(2,0) in the area: E r1 at (1,0), closed by E r3 at (2,0)
  const a = castleGame();
  add(a, [['1,0', 'E', 1]]);
  next(a, 'E', 0);
  let ev = turn(a, 2, 0, 3);
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.from]), [[4, 'city']]);
  const b = castleGame();
  add(b, [['1,0', 'E', 1]]); put(b, '1,0', 0, 0);
  next(b, 'E', 0);
  turn(b, 2, 0, 3);
  assert.equal(b.phase, 'castle');
  ev = decide(b, false);
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.from]), [[4, 'city']]);
  assert.equal(b.players[0].score, 4); assert.equal(b.players[1].score, 4);
  const c = castleGame();
  add(c, [['1,0', 'E', 1]]); put(c, '1,0', 0, 0);
  next(c, 'E', 0);
  turn(c, 2, 0, 3);
  ev = decide(c, true);
  assert.equal(castleEvents(ev).length, 0, 'a converted city is not completed');
  assert.equal(c.castles[0].k, 'meeple'); assert.equal(c.castles.length, 2);
});

T('CA6: an empty monastery completed in the area triggers at 9; one outside with neighbours inside does not', () => {
  const opts = { bcb: { bazaars: false } }; // BB/F.b (plain meadow) fills the gaps
  const a = castleGame(opts, { extra: [['1,0', 'B', 0], ['0,-1', 'BB/F.b', 0], ['1,-1', 'BB/F.b', 0], ['2,-1', 'BB/F.b', 0], ['2,0', 'BB/F.b', 0], ['1,1', 'BB/F.b', 0]] });
  next(a, 'BB/F.b', 0);
  let ev = turn(a, 2, 1, 0);
  assert.ok(ev.some((e) => e.kind === 'monastery' && e.points === 9 && !e.winners.length));
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.from]), [[9, 'monastery']]);
  const b = castleGame(opts, { extra: [['2,0', 'B', 0], ['1,-1', 'BB/F.b', 0], ['2,-1', 'BB/F.b', 0], ['3,-1', 'BB/F.b', 0], ['1,0', 'BB/F.b', 0], ['3,0', 'BB/F.b', 0], ['1,1', 'BB/F.b', 0], ['2,1', 'BB/F.b', 0]] });
  next(b, 'BB/F.b', 0);
  ev = turn(b, 3, 1, 0);
  assert.ok(ev.some((e) => e.kind === 'monastery' && e.points === 9), 'the monastery at (2,0) is complete');
  assert.equal(castleEvents(ev).length, 0, 'its own tile is outside the area');
  assert.equal(b.castles[0].k, 'meeple');
});

T('CA6/CA8: the placement that builds a castle never scores it, not even through a chain; an older castle scores from it', () => {
  // castle A: (-2,0)-(-1,0), P0; castle B: (0,0)-(0,1), P1, built by the L tile that also completes the road (-1,1)-(0,1)
  const s = setup([['-2,0', 'E', 1], ['0,0', 'E', 2], ['-1,1', 'A', 3]], 'E');
  put(s, '-2,0', 0, 0); put(s, '0,0', 1, 0);
  turn(s, -1, 0, 3);
  decide(s, true);
  next(s, 'L', 1);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 1);
  const ev = decide(s, true);
  assert.ok(ev.some((e) => e.kind === 'road' && e.points === 2 && !e.winners.length), 'the road (-1,1)-(0,1) is complete');
  const ce = castleEvents(ev);
  assert.equal(ce.length, 1, 'only the older castle scores');
  assert.equal(ce[0].castle, 0); assert.equal(ce[0].points, 2); assert.deepEqual(ce[0].winners, [0]);
  assert.equal(s.castles[1].k, 'meeple', 'the new castle (whose area holds a tile of the older one) still waits');
});

T('CA6: a castle built in builder part 1 scores in part 2 of the same double turn (real builder)', () => {
  const s = setup([['0,0', 'E', 2], ['-2,1', 'A', 3], ['-1,1', 'U', 1]], 'D', { exps: { traders: true }, deck: ['B', 'B', 'B', 'A'] });
  put(s, '0,0', 0, 0); put(s, '-1,1', 0, 0); put(s, '-1,1', 0, 0, 'builder');
  turn(s, 0, 1, 0); // D: closes the small city and extends the builder's road
  assert.equal(s.phase, 'castle');
  decide(s, true);
  assert.equal(s.part, 2); assert.equal(s.current, 0); assert.equal(s.drawn, 'A');
  const ev = turn(s, 1, 1, 1);
  assert.ok(ev.some((e) => e.kind === 'road' && e.points === 4 && e.winners.includes(0)));
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.winners]), [[4, [0]]]);
  assert.equal(s.players[0].score, 8);
});

T('CA6: a bazaar-round turn can trigger a castle', () => {
  const s = castleGame();
  add(s, [['1,-1', 'A', 0], ['1,0', 'U', 0]]);
  s.deck = ['B', 'B', 'B', 'B', 'B', 'A', 'B']; // the reveal pops B, then A
  next(s, 'BB/F.b', 0);
  turn(s, -1, 0, 0);
  assert.equal(s.phase, 'bazaar'); assert.equal(G.actingSeat(s), 1);
  const iA = s.bazaar.tiles.findIndex((x) => x.t === 'A');
  G.applyAction(s, { t: 'bazaar', pick: iA, bid: 0 });
  G.applyAction(s, { t: 'bazaar', pass: true });
  assert.ok(s.bazaar && s.phase === 'place' && s.current === 1 && s.drawn === 'A', 'P1 plays the bought tile');
  const ev = turn(s, 1, 1, 2);
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.winners]), [[3, [1]]]);
  assert.ok(s.bazaar, 'still inside the bazaar round');
});

T('CA6: fields never trigger a castle, during play or at the end', () => {
  const s = castleGame();
  next(s, 'B', 0);
  put(s, '0,1', 0, 1); // P0's farmer in the field of (0,1)
  const ev = turn(s, 1, 1, 0); // a monastery next door: the field grows, nothing completes
  assert.equal(castleEvents(ev).length, 0);
  const fin = G.finalScoring(s, true);
  assert.ok(!fin.some((e) => e.kind === 'castle'));
  assert.ok(fin.some((e) => e.kind === 'field' && e.winners.includes(0) && e.points === 4));
});

// =====================================================================================
// CA7 Value
// =====================================================================================
T('CA7: the castle takes the full value: inn x2, cathedral x3, pennants', () => {
  // inn: road (1,-1)-(1,0)-(1,1) through IC/RFr.iG (inn road) -> 6
  const a = castleGame({ exps: { inns: true } });
  add(a, [['1,-1', 'A', 0], ['1,0', 'IC/RFr.iG', 1]]);
  next(a, 'A', 0);
  let ce = castleEvents(turn(a, 1, 1, 2));
  assert.deepEqual(ce.map((e) => e.points), [6]);
  // cathedral: 5-tile city through IC/Cccc.c with (1,1) in the area -> 15
  const b = castleGame({ exps: { inns: true } });
  add(b, [['1,1', 'E', 1], ['2,1', 'IC/Cccc.c', 0], ['2,0', 'E', 2], ['3,1', 'E', 3]]);
  next(b, 'E', 0);
  ce = castleEvents(turn(b, 2, 2, 0));
  assert.deepEqual(ce.map((e) => e.points), [15]);
  // pennant: (1,1) cap - (2,1) F (pennant) - (3,1) cap -> (3 + 1) x 2 = 8
  const c = castleGame();
  add(c, [['1,1', 'E', 1], ['2,1', 'F', 0]]);
  next(c, 'E', 0);
  ce = castleEvents(turn(c, 3, 1, 3));
  assert.deepEqual(ce.map((e) => e.points), [8]);
});

T('CA7: two features completed at once: the castle takes the higher one, not the first one', () => {
  // J at (1,1) closes the empty small city (1,0)-(1,1) (4, listed first) and a 5-tile road (5)
  const s = castleGame();
  add(s, [['1,0', 'E', 2], ['2,1', 'U', 1], ['3,1', 'A', 1], ['1,2', 'U', 0], ['1,3', 'A', 2]]);
  next(s, 'J', 0);
  const ev = turn(s, 1, 1, 0);
  assert.ok(ev.some((e) => e.kind === 'city' && e.points === 4));
  assert.ok(ev.some((e) => e.kind === 'road' && e.points === 5));
  assert.deepEqual(castleEvents(ev).map((e) => [e.points, e.from]), [[5, 'road']]);
  assert.equal(s.players[1].score, 5);
});

T('CA7: one road scores two castles in full; the owner of road and castle scores twice; breakdown castle', () => {
  // castle X (0,0)-(0,1) of P1, castle Y (2,0)-(2,1) of P0; road (1,-1)-(1,0)-(1,1) lies in both areas
  const s = setup([['0,0', 'E', 2], ['2,0', 'E', 2]], 'E');
  put(s, '0,0', 1, 0); put(s, '2,0', 0, 0);
  turn(s, 0, 1, 0); decide(s, true);
  next(s, 'E', 1);
  turn(s, 2, 1, 0); decide(s, true);
  add(s, [['1,-1', 'A', 0]]);
  next(s, 'U', 1);
  turn(s, 1, 0, 0, { kind: 'follower', key: '1,0', fi: 0, k: 'meeple' });
  next(s, 'A', 0);
  const ev = turn(s, 1, 1, 2);
  const ce = castleEvents(ev);
  assert.deepEqual(sorted(ce.map((e) => `${e.castle}:${e.points}:${e.winners}`)), ['0:3:1', '1:3:0']);
  assert.equal(s.players[1].breakdown.road, 3); assert.equal(s.players[1].breakdown.castle, 3); assert.equal(s.players[1].score, 6);
  assert.equal(s.players[0].breakdown.castle, 3); assert.equal(s.players[0].score, 3);
  for (const p of s.players) assert.equal(Object.values(p.breakdown).reduce((a, b) => a + b, 0), p.score);
});

// =====================================================================================
// CA8 Chains
// =====================================================================================
// castle X: vertical (0,0)-(0,1) of P1; castle Y: horizontal (1,1)-(2,1) of P0. Y's tile (1,1) lies in
// X's area, X's tiles are not in Y's area: Y scoring sets X off, X scoring does not set Y off.
function twoCastles() {
  const s = setup([['0,0', 'E', 2], ['1,1', 'E', 1]], 'E');
  put(s, '0,0', 1, 0); put(s, '1,1', 0, 0);
  turn(s, 0, 1, 0); decide(s, true);
  next(s, 'E', 1);
  turn(s, 2, 1, 3); decide(s, true);
  assert.equal(s.castles.length, 2);
  return s;
}
T('CA8: chains are directional: X scoring does not set off Y; Y scoring sets off X with the same value', () => {
  const a = twoCastles();
  add(a, [['-1,-1', 'A', 0], ['-1,0', 'U', 0]]); // road on x = -1: only in X's area
  next(a, 'A', 0);
  let ce = castleEvents(turn(a, -1, 1, 2));
  assert.deepEqual(ce.map((e) => [e.castle, e.points]), [[0, 3]]);
  assert.equal(a.castles[1].k, 'meeple', 'Y still waits');
  const b = twoCastles();
  add(b, [['2,2', 'A', 3]]); // road (2,2)-(3,2): only in Y's area
  next(b, 'A', 1);
  ce = castleEvents(turn(b, 3, 2, 1));
  assert.deepEqual(sorted(ce.map((e) => `${e.castle}:${e.points}:${e.from}`)), ['0:2:castle', '1:2:road']);
});

T('CA8: a castle reachable from two sources takes the best value, and every castle scores once', () => {
  // D at (2,0) completes a 3-tile road (in both areas) and an empty small city (2,-1)-(2,0) worth 4 (only in Y's area)
  const s = twoCastles();
  add(s, [['1,0', 'A', 3], ['2,-1', 'E', 2], ['3,0', 'A', 1]]);
  next(s, 'D', 0);
  const ev = turn(s, 2, 0, 0);
  assert.ok(ev.some((e) => e.kind === 'road' && e.points === 3));
  assert.ok(ev.some((e) => e.kind === 'city' && e.points === 4));
  const ce = castleEvents(ev);
  assert.equal(ce.length, 2, 'each castle once');
  assert.deepEqual(sorted(ce.map((e) => `${e.castle}:${e.points}:${e.from}`)), ['0:4:castle', '1:4:city']);
  assert.equal(s.players[1].breakdown.castle, 4); assert.equal(s.players[0].breakdown.castle, 4);
});

// =====================================================================================
// CA9 The castellan is out of reach
// =====================================================================================
T('CA9: the dragon may enter both castle tiles but never eats the castellan', () => {
  const s = castleGame({ exps: { dragon: true } }, { extra: [['1,0', 'B', 0]] });
  s.dragon = '1,0';
  next(s, 'DG/C.dG', 0);
  turn(s, 2, 0, 1);
  assert.equal(s.phase, 'dragon');
  assert.ok(G.dragonMoves(s).includes('0,0'));
  const ev1 = G.applyAction(s, { t: 'dragon', key: '0,0' });
  assert.deepEqual(ev1[0].meeples, []);
  const ev2 = G.applyAction(s, { t: 'dragon', key: '0,1' });
  assert.deepEqual(ev2[0].meeples, []);
  assert.equal(s.phase, 'place'); assert.equal(s.castles[0].k, 'meeple');
});

T('CA9: the castellan is never in captureTargets, princess or portal options', () => {
  // a tower at (0,-1), right above the castle's knight tile; P0's knight in an open city at (1,-1), in range
  const s = castleGame({ exps: { tower: true, dragon: true } }, { extra: [['0,-1', 'TO/C', 0], ['1,-1', 'E', 1]] });
  s.towers['0,-1'].h = 2;
  put(s, '1,-1', 0, 0);
  for (let h = 0; h <= 4; h++) assert.ok(!G.captureTargets(s, '0,-1', h).some((t) => t.fi === 'castle' || t.p === 1), `height ${h}`);
  assert.ok(G.captureTargets(s, '0,-1', 1).some((t) => t.key === '1,-1'), 'other figures in range are targets');
  const probe = G.cloneState(s);
  next(probe, 'B', 0);
  assert.throws(() => turn(probe, -1, 0, 0, { kind: 'floor', key: '0,-1', capture: { key: '0,0', fi: 'castle', k: 'meeple', p: 1 } }), /capture/i);
  // the princess (DG/CRRR.p closing the east city) and a portal (DG/RrC.g) never reach the castellan
  const pr = G.cloneState(s);
  next(pr, 'DG/CRRR.p', 1);
  G.placeTile(pr, 2, -1, 3);
  const po = G.followerOptions(pr).filter((o) => o.kind === 'princess');
  assert.deepEqual(po.map((o) => `${o.key}#${o.fi}`), ['1,-1#0']);
  const pt = G.cloneState(s);
  next(pt, 'DG/RrC.g', 0);
  G.placeTile(pt, -1, 0, 0);
  const portal = G.followerOptions(pt).filter((o) => o.portal);
  assert.ok(portal.length > 0);
  const capNodes = new Set(s.castles[0].nodes.map(([k, f]) => `${k}#${f}`));
  assert.ok(!portal.some((o) => o.fi === 'castle' || capNodes.has(`${o.key}#${o.fi}`)));
});

// =====================================================================================
// CA10 Fairy
// =====================================================================================
T('CA10: the fairy can be moved to a castellan (fi castle, c), and is not offered there again', () => {
  const s = castleGame({ exps: { dragon: true } }, { owner: 0 });
  next(s, 'B', 0);
  G.placeTile(s, 0, 2, 0);
  const fo = G.followerOptions(s).filter((o) => o.kind === 'fairy');
  assert.deepEqual(fo, [{ kind: 'fairy', key: '0,0', fi: 'castle', k: 'meeple', c: 0 }]);
  G.finishTurn(s, fo[0]);
  assert.deepEqual(s.fairy, { key: '0,0', f: 'castle', k: 'meeple', p: 0, c: 0 });
  next(s, 'B', 0);
  G.placeTile(s, -1, 0, 0);
  assert.ok(!G.followerOptions(s).some((o) => o.kind === 'fairy'), 'already standing there');
});

T('CA10: a fairy by the converted knight stays; +1 every turn, +3 when the castle scores, then unassigned on her tile', () => {
  const s = setup([['0,0', 'E', 2]], 'E', { exps: { dragon: true } });
  put(s, '0,0', 1, 0);
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  turn(s, 0, 1, 0);
  decide(s, true);
  assert.equal(s.players[1].score, 1);
  next(s, 'B', 1); turn(s, -1, 0, 0);
  next(s, 'B', 0); s.current = 0; turn(s, -1, 1, 0);
  assert.equal(s.players[1].score, 2, '+1 at the start of each of P1\'s turns');
  add(s, [['1,-1', 'A', 0], ['1,0', 'U', 0]]);
  next(s, 'A', 1);
  const ev = turn(s, 1, 1, 2);
  const i = ev.findIndex((e) => e.kind === 'castle');
  assert.ok(i >= 0 && ev[i + 1].kind === 'fairy' && ev[i + 1].points === 3);
  assert.equal(s.players[1].score, 2 + 3 + 3);
  assert.equal(s.players[1].breakdown.fairy, 5); assert.equal(s.players[1].breakdown.castle, 3);
  assert.deepEqual(s.fairy, { key: '0,0', f: null, k: null, p: null });
  next(s, 'B', 0); turn(s, 2, 0, 0);
  assert.equal(s.players[1].score, 8, 'no more +1');
});

T('CA10: a fairy by a castellan blocks the dragon from the knight\'s tile', () => {
  const s = castleGame({ exps: { dragon: true } }, { extra: [['1,0', 'B', 0]] });
  s.fairy = { key: '0,0', f: 'castle', c: 0, k: 'meeple', p: 1 };
  s.dragon = '1,0';
  next(s, 'DG/C.dG', 0);
  turn(s, 2, 0, 1);
  assert.equal(s.phase, 'dragon');
  assert.deepEqual(G.dragonMoves(s), ['2,0']);
});

// =====================================================================================
// CA11 Final scoring
// =====================================================================================
T('CA11: castellans go home first with 0 points and no fairy +3; the field still counts the castle', () => {
  const s = castleGame({ exps: { dragon: true } });
  s.fairy = { key: '0,0', f: 'castle', c: 0, k: 'meeple', p: 1 };
  put(s, '0,1', 0, 1);
  const before = s.players[1].score;
  const fin = G.finalScoring(s, true);
  assert.equal(fin[0].kind, 'castleEnd');
  assert.equal(fin[0].points, 0); assert.deepEqual(fin[0].winners, []);
  assert.ok(!fin.some((e) => e.kind === 'fairy'), 'no fairy bonus for a castle at the end');
  assert.equal(s.players[1].score, before);
  assert.equal(s.castles[0].k, null); assert.equal(s.players[1].supply.meeple, 7);
  assert.equal(s.fairy.p, null);
  assert.ok(fin.some((e) => e.kind === 'field' && e.points === 4 && e.castleCount === 1));
});

T('CA11: a field with one castle and one city = 7; with the winner\'s pig 9', () => {
  const s = castleGame({ exps: { traders: true } });
  add(s, [['0,2', 'E', 2], ['0,3', 'E', 0]]); // a completed (scored) small city under the castle
  put(s, '0,1', 0, 1); put(s, '0,1', 0, 1, 'pig');
  const fin = G.finalScoring(s, true);
  const field = fin.find((e) => e.kind === 'field');
  assert.equal(field.points, 7); assert.equal(field.cityCount, 2); assert.equal(field.castleCount, 1);
  assert.equal(fin.find((e) => e.kind === 'pig').points, 2);
  assert.equal(s.players[0].score, 9);
});

T('CA11: castles separate fields: each field beside the castle gets the castle\'s 4', () => {
  const s = setup([['0,0', 'E', 1]], 'E'); // horizontal castle (0,0)-(1,0)
  put(s, '0,0', 1, 0);
  turn(s, 1, 0, 3);
  decide(s, true);
  put(s, '0,0', 0, 1); put(s, '1,0', 1, 1);
  assert.notEqual(G.getGroup(s.board, '0,0', 1).id, G.getGroup(s.board, '1,0', 1).id);
  const fin = G.finalScoring(s, true);
  const fields = fin.filter((e) => e.kind === 'field');
  assert.equal(fields.length, 2);
  assert.ok(fields.every((e) => e.points === 4 && e.castleCount === 1));
  assert.equal(s.players[0].score, 4); assert.equal(s.players[1].score, 4);
});

// =====================================================================================
// Combinations
// =====================================================================================
T('CI4: Abbot x P&D x BCB: a fairy by the castellan; the abbot recall in the area does nothing; the empty garden then scores the castle 9 + fairy 3', () => {
  // garden BA/CG at (1,0) (its city cap closed by E at (1,-1)), with P1's abbot; meadow tiles around it
  const s = setup([['0,0', 'E', 2], ['1,-1', 'E', 2], ['1,0', 'BA/CG', 0], ['0,-1', 'BB/F.b', 0], ['2,-1', 'BB/F.b', 0], ['2,0', 'BB/F.b', 0], ['1,1', 'BB/F.b', 0]], 'E',
    { exps: { abbot: true, dragon: true }, bcb: { bazaars: false } });
  put(s, '0,0', 1, 0); put(s, '1,0', 1, 2, 'abbot');
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  turn(s, 0, 1, 0);
  decide(s, true);
  assert.equal(s.fairy.f, 'castle');
  assert.equal(s.current, 1); assert.equal(s.players[1].score, 1);
  next(s, 'BB/F.b', 1);
  let ev = turn(s, -1, 0, 0, { kind: 'recall', key: '1,0', fi: 2 });
  const rec = ev.find((e) => e.kind === 'recall');
  assert.equal(rec.points, 8);
  assert.equal(castleEvents(ev).length, 0, 'a recall never triggers a castle');
  assert.ok(!ev.some((e) => e.kind === 'fairy' && e.points === 3));
  assert.equal(s.castles[0].k, 'meeple');
  next(s, 'BB/F.b', 0);
  ev = turn(s, 2, 1, 0);
  assert.ok(ev.some((e) => e.kind === 'garden' && e.points === 9 && !e.winners.length));
  const i = ev.findIndex((e) => e.kind === 'castle');
  assert.equal(ev[i].points, 9); assert.equal(ev[i].from, 'garden');
  assert.equal(ev[i + 1].kind, 'fairy'); assert.equal(ev[i + 1].points, 3);
  assert.equal(s.players[1].score, 1 + 8 + 9 + 3);
  assert.deepEqual([s.players[1].breakdown.monastery, s.players[1].breakdown.castle, s.players[1].breakdown.fairy], [8, 9, 4]);
});

T('CI5: I&C x T&B x BCB: a large castellan scores once and goes home; the castle is 5 for a winning pig owner', () => {
  const s = castleGame({ exps: { inns: true, traders: true } }, { kind: 'large' });
  assert.equal(s.castles[0].k, 'large'); assert.equal(s.players[1].supply.large, 0);
  add(s, [['1,-1', 'A', 0], ['1,0', 'U', 0]]);
  next(s, 'A', 0);
  const ce = castleEvents(turn(s, 1, 1, 2));
  assert.deepEqual(ce.map((e) => e.points), [3]);
  assert.equal(s.players[1].score, 3, 'once, not twice'); assert.equal(s.players[1].supply.large, 1);
  // after scoring the castle still counts for farmers: 3 + 1, +1 for the pig
  put(s, '0,1', 0, 1); put(s, '0,1', 0, 1, 'pig');
  const fin = G.finalScoring(s, true);
  assert.equal(fin.find((e) => e.kind === 'field').points, 4);
  assert.equal(fin.find((e) => e.kind === 'pig').points, 1);
  assert.equal(s.players[0].score, 5);
});

T('CI6: Tower x BCB: a castle on a tower-foundation cap; the tower keeps working and never captures the castellan', () => {
  // TO/CFR r2 at (0,0): cap south (with the foundation), road north
  const s = setup([['0,0', 'TO/CFR', 2]], 'E', { exps: { tower: true } });
  put(s, '0,0', 1, 0);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle');
  decide(s, true);
  assert.equal(s.castles[0].key, '0,0');
  next(s, 'B', 1);
  G.placeTile(s, -1, 0, 0);
  assert.ok(G.followerOptions(s).some((o) => o.kind === 'floor' && o.key === '0,0'), 'floors may go on the tower');
  G.finishTurn(s, { kind: 'floor', key: '0,0' });
  assert.equal(s.towers['0,0'].h, 1);
  assert.ok(!G.captureTargets(s, '0,0', 3).some((t) => t.fi === 'castle'));
  next(s, 'B', 0);
  G.placeTile(s, 1, 0, 0);
  assert.ok(G.followerOptions(s).some((o) => o.kind === 'towerTop' && o.key === '0,0'));
  assert.throws(() => G.finishTurn(G.cloneState(s), { kind: 'floor', key: '0,0', capture: { key: '0,0', fi: 'castle', k: 'meeple', p: 1 } }), /capture/i);
});

// =====================================================================================
// Computer players: chooseCastle
// =====================================================================================
const LEVELS = ['easy', 'medium', 'hard'];
T('AI: chooseCastle always returns the legal decision for castleAsk[0] (random games, every level)', () => {
  const EXPS = ['abbot', 'inns', 'traders', 'dragon', 'tower'];
  let asked = 0;
  for (let g = 0; g < 24; g++) {
    const exps = { bridges: true };
    EXPS.forEach((e, i) => { if ((g >> i) & 1) exps[e] = true; });
    const n = 2 + (g % 4);
    const s = G.newGame(COLORS.slice(0, n).map((c) => ({ name: c, color: c })), { expansions: exps });
    // small-city caps early, so many decisions come up
    const caps = s.deck.filter((t) => ['E', 'H', 'I'].includes(t));
    s.deck = [...s.deck.filter((t) => !['E', 'H', 'I'].includes(t)), ...caps];
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 1500) {
      if (s.phase === 'castle') {
        asked++;
        for (const lvl of LEVELS) {
          const t0 = performance.now();
          const a = chooseCastle(s, lvl);
          assert.ok(performance.now() - t0 < 50, 'castle choice is quick');
          assert.equal(a.t, 'castle'); assert.equal(a.fi, s.castleAsk[0].fi); assert.equal(typeof a.build, 'boolean');
          G.applyAction(G.cloneState(s), a);
        }
        G.applyAction(s, { t: 'castle', fi: s.castleAsk[0].fi, build: Math.random() < 0.6 });
        continue;
      }
      if (s.phase === 'dragon') { const m = G.dragonMoves(s); G.applyAction(s, { t: 'dragon', key: m[Math.floor(Math.random() * m.length)] }); continue; }
      if (s.phase === 'bazaar') {
        const o = G.bazaarOptions(s);
        const a = o.stage === 'pick' ? { t: 'bazaar', pick: o.pick[0], bid: 0 } : o.stage === 'bid' ? { t: 'bazaar', pass: true } : o.stage === 'decide' ? { t: 'bazaar', sell: false } : { t: 'bazaar', take: o.pick[0] };
        G.applyAction(s, a); continue;
      }
      const vp = G.validPlacements(s);
      const pl = vp[Math.floor(Math.random() * vp.length)];
      const r = pl.rots[Math.floor(Math.random() * pl.rots.length)];
      const probe = G.cloneState(s);
      const bridge = pl.needsBridge?.[r]?.[0] || null;
      G.placeTile(probe, pl.x, pl.y, r, bridge);
      const opts = G.followerOptions(probe).filter((o) => o.kind === 'follower' && !o.portal);
      const act = opts.length && Math.random() < 0.7 ? opts[Math.floor(Math.random() * opts.length)] : null;
      G.applyAction(s, { t: 'turn', x: pl.x, y: pl.y, r, bridge, act });
    }
    assert.equal(s.phase, 'over');
  }
  assert.ok(asked >= 20, `castle decisions came up (${asked})`);
});

T('AI: full games of computer players with castles: every castle decision is legal and the game ends', () => {
  let asks = 0, builds = 0;
  for (const [exps, n] of [[{ bridges: true }, 3], [{ bridges: true, inns: true, traders: true, dragon: true }, 4]]) {
    const s = G.newGame(Array.from({ length: n }, (_, i) => ({ name: 'p' + i, color: COLORS[i], kind: 'ai', level: LEVELS[i % 3] })), { expansions: exps });
    const caps = s.deck.filter((t) => ['E', 'H', 'I'].includes(t));
    s.deck = [...s.deck.filter((t) => !['E', 'H', 'I'].includes(t)), ...caps];
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 1500) {
      const lvl = s.players[G.actingSeat(s)].level;
      if (s.phase === 'castle') { asks++; const a = chooseCastle(s, lvl); if (a.build) builds++; G.applyAction(s, a); continue; }
      if (s.phase === 'bazaar') { G.applyAction(s, chooseBazaarAction(s, lvl)); continue; }
      if (s.phase === 'dragon') { G.applyAction(s, { t: 'dragon', key: chooseDragonMove(s, lvl) }); continue; }
      const mv = chooseMove(s, lvl);
      if (mv.discard) G.applyAction(s, { t: 'discard' });
      else G.applyAction(s, { t: 'turn', x: mv.x, y: mv.y, r: mv.r, bridge: mv.bridge || null, act: mv.act || null });
    }
    assert.equal(s.phase, 'over');
    assert.ok(s.castles.every((c) => c.k === null), 'every castellan home at the end');
  }
  assert.ok(asks > 0, 'the computer players met small cities');
  console.log(`AI castle decisions: ${asks}, built ${builds}`);
});

// A castle decision for P1 (knight at (0,0)) with the given tiles around and the given pile size.
function aiCastleState(extra, deckSize, { farmer = false } = {}) {
  const s = setup([['0,0', 'E', 2], ...extra], 'E', { deck: Array(deckSize).fill('B'), bcb: { bazaars: false } });
  put(s, '0,0', 1, 0);
  if (farmer) put(s, '0,0', 1, 1);
  turn(s, 0, 1, 0);
  assert.equal(s.phase, 'castle'); assert.equal(G.actingSeat(s), 1);
  return s;
}
// a 4-tile city with a pennant and one open end, starting at (1,0) in the area: worth 10 when finished
const BIG_CITY = [['1,0', 'E', 1], ['2,0', 'F', 0], ['3,0', 'G', 0], ['4,0', 'G', 0]];
T('AI: medium and hard bots build early with a big unfinished city or a busy monastery in reach', () => {
  for (const lvl of ['medium', 'hard']) {
    assert.equal(chooseCastle(aiCastleState(BIG_CITY, 60), lvl).build, true, `${lvl}: big city`);
    const mon = [['1,0', 'B', 0], ['0,-1', 'BB/F.b', 0], ['1,-1', 'BB/F.b', 0], ['2,-1', 'BB/F.b', 0], ['2,0', 'BB/F.b', 0], ['2,1', 'BB/F.b', 0]];
    assert.equal(chooseCastle(aiCastleState(mon, 60), lvl).build, true, `${lvl}: monastery with 7 neighbours`);
  }
});

T('AI: bots take the 4 points near the end and when nothing worthwhile is in reach', () => {
  for (const lvl of LEVELS) {
    assert.equal(chooseCastle(aiCastleState(BIG_CITY, 8), lvl).build, false, `${lvl}: 8 tiles left`);
  }
  for (const lvl of ['medium', 'hard']) {
    assert.equal(chooseCastle(aiCastleState([], 60), lvl).build, false, `${lvl}: only empty squares around`);
    assert.equal(chooseCastle(aiCastleState([['1,0', 'W', 3]], 60), lvl).build, false, `${lvl}: only one-tile road stubs (cheap triggers)`);
  }
  // easy: a coin flip while 20+ tiles are left, never after
  assert.equal(chooseCastle(aiCastleState(BIG_CITY, 30), 'easy', () => 0.1).build, true);
  assert.equal(chooseCastle(aiCastleState(BIG_CITY, 30), 'easy', () => 0.9).build, false);
  assert.equal(chooseCastle(aiCastleState(BIG_CITY, 19), 'easy', () => 0.1).build, false);
});

T('AI: chooseCastle counts a field that touches both caps once (H.3: +1 per field the owner wins)', () => {
  // monasteries at (1,0) and (1,1) join the fields of both caps into ONE field, won by P1's farmer.
  // H.3: EV = 3.40 (two empty squares, two 3-neighbour monasteries), farm = 1, keep = 1 ->
  // 3.40 + 1 - 1 = 3.40 <= 4.3, so the hard bot takes the points. Counting the field once per cap
  // (farm = 2) gives 4.40 > 4.3 and a castle.
  const s = aiCastleState([['1,0', 'B', 0], ['1,1', 'B', 0]], 60, { farmer: true });
  assert.equal(G.getGroup(s.board, '0,0', 1).id, G.getGroup(s.board, '0,1', 1).id, 'one field borders both caps');
  assert.equal(chooseCastle(s, 'hard').build, false);
});

T('AI: chooseMove sees the fairy\'s +3 on a castellan (evaluate keeps the castle id c)', () => {
  // P0 (hard) has no meeples in hand; its castle waits at (0,0)-(0,1); the drawn A finishes the road
  // (1,-1)-(1,0)-(1,1) in the area, so moving the fairy to the castellan this turn earns +3 at once.
  const s = setup([['0,0', 'E', 2], ['1,-1', 'A', 0], ['1,0', 'U', 0]], 'E', { exps: { dragon: true } });
  put(s, '0,0', 0, 0);
  turn(s, 0, 1, 0);
  decide(s, true);
  add(s, [['-1,0', 'U', 0]]); put(s, '-1,0', 1, 0); // a rival figure on the board
  s.fairy = { key: '-1,0', f: null, k: null, p: null };
  s.players[0].supply.meeple = 0;
  next(s, 'A', 0);
  s.players[0].kind = 'ai';
  const mv = chooseMove(s, 'hard', () => 0.5);
  assert.deepEqual([mv.x, mv.y, mv.r], [1, 1, 2], 'the bot finishes the road in the castle\'s area');
  assert.deepEqual(mv.act, { kind: 'fairy', key: '0,0', fi: 'castle', k: 'meeple', c: 0 }, 'and takes the free fairy +3');
});
