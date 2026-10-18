// Random games with Bridges, Castles & Bazaars in every combination of the seven expansions:
// the invariants of MASTER H.2.11 after every action, and an identical replay of the action log.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const EXPS = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower', 'bridges'];
const stats = { games: 0, castlesBuilt: 0, castleScores: 0, chainScores: 0, bazaars: 0, bazaarSkips: 0, deals: {}, discards: 0, replaced: 0, negative: 0, castleEnd: 0, fieldCastles: 0, actions: 0, castlePhases: 0, bazaarPhases: 0, bridgeOnly: 0, bazaarTurnBonus: 0, hostPart2AfterRound: 0 };
function countPieces(s) {
  const onBoard = Object.values(s.board).reduce((a, t) => a + t.pieces.length, 0);
  const tops = Object.values(s.towers).filter((t) => t.top).length;
  const hand = s.players.reduce((a, p) => a + Object.values(p.supply).reduce((x, y) => x + y, 0), 0);
  const held = s.players.reduce((a, p) => a + p.prisoners.length, 0);
  const cast = (s.castles || []).filter((c) => c.k).length;
  return onBoard + tops + hand + held + cast;
}
function countTiles(s) {
  const bz = s.bazaar ? s.bazaar.tiles.filter((x) => !x.played).length : 0;
  return Object.keys(s.board).length + s.discarded.length + s.setAside.length + s.deck.length + (s.drawn ? 1 : 0) + bz;
}
function check(s, startPieces, startTiles, exps, n) {
  if (countPieces(s) !== startPieces) throw new Error('pieces not conserved');
  if (countTiles(s) !== startTiles) throw new Error(`tiles not conserved ${countTiles(s)} vs ${startTiles}`);
  let bridgesOnBoard = 0;
  for (const [k, t] of Object.entries(s.board)) {
    if (t.bridge !== undefined && t.bridge !== null) bridgesOnBoard++;
    const [x, y] = G.parseKey(k);
    for (const sd of [1, 2]) { const nb = G.neighbour(s.board, x, y, sd); if (nb && G.edgeType(t, sd) !== G.edgeType(nb, (sd + 2) % 4)) throw new Error('edge mismatch'); }
  }
  if (exps.bridges) {
    const built = s.players.reduce((a, p) => a + (G.BRIDGES(n) - p.bridges), 0);
    if (built !== bridgesOnBoard) throw new Error('bridge count');
  }
  for (const c of s.castles) {
    if (c.k && Object.values(s.board).some((t) => t.pieces.some((pc) => pc.f === 'castle'))) throw new Error('castellan in pieces');
    const g = G.getGroup(s.board, c.nodes[0][0], c.nodes[0][1]);
    if (!g.complete || g.nodes.length !== 2) throw new Error('castle not a 2-cap city');
  }
  if (s.fairy && s.fairy.f === 'castle' && s.fairy.p !== null) { const c = s.castles[s.fairy.c]; if (!c || c.k !== s.fairy.k) throw new Error('fairy castle'); }
  if (s.dragon && s.board[s.dragon].pieces.length) throw new Error('figure on the dragon tile');
  if (s.phase === 'bazaar' && G.ransomOptions(s).length) throw new Error('ransom during auction');
  if (s.phase === 'castle' && !s.castleAsk.length) throw new Error('castle phase without ask');
}
function randomAction(s) {
  if (s.phase === 'dragon') return { t: 'dragon', key: rnd(G.dragonMoves(s)) };
  if (s.phase === 'castle') { stats.castlePhases++; return { t: 'castle', fi: s.castleAsk[0].fi, build: Math.random() < 0.7 }; }
  if (s.phase === 'bazaar') {
    stats.bazaarPhases++;
    const o = G.bazaarOptions(s);
    if (o.stage === 'pick') return { t: 'bazaar', pick: rnd(o.pick), bid: Math.floor(Math.random() * 4) };
    if (o.stage === 'bid') return Math.random() < 0.5 ? { t: 'bazaar', pass: true } : { t: 'bazaar', bid: o.minBid + Math.floor(Math.random() * 3) };
    if (o.stage === 'decide') return { t: 'bazaar', sell: Math.random() < 0.5 };
    if (o.stage === 'take') return { t: 'bazaar', take: rnd(o.pick) };
  }
  // place
  if (G.canDiscard(s)) { stats.bridgeOnly++; if (Math.random() < 0.3) { stats.discards++; return { t: 'discard' }; } }
  const vp = G.validPlacements(s);
  const pick = rnd(vp);
  const r = rnd(pick.rots);
  let bridge = pick.needsBridge?.[r]?.[0] || null;
  if (!bridge && Math.random() < 0.15) { const sp = G.bridgeSpots(s, pick.x, pick.y, s.drawn, r); if (sp.length) bridge = rnd(sp); }
  const probe = G.cloneState(s);
  G.placeTile(probe, pick.x, pick.y, r, bridge);
  const opts = G.followerOptions(probe);
  let act = opts.length && Math.random() < 0.6 ? { ...rnd(opts) } : null;
  if (act?.kind === 'floor') { const tg = G.captureTargets(probe, act.key, probe.towers[act.key].h + 1); if (tg.length && Math.random() < 0.7) act.capture = rnd(tg); }
  return { t: 'turn', x: pick.x, y: pick.y, r, bridge, act, ...(Math.random() < 0.1 ? { noBonus: true } : {}) };
}
function game(exps, n, opts = {}) {
  const cols = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
  const s = G.newGame(cols.slice(0, n).map((c) => ({ name: c, color: c })), { expansions: exps, ...opts });
  const init = G.cloneState(s);
  const startPieces = countPieces(s), startTiles = countTiles(s);
  const log = [];
  let guard = 0;
  while (s.phase !== 'over' && guard++ < 1500) {
    const before = { host: s.bazaar?.host, part: s.part };
    const a = JSON.parse(JSON.stringify(randomAction(s)));
    const ev = G.applyAction(s, a);
    log.push(a); stats.actions++;
    for (const e of ev) {
      if (e.kind === 'castleBuilt') stats.castlesBuilt++;
      if (e.kind === 'castle') { stats.castleScores++; if (e.from === 'castle') stats.chainScores++; }
      if (e.kind === 'bazaarOpen') stats.bazaars++;
      if (e.kind === 'bazaarSkip') stats.bazaarSkips++;
      if (e.kind === 'bazaarDeal') stats.deals[e.how] = (stats.deals[e.how] || 0) + 1;
      if (e.kind === 'bazaarTurn' && e.replaced) stats.replaced++;
      if (e.kind === 'bonus' && s.bazaar) stats.bazaarTurnBonus++;
      if (e.kind === 'bazaarEnd' && s.part === 2 && s.phase === 'place') stats.hostPart2AfterRound++;
    }
    check(s, startPieces, startTiles, exps, n);
    if (s.players.some((p) => p.score < 0)) stats.negative++;
  }
  if (s.phase !== 'over') throw new Error('game did not end');
  if (Object.values(s.board).some((t) => t.pieces.length) || s.castles.some((c) => c.k)) throw new Error('figures left at the end');
  for (const e of s.finalEvents) { if (e.kind === 'castleEnd') stats.castleEnd++; if (e.kind === 'field' && e.castleCount) stats.fieldCastles++; }
  for (const p of s.players) {
    const sum = Object.values(p.breakdown).reduce((a, b) => a + b, 0);
    if (sum !== p.score) throw new Error('breakdown');
    if (!exps.bridges && p.score < 0) throw new Error('negative without bazaars');
  }
  // lockstep replay
  const rep = G.cloneState(init);
  for (const a of log) G.applyAction(rep, a);
  if (JSON.stringify(rep) !== JSON.stringify(s)) throw new Error('replay differs');
  stats.games++;
}
test('random games: all 128 expansion combinations keep the invariants and replay identically', () => {
  for (let mask = 0; mask < 1 << EXPS.length; mask++) {
    const exps = {}; EXPS.forEach((e, b) => { if (mask & (1 << b)) exps[e] = true; });
    game(exps, 2 + (mask % 3));
  }
  assert.equal(stats.games, 128);
});

test('random games with everything on, 2 to 6 players, and the no-bidding bazaar', () => {
  const all = Object.fromEntries(EXPS.map((e) => [e, true]));
  for (let n = 2; n <= 6; n++) game(all, n);
  for (let g = 0; g < 3; g++) game(all, 2 + g, { bcb: { auction: false } });
  console.log(JSON.stringify(stats));
  assert.ok(stats.castlesBuilt > 0 && stats.bazaars > 0, 'castles and bazaars came up');
});
