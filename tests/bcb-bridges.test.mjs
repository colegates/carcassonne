// Bridges, Castles & Bazaars: bridges (MASTER H.1 BC3–BC15, BC50, H.2.3, checklist H.5 BR1–BR10) and
// bridges combined with the River (BR8, CI7), Inns & Cathedrals, Traders & Builders, the Princess & the
// Dragon and the Tower. Each test states the behaviour MASTER H requires; a title starting with "BUG:"
// marks a test that fails because the app is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
import * as AI from '../public/js/ai.js';
import { TILE_TYPES, SIDE_DELTA, isRiverTile } from '../public/js/tiles.js';

const COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const players = (n) => Array.from({ length: n }, (_, i) => ({ name: 'P' + i, color: COLORS[i] }));

// A game with the expansion on and a hand-made land board: [key, tile, rotation, extra tile fields].
function setup(board, drawn, { n = 2, exps = {}, bcb, deck } = {}) {
  const s = G.newGame(players(n), { expansions: { bridges: true, ...exps }, ...(bcb ? { bcb } : {}) }, () => 0.5);
  s.board = {};
  board.forEach(([k, t, r, extra], i) => { s.board[k] = { t, r, pieces: [], n: i, ...(extra || {}) }; });
  s.placed = board.length;
  s.drawn = drawn; s.phase = 'place'; s.current = 0; s.setAside = []; s.discarded = [];
  s.deck = deck ? deck.slice() : Array(12).fill('B');
  delete s.river; // hand-made boards are land boards (past the river phase)
  return s;
}
const put = (s, k, p, f, kind = 'meeple') => { s.board[k].pieces.push({ p, f, k: kind }); s.players[p].supply[kind]--; };
const turn = (s, x, y, r, act = null, bridge = null) => G.applyAction(s, { t: 'turn', x, y, r, bridge, act });
const bf = (s, k) => G.bridgeFeature(s.board[k]);
const spotIds = (list) => list.map((b) => `${b.key}/${b.axis}`).sort();
// the printed edge of tile t turned r, on world side `side`
const printed = (t, r, side) => TILE_TYPES[t].edges[(side - r + 4) % 4];
// the edge of a tile as it lies (a bridge end is a road)
const edgeOf = (tile, side) => (tile.bridge !== undefined && tile.bridge !== null && side % 2 === tile.bridge ? 'road' : printed(tile.t, tile.r, side));
// the two squares a bridge on k along axis points at
const ends = (k, axis) => { const [x, y] = G.parseKey(k); return [axis, axis + 2].map((sd) => G.key(x + SIDE_DELTA[sd][0], y + SIDE_DELTA[sd][1])); };
const feat = (s, k, type) => G.featuresOf(s.board[k]).map((f, i) => (f.type === type ? i : -1)).filter((i) => i >= 0);

// A small seeded generator, so the random boards are the same on every run.
function lcg(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }

// Independent check of BC4/BC5 for tile t at (x, y, r) with bridge b: the bridge is on the new tile or an orthogonal
// neighbour without a bridge, both its ends are printed meadow, and afterwards every edge of the new tile and of
// the bridged tile matches its neighbour.
function bridgeOracle(s, x, y, t, r, b) {
  const k = G.key(x, y);
  const [bx, by] = G.parseKey(b.key);
  if (Math.abs(bx - x) + Math.abs(by - y) > 1) return false;
  const host = b.key === k ? { t, r } : s.board[b.key];
  if (!host || (host.bridge !== undefined && host.bridge !== null)) return false;
  if ([b.axis, b.axis + 2].some((sd) => printed(host.t, host.r, sd) !== 'field')) return false;
  const at = (q) => (q === b.key ? { t: host.t, r: host.r, bridge: b.axis } : q === k ? { t, r } : s.board[q]);
  for (const ck of new Set([k, b.key])) {
    const [cx, cy] = G.parseKey(ck);
    for (let sd = 0; sd < 4; sd++) {
      const nb = at(G.key(cx + SIDE_DELTA[sd][0], cy + SIDE_DELTA[sd][1]));
      if (nb && edgeOf(at(ck), sd) !== edgeOf(nb, (sd + 2) % 4)) return false;
    }
  }
  return true;
}
// every bridge one could think of for a placement at (x, y): the new tile and each tile next to it, both axes
function candidateBridges(s, x, y) {
  const out = [{ key: G.key(x, y), axis: 0 }, { key: G.key(x, y), axis: 1 }];
  for (const [dx, dy] of SIDE_DELTA) {
    const nk = G.key(x + dx, y + dy);
    if (s.board[nk]) out.push({ key: nk, axis: 0 }, { key: nk, axis: 1 });
  }
  return out;
}
// a random legal decision for the phases that are not a tile placement (null in phase 'place')
function randomDecision(s, rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  if (s.phase === 'dragon') return { t: 'dragon', key: pick(G.dragonMoves(s)) };
  if (s.phase === 'castle') return { t: 'castle', fi: s.castleAsk[0].fi, build: rnd() < 0.5 };
  if (s.phase === 'bazaar') {
    const o = G.bazaarOptions(s);
    if (o.stage === 'pick') return { t: 'bazaar', pick: pick(o.pick), bid: Math.floor(rnd() * 3) };
    if (o.stage === 'bid') return rnd() < 0.6 ? { t: 'bazaar', pass: true } : { t: 'bazaar', bid: o.minBid };
    if (o.stage === 'decide') return { t: 'bazaar', sell: rnd() < 0.5 };
    return { t: 'bazaar', take: pick(o.pick) };
  }
  return null;
}

// ---------- BR1 supply ----------
test('BR1 supply: 3 bridges each with 2 to 4 players, 2 with 5 or 6; none without the expansion', () => {
  for (let n = 2; n <= 6; n++) {
    const s = G.newGame(players(n), { expansions: { bridges: true, inns: true } }, () => 0.5);
    assert.ok(s.players.every((p) => p.bridges === (n >= 5 ? 2 : 3)), `${n} players`);
    const none = G.newGame(players(n), { expansions: { inns: true } }, () => 0.5);
    assert.ok(none.players.every((p) => p.bridges === 0), `${n} players without the expansion`);
  }
});

test('BR1 bcb.bridges off: no bridges, no bridge spots or bridge-only placements (even with a forged supply); castles unaffected', () => {
  const s = setup([['0,0', 'D', 0]], 'B', { bcb: { bridges: false } });
  assert.equal(s.players[0].bridges, 0);
  assert.equal(s.players[0].castles, 3);
  assert.equal(G.bcbOn(s, 'bridges'), false);
  s.players[0].bridges = 3;
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', 0), []);
  const vp = G.validPlacements(s);
  assert.ok(!vp.some((p) => p.needsBridge));
  assert.deepEqual(vp.map((p) => G.key(p.x, p.y)), ['0,1'], 'B fits only below D as printed');
  assert.throws(() => G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 }), /Illegal/);
  // switching the other parts off leaves the bridges alone
  const t = setup([['0,0', 'D', 0]], 'B', { bcb: { castles: false, bazaars: false } });
  assert.equal(t.players[0].bridges, 3);
  assert.equal(t.players[0].castles, 0);
  assert.deepEqual(G.bridgeSpots(t, 1, 0, 'B', 0), [{ key: '1,0', axis: 1 }]);
});

// ---------- BR2 legality ----------
test('BR2 a bridge on the new tile can carry a road on at both of its ends (a tile dropped between two road ends)', () => {
  const s = setup([['0,0', 'D', 0], ['2,0', 'D', 0]], 'B');
  for (let r = 0; r < 4; r++) {
    assert.equal(G.canPlace(s, 1, 0, 'B', r), false);
    assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', r), [{ key: '1,0', axis: 1 }]);
  }
  const v = G.validPlacements(s).find((p) => p.x === 1 && p.y === 0);
  assert.deepEqual(v.rots, [0, 1, 2, 3]);
  for (const r of v.rots) assert.deepEqual(v.needsBridge[r], [{ key: '1,0', axis: 1 }]);
  turn(s, 1, 0, 0, null, { key: '1,0', axis: 1 });
  const g = G.getGroup(s.board, '1,0', bf(s, '1,0'));
  assert.deepEqual([...g.tiles].sort(), ['0,0', '1,0', '2,0']);
  assert.equal(g.openEdges, 2, 'only the two outer ends of the D roads are open');
});

test('BR2 bridge ends stand on printed meadow: never on a road, a city or a river edge', () => {
  // U turned north–south east of D: its west meadow meets D's road; only an east–west bridge helps
  const s = setup([['0,0', 'D', 0]], 'U');
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'U', 0), [{ key: '1,0', axis: 1 }]);
  assert.throws(() => G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 0 }), /Illegal/, 'ends on the printed road');
  assert.equal(s.players[0].bridges, 3);
  assert.equal(s.board['1,0'], undefined);
  // a city cap (E, city north) gets an east–west bridge, never a north–south one
  const e = setup([['0,0', 'D', 0]], 'E');
  assert.deepEqual(G.bridgeSpots(e, 1, 0, 'E', 0), [{ key: '1,0', axis: 1 }]);
  assert.throws(() => G.placeTile(e, 1, 0, 0, { key: '1,0', axis: 0 }), /Illegal/, 'one end on the city');
  for (let r = 0; r < 4; r++) for (const b of G.bridgeSpots(e, 1, 0, 'E', r)) {
    for (const sd of [b.axis, b.axis + 2]) assert.equal(printed('E', r, sd), 'field');
  }
  // the lake (river to the west): a road arriving from the north is carried north–south; east–west ends on the river
  const l = setup([['0,0', 'RI.1/I.e', 0]], 'A');
  assert.deepEqual(G.bridgeSpots(l, 0, -1, 'A', 0), [{ key: '0,0', axis: 0 }]);
  assert.throws(() => G.placeTile(l, 0, -1, 0, { key: '0,0', axis: 1 }), /Illegal/);
});

test('BR2 one bridge cannot fix two mismatches on different axes, and nothing fixes a road against a city', () => {
  // D's road arrives from the west and A's road from the north: a meadow tile at 1,0 would need two bridges
  const s = setup([['0,0', 'D', 0], ['1,-1', 'A', 0]], 'B');
  for (let r = 0; r < 4; r++) assert.deepEqual(G.bridgeSpots(s, 1, 0, 'B', r), []);
  assert.ok(!G.validPlacements(s).some((p) => p.x === 1 && p.y === 0));
  assert.throws(() => G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 }), /Illegal/);
  assert.throws(() => G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 0 }), /Illegal/);
  // north of D lies its city: a straight road can never go there, bridge or not
  const c = setup([['0,0', 'D', 0]], 'U');
  for (let r = 0; r < 4; r++) assert.deepEqual(G.bridgeSpots(c, 0, -1, 'U', r), []);
  assert.ok(!G.validPlacements(c).some((p) => p.x === 0 && p.y === -1));
});

test('BR2 a bridge next door needs an empty square at its far end; one bridge per tile; never on a diagonal tile', () => {
  // U turned east–west east of a monastery: the monastery tile carries the road on, its far end is empty
  const s = setup([['0,0', 'B', 0]], 'U');
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'U', 1), [{ key: '0,0', axis: 1 }]);
  // the far end would run into a meadow: refused
  const m = setup([['0,0', 'B', 0], ['-1,0', 'B', 0]], 'U');
  assert.deepEqual(G.bridgeSpots(m, 1, 0, 'U', 1), []);
  assert.throws(() => G.placeTile(m, 1, 0, 1, { key: '0,0', axis: 1 }), /Illegal/);
  // a tile that already carries a bridge takes no second one (bridges never cross)
  const two = setup([['0,0', 'B', 0, { bridge: 0 }]], 'U');
  assert.deepEqual(G.bridgeSpots(two, 1, 0, 'U', 1), []);
  assert.throws(() => G.placeTile(two, 1, 0, 1, { key: '0,0', axis: 1 }), /Illegal/);
  // 0,1 touches the new square 1,0 only at a corner
  const d = setup([['0,0', 'B', 0], ['0,1', 'B', 0]], 'U');
  assert.ok(!G.bridgeSpots(d, 1, 0, 'U', 1).some((b) => b.key === '0,1'));
  assert.throws(() => G.placeTile(d, 1, 0, 1, { key: '0,1', axis: 1 }), /Illegal/);
});

test('BR2 bridges may follow each other: a new bridge continues the end of an older one', () => {
  const s = setup([['0,0', 'D', 0], ['1,0', 'B', 0, { bridge: 1 }]], 'B');
  assert.equal(G.canPlace(s, 2, 0, 'B', 0), false);
  assert.deepEqual(G.bridgeSpots(s, 2, 0, 'B', 0), [{ key: '2,0', axis: 1 }]);
  turn(s, 2, 0, 0, null, { key: '2,0', axis: 1 });
  assert.deepEqual([...G.getGroup(s.board, '2,0', bf(s, '2,0')).tiles].sort(), ['0,0', '1,0', '2,0']);
});

// ---------- BR3 needed and optional bridges ----------
test('BR3 random boards: needsBridge holds exactly the one bridge that fits, optional bridges start a new road, an independent edge check agrees', () => {
  const rnd = lcg(20261018);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const OTHERS = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower'];
  const tally = { placements: 0, needed: 0, optional: 0, refused: 0, neighbourBridges: 0, riverBridges: 0, discards: 0, noBridgeDraws: 0 };
  for (let gno = 0; gno < 20; gno++) {
    const exps = { bridges: true };
    OTHERS.forEach((e, i) => { if (((gno * 7 + 3) >> i) & 1) exps[e] = true; });
    if (gno % 3 === 0) exps.river = true;
    const n = 2 + (gno % 4);
    const s = G.newGame(players(n), { expansions: exps }, rnd);
    for (let guard = 0; s.phase !== 'over' && guard < 3000; guard++) {
      const riverPhase = !!s.river?.open;
      const d = randomDecision(s, rnd);
      if (d) { const ev = G.applyAction(s, d); if (riverPhase) assert.ok(!ev.some((e) => e.kind === 'bazaarOpen')); continue; }
      const t = s.drawn, me = s.players[s.current];
      const vp = G.validPlacements(s);
      assert.ok(vp.length > 0, 'a drawn tile always has a placement');
      if (!(me.bridges > 0)) { tally.noBridgeDraws++; assert.ok(!vp.some((p) => p.needsBridge), 'BC9: no bridge placements without bridges'); }
      const plain = vp.some((p) => p.rots.some((r) => !p.needsBridge?.[r]));
      assert.equal(G.canDiscard(s), !plain, 'canDiscard ⇔ every placement needs a bridge');
      const land = !isRiverTile(t);
      const byKey = new Map(vp.map((p) => [G.key(p.x, p.y), p]));
      for (const [x, y] of G.frontier(s.board)) {
        const p = byKey.get(G.key(x, y));
        for (let r = 0; r < 4; r++) {
          const inRots = !!p && p.rots.includes(r);
          if (!inRots && !land) continue; // the river rules decide river tiles
          const spots = inRots ? G.bridgeSpots(s, x, y, t, r) : [];
          const ids = new Set(spotIds(spots));
          if (me.bridges > 0) {
            for (const c of candidateBridges(s, x, y)) {
              const fits = bridgeOracle(s, x, y, t, r, c);
              if (inRots) assert.equal(ids.has(`${c.key}/${c.axis}`), fits, `${t} at ${x},${y} r${r} bridge ${c.key}/${c.axis}`);
              else { assert.equal(fits, false, `${t} at ${x},${y} r${r}: refused, yet bridge ${c.key}/${c.axis} would fit`); tally.refused++; }
            }
          }
          if (!inRots) continue;
          tally.placements++;
          const k = G.key(x, y);
          if (p.needsBridge?.[r]) {
            tally.needed++;
            assert.equal(p.needsBridge[r].length, 1, 'BC6: exactly one bridge makes it fit');
            assert.deepEqual(spotIds(p.needsBridge[r]), [...ids]);
            assert.equal(G.canPlace(s, x, y, t, r), false);
            assert.equal(G.canPlace(s, x, y, t, r, p.needsBridge[r][0]), true);
          } else {
            assert.equal(G.canPlace(s, x, y, t, r), true);
            for (const b of spots) {
              tally.optional++;
              for (const e of ends(b.key, b.axis)) assert.ok(e !== k && !s.board[e], 'BC7: an optional bridge has both ends on empty squares');
            }
          }
        }
      }
      // play: sometimes throw a bridge-only tile away, else a random placement with its bridge (or an optional one)
      if (G.canDiscard(s) && rnd() < 0.25) { tally.discards++; G.applyAction(s, { t: 'discard' }); continue; }
      const pl = pick(vp), r = pick(pl.rots), k = G.key(pl.x, pl.y);
      let bridge = pl.needsBridge?.[r]?.[0] || null;
      if (!bridge && rnd() < 0.3) { const sp = G.bridgeSpots(s, pl.x, pl.y, t, r); if (sp.length) bridge = pick(sp); }
      const placer = s.current, before = me.bridges;
      const probe = G.cloneState(s);
      G.placeTile(probe, pl.x, pl.y, r, bridge);
      const opts = G.followerOptions(probe);
      for (const o of opts) {
        if (o.kind === 'follower' && !o.portal) assert.equal(o.key, k, 'BC10: figures only on the tile just placed');
        if (o.kind === 'follower' && (o.k === 'abbot' || o.k === 'pig')) assert.notEqual(o.fi, G.bridgeFeature(probe.board[o.key]), 'BC10: never abbot or pig on a bridge');
      }
      const act = opts.length && rnd() < 0.5 ? pick(opts) : null;
      const ev = G.applyAction(s, { t: 'turn', x: pl.x, y: pl.y, r, bridge, act });
      if (riverPhase) assert.ok(!ev.some((e) => e.kind === 'bazaarOpen'), 'CI7: no bazaar in the river phase');
      if (bridge) {
        assert.equal(s.players[placer].bridges, before - 1);
        if (riverPhase) tally.riverBridges++;
        const bt = s.board[bridge.key];
        for (const sd of [bridge.axis, bridge.axis + 2]) assert.equal(printed(bt.t, bt.r, sd), 'field');
        if (bridge.key !== k) {
          tally.neighbourBridges++;
          assert.equal(G.getGroup(s.board, bridge.key, G.bridgeFeature(bt)).complete, false, 'BC12: a bridge next door never finishes a road');
        }
      }
      // H.2.11: bridges on the board = bridges spent; every pair of neighbours matches
      const onBoard = Object.values(s.board).filter((tt) => tt.bridge !== undefined && tt.bridge !== null).length;
      assert.equal(s.players.reduce((a, q) => a + G.BRIDGES(n) - q.bridges, 0), onBoard);
    }
    assert.equal(s.phase, 'over');
    for (const [kk, tt] of Object.entries(s.board)) {
      const [x, y] = G.parseKey(kk);
      for (const sd of [1, 2]) { const nb = G.neighbour(s.board, x, y, sd); if (nb) assert.equal(edgeOf(tt, sd), edgeOf(nb, (sd + 2) % 4)); }
    }
  }
  // (a tile that fits only with a bridge is rare in random play; the BR7 tests below throw such tiles away)
  assert.ok(tally.needed > 200 && tally.optional > 200 && tally.refused > 1000 && tally.neighbourBridges > 5 && tally.riverBridges > 0 && tally.noBridgeDraws > 50, JSON.stringify(tally));
});

test('BR3 placeTile refuses a bridge that is not a bridge spot and changes nothing', () => {
  const base = () => setup([['0,0', 'D', 0], ['0,1', 'B', 0]], 'B');
  const bad = [
    { key: '1,0', axis: 0 }, // on the new tile, but the road from D still meets a meadow
    { key: '0,1', axis: 1 }, // a tile touching 1,0 only at a corner
    { key: '0,0', axis: 1 }, // D has no meadow-to-meadow axis
    { key: '2,0', axis: 1 }, // an empty square
    { key: '7,7', axis: 0 }, // far away
  ];
  for (const b of bad) {
    const s = base();
    const before = JSON.stringify(s);
    assert.throws(() => G.placeTile(s, 1, 0, 0, b), /Illegal/, JSON.stringify(b));
    assert.equal(JSON.stringify(s), before, `nothing changed after ${JSON.stringify(b)}`);
  }
  // an optional bridge with one end against an existing meadow is refused, the other axis is fine
  const s = setup([['0,0', 'B', 0]], 'B');
  assert.throws(() => G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 }), /Illegal/);
  // no bridges left
  const z = base();
  z.players[0].bridges = 0;
  assert.throws(() => G.placeTile(z, 1, 0, 0, { key: '1,0', axis: 1 }), /Illegal/);
});

test('BR3 a bridge costs the player who builds it one bridge, the other players none', () => {
  const s = setup([['0,0', 'D', 0], ['3,0', 'D', 0]], 'B');
  turn(s, 1, 0, 0, null, { key: '1,0', axis: 1 });
  assert.deepEqual(s.players.map((p) => p.bridges), [2, 3]);
  assert.equal(s.current, 1);
  turn(s, 2, 0, 0, null, { key: '2,0', axis: 1 });
  assert.deepEqual(s.players.map((p) => p.bridges), [2, 2]);
  assert.equal(s.board['1,0'].bridge, 1); assert.equal(s.board['2,0'].bridge, 1);
});

test('BR3/BC7 an optional bridge may go on the new tile or on a neighbour (parallel to the shared side); it starts a new road', () => {
  const s = setup([['0,0', 'B', 0]], 'B');
  assert.ok(G.canPlace(s, 1, 0, 'B', 0), 'fits as printed');
  assert.deepEqual(spotIds(G.bridgeSpots(s, 1, 0, 'B', 0)), ['0,0/0', '1,0/0']);
  // on the neighbour: allowed, carries a brand-new road, and nobody may stand on it now
  const nb = G.cloneState(s);
  G.placeTile(nb, 1, 0, 0, { key: '0,0', axis: 0 });
  assert.equal(nb.board['0,0'].bridge, 0); assert.equal(nb.players[0].bridges, 2);
  const g = G.getGroup(nb.board, '0,0', bf(nb, '0,0'));
  assert.equal(g.tiles.size, 1); assert.equal(g.openEdges, 2);
  assert.ok(!G.followerOptions(nb).some((o) => o.key === '0,0'));
  // on the new tile: the bridge road may take the meeple
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 0 });
  assert.ok(G.followerOptions(s).some((o) => o.kind === 'follower' && o.key === '1,0' && o.fi === bf(s, '1,0') && o.k === 'meeple'));
});

// ---------- BR4 fields, cities and rivers under bridges ----------
test('BR4 the meadows beside a road that ends at a bridge join; the meadow under the bridge is one meadow; farmers score the joined meadow', () => {
  const s = setup([['0,0', 'D', 0], ['0,-1', 'E', 2]], 'B');
  put(s, '0,0', 1, 3); // P1's farmer in D's southern meadow, which touches no city
  turn(s, 1, 0, 0, null, { key: '1,0', axis: 1 });
  assert.equal(G.getGroup(s.board, '0,0', 2).id, G.getGroup(s.board, '0,0', 3).id);
  assert.equal(G.getGroup(s.board, '1,0', 1).id, G.getGroup(s.board, '0,0', 3).id, 'B\'s meadow under the bridge is not cut');
  const field = G.finalScoring(s, true).find((e) => e.kind === 'field');
  assert.equal(field.cityCount, 1, 'the finished city north of the road now borders the farmer\'s meadow');
  assert.equal(field.points, 3); assert.deepEqual(field.winners, [1]);
});

test('BR4/BR8 a road meeting a river tile\'s meadow edge is carried across the river by a bridge; the river still splits the meadows', () => {
  const s = setup([['0,0', 'RI.1/IFI', 0]], 'U'); // the river runs west–east, meadows north and south
  assert.deepEqual(G.bridgeSpots(s, 0, -1, 'U', 0), [{ key: '0,0', axis: 0 }]);
  turn(s, 0, -1, 0, null, { key: '0,0', axis: 0 });
  const t = s.board['0,0'];
  const [north, south] = feat(s, '0,0', 'field').map((i) => G.getGroup(s.board, '0,0', i));
  assert.notEqual(north.id, south.id, 'the river splits them');
  assert.equal(G.getGroup(s.board, '0,-1', 1).id, G.getGroup(s.board, '0,-1', 2).id, 'the meadows beside U\'s road join on the north bank');
  assert.equal(G.getGroup(s.board, '0,-1', 1).id, north.id);
  assert.equal(G.edgeType(t, 1), 'river'); assert.equal(G.edgeType(t, 3), 'river');
  assert.equal(G.edgeType(t, 0), 'road'); assert.equal(G.edgeType(t, 2), 'road');
});

test('BR4 a city under a bridge stays one city: F bridged north–south completes the city on both sides', () => {
  const s = setup([['-1,0', 'E', 1], ['1,0', 'E', 3]], 'F');
  assert.ok(G.canPlace(s, 0, 0, 'F', 0), 'fits as printed: the bridge is optional');
  assert.ok(G.bridgeSpots(s, 0, 0, 'F', 0).some((b) => b.key === '0,0' && b.axis === 0));
  put(s, '-1,0', 1, 0);
  const ev = turn(s, 0, 0, 0, null, { key: '0,0', axis: 0 });
  const city = ev.find((e) => e.kind === 'city');
  assert.ok(city, 'the city is completed across the bridged tile');
  assert.equal(city.tiles, 3); assert.equal(city.points, 8);
  assert.deepEqual(city.winners, [1]);
  const [n, so] = feat(s, '0,0', 'field');
  assert.notEqual(G.getGroup(s.board, '0,0', n).id, G.getGroup(s.board, '0,0', so).id, 'the city band still separates the meadows');
  assert.equal(G.getGroup(s.board, '0,0', bf(s, '0,0')).tiles.size, 1, 'the bridge is a road of its own');
});

// ---------- BR5 figures on bridges ----------
test('BR5 I&C: a large meeple may stand on the bridge of the tile just placed (strength 2)', () => {
  const s = setup([['0,0', 'D', 0]], 'B', { exps: { inns: true } });
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  const b = bf(s, '1,0');
  const o = G.followerOptions(s).find((q) => q.kind === 'follower' && q.key === '1,0' && q.fi === b && q.k === 'large');
  assert.ok(o);
  G.finishTurn(s, o);
  assert.deepEqual(s.board['1,0'].pieces, [{ p: 0, f: b, k: 'large' }]);
  assert.equal(s.players[0].supply.large, 0);
  assert.equal(G.getGroup(s.board, '0,0', 1).meeples[0].w, 2);
});

test('BR5 T&B: the builder may go on the bridge when its owner has a meeple in that road; abbot and pig never stand on a bridge', () => {
  const s = setup([['0,0', 'D', 0]], 'B', { exps: { traders: true, abbot: true } });
  put(s, '0,0', 0, 1); // P0's meeple on D's road
  put(s, '0,0', 0, 3); // P0's farmer in D's southern meadow (a pig is possible in that meadow)
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  const b = bf(s, '1,0');
  const opts = G.followerOptions(s);
  assert.deepEqual(opts.filter((q) => q.key === '1,0' && q.fi === b).map((q) => q.k), ['builder'], 'the road is P0\'s already: only the builder');
  assert.ok(opts.some((q) => q.k === 'abbot' && q.key === '1,0' && q.fi === 0), 'the abbot may take the monastery');
  assert.ok(opts.some((q) => q.k === 'pig' && q.key === '1,0'), 'the pig may go in the meadow');
  assert.ok(!opts.some((q) => (q.k === 'abbot' || q.k === 'pig') && q.fi === b));
  G.finishTurn(s, opts.find((q) => q.fi === b));
  assert.deepEqual(s.board['1,0'].pieces, [{ p: 0, f: b, k: 'builder' }]);
});

test('BR5 a bridge that joins an occupied road blocks the claim; nothing ever goes on a bridge built next door', () => {
  const s = setup([['0,0', 'D', 0]], 'B', { exps: { inns: true, traders: true } });
  put(s, '0,0', 1, 1); // P1's highwayman on D's road
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  assert.ok(!G.followerOptions(s).some((q) => q.key === '1,0' && q.fi === bf(s, '1,0')), 'no meeple, large meeple or builder for P0');
  // a neighbour bridge carrying a new, empty road: no figure on it; the road is claimed on the new tile instead
  const t = setup([['0,0', 'B', 0]], 'U', { exps: { traders: true } });
  G.placeTile(t, 1, 0, 1, { key: '0,0', axis: 1 });
  assert.ok(!G.followerOptions(t).some((q) => q.key === '0,0' && q.kind === 'follower'));
  assert.ok(G.followerOptions(t).some((q) => q.key === '1,0' && q.fi === 0 && q.k === 'meeple'));
});

test('BR5 a meeple put on a bridge that has just finished a road scores at once', () => {
  const s = setup([['0,0', 'A', 3], ['2,0', 'A', 1]], 'B');
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  const o = G.followerOptions(s).find((q) => q.key === '1,0' && q.fi === bf(s, '1,0') && q.k === 'meeple');
  assert.ok(o, 'a just-finished road may still be claimed');
  const road = G.finishTurn(s, o).find((e) => e.kind === 'road');
  assert.equal(road.points, 3); assert.deepEqual(road.winners, [0]);
  assert.equal(s.players[0].score, 3); assert.equal(s.board['1,0'].pieces.length, 0);
});

// ---------- BR6 scoring ----------
test('BR6 a tile counts once when a road runs over it twice (its printed road and its bridge)', () => {
  // A at 0,0 has a bridge west–east; three bends lead from the bridge's east end back to A's own road
  const s = setup([['0,0', 'A', 0, { bridge: 1 }], ['1,0', 'V', 0], ['1,1', 'V', 1], ['0,1', 'V', 2]], 'A');
  put(s, '1,0', 1, 0);
  const g0 = G.getGroup(s.board, '0,0', bf(s, '0,0'));
  assert.ok(g0.nodes.some(([k, f]) => k === '0,0' && f === 1), 'the road comes back to the printed road of the bridged tile');
  assert.equal(G.groupPoints(g0), 4, 'unfinished: 4 tiles');
  const road = turn(s, -1, 0, 3).find((e) => e.kind === 'road');
  assert.equal(road.tiles, 5); assert.equal(road.points, 5);
  assert.equal(s.players[1].score, 5);
});

test('BR6 the rulebook road: six tiles with two bridges between two crossroads score 6', () => {
  const s = setup([['0,0', 'X', 0], ['1,0', 'B', 0, { bridge: 1 }], ['2,0', 'U', 1], ['4,0', 'U', 1], ['5,0', 'X', 0]], 'B');
  put(s, '2,0', 0, 0);
  assert.deepEqual(G.validPlacements(s).find((p) => p.x === 3 && p.y === 0).needsBridge[0], [{ key: '3,0', axis: 1 }]);
  const road = turn(s, 3, 0, 0, null, { key: '3,0', axis: 1 }).find((e) => e.kind === 'road' && e.winners.length);
  assert.equal(road.tiles, 6); assert.equal(road.points, 6); assert.equal(s.players[0].score, 6);
});

test('BR6 I&C: an inn road carried on over a bridge doubles; a bridge across an inn tile that does not join the inn road does not', () => {
  const s = setup([['-1,0', 'A', 3], ['0,0', 'IC/RFr.iG', 0], ['2,0', 'A', 1]], 'B', { exps: { inns: true } });
  put(s, '0,0', 0, 0);
  const road = turn(s, 1, 0, 0, null, { key: '1,0', axis: 1 }).find((e) => e.kind === 'road');
  assert.equal(road.inn, true); assert.equal(road.tiles, 4); assert.equal(road.points, 8);
  assert.equal(s.players[0].score, 8);
  const t = setup([['0,-1', 'A', 0], ['0,0', 'IC/RFr.iG', 0, { bridge: 0 }]], 'A', { exps: { inns: true } });
  put(t, '0,-1', 0, 1);
  const r2 = turn(t, 0, 1, 2).find((e) => e.kind === 'road');
  assert.equal(r2.inn, false); assert.equal(r2.tiles, 3); assert.equal(r2.points, 3);
});

test('BR6 I&C: an unfinished inn road that runs over a bridge scores 0 at the end, the bridge tile included', () => {
  const s = setup([['0,0', 'IC/RFr.iG', 0], ['1,0', 'B', 0, { bridge: 1 }]], 'B', { exps: { inns: true } });
  put(s, '1,0', 0, bf(s, '1,0'));
  const road = G.finalScoring(s, true).find((e) => e.kind === 'road');
  assert.equal(road.tiles, 2); assert.equal(road.inn, true); assert.equal(road.points, 0);
  assert.equal(s.players[0].score, 0);
});

test('BR6 BC14: BCB inns count only with I&C (noInn), also on a road that continues over a bridge', () => {
  const run = (exps) => {
    const s = setup([['0,1', 'B', 0, { bridge: 0 }], ['0,2', 'A', 2]], 'BB/RFR.bi', { exps, bcb: { bazaars: false } });
    put(s, '0,2', 1, 1);
    const ev = turn(s, 0, 0, 0);
    return [s, ev.find((e) => e.kind === 'road' && e.complete)];
  };
  const [off, roadOff] = run({});
  assert.equal(off.board['0,0'].noInn, true);
  assert.equal(roadOff.inn, false); assert.equal(roadOff.tiles, 3); assert.equal(roadOff.points, 3);
  const [on, roadOn] = run({ inns: true });
  assert.ok(!on.board['0,0'].noInn);
  assert.equal(roadOn.inn, true); assert.equal(roadOn.points, 6);
  // at the end: an unfinished BCB inn road over a bridge scores 1 per tile without I&C, 0 with it
  const fin = (exps) => {
    const s = setup([['0,1', 'B', 0, { bridge: 0 }]], 'BB/R.bi', { exps, bcb: { bazaars: false } });
    turn(s, 0, 0, 0, { kind: 'follower', key: '0,0', fi: 0, k: 'meeple' });
    return G.finalScoring(s, true).find((e) => e.kind === 'road');
  };
  assert.equal(fin({}).points, 2);
  assert.equal(fin({ inns: true }).points, 0);
});

// ---------- BR7 throwing a bridge-only tile away ----------
test('BR7 a tile that fits only with a bridge may be thrown away and the same player draws again; one with a bridge-free spot may not', () => {
  const s = setup([['0,0', 'X', 0]], 'B', { deck: ['A', 'U'] });
  assert.ok(G.validPlacements(s).every((p) => p.rots.every((r) => p.needsBridge?.[r])));
  assert.equal(G.canDiscard(s), true);
  const ev = G.applyAction(s, { t: 'discard' });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind, 'discard'); assert.equal(ev[0].tile, 'B'); assert.equal(ev[0].player, 0);
  assert.deepEqual(s.discarded, ['B']);
  assert.equal(s.drawn, 'U'); assert.equal(s.current, 0); assert.equal(s.phase, 'place'); assert.equal(s.turn, 1);
  assert.equal(s.players[0].bridges, 3);
  assert.equal(G.canDiscard(s), false, 'U fits next to the crossroads as printed');
  const before = JSON.stringify(s);
  assert.throws(() => G.applyAction(s, { t: 'discard' }));
  assert.equal(JSON.stringify(s), before);
});

test('BR7 BC9: a player without bridges never gets a bridge-only tile: it is removed when drawn (also with bcb.bridges off)', () => {
  const play = (p0bridges, bcb) => {
    const s = setup([['0,0', 'X', 0]], 'X', { deck: ['U', 'B'], bcb });
    s.current = 1;
    s.players[0].bridges = p0bridges;
    turn(s, 1, 0, 0); // P1 adds a second crossroads; then P0 draws B, which only fits with a bridge
    return s;
  };
  const has = play(3);
  assert.equal(has.current, 0); assert.equal(has.drawn, 'B'); assert.equal(G.canDiscard(has), true);
  const none = play(0);
  assert.equal(none.current, 0); assert.equal(none.drawn, 'U'); assert.deepEqual(none.discarded, ['B']);
  const off = play(0, { bridges: false });
  assert.equal(off.drawn, 'U'); assert.deepEqual(off.discarded, ['B']);
});

test('BR7 T&B: a bridge-only tile drawn in part 2 may be thrown away; with the last bridge spent in part 1 it is removed instead', () => {
  const start = (bridges) => {
    const s = setup([['0,0', 'X', 0]], 'U', { exps: { traders: true }, deck: ['A', 'U', 'B'] });
    put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
    s.players[0].bridges = bridges;
    turn(s, 1, 0, 0, null, { key: '1,0', axis: 1 }); // U north–south: its bridge joins the builder's road
    return s;
  };
  const s = start(3);
  assert.equal(s.part, 2); assert.equal(s.current, 0); assert.equal(s.drawn, 'B');
  assert.equal(G.canDiscard(s), true);
  G.applyAction(s, { t: 'discard' });
  assert.equal(s.part, 2); assert.equal(s.current, 0); assert.equal(s.drawn, 'U'); assert.deepEqual(s.discarded, ['B']);
  turn(s, 2, 0, 1);
  assert.equal(s.current, 1); assert.equal(s.part, 1, 'no third tile');
  const last = start(1);
  assert.equal(last.players[0].bridges, 0);
  assert.equal(last.part, 2); assert.equal(last.current, 0); assert.equal(last.drawn, 'U'); assert.deepEqual(last.discarded, ['B']);
});

test('BR7 throwing away the last tile of the stack ends the game (final scoring runs)', () => {
  const s = setup([['0,0', 'X', 0]], 'B', { deck: [] });
  put(s, '0,0', 1, 0);
  G.applyAction(s, { t: 'discard' });
  assert.equal(s.phase, 'over'); assert.equal(s.drawn, null);
  assert.ok(s.finalEvents.some((e) => e.kind === 'road' && e.winners.includes(1)));
  assert.equal(s.players[1].score, 1);
});

test('BR7 BC32: a bazaar tile that is thrown away holds no bazaar', () => {
  const s = setup([['0,0', 'X', 0]], 'BB/F.b', { deck: [...Array(8).fill('B'), 'U'] });
  assert.equal(G.canDiscard(s), true);
  G.applyAction(s, { t: 'discard' });
  assert.equal(s.drawn, 'U'); assert.equal(s.bazaar, null); assert.equal(s.bazaarDue, false);
  turn(s, 1, 0, 1);
  assert.equal(s.phase, 'place'); assert.equal(s.bazaar, null, 'no auction after the part either'); assert.equal(s.current, 1);
});

test('BR7 BC44/BC46: a bought tile that fits only with a bridge may be thrown away; with the stack empty the round goes on, the game ends after it', () => {
  const start = (p1bridges) => {
    const s = setup([['-1,0', 'X', 0], ['0,0', 'X', 0], ['1,0', 'X', 0]], 'BB/RFR.b', { deck: ['U', 'B'] });
    s.players[1].bridges = p1bridges;
    turn(s, 0, 1, 0);
    assert.equal(s.phase, 'bazaar'); assert.deepEqual(s.bazaar.tiles.map((x) => x.t), ['B', 'U']);
    G.applyAction(s, { t: 'bazaar', pick: 0, bid: 0 }); // P1 chooses B
    return [s, G.applyAction(s, { t: 'bazaar', pass: true })]; // P0 passes: P1 pays the bank 0, P0 takes U
  };
  const [s] = start(3);
  assert.equal(s.current, 1); assert.equal(s.drawn, 'B'); assert.equal(s.deck.length, 0);
  assert.equal(G.canDiscard(s), true);
  const ev = G.applyAction(s, { t: 'discard' });
  assert.ok(s.bazaar, 'still inside the bazaar round');
  assert.equal(s.current, 0); assert.equal(s.drawn, 'U'); assert.equal(s.phase, 'place');
  assert.ok(ev.some((e) => e.kind === 'bazaarTurn' && e.seat === 0));
  turn(s, 0, -1, 0);
  assert.equal(s.phase, 'over', 'the game ends after the round, not inside it');
  // without bridges the bought tile cannot be placed at all: removed, nothing to draw, P1's bazaar turn is skipped
  const [t, ev2] = start(0);
  assert.ok(t.discarded.includes('B'));
  assert.ok(!ev2.some((e) => e.kind === 'bazaarTurn' && e.seat === 1));
  assert.equal(t.current, 0); assert.equal(t.drawn, 'U');
});

test('BR7/BR9 T&B in a bazaar round: a bought tile whose bridge joins the builder\'s road earns part 2 at once; a bridge-only part-2 tile may be thrown away; an empty stack ends the game only after the round', () => {
  const play = (stackAfterReveal) => {
    const s = setup([['-1,0', 'X', 0], ['0,0', 'X', 0], ['1,0', 'X', 0]], 'BB/RFR.b', { exps: { traders: true }, deck: [...stackAfterReveal, 'B', 'U'] });
    put(s, '1,0', 1, 1); put(s, '1,0', 1, 1, 'builder'); // P1's meeple and builder on the east road of the last crossroads
    turn(s, 0, 1, 0); // P0 places the bazaar; the reveal pops U, then B
    G.applyAction(s, { t: 'bazaar', pick: s.bazaar.tiles.findIndex((x) => x.t === 'U'), bid: 0 }); // P1 chooses U
    G.applyAction(s, { t: 'bazaar', pass: true }); // P0 passes: P1 pays the bank 0, P0 takes B
    assert.equal(s.current, 1); assert.equal(s.drawn, 'U');
    const ev = turn(s, 2, 0, 0, null, { key: '2,0', axis: 1 }); // U north–south, its bridge continues P1's builder road
    return [s, ev];
  };
  const [s, ev] = play(['X', 'B']);
  assert.ok(ev.some((e) => e.kind === 'bonus'), 'BC15/BC40: part 2 at once, inside the round');
  assert.equal(s.current, 1); assert.equal(s.part, 2); assert.equal(s.drawn, 'B'); assert.ok(s.bazaar);
  assert.equal(G.canDiscard(s), true);
  G.applyAction(s, { t: 'discard' });
  assert.equal(s.current, 1); assert.equal(s.part, 2); assert.equal(s.drawn, 'X'); assert.ok(s.bazaar);
  // no tile left for part 2: the round goes on (P0 plays B, which only fits with a bridge, and throws it away)
  const [t] = play([]);
  assert.equal(t.current, 0); assert.equal(t.drawn, 'B'); assert.ok(t.bazaar);
  G.applyAction(t, { t: 'discard' });
  assert.equal(t.phase, 'over', 'BC46: the game ends after the round');
});

// ---------- BR8 / CI7 the River ----------
test('BR8/CI7 river phase: a bridge may cross the new straight river tile or go on the spring (parallel), never along the river', () => {
  const s = G.newGame(players(2), { expansions: { river: true, bridges: true } }, () => 0.5);
  s.drawn = 'RI.1/IFI'; s.deck = ['RI.1/II', 'RI.1/IFI'];
  const vp = G.validPlacements(s);
  assert.deepEqual(vp.map((p) => [p.x, p.y, p.rots.join()]), [[0, 1, '1,3']]);
  assert.ok(!vp[0].needsBridge, 'it fits as printed');
  assert.deepEqual(spotIds(G.bridgeSpots(s, 0, 1, 'RI.1/IFI', 1)), ['0,0/1', '0,1/1']);
  const plain = G.cloneState(s);
  turn(plain, 0, 1, 1);
  turn(s, 0, 1, 1, null, { key: '0,1', axis: 1 });
  assert.equal(s.board['0,1'].bridge, 1); assert.equal(s.players[0].bridges, 2);
  assert.deepEqual(s.river.open, plain.river.open, 'the river goes on as before');
  assert.deepEqual(s.river.open, { x: 0, y: 1, side: 2 });
  // the bridge joins no meadows: the banks are joined (around the spring) or apart exactly as without it
  for (const k of ['0,0', '0,1']) for (const i of feat(s, k, 'field')) {
    assert.equal(G.getGroup(s.board, k, i).id, G.getGroup(plain.board, k, i).id, `meadow ${k}#${i}`);
  }
  assert.equal(feat(s, '0,1', 'field').length, 2, 'the river tile keeps a meadow on each bank');
  assert.equal(G.edgeType(s.board['0,1'], 0), 'river'); assert.equal(G.edgeType(s.board['0,1'], 2), 'river');
  assert.equal(s.current, 1); assert.equal(s.drawn, 'RI.1/IFI');
});

test('BR8 the river rules do not change with bridges: river tiles go only on the open end, no forbidden bend becomes legal', () => {
  const RIVER = Object.keys(TILE_TYPES).filter((t) => TILE_TYPES[t].exp === 'river' && t !== 'RI/s');
  const s = G.newGame(players(2), { expansions: { river: true, bridges: true } }, () => 0.5);
  const without = (st) => { const c = G.cloneState(st); c.players[c.current].bridges = 0; return c; };
  const shape = (vp) => vp.map((p) => `${p.x},${p.y}:${p.rots.join('')}${p.needsBridge ? '+bridge' : ''}`).sort();
  const compare = () => { for (const t of RIVER) assert.deepEqual(shape(G.validPlacements(s, t)), shape(G.validPlacements(without(s), t)), t); };
  compare();
  // a bend to the east, then the same bend again would be an immediate U-turn
  s.drawn = 'RI.1/II';
  const exitEast = G.validPlacements(s)[0].rots.find((r) => G.riverSidesWorld('RI.1/II', r).includes(1));
  turn(s, 0, 1, exitEast);
  compare();
  const next = G.validPlacements(s, 'RI.1/II');
  assert.equal(next.length, 1);
  assert.deepEqual(next[0].rots.map((r) => G.riverSidesWorld('RI.1/II', r).find((sd) => sd !== 3)), [2], 'only the bend back south (north would be a U-turn)');
  assert.ok(!next[0].needsBridge);
});

test('BR8 BC13: of the river tiles only the spring, the straight river and the lake can carry a bridge (both ends meadow, across the river)', () => {
  const RIVER = Object.keys(TILE_TYPES).filter((t) => TILE_TYPES[t].exp === 'river');
  const bridgeable = new Set();
  for (const t of RIVER) for (let r = 0; r < 4; r++) for (let side = 0; side < 4; side++) {
    // a monastery road (A, road on its south side) arriving at the river tile from `side`
    const [dx, dy] = SIDE_DELTA[side];
    const s = setup([['0,0', t, r]], 'A');
    for (const b of G.bridgeSpots(s, dx, dy, 'A', side)) {
      if (b.key !== '0,0') continue;
      bridgeable.add(t);
      assert.equal(b.axis, side % 2);
      for (const sd of [b.axis, b.axis + 2]) assert.equal(printed(t, r, sd), 'field', `${t} r${r}`);
    }
  }
  assert.deepEqual([...bridgeable].sort(), ['RI.1/I.e', 'RI.1/IFI', 'RI/s']);
});

// ---------- BR9 Traders & Builders ----------
test('BR9 T&B: a bridge on the new tile that joins the builder\'s road earns the double turn; part 2 may build a second bridge', () => {
  const s = setup([['0,0', 'D', 0]], 'B', { exps: { traders: true }, deck: ['U', 'B'] });
  put(s, '0,0', 0, 1); put(s, '0,0', 0, 1, 'builder');
  const plain = G.cloneState(s);
  G.placeTile(plain, 0, 1, 0);
  assert.equal(plain.bonus, false, 'a tile away from the road earns nothing');
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  assert.equal(s.bonus, true, 'BC15: evaluated after the bridge');
  G.finishTurn(s, null);
  assert.equal(s.part, 2); assert.equal(s.drawn, 'B'); assert.equal(s.current, 0);
  assert.deepEqual(G.validPlacements(s).find((p) => p.x === 2 && p.y === 0).needsBridge[0], [{ key: '2,0', axis: 1 }]);
  turn(s, 2, 0, 0, null, { key: '2,0', axis: 1 });
  assert.equal(s.players[0].bridges, 1, 'one bridge per tile placement: two in the double turn');
  assert.equal(s.board['1,0'].bridge, 1); assert.equal(s.board['2,0'].bridge, 1);
  assert.equal(s.current, 1); assert.equal(s.part, 1, 'part 2 never earns another tile');
});

test('BR9 T&B: a builder standing on a bridge is triggered when a later tile extends that road', () => {
  const s = setup([['0,0', 'D', 0], ['1,0', 'B', 0, { bridge: 1 }]], 'U', { exps: { traders: true } });
  put(s, '0,0', 0, 1); put(s, '1,0', 0, bf(s, '1,0'), 'builder');
  G.placeTile(s, 2, 0, 1);
  assert.equal(s.bonus, true);
});

// ---------- BR10 Princess & Dragon, Tower ----------
test('BR10 P&D: the magic portal may put a meeple on an empty, unfinished bridge road elsewhere — not an occupied, finished or dragon one', () => {
  const board = () => [['0,0', 'D', 0], ['1,0', 'B', 0, { bridge: 1 }]];
  const s = setup(board(), 'DG/RRR.g', { exps: { dragon: true } });
  G.placeTile(s, 0, 1, 0);
  const b = bf(s, '1,0');
  const o = G.followerOptions(s).find((q) => q.portal && q.key === '1,0' && q.fi === b && q.k === 'meeple');
  assert.ok(o, 'portal onto the bridge');
  G.finishTurn(s, o);
  assert.deepEqual(s.board['1,0'].pieces, [{ p: 0, f: b, k: 'meeple' }]);
  const occ = setup(board(), 'DG/RRR.g', { exps: { dragon: true } });
  put(occ, '0,0', 1, 1);
  G.placeTile(occ, 0, 1, 0);
  assert.ok(!G.followerOptions(occ).some((q) => q.portal && q.key === '1,0' && q.fi === b), 'occupied road');
  const dr = setup(board(), 'DG/RRR.g', { exps: { dragon: true } });
  dr.dragon = '1,0';
  G.placeTile(dr, 0, 1, 0);
  assert.ok(!G.followerOptions(dr).some((q) => q.portal && q.key === '1,0'), 'the dragon\'s tile');
  const done = setup([['0,0', 'A', 3], ['1,0', 'B', 0, { bridge: 1 }], ['2,0', 'A', 1]], 'DG/RRR.g', { exps: { dragon: true } });
  G.placeTile(done, 1, 1, 0);
  assert.ok(!G.followerOptions(done).some((q) => q.portal && q.key === '1,0' && q.fi === b), 'finished road');
});

test('BR10 P&D: the dragon eats a meeple standing on a bridge; the bridge stays', () => {
  const s = setup([['0,0', 'D', 0], ['1,0', 'B', 0, { bridge: 1 }]], 'DG/RFr.d', { exps: { dragon: true } });
  s.dragon = '0,0';
  const b = bf(s, '1,0');
  put(s, '1,0', 1, b);
  turn(s, -1, 0, 0);
  assert.equal(s.phase, 'dragon');
  assert.ok(G.dragonMoves(s).includes('1,0'));
  const eat = G.applyAction(s, { t: 'dragon', key: '1,0' }).find((e) => e.kind === 'dragon');
  assert.deepEqual(eat.meeples.map((m) => [m.key, m.f, m.p]), [['1,0', b, 1]]);
  assert.equal(s.board['1,0'].pieces.length, 0); assert.equal(s.players[1].supply.meeple, 7);
  assert.equal(s.board['1,0'].bridge, 1, 'bridges are never eaten');
});

test('BR10 Tower: a tower captures a meeple standing on a bridge', () => {
  const s = setup([['0,0', 'TO/FG', 0], ['1,0', 'B', 0, { bridge: 0 }]], 'B', { exps: { tower: true } });
  s.towers['0,0'] = { h: 0, top: null };
  const b = bf(s, '1,0');
  put(s, '1,0', 1, b);
  G.placeTile(s, 0, 1, 0);
  const target = G.captureTargets(s, '0,0', 1).find((c) => c.key === '1,0' && c.fi === b);
  assert.ok(target, 'the meeple on the bridge is in reach');
  const ev = G.finishTurn(s, { kind: 'floor', key: '0,0', capture: target });
  assert.ok(ev.some((e) => e.kind === 'capture' && e.captured.key === '1,0'));
  assert.equal(s.board['1,0'].pieces.length, 0);
  assert.deepEqual(s.players[0].prisoners, [{ p: 1, k: 'meeple' }]);
  assert.equal(s.board['1,0'].bridge, 0, 'bridges are never captured');
});

test('BR10 P&D BC50: a bridge may go on a volcano tile (needed or optional) or on the dragon\'s tile; no figure goes on such a bridge', () => {
  const s = setup([['0,0', 'D', 0]], 'DG/F.v', { exps: { dragon: true } });
  assert.deepEqual(G.bridgeSpots(s, 1, 0, 'DG/F.v', 0), [{ key: '1,0', axis: 1 }]);
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  assert.equal(s.dragon, '1,0');
  assert.ok(!G.followerOptions(s).some((q) => q.key === '1,0'), 'nothing on the volcano tile, bridge included');
  const o = setup([['0,0', 'D', 0]], 'DG/F.v', { exps: { dragon: true } });
  assert.ok(G.canPlace(o, 0, 1, 'DG/F.v', 0));
  assert.deepEqual(G.bridgeSpots(o, 0, 1, 'DG/F.v', 0), [{ key: '0,1', axis: 1 }]);
  G.placeTile(o, 0, 1, 0, { key: '0,1', axis: 1 });
  assert.equal(o.dragon, '0,1');
  assert.ok(!G.followerOptions(o).some((q) => q.key === '0,1'));
  // the dragon stands on 0,0: a road arriving there is carried on by a bridge on the dragon's tile
  const d = setup([['0,0', 'B', 0]], 'A', { exps: { dragon: true } });
  d.dragon = '0,0';
  assert.deepEqual(G.bridgeSpots(d, 1, 0, 'A', 1), [{ key: '0,0', axis: 1 }]);
  G.placeTile(d, 1, 0, 1, { key: '0,0', axis: 1 });
  assert.equal(d.board['0,0'].bridge, 1);
  assert.ok(!G.followerOptions(d).some((q) => q.key === '0,0'));
});

test('Tower: a bridge and a tower may share a tile; the tower still grows and captures the meeple on that bridge', () => {
  const s = setup([['0,0', 'D', 0]], 'TO/FG', { exps: { tower: true } });
  G.placeTile(s, 1, 0, 0, { key: '1,0', axis: 1 });
  assert.deepEqual(s.towers['1,0'], { h: 0, top: null });
  const b = bf(s, '1,0');
  const o = G.followerOptions(s).find((q) => q.key === '1,0' && q.fi === b && q.k === 'meeple');
  assert.ok(o, 'a meeple may stand on the bridge of the tower tile');
  G.finishTurn(s, o);
  assert.equal(s.current, 1); assert.equal(s.drawn, 'B');
  G.placeTile(s, 1, 1, 0);
  const target = G.captureTargets(s, '1,0', 1).find((c) => c.key === '1,0' && c.fi === b);
  assert.ok(target, 'the tower\'s own tile is in reach');
  G.finishTurn(s, { kind: 'floor', key: '1,0', capture: target });
  assert.equal(s.towers['1,0'].h, 1);
  assert.deepEqual(s.players[1].prisoners, [{ p: 0, k: 'meeple' }]);
});

// ---------- computer players and bridges ----------
test('AI: on a bridge-only tile a bot plays the needed bridge or throws the tile away; easy bots never throw a tile away (H.3)', () => {
  const s = setup([['0,0', 'X', 0]], 'BB/F.b', { bcb: { bazaars: false } });
  for (const fi of [0, 1, 2, 3]) put(s, '0,0', 1, fi);
  assert.equal(G.canDiscard(s), true);
  const seen = {};
  for (const lvl of ['easy', 'medium', 'hard']) {
    const st = G.cloneState(s);
    const mv = AI.chooseMove(st, lvl, () => 0.5);
    assert.equal(JSON.stringify(st), JSON.stringify(s), 'thinking leaves the state alone');
    seen[lvl] = mv.discard ? 'discard' : 'place';
    if (mv.discard) { G.applyAction(st, { t: 'discard' }); continue; }
    const v = G.validPlacements(s).find((p) => p.x === mv.x && p.y === mv.y);
    assert.deepEqual(mv.bridge, v.needsBridge[mv.r][0], 'the needed bridge');
    G.applyAction(st, { t: 'turn', x: mv.x, y: mv.y, r: mv.r, bridge: mv.bridge, act: mv.act || null });
  }
  assert.equal(seen.easy, 'place');
  // the hint for a human uses the hard evaluator and can recommend throwing the tile away
  assert.deepEqual(AI.suggestMove(G.cloneState(s)), { discard: true });
});
