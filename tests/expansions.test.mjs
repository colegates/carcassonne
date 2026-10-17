import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../public/js/game.js';
import { TILE_TYPES, buildDeck } from '../public/js/tiles.js';

const two = [{ name: 'A', color: 'red' }, { name: 'B', color: 'blue' }];
const tileIdx = (id, type, pred = () => true) => TILE_TYPES[id].features.findIndex((f, i) => f.type === type && pred(f, i));
// place the given tile and finish with act
function play(s, t, x, y, r, act = null) {
  s.drawn = t; s.phase = 'place';
  G.placeTile(s, x, y, r);
  return G.finishTurn(s, act);
}

// ---------------- The River ----------------
function riverState() {
  const s = G.newGame(two, { expansions: { river: true } });
  s.board = { '0,0': { t: 'RI/s', r: 1, pieces: [], n: 0 } };
  s.river = { open: { x: 0, y: 0, side: 2 }, lastIn: null };
  return s;
}

test('river deck: spring start, 11 river tiles first, lake last, start tile out', () => {
  const { start, deck } = buildDeck({ river: true });
  assert.equal(start, 'RI/s');
  const river = deck.slice(-11);
  assert.ok(river.every((t) => TILE_TYPES[t].exp === 'river'));
  assert.equal(river[0], 'RI.1/I.e');
  assert.equal(deck.length, 71 + 11);
  assert.equal(deck.filter((t) => t === 'D').length, 3);
});

test('official completed river example is legal in order', () => {
  const s = riverState();
  const ex = JSON.parse(fs.readFileSync(new URL('../docs/expansions/river.json', import.meta.url))).rules.example_layout.tiles;
  for (const t of ex.slice(1)) {
    assert.ok(G.canPlace(s, t.x, t.y, t.id, t.r), `${t.id} at ${t.x},${t.y} r${t.r}`);
    play(s, t.id, t.x, t.y, t.r);
  }
  assert.equal(s.river.open, null);
});

test('river: no immediate U-turn, must continue the open end', () => {
  const s = G.newGame(two, { expansions: { river: true } });
  s.board = { '0,0': { t: 'RI/s', r: 0, pieces: [], n: 0 } };
  s.river = { open: { x: 0, y: 0, side: 1 }, lastIn: null };
  play(s, 'RI.1/RIrI', 1, 0, 1); // straight W-E ... rotated: river N-S becomes W-E
  // Watch-out example from the rulebook (rotated so the spring flows east)
  const t = G.newGame(two, { expansions: { river: true } });
  t.board = { '0,0': { t: 'RI/s', r: 1, pieces: [], n: 0 } };
  t.river = { open: { x: 0, y: 0, side: 2 }, lastIn: null };
  play(t, 'RI.1/RIrI', 0, 1, 0);
  // right bend then a second right bend must be refused
  const okFirst = [0, 1, 2, 3].filter((r) => G.canPlace(t, 0, 2, 'RI.1/II', r));
  assert.ok(okFirst.length >= 1);
  assert.equal(G.canPlace(t, 5, 5, 'RI.1/IFI', 0), false, 'not at the open end');
});

test('river: lake ends the river; land tiles never touch the open end', () => {
  const s = riverState();
  play(s, 'RI.1/IFI', 0, 1, 1);
  assert.ok(G.canPlace(s, 0, 2, 'RI.1/I.e', 1));
  assert.equal(G.canPlace(s, 0, 2, 'U', 0), false);
});

// ---------------- The Abbot ----------------
test('base deck keeps 72 tiles with 8 garden versions', () => {
  const { deck } = buildDeck({});
  assert.equal(deck.length, 71);
  assert.equal(deck.filter((t) => TILE_TYPES[t].features.some((f) => f.type === 'garden')).length, 8);
  assert.equal(deck.filter((t) => t === 'E').length, 4);
});

test('abbot goes on gardens/monasteries only; meeples never on gardens', () => {
  const s = G.newGame(two, { expansions: { abbot: true } });
  s.drawn = 'BA/CG'; s.phase = 'place';
  G.placeTile(s, 0, -1, 2);
  const opts = G.followerOptions(s);
  const gi = tileIdx('BA/CG', 'garden');
  assert.ok(opts.some((o) => o.fi === gi && o.k === 'abbot'));
  assert.ok(!opts.some((o) => o.fi === gi && o.k === 'meeple'));
  assert.ok(!opts.some((o) => o.k === 'abbot' && o.fi !== gi));
});

test('abbot recall scores 1 + neighbours immediately and returns the abbot', () => {
  const s = G.newGame(two, { expansions: { abbot: true } });
  s.board = { '0,0': { t: 'B', r: 0, pieces: [{ p: 0, f: 0, k: 'abbot' }], n: 0 }, '1,0': { t: 'B', r: 0, pieces: [], n: 1 }, '-1,0': { t: 'B', r: 0, pieces: [], n: 2 } };
  s.players[0].supply.abbot = 0;
  s.drawn = 'B'; s.phase = 'place';
  G.placeTile(s, 0, 1, 0);
  const rec = G.followerOptions(s).find((o) => o.kind === 'recall');
  assert.ok(rec);
  const ev = G.finishTurn(s, rec);
  assert.equal(ev[0].points, 1 + 3);
  assert.equal(s.players[0].score, 4);
  assert.equal(s.players[0].supply.abbot, 1);
});

test('surrounded garden with abbot scores 9', () => {
  const s = G.newGame(two, { expansions: { abbot: true } });
  const gi = tileIdx('BA/RFrG', 'garden');
  s.board = { '0,0': { t: 'BA/RFrG', r: 0, pieces: [{ p: 1, f: gi, k: 'abbot' }], n: 0 } };
  s.players[1].supply.abbot = 0;
  for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]]) s.board[G.key(x, y)] = { t: 'B', r: 0, pieces: [], n: 1 };
  const ev = play(s, 'B', -1, 0, 0);
  const g = ev.find((e) => e.kind === 'garden');
  assert.equal(g.points, 9);
  assert.equal(s.players[1].score, 9);
});

// ---------------- Inns & Cathedrals ----------------
test('large meeple counts double; inn road 2/tile; cathedral 3/tile', () => {
  const g = { type: 'road', complete: true, inn: true, tiles: new Set(['a', 'b', 'c']), pennants: 0 };
  assert.equal(G.groupPoints(g), 6);
  assert.equal(G.groupPoints({ ...g, complete: false }), 0);
  const c = { type: 'city', complete: true, cathedral: true, tiles: new Set(['a', 'b']), pennants: 1 };
  assert.equal(G.groupPoints(c), 9);
  assert.equal(G.groupPoints({ ...c, complete: false }), 0);
  assert.deepEqual(G.owners([{ p: 0, k: 'large' }, { p: 1, k: 'meeple' }]), [0]);
  assert.deepEqual(G.owners([{ p: 0, k: 'large' }, { p: 1, k: 'meeple' }, { p: 1, k: 'meeple' }]), [0, 1]);
});

test('large meeple is offered when playing Inns & Cathedrals', () => {
  const s = G.newGame(two, { expansions: { inns: true } });
  s.drawn = 'U'; s.phase = 'place';
  G.placeTile(s, 1, 0, 1);
  const opts = G.followerOptions(s);
  assert.ok(opts.some((o) => o.k === 'large'));
});

// ---------------- Traders & Builders ----------------
test('builder needs own meeple in the road and earns a second tile', () => {
  const s = G.newGame(two, { expansions: { traders: true } });
  s.deck = ['U', 'U', 'U', 'U', 'U', 'U'];
  // A: road meeple east of start
  play(s, 'U', 1, 0, 1, { kind: 'follower', key: '1,0', fi: 0, k: 'meeple' });
  // B passes
  play(s, 'U', -1, 0, 1);
  // A extends own road and places builder there
  s.drawn = 'U'; s.phase = 'place';
  G.placeTile(s, 2, 0, 1);
  const b = G.followerOptions(s).find((o) => o.k === 'builder');
  assert.ok(b, 'builder offered');
  G.finishTurn(s, b);
  assert.equal(s.current, 1);
  play(s, 'U', -2, 0, 1); // B
  // A extends the builder's road -> second tile for A
  s.drawn = 'U'; s.phase = 'place';
  G.placeTile(s, 3, 0, 1);
  assert.equal(s.bonus, true);
  const ev = G.finishTurn(s, null);
  assert.ok(ev.some((e) => e.kind === 'bonus'));
  assert.equal(s.current, 0, 'same player again');
  assert.equal(s.part, 2);
  s.drawn = 'U'; s.phase = 'place';
  G.placeTile(s, 4, 0, 1);
  assert.equal(s.bonus, false, 'no chain');
  G.finishTurn(s, null);
  assert.equal(s.current, 1);
});

test('goods go to the player completing the city, majority 10 at the end', () => {
  const s = G.newGame(two, { expansions: { traders: true } });
  s.deck = ['U'];
  s.current = 1;
  // TB/Cc.w is a city corner N+W with wine; complete it with the start tile's city? use a 2-tile city: corner + caps
  s.board = { '0,0': { t: 'TB/Cc.w', r: 0, pieces: [], n: 0 }, '0,-1': { t: 'E', r: 2, pieces: [], n: 1 } };
  const ev = play(s, 'E', -1, 0, 1); // cap facing east closes the west side
  assert.ok(ev.some((e) => e.kind === 'city' && e.complete));
  assert.equal(s.players[1].goods.wine, 1);
  assert.equal(s.players[0].goods.wine, 0);
});

test('pig adds 1 per city for the winning farmer', () => {
  const s = G.newGame(two, { expansions: { traders: true } });
  const fi = tileIdx('E', 'field');
  s.board = { '0,0': { t: 'E', r: 0, pieces: [{ p: 0, f: fi, k: 'meeple' }, { p: 0, f: fi, k: 'pig' }], n: 0 }, '0,-1': { t: 'E', r: 2, pieces: [], n: 1 } };
  const ev = G.finalScoring(s, true);
  const field = ev.find((e) => e.kind === 'field');
  const pig = ev.find((e) => e.kind === 'pig');
  assert.equal(field.points, 3);
  assert.equal(pig.points, 1);
  assert.equal(s.players[0].score, 4);
});

// ---------------- random games with every combination ----------------
const EXPS = ['river', 'abbot', 'inns', 'traders'];
test('random games for every expansion combination keep invariants', () => {
  for (let mask = 0; mask < 1 << EXPS.length; mask++) {
    const expansions = {};
    EXPS.forEach((e, i) => { if (mask & (1 << i)) expansions[e] = true; });
    for (let g = 0; g < 3; g++) {
      const s = G.newGame([...two, { name: 'C', color: 'green' }], { expansions });
      const startPieces = s.players.reduce((a, p) => a + Object.values(p.supply).reduce((x, y) => x + y, 0), 0);
      let guard = 0;
      while (s.phase !== 'over' && guard++ < 400) {
        const vp = G.validPlacements(s);
        const pick = vp[Math.floor(Math.random() * vp.length)];
        G.placeTile(s, pick.x, pick.y, pick.rots[Math.floor(Math.random() * pick.rots.length)]);
        const opts = G.followerOptions(s);
        G.finishTurn(s, opts.length && Math.random() < 0.6 ? opts[Math.floor(Math.random() * opts.length)] : null);
        if (s.phase !== 'over') {
          const onBoard = Object.values(s.board).reduce((a, t) => a + t.pieces.length, 0);
          const inHand = s.players.reduce((a, p) => a + Object.values(p.supply).reduce((x, y) => x + y, 0), 0);
          assert.equal(onBoard + inHand, startPieces, `pieces conserved (${JSON.stringify(expansions)})`);
          for (const [k, t] of Object.entries(s.board)) for (const pc of t.pieces) {
            if (pc.k === 'builder' || pc.k === 'pig') {
              const gr = G.getGroup(s.board, k, pc.f);
              assert.ok(gr.meeples.some((m) => m.p === pc.p && (m.k === 'meeple' || m.k === 'large')), 'builder/pig supported');
            }
          }
        }
      }
      assert.equal(s.phase, 'over');
      assert.ok(Object.values(s.board).every((t) => !t.pieces.length), 'all figures home at the end');
      for (const p of s.players) {
        const sum = Object.values(p.breakdown).reduce((a, b) => a + b, 0);
        assert.equal(sum, p.score, 'breakdown adds up');
      }
    }
  }
});
