import test from 'node:test';
import assert from 'node:assert/strict';
import { TILE_TYPES, buildDeck } from '../public/js/tiles.js';
import * as G from '../public/js/game.js';

const players = [{ name: 'A', color: 'red' }, { name: 'B', color: 'blue' }];
function fresh(options) {
  const s = G.newGame(players, options);
  return s;
}
function put(s, t, x, y, r, meeple = null) {
  s.drawn = t; s.phase = 'place';
  G.placeTile(s, x, y, r);
  return G.finishTurn(s, meeple);
}

test('deck has 71 tiles + start tile = 72', () => {
  assert.equal(buildDeck().deck.length, 71);
  assert.equal(Object.values(TILE_TYPES).filter((t) => t.exp === 'base' && !t.replaces).reduce((a, t) => a + t.count, 0), 72);
});

test('field count per tile type', () => {
  const expected = { A: 1, B: 1, C: 0, D: 2, E: 1, F: 2, G: 2, H: 1, I: 1, J: 2, K: 2, L: 3, M: 1, N: 1, O: 2, P: 2, Q: 1, R: 1, S: 2, T: 2, U: 2, V: 2, W: 3, X: 4 };
  for (const [id, n] of Object.entries(expected)) {
    assert.equal(TILE_TYPES[id].features.filter((f) => f.type === 'field').length, n, id);
  }
});

test('two-tile city scores 4 and returns meeple', () => {
  const s = fresh();
  s.deck = ['U', 'U', 'U'];
  // E rotated 180 puts city on south edge, above start tile's north city
  const ev = put(s, 'E', 0, -1, 2, 0);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].points, 4);
  assert.equal(s.players[0].score, 4);
  assert.equal(s.players[0].supply.meeple, 7);
});

test('edge matching rejects city against field', () => {
  const s = fresh();
  assert.equal(G.canPlace(s, 0, -1, 'E', 0), false); // field faces the city
  assert.equal(G.canPlace(s, 0, -1, 'E', 2), true);
  assert.equal(G.canPlace(s, 5, 5, 'E', 2), false); // not adjacent
});

test('road completes between two junction ends', () => {
  const s = fresh();
  s.deck = ['U', 'U', 'U', 'U'];
  // start tile road runs W-E. Put W-junction (roads E,S,W) to the east rotated so W-side road connects.
  put(s, 'W', 1, 0, 0, 2); // road W of junction -> player 0 (feature 2 = road W)
  assert.equal(s.players[0].supply.meeple, 6);
  const ev = put(s, 'X', -1, 0, 0, null); // crossroads closes west end
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind, 'road');
  assert.equal(ev[0].points, 3);
  assert.equal(s.players[0].score, 3);
  assert.equal(s.players[0].supply.meeple, 7);
});

test('cannot place meeple on occupied road', () => {
  const s = fresh();
  s.deck = ['U', 'U', 'U', 'U'];
  put(s, 'U', 1, 0, 1, 0); // straight road rotated to E-W, meeple on road (player 0)
  s.drawn = 'U'; s.phase = 'place';
  G.placeTile(s, -1, 0, 1);
  const opts = G.meepleOptions(s);
  assert.ok(!opts.includes(0), 'road is taken');
  assert.ok(opts.includes(1) && opts.includes(2), 'fields free');
});

test('monastery completes with 9', () => {
  const s = fresh();
  s.board = { '0,0': { t: 'B', r: 0, pieces: [{ p: 1, f: 0, k: 'meeple' }], n: 0 } };
  s.players[1].supply.meeple = 6;
  s.deck = ['B', 'B', 'B'];
  const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  for (const [x, y] of ring) { s.board[G.key(x, y)] = { t: 'B', r: 0, pieces: [], n: 1 }; }
  const ev = put(s, 'B', -1, 0, 0, null);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].points, 9);
  assert.equal(s.players[1].score, 9);
});

test('final scoring: incomplete city, farmer with completed city', () => {
  const s = fresh();
  s.deck = ['U'];
  // farmer on start tile field north of road (feature 2 borders the city)
  s.board['0,0'].pieces = [{ p: 0, f: 2, k: 'meeple' }]; s.players[0].supply.meeple = 6;
  // complete city above
  s.drawn = 'E'; s.phase = 'place'; G.placeTile(s, 0, -1, 2); G.finishTurn(s, null);
  // the deck had one more tile, play it then game ends
  s.phase = 'place';
  const t = s.drawn; const vp = G.validPlacements(s, t)[0];
  G.placeTile(s, vp.x, vp.y, vp.rots[0]);
  G.finishTurn(s, null);
  assert.equal(s.phase, 'over');
  const fe = s.finalEvents.find((e) => e.kind === 'field');
  assert.equal(fe.points, 3);
  assert.equal(s.players[0].score, 3);
});

test('city with pennant, incomplete at end = tiles + pennants', () => {
  const s = fresh();
  s.board['0,-1'] = { t: 'M', r: 1, pieces: [{ p: 1, f: 0, k: 'meeple' }], n: 1 }; // city N+E after rotating N+W by 1 -> N+E... south edge field
  // M rotated 1: sides N+W -> E+N. Place instead with city facing S: rotation 3 -> sides W+S? use r=2: S+E
  s.board['0,-1'].r = 2;
  const g = G.getGroup(s.board, '0,-1', 0);
  assert.equal(g.tiles.size, 2);
  assert.equal(g.complete, false);
  assert.equal(G.groupPoints(g), 3);
});

test('full random games run to completion with consistent meeple counts', () => {
  for (let i = 0; i < 30; i++) {
    const s = G.newGame([...players, { name: 'C', color: 'green' }]);
    while (s.phase !== 'over') {
      const vp = G.validPlacements(s, s.drawn);
      const pick = vp[Math.floor(Math.random() * vp.length)];
      G.placeTile(s, pick.x, pick.y, pick.rots[Math.floor(Math.random() * pick.rots.length)]);
      const opts = G.meepleOptions(s);
      G.finishTurn(s, opts.length && Math.random() < 0.5 ? opts[Math.floor(Math.random() * opts.length)] : null);
      const onBoard = Object.values(s.board).reduce((a, t) => a + t.pieces.length, 0);
      const inHand = s.players.reduce((a, p) => a + p.supply.meeple, 0);
      if (s.phase !== 'over') assert.equal(onBoard + inHand, 21);
    }
    assert.equal(Object.keys(s.board).length + s.discarded.length, 72);
    assert.ok(Object.values(s.board).every((t) => !t.pieces.length));
  }
});
