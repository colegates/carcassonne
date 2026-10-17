// Bridges, Castles & Bazaars: bridges.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';

// A game with the expansion on and a hand-made board.
function setup(board, drawn, players = 2) {
  const s = G.newGame(Array.from({ length: players }, (_, i) => ({ name: 'P' + i, color: ['red', 'blue', 'green', 'yellow', 'black'][i] })), { expansions: { bridges: true } }, () => 0.5);
  s.board = {};
  for (const [k, t, r] of board) s.board[k] = { t, r, pieces: [], n: 0 };
  s.drawn = drawn;
  s.phase = 'place';
  s.current = 0;
  s.setAside = [];
  return s;
}

test('each player gets 3 bridges (2 with five or six players)', () => {
  assert.equal(setup([], 'B').players[0].bridges, 3);
  assert.equal(setup([], 'B', 5).players[0].bridges, 2);
});

test('a bridge on the new tile makes a road-to-meadow placement legal', () => {
  // D (road west–east) at 0,0; a monastery tile east of it has meadow facing the road
  const s = setup([['0,0', 'D', 0]], 'B');
  assert.equal(G.canPlace(s, 1, 0, 'B', 0), false);
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', 0), [{ key: '1,0', axis: 1 }]);
  const spot = G.validPlacements(s).find((p) => p.x === 1 && p.y === 0);
  assert.ok(spot && spot.rots.length === 4 && spot.needsBridge[0][0].axis === 1);
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  assert.equal(s.board['1,0'].bridge, 1);
  assert.equal(s.players[0].bridges, 2);
  // the bridge's road joins the road on D
  const bf = G.bridgeFeature(s.board['1,0']);
  const g = G.getGroup(s.board, '1,0', bf);
  assert.equal(g.type, 'road');
  assert.ok(g.nodes.some(([k]) => k === '0,0'));
  assert.equal(G.edgeType(s.board['1,0'], 1), 'road');
  assert.equal(G.edgeType(s.board['1,0'], 0), 'field');
});

test('a bridge on the neighbouring tile carries the new tile\'s road', () => {
  // monastery at 0,0; a straight road (turned west–east) placed east of it
  const s = setup([['0,0', 'B', 0]], 'U');
  assert.equal(G.canPlace(s, 1, 0, 'U', 1), false);
  const spots = G.bridgeSpots(s, 1, 0, 'U', 1);
  assert.deepEqual(spots, [{ key: '0,0', axis: 1 }]);
  G.placeTile(s, 1, 0, 1, spots[0]);
  assert.equal(s.board['0,0'].bridge, 1);
  const g = G.getGroup(s.board, '1,0', 0);
  assert.ok(g.nodes.some(([k]) => k === '0,0'), 'the road runs onto the bridge');
});

test('a bridge never fixes a city edge, and both ends must face a road or nothing', () => {
  // E (city north) at 0,0: placing B below it gives meadow against meadow (fine); placing B
  // east of D's city side can't be helped by a bridge
  const s = setup([['0,0', 'D', 0], ['1,-1', 'B', 0]], 'E');
  // E turned so its city faces D's road: no bridge helps a city edge
  for (let r = 0; r < 4; r++) {
    const spots = G.bridgeSpots(s, 1, 0, 'E', r);
    for (const b of spots) assert.ok(G.canPlace(s, 1, 0, 'E', r, b));
  }
  // far end of a bridge on a neighbour may not run into a meadow
  const s2 = setup([['0,0', 'B', 0], ['-1,0', 'B', 0]], 'U');
  assert.deepEqual(G.bridgeSpots(s2, 1, 0, 'U', 1), [], 'the bridge on 0,0 would end against the meadow of -1,0');
});

test('one bridge per tile', () => {
  const s = setup([['0,0', 'B', 0]], 'U');
  s.board['0,0'].bridge = 0;
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'U', 1), []);
});

test('no bridges without the expansion or when you have none left', () => {
  const s = setup([['0,0', 'D', 0]], 'B');
  s.players[0].bridges = 0;
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', 0), []);
  assert.ok(!G.validPlacements(s).some((p) => p.x === 1 && p.y === 0));
  s.players[0].bridges = 3;
  s.options.expansions = {};
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', 0), []);
});

test('the meadows beside a road join under a bridge', () => {
  const s = setup([['0,0', 'D', 0]], 'B');
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  // D's meadow north of its road (field 2) and south of it (field 3) now meet on the bridge tile
  const north = G.getGroup(s.board, '0,0', 2), south = G.getGroup(s.board, '0,0', 3);
  assert.equal(north.id, south.id);
});

test('a follower may go on a bridge built on the new tile, not on one next door', () => {
  const s = setup([['0,0', 'D', 0]], 'B');
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  const bf = G.bridgeFeature(s.board['1,0']);
  assert.ok(G.followerOptions(s).some((o) => o.kind === 'follower' && o.key === '1,0' && o.fi === bf));
  const s2 = setup([['0,0', 'B', 0]], 'U');
  G.placeTile(s2, 1, 0, 1, { key: '0,0', axis: 1 });
  assert.ok(!G.followerOptions(s2).some((o) => o.key === '0,0'));
});

test('a road over a bridge scores 1 per tile, the bridge tile once', () => {
  // D at 0,0 (road ends at its city? no: D's road runs west–east), bridge tile east, then an end
  const s = setup([['0,0', 'D', 0]], 'B');
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  const g = G.getGroup(s.board, '1,0', G.bridgeFeature(s.board['1,0']));
  assert.equal(g.tiles.size, 2);
  assert.equal(G.groupPoints(g), 2);
});
