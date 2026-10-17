import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';

const two = [{ name: 'A', color: 'red' }, { name: 'B', color: 'blue' }];
function fresh(expansions) {
  const s = G.newGame(two, { expansions });
  s.board = { '0,0': { t: 'D', r: 0, pieces: [], n: 0 } };
  s.deck = ['B', 'B', 'B', 'B', 'B', 'B'];
  s.setAside = [];
  s.drawn = null;
  s.current = 0;
  return s;
}
const place = (s, t, x, y, r) => { s.drawn = t; s.phase = 'place'; G.placeTile(s, x, y, r); };
const play = (s, t, x, y, r, act = null) => { place(s, t, x, y, r); return G.finishTurn(s, act); };
const put = (s, k, p, f, kind = 'meeple') => { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; };
function grid(s, w, h) {
  s.board = {};
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) s.board[G.key(x, y)] = { t: 'B', r: 0, pieces: [], n: 1 };
}

// ---------------- The Princess & the Dragon ----------------
test('dragon tiles are set aside until a volcano brings the dragon', () => {
  const s = fresh({ dragon: true });
  s.deck = ['B', 'DG/RFr.d', 'DG/Rr.d'];
  G.drawTile(s);
  assert.equal(s.drawn, 'B');
  assert.deepEqual(s.setAside, ['DG/Rr.d', 'DG/RFr.d']);
  s.deck = ['E'];
  place(s, 'DG/RFr.v', 1, 0, 0);
  assert.equal(s.dragon, '1,0');
  assert.deepEqual(s.setAside, []);
  assert.deepEqual([...s.deck].sort(), ['DG/RFr.d', 'DG/Rr.d', 'E']);
});

test('no figure may go on a volcano tile, but the fairy may move', () => {
  const s = fresh({ dragon: true });
  put(s, '0,0', 0, 0);
  place(s, 'DG/RFr.v', 1, 0, 0);
  const opts = G.followerOptions(s);
  assert.ok(!opts.some((o) => o.kind === 'follower'));
  const fairy = opts.find((o) => o.kind === 'fairy');
  assert.deepEqual([fairy.key, fairy.fi, fairy.k], ['0,0', 0, 'meeple']);
  G.finishTurn(s, fairy);
  assert.deepEqual(s.fairy, { key: '0,0', f: 0, k: 'meeple', p: 0 });
});

test('the dragon flies up to 6 tiles, players take turns and it eats what it lands on', () => {
  const s = fresh({ dragon: true });
  grid(s, 4, 2);
  s.board['3,1'].t = 'DG/RFr.d';
  s.dragon = '0,0';
  put(s, '1,0', 1, 1); // B's farmer
  put(s, '2,0', 0, 0); // A's monk
  s.last = '3,1'; s.phase = 'action'; s.current = 0;
  G.finishTurn(s, null);
  assert.equal(s.phase, 'dragon');
  assert.equal(G.dragonMover(s), 0);
  assert.deepEqual(G.dragonMoves(s).sort(), ['0,1', '1,0']);
  s.fairy = { key: '1,0', f: 1, k: 'meeple', p: 1 };
  assert.deepEqual(G.dragonMoves(s), ['0,1'], 'never onto the fairy');
  s.fairy = null;
  let ev = G.moveDragon(s, '1,0');
  assert.equal(ev[0].meeples.length, 1);
  assert.equal(s.players[1].supply.meeple, 7);
  assert.equal(G.dragonMover(s), 1);
  assert.throws(() => G.moveDragon(s, '0,0'), /Illegal/, 'no flying back');
  G.moveDragon(s, '2,0');
  assert.equal(s.players[0].supply.meeple, 7);
  G.moveDragon(s, '3,0');
  G.moveDragon(s, '3,1');
  G.moveDragon(s, '2,1');
  assert.equal(s.phase, 'dragon');
  ev = G.moveDragon(s, '1,1');
  assert.equal(s.flight, null);
  assert.notEqual(s.phase, 'dragon');
  assert.equal(s.dragon, '1,1');
});

test('the flight ends early in a dead end', () => {
  const s = fresh({ dragon: true });
  grid(s, 3, 1);
  s.board['2,0'].t = 'DG/RFr.d';
  s.dragon = '0,0';
  s.last = '2,0'; s.phase = 'action';
  G.finishTurn(s, null);
  G.moveDragon(s, '1,0');
  G.moveDragon(s, '2,0');
  assert.equal(s.flight, null);
  assert.notEqual(s.phase, 'dragon');
});

test('fairy: +1 at the start of your turn while she stands by your follower', () => {
  const s = fresh({ dragon: true });
  put(s, '0,0', 1, 0);
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  const ev = play(s, 'B', 0, 1, 0);
  assert.equal(s.current, 1);
  assert.equal(s.players[1].score, 1);
  assert.equal(s.players[1].breakdown.fairy, 1);
  assert.ok(ev.some((e) => e.kind === 'fairy' && e.points === 1));
});

test('fairy: +3 when her follower is scored, then she stays behind unassigned', () => {
  const s = fresh({ dragon: true });
  put(s, '0,0', 1, 0);
  s.fairy = { key: '0,0', f: 0, k: 'meeple', p: 1 };
  const ev = play(s, 'E', 0, -1, 2); // A closes B's city
  assert.ok(ev.some((e) => e.kind === 'fairy' && e.points === 3));
  assert.equal(s.players[1].score, 4 + 3);
  assert.deepEqual(s.fairy, { key: '0,0', f: null, k: null, p: null });
});

test('princess: may send one knight home instead of placing a figure', () => {
  const s = fresh({ dragon: true });
  put(s, '0,0', 1, 0);
  place(s, 'DG/Ccc.p', 0, -1, 2);
  const pr = G.followerOptions(s).filter((o) => o.kind === 'princess');
  assert.equal(pr.length, 1);
  assert.deepEqual([pr[0].key, pr[0].fi, pr[0].p], ['0,0', 0, 1]);
  G.finishTurn(s, pr[0]);
  assert.equal(s.board['0,0'].pieces.length, 0);
  assert.equal(s.players[1].supply.meeple, 7);
});

test('magic portal: onto an empty, unfinished feature of any tile, never the dragon\'s tile', () => {
  const s = fresh({ dragon: true });
  put(s, '0,0', 1, 1); // B's thief on the road
  place(s, 'DG/CRr.g', 1, 0, 1);
  const portal = G.followerOptions(s).filter((o) => o.portal);
  assert.ok(portal.some((o) => o.key === '0,0' && o.fi === 0 && o.k === 'meeple'), 'empty city');
  assert.ok(!portal.some((o) => o.key === '0,0' && o.fi === 1), 'occupied road');
  assert.ok(!portal.some((o) => o.key === '1,0'), 'own tile uses the normal options');
  s.dragon = '0,0';
  assert.ok(!G.followerOptions(s).some((o) => o.portal && o.key === '0,0'));
});

test('no figure may be placed on the dragon\'s tile', () => {
  const s = fresh({ dragon: true });
  place(s, 'U', 1, 0, 1);
  s.dragon = '1,0';
  assert.ok(!G.followerOptions(s).some((o) => o.kind === 'follower' && o.key === '1,0'));
});

// ---------------- The Tower ----------------
test('tower: floors per player count', () => {
  for (const [n, f] of [[2, 10], [3, 9], [4, 7], [5, 6], [6, 5]]) {
    const ps = ['red', 'blue', 'green', 'yellow', 'black', 'pink'].slice(0, n).map((c) => ({ name: c, color: c }));
    assert.equal(G.newGame(ps, { expansions: { tower: true, inns: true } }).players[0].floors, f);
  }
});

test('tower: a floor captures in a plus shape up to its height; prisoners can be bought back', () => {
  const s = fresh({ tower: true });
  put(s, '0,0', 1, 0);
  place(s, 'TO/C', 0, 1, 2);
  assert.deepEqual(s.towers['0,1'], { h: 0, top: null });
  const fl = G.followerOptions(s).find((o) => o.kind === 'floor' && o.key === '0,1');
  assert.ok(fl);
  assert.equal(G.captureTargets(s, '0,1', 1).length, 1);
  s.board['1,0'] = { t: 'B', r: 0, pieces: [{ p: 1, f: 0, k: 'meeple' }], n: 9 }; // diagonal: out of reach
  s.players[1].supply.meeple--;
  assert.equal(G.captureTargets(s, '0,1', 1).length, 1);
  G.finishTurn(s, { ...fl, capture: { key: '0,0', fi: 0, k: 'meeple', p: 1 } });
  assert.equal(s.towers['0,1'].h, 1);
  assert.equal(s.players[0].floors, 9);
  assert.deepEqual(s.players[0].prisoners, [{ p: 1, k: 'meeple' }]);
  assert.equal(s.board['0,0'].pieces.length, 0);
  assert.equal(s.current, 1);
  assert.deepEqual(G.ransomOptions(s), [], 'needs 3 points');
  s.players[1].score = 5; s.players[1].breakdown.city = 5;
  assert.deepEqual(G.ransomOptions(s), [{ from: 0, k: 'meeple' }]);
  G.applyAction(s, { t: 'ransom', from: 0, k: 'meeple' });
  assert.equal(s.players[1].score, 2);
  assert.equal(s.players[0].score, 3);
  assert.equal(s.players[1].supply.meeple, 6);
  assert.deepEqual(s.players[0].prisoners, []);
});

test('tower: capturing your own figure sends it home', () => {
  const s = fresh({ tower: true });
  put(s, '0,0', 0, 0);
  place(s, 'TO/C', 0, 1, 2);
  const fl = G.followerOptions(s).find((o) => o.kind === 'floor');
  G.finishTurn(s, { ...fl, capture: { key: '0,0', fi: 0, k: 'meeple', p: 0 } });
  assert.equal(s.players[0].supply.meeple, 7);
  assert.deepEqual(s.players[0].prisoners, []);
});

test('tower: holding each other\'s figures swaps them back at once', () => {
  const s = fresh({ tower: true });
  s.players[0].prisoners.push({ p: 1, k: 'meeple' }); s.players[1].supply.meeple--;
  put(s, '0,0', 0, 0);
  s.current = 1;
  place(s, 'TO/C', 0, 1, 2);
  const fl = G.followerOptions(s).find((o) => o.kind === 'floor');
  G.finishTurn(s, { ...fl, capture: { key: '0,0', fi: 0, k: 'meeple', p: 0 } });
  assert.deepEqual(s.players[0].prisoners, []);
  assert.deepEqual(s.players[1].prisoners, []);
  assert.equal(s.players[0].supply.meeple, 7);
  assert.equal(s.players[1].supply.meeple, 7);
});

test('tower: a meeple on top closes the tower; capturing it opens it again', () => {
  const s = fresh({ tower: true });
  s.towers['0,0'] = { h: 2, top: null };
  place(s, 'TO/C', 0, 1, 2);
  const top = G.followerOptions(s).find((o) => o.kind === 'towerTop' && o.key === '0,0' && o.k === 'meeple');
  G.finishTurn(s, top);
  assert.deepEqual(s.towers['0,0'].top, { p: 0, k: 'meeple' });
  place(s, 'B', 1, 1, 0);
  const opts = G.followerOptions(s);
  assert.ok(!opts.some((o) => o.key === '0,0' && (o.kind === 'floor' || o.kind === 'towerTop')), 'closed');
  const fl = opts.find((o) => o.kind === 'floor' && o.key === '0,1');
  G.finishTurn(s, { ...fl, capture: { key: '0,0', fi: 'top', k: 'meeple', p: 0 } });
  assert.equal(s.towers['0,0'].top, null);
  assert.deepEqual(s.players[1].prisoners, [{ p: 0, k: 'meeple' }]);
});

test('the dragon eats a meeple on a tower but not the floors', () => {
  const s = fresh({ dragon: true, tower: true });
  grid(s, 3, 1);
  s.board['2,0'].t = 'DG/RFr.d';
  s.towers['1,0'] = { h: 3, top: { p: 1, k: 'meeple' } }; s.players[1].supply.meeple--;
  s.dragon = '0,0'; s.last = '2,0'; s.phase = 'action';
  G.finishTurn(s, null);
  G.moveDragon(s, '1,0');
  assert.deepEqual(s.towers['1,0'], { h: 3, top: null });
  assert.equal(s.players[1].supply.meeple, 7);
});

// ---------------- rulings from docs/expansions/MASTER.md ----------------
test('recalling the abbot never earns the fairy bonus (B1)', () => {
  const s = fresh({ dragon: true, abbot: true });
  s.board = { '0,0': { t: 'B', r: 0, pieces: [{ p: 0, f: 0, k: 'abbot' }], n: 0 } };
  s.players[0].supply.abbot = 0;
  s.fairy = { key: '0,0', f: 0, k: 'abbot', p: 0 };
  place(s, 'B', 1, 0, 0);
  const rec = G.followerOptions(s).find((o) => o.kind === 'recall');
  const ev = G.finishTurn(s, rec);
  assert.equal(s.players[0].score, 2);
  assert.ok(!ev.some((e) => e.kind === 'fairy'));
  assert.deepEqual(s.fairy, { key: '0,0', f: null, k: null, p: null });
});

test('the builder\'s bonus tile may be declined (B18)', () => {
  const s = fresh({ traders: true });
  s.board = { '0,0': { t: 'U', r: 1, pieces: [{ p: 0, f: 0, k: 'meeple' }, { p: 0, f: 0, k: 'builder' }], n: 0 } };
  s.players[0].supply.meeple--; s.players[0].supply.builder = 0;
  s.deck = ['U', 'U', 'U', 'U']; s.drawn = 'U';
  G.applyAction(s, { t: 'turn', x: 1, y: 0, r: 1, act: null, noBonus: true });
  assert.equal(s.current, 1, 'turn passed without the bonus tile');
  const s2 = fresh({ traders: true });
  s2.board = { '0,0': { t: 'U', r: 1, pieces: [{ p: 0, f: 0, k: 'meeple' }, { p: 0, f: 0, k: 'builder' }], n: 0 } };
  s2.players[0].supply.meeple--; s2.players[0].supply.builder = 0;
  s2.deck = ['U', 'U', 'U', 'U']; s2.drawn = 'U';
  G.applyAction(s2, { t: 'turn', x: 1, y: 0, r: 1, act: null });
  assert.equal(s2.current, 0, 'bonus tile taken by default');
  assert.equal(s2.part, 2);
});
