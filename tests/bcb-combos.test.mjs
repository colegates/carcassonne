// Bridges, Castles & Bazaars in combination with the six other expansions (MASTER H.5 CI1, CI2):
// seeded random games in every combination of the seven expansions with 2–6 players, the
// invariants of MASTER H.2.11 after every action, an independent recomputation of every castle
// score (BC22–BC25), a JSON round trip of the action log replayed on a fresh engine (lockstep), and
// whole games played by the real computer players (chooseMove, chooseCastle, chooseBazaarAction,
// chooseDragonMove, chooseRansom).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
import { TILE_TYPES } from '../public/js/tiles.js';
import { chooseMove, chooseCastle, chooseBazaarAction, chooseDragonMove, chooseRansom } from '../public/js/ai.js';

const EXPS = ['river', 'abbot', 'inns', 'traders', 'dragon', 'tower', 'bridges'];
const COLS = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const KINDS = ['meeple', 'large', 'abbot', 'builder', 'pig'];
const ALL = Object.fromEntries(EXPS.map((e) => [e, true]));
const expsOf = (mask) => Object.fromEntries(EXPS.filter((_, b) => mask & (1 << b)).map((e) => [e, true]));
const maxPlayers = (exps) => (exps.inns ? 6 : 5); // the 6th colour comes with Inns & Cathedrals

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const json = (x) => JSON.parse(JSON.stringify(x));
const isCap = (f) => f.type === 'city' && f.sides.length === 1 && !f.noCastle;

// ---------- invariants (MASTER H.2.11, plus a few that follow from H.2) ----------
function figureTable(s) { // [player][kind] → figures of that player and kind anywhere
  const t = s.players.map(() => Object.fromEntries(KINDS.map((k) => [k, 0])));
  s.players.forEach((p, i) => { for (const [k, v] of Object.entries(p.supply)) t[i][k] += v; });
  for (const tile of Object.values(s.board)) for (const pc of tile.pieces) t[pc.p][pc.k]++;
  for (const tw of Object.values(s.towers || {})) if (tw.top) t[tw.top.p][tw.top.k]++;
  for (const p of s.players) for (const q of p.prisoners) t[q.p][q.k]++;
  for (const c of s.castles) if (c.k) t[c.owner][c.k]++;
  return JSON.stringify(t);
}
function tileBag(s) {
  const bag = {};
  const add = (t) => { bag[t] = (bag[t] || 0) + 1; };
  for (const tile of Object.values(s.board)) add(tile.t);
  s.discarded.forEach(add); s.setAside.forEach(add); s.deck.forEach(add);
  if (s.drawn) add(s.drawn);
  if (s.bazaar) for (const x of s.bazaar.tiles) if (!x.played) add(x.t);
  return JSON.stringify(Object.keys(bag).sort().map((k) => [k, bag[k]]));
}
const tileCount = (s) => Object.keys(s.board).length + s.discarded.length + s.setAside.length + s.deck.length
  + (s.drawn ? 1 : 0) + (s.bazaar ? s.bazaar.tiles.filter((x) => !x.played).length : 0);

function checkInvariants(s, ctx, events = [], pre = null) {
  const fail = (m) => { throw new Error(`${ctx.tag}, action ${ctx.step}: ${m}`); };
  const n = s.players.length;
  if (figureTable(s) !== ctx.figs) fail('figures not conserved (supply + tiles + tower tops + prisoners + castellans, per player and kind)');
  if (ctx.full || ctx.bagCheck) { if (tileBag(s) !== ctx.bag) fail('tiles not conserved (board + discarded + set aside + pile + drawn + unplayed bazaar tiles)'); }
  else if (tileCount(s) !== ctx.total) fail('tile count not conserved');
  // bridges
  let bridges = 0;
  for (const [k, t] of Object.entries(s.board)) {
    if (t.bridge === undefined || t.bridge === null) continue;
    if (t.bridge !== 0 && t.bridge !== 1) fail(`bridge axis ${t.bridge} at ${k}`);
    bridges++;
    for (const sd of t.bridge === 0 ? [0, 2] : [1, 3]) {
      const et = G.edgeType({ t: t.t, r: t.r }, sd);
      if (et !== 'field') fail(`a bridge end on a printed ${et} edge at ${k}`);
    }
  }
  const bOn = G.bcbOn(s, 'bridges');
  const used = s.players.reduce((a, p) => a + ((bOn ? G.BRIDGES(n) : 0) - p.bridges), 0);
  if (used !== bridges) fail(`bridges used ${used}, on the board ${bridges}`);
  for (const k of ctx.full ? Object.keys(s.board) : ctx.touched) {
    const t = s.board[k];
    const [x, y] = G.parseKey(k);
    for (let sd = 0; sd < 4; sd++) {
      const nb = G.neighbour(s.board, x, y, sd);
      if (nb && G.edgeType(t, sd) !== G.edgeType(nb, (sd + 2) % 4)) fail(`edges do not match at ${k} side ${sd}`);
    }
  }
  // castles
  const cOn = G.bcbOn(s, 'castles');
  const built = new Array(n).fill(0);
  for (const c of s.castles) {
    built[c.owner]++;
    if (c.nodes.length !== 2 || c.tiles.length !== 2) fail(`castle ${c.id} has ${c.nodes.length} caps on ${c.tiles.length} tiles`);
    for (const [k, fi] of c.nodes) {
      if (!isCap(G.featuresOf(s.board[k])[fi])) fail(`castle ${c.id}: ${k}#${fi} is not a one-edge castle cap`);
      if (!c.tiles.includes(k)) fail(`castle ${c.id}: cap on a tile that is not its own`);
      if (s.board[k].pieces.some((pc) => pc.f === fi)) fail(`a figure stands on castle ${c.id} (castellan in tile.pieces?)`);
    }
    const g = G.getGroup(s.board, c.nodes[0][0], c.nodes[0][1]);
    if (!g.complete || g.nodes.length !== 2 || g.tiles.size !== 2) fail(`castle ${c.id} is not a complete two-cap city`);
    if (JSON.stringify(c.area) !== JSON.stringify(G.castleArea(c.tiles))) fail(`castle ${c.id} area`);
    if (c.k !== null && c.k !== 'meeple' && c.k !== 'large') fail(`castle ${c.id} castellan kind ${c.k}`);
    if (!c.tiles.includes(c.key)) fail(`castle ${c.id} castellan key ${c.key}`);
  }
  if (!cOn && s.castles.length) fail('a castle with castles switched off');
  s.players.forEach((p, i) => { if (p.castles + built[i] !== (cOn ? G.BRIDGES(n) : 0)) fail(`castle tokens of player ${i}`); });
  for (const e of events) {
    if (e.kind === 'city' && s.castles.some((c) => e.nodes.some(([k, fi]) => c.nodes.some(([a, b]) => a === k && b === fi)))) fail('a castle\'s city produced a scoring event');
  }
  const fy = s.fairy;
  if (fy?.f === 'castle') {
    const c = s.castles[fy.c];
    if (!c || c.k !== fy.k || c.owner !== fy.p) fail('fairy.f === "castle" but that castellan is not there');
  } else if (fy && fy.p !== null && fy.p !== undefined && fy.f !== 'top' && !s.board[fy.key]?.pieces.some((pc) => pc.p === fy.p && pc.f === fy.f && pc.k === fy.k)) {
    fail('the fairy is assigned to a follower that is not there');
  }
  // scores
  s.players.forEach((p, i) => {
    const sum = Object.values(p.breakdown).reduce((a, b) => a + b, 0);
    if (sum !== p.score) fail(`player ${i}: breakdown sums to ${sum}, score ${p.score}`);
    if (!Number.isInteger(p.score)) fail(`player ${i}: score ${p.score}`);
    if (p.score < 0 && !G.bcbOn(s, 'bazaars')) fail(`player ${i}: negative score ${p.score} without bazaars`);
  });
  // phases
  if (!G.bcbOn(s, 'bazaars') && s.bazaar) fail('a bazaar with bazaars switched off');
  if (s.phase === 'bazaar') {
    const bz = s.bazaar;
    if (!bz) fail('phase bazaar without a bazaar');
    const seat = G.actingSeat(s);
    if (!Number.isInteger(seat) || seat < 0 || seat >= n) fail(`acting seat ${seat} in the bazaar`);
    if (G.bazaarOptions(s).seat !== seat) fail('bazaarOptions().seat differs from actingSeat()');
    for (let p = 0; p < n; p++) if (G.ransomOptions(s, p).length) fail('a ransom is offered during the auction');
    const has = (p) => bz.tiles.some((x) => x.owner === p);
    if (bz.stage === 'pick' && has(seat)) fail('the chooser already has a tile');
    if (bz.stage === 'bid' && (has(seat) || seat === bz.chooser)) fail('a bidder with a tile, or the chooser bids');
    if (bz.stage === 'decide' && (bz.high.p === bz.chooser || has(bz.chooser))) fail('decide stage without a rival bid');
    if (bz.stage === 'take' && seat !== s.current) fail('a tile taken out of turn');
    if (bz.stage === 'round') fail('phase bazaar in stage round');
    if (bz.stage !== 'take') {
      const free = s.players.filter((_, p) => !has(p)).length;
      if (bz.tiles.filter((x) => x.owner === null).length !== free) fail('unowned tiles != seats without a tile');
      if (free < 2) fail('an auction with fewer than two seats without a tile');
    }
  }
  if (s.bazaar) {
    const owners = s.bazaar.tiles.map((x) => x.owner).filter((o) => o !== null);
    if (new Set(owners).size !== owners.length) fail('a seat owns two bazaar tiles');
    if (s.bazaar.tiles.length !== n) fail('a bazaar does not reveal one tile per player');
  }
  if (s.phase === 'castle') {
    if (!s.castleAsk.length) fail('phase castle with an empty castleAsk');
    if (s.players[s.castleAsk[0].p].castles < 1) fail('a castle decision for an owner without castle tokens');
    if (G.castleOptions(s).seat !== G.actingSeat(s)) fail('castleOptions().seat differs from actingSeat()');
  } else if (s.castleAsk.length) fail('castleAsk left over outside phase castle');
  if (['place', 'bazaar', 'over'].includes(s.phase) && s.bazaarDue) fail('bazaarDue left over');
  if (s.dragon && s.board[s.dragon].pieces.length) fail('a figure on the dragon\'s tile');
  if (s.phase === 'place' && !s.drawn) fail('phase place without a tile');
  if (s.phase === 'over') {
    if (s.bazaar) fail('the game ended inside a bazaar');
    if (Object.values(s.board).some((t) => t.pieces.length) || s.castles.some((c) => c.k)) fail('figures left on the board at the end');
  }
  if (pre) castleOracle(s, events, pre, fail);
}

// Independent recomputation of the castle scores of one action (BC22–BC25): castles waiting
// before the action (built in an earlier placement, castellan present) score the best value of a
// completed road/city with a tile in their area or a monastery/garden on an area tile, and pass it
// on to every waiting castle whose area holds one of their tiles.
function castleOracle(s, events, pre, fail) {
  const got = events.filter((e) => e.kind === 'castle');
  const feats = events.filter((e) => ['road', 'city', 'monastery', 'garden'].includes(e.kind));
  if (!got.length && !feats.length) return;
  const now = s.board[s.last].n;
  const waiting = pre.castles.filter((c) => c.k && c.born < now);
  const val = new Map();
  for (const c of waiting) for (const f of feats) {
    if (f.nodes.some(([k]) => c.area.includes(k))) val.set(c.id, Math.max(val.get(c.id) ?? -1, f.points));
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const c of waiting) for (const d of waiting) {
      if (c === d || !val.has(d.id) || !c.area.some((a) => d.tiles.includes(a))) continue;
      if ((val.get(c.id) ?? -1) < val.get(d.id)) { val.set(c.id, val.get(d.id)); changed = true; }
    }
  }
  const want = [...val].sort((a, b) => a[0] - b[0]).map(([id, v]) => `${id}:${v}`).join(' ');
  const have = got.map((e) => [e.castle, e.points]).sort((a, b) => a[0] - b[0]).map(([id, v]) => `${id}:${v}`).join(' ');
  if (want !== have) fail(`castle scores [${have}], expected [${want}]`);
  for (const e of got) {
    if (s.castles[e.castle].k !== null) fail(`castle ${e.castle} scored but kept its castellan`);
    if (JSON.stringify(e.winners) !== JSON.stringify([s.castles[e.castle].owner])) fail(`castle ${e.castle} paid the wrong player`);
  }
}

// ---------- the random driver ----------
// One random legal decision, made on s the way the controller makes it (a tile is placed, then a
// follower option is chosen from followerOptions on the real state). Returns { a, ev, needed }.
function makeDriver(rnd, o = {}) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const apply = (a) => ({ a, ev: G.applyAction(s0.s, json(a)) });
  const s0 = {};
  return (s) => {
    s0.s = s;
    if (s.phase === 'dragon') return apply({ t: 'dragon', key: pick(G.dragonMoves(s)) });
    if (s.phase === 'castle') return apply({ t: 'castle', fi: G.castleOptions(s).fi, build: rnd() < (o.build ?? 0.7) });
    if (s.phase === 'bazaar') {
      const bo = G.bazaarOptions(s);
      if (bo.stage === 'pick') { const r = rnd(); return apply({ t: 'bazaar', pick: pick(bo.pick), bid: r < 0.05 ? 99 : r < 0.15 ? Math.floor(rnd() * 20) : Math.floor(rnd() * 4) }); }
      if (bo.stage === 'bid') return apply(rnd() < 0.5 || bo.minBid > 99 ? { t: 'bazaar', pass: true } : { t: 'bazaar', bid: Math.min(99, bo.minBid + Math.floor(rnd() * 3)) });
      if (bo.stage === 'decide') return apply({ t: 'bazaar', sell: rnd() < 0.5 });
      return apply({ t: 'bazaar', take: pick(bo.pick) });
    }
    const ro = G.ransomOptions(s);
    if (ro.length && rnd() < 0.3) { const r = pick(ro); return apply({ t: 'ransom', from: r.from, k: r.k }); }
    if (G.canDiscard(s) && rnd() < (o.discard ?? 0.4)) return apply({ t: 'discard' });
    const vp = G.validPlacements(s);
    if (!vp.length) throw new Error('the drawn tile has no legal placement');
    let pl = pick(vp);
    let r = pick(pl.rots);
    if (o.close && rnd() < o.close) {
      // coverage bias: prefer spots whose open sides show roads and cities (bridge-only tiles get likelier)
      let best = -Infinity;
      for (const q of vp) for (const rr of q.rots) {
        if (q.needsBridge?.[rr]) continue;
        let v = rnd() * 0.5;
        for (let sd = 0; sd < 4; sd++) {
          if (G.neighbour(s.board, q.x, q.y, sd)) continue;
          const et = G.edgeType({ t: s.drawn, r: rr }, sd);
          v += et === 'field' ? -1 : et === 'river' ? 0 : 1;
        }
        if (v > best) { best = v; pl = q; r = rr; }
      }
    }
    let bridge = pl.needsBridge?.[r]?.[0] || null;
    const needed = !!bridge;
    if (!bridge && rnd() < (o.optBridge ?? 0.15)) { const sp = G.bridgeSpots(s, pl.x, pl.y, s.drawn, r); if (sp.length) bridge = pick(sp); }
    const a = { t: 'turn', x: pl.x, y: pl.y, r, bridge, act: null, ...(rnd() < 0.1 ? { noBonus: true } : {}) };
    G.placeTile(s, pl.x, pl.y, r, bridge);
    const fo = G.followerOptions(s);
    if (fo.length && rnd() < 0.65) {
      const caps = fo.filter((f) => f.kind === 'follower' && f.key === s.last && isCap(G.featuresOf(s.board[f.key])[f.fi]));
      a.act = { ...(caps.length && rnd() < 0.5 ? pick(caps) : pick(fo)) };
      if (a.act.kind === 'floor') { const tg = G.captureTargets(s, a.act.key, s.towers[a.act.key].h + 1); if (tg.length && rnd() < 0.7) a.act.capture = pick(tg); }
    }
    const ev = G.finishTurn(s, a.act ? json(a.act) : null, !!a.noBonus);
    s.seq++;
    return { a, ev, needed };
  };
}

// Test harness only (logged and repeated in the replay): swap the drawn tile for one further down
// the pile that fits only with a bridge, since such tiles are rare in random play.
function rigSwap(s, i) { const t = s.deck[i]; s.deck[i] = s.drawn; s.drawn = t; }
function findRig(s) {
  if (s.phase !== 'place' || !G.bcbOn(s, 'bridges') || !(s.players[s.current].bridges > 0) || s.river?.open) return -1;
  const seen = new Set([s.drawn]);
  for (let i = s.deck.length - 1; i >= Math.max(0, s.deck.length - 30); i--) {
    const t = s.deck[i];
    if (seen.has(t)) continue;
    seen.add(t);
    if (TILE_TYPES[t].exp === 'river' || (TILE_TYPES[t].tags.includes('dragon') && !s.dragon && G.hasExp(s, 'dragon'))) continue;
    if (!G.hasPlainPlacement(s, t) && G.validPlacements(s, t).length) return i;
  }
  return -1;
}

function newCoverage() { return {}; }
function noteCoverage(cov, s, a, ev, pre, needed) {
  const bump = (k) => { cov[k] = (cov[k] || 0) + 1; };
  bump(`action.${a.t}`);
  if (pre.canDiscard) bump('bridgeOnlyTile');
  if (a.t === 'turn' && a.bridge) {
    const k = G.key(a.x, a.y);
    bump(`bridge.${needed ? 'needed' : 'optional'}.${a.bridge.key === k ? 'newTile' : 'neighbour'}`);
    if (a.act?.kind === 'follower' && a.act.key === k && a.act.fi === G.bridgeFeature(s.board[k])) bump('bridge.figureOnIt');
    if (pre.river) bump('bridge.riverPhase');
    if (pre.bazaar) bump('bridge.inBazaarTurn');
  }
  if (a.t === 'castle') {
    bump(a.build ? 'castle.build' : 'castle.takePoints');
    if (pre.acting !== pre.current) bump('castle.decidedByNonActiveOwner');
    if (pre.bazaar) bump('castle.decidedInBazaarTurn');
    if (pre.asks > 1) bump('castle.twoDecisionsOnePlacement');
  }
  if (a.t === 'discard') {
    bump('discard');
    if (pre.part === 2) bump('discard.part2');
    if (pre.bazaar) bump('discard.inBazaarTurn');
    if (pre.deck === 0) bump('discard.emptyPile');
  }
  if (s.discarded.length > pre.discarded + (a.t === 'discard' ? 1 : 0)) bump('unplaceableRemoved');
  if (a.t === 'ransom' && pre.bazaar) bump('ransom.inBazaarTurn');
  if (a.t === 'bazaar') bump(`auction.${pre.stage}.${a.pass ? 'pass' : a.sell === true ? 'sell' : a.sell === false ? 'buy' : a.take !== undefined ? 'take' : 'bid'}`);
  for (const e of ev) {
    if (['castleBuilt', 'castle', 'bazaarOpen', 'bazaarSkip', 'bazaarRound', 'bazaarEnd', 'dragon', 'capture', 'princess', 'recall', 'goods'].includes(e.kind)) bump(`event.${e.kind}`);
    if (e.kind === 'castle') { bump(`castleScoredBy.${e.from}`); if (pre.bazaar || s.bazaar) bump('castle.scoredInBazaarRound'); }
    if (e.kind === 'bazaarDeal') bump(`deal.${e.how}`);
    if (e.kind === 'bazaarTurn' && e.replaced) bump('bazaar.boughtTileReplaced');
    if (e.kind === 'bonus' && s.bazaar) bump('bazaar.builderPart2InRound');
    if (e.kind === 'dragon' && (pre.bazaar || s.bazaar)) bump('bazaar.dragonFliesInRound');
    if (e.kind === 'bazaarOpen' && pre.part === 2) bump('bazaar.afterPart2');
    if (e.kind === 'bazaarEnd' && s.part === 2 && s.phase === 'place') bump('bazaar.hostPart2AfterRound');
    if (e.kind === 'fairy' && e.points === 3 && ev.some((x) => x.kind === 'castle')) bump('fairy.plus3ForCastle');
  }
  if (s.fairy?.f === 'castle') bump('fairy.byCastellan');
  if (s.players.some((p) => p.score < 0)) bump('negativeScore');
}

// A seeded random game: invariants after every action, the castle oracle, and a lockstep replay of
// the JSON action log (with checkpoints) on the given engine (a fresh module instance by default).
function playRandom(engine, exps, n, seed, { bcb, drv = {}, rig = 0, cov = newCoverage(), kindSwitch = 0, snapshots = 0.03 } = {}) {
  const rnd = mulberry(seed);
  const s = G.newGame(COLS.slice(0, n).map((c) => ({ name: c, color: c })), { expansions: exps, ...(bcb ? { bcb } : {}) }, rnd);
  const initWire = JSON.stringify(s);
  const ctx = { tag: `seed ${seed}, ${n} players, ${Object.keys(exps).join('+') || 'base'}${bcb ? ` bcb ${JSON.stringify(bcb)}` : ''}`, step: 0, figs: figureTable(s), bag: tileBag(s), total: tileCount(s), touched: [], full: true };
  checkInvariants(s, ctx);
  ctx.full = false;
  const drive = makeDriver(rnd, drv);
  const log = [];
  const checkpoints = [];
  while (s.phase !== 'over') {
    ctx.step = log.length;
    if (log.length > 3000) throw new Error(`${ctx.tag}: the game did not end`);
    if (rig && rnd() < rig) { const i = findRig(s); if (i >= 0) { rigSwap(s, i); log.push({ t: '__rig', i }); cov.rig = (cov.rig || 0) + 1; } }
    if (kindSwitch && rnd() < kindSwitch) {
      // a phone lets a bot play a seat (or takes it back): a lockstep action like any other
      const seat = Math.floor(rnd() * n);
      const a = { t: 'kind', seat, kind: s.players[seat].kind === 'ai' ? 'human' : 'ai', level: 'medium' };
      G.applyAction(s, json(a)); log.push(a);
    }
    const pre = { castles: s.castles.map((c) => ({ ...c })), acting: G.actingSeat(s), current: s.current, bazaar: !!s.bazaar, stage: s.bazaar?.stage, part: s.part, discarded: s.discarded.length, asks: s.castleAsk.length, river: !!s.river?.open, canDiscard: G.canDiscard(s), deck: s.deck.length };
    let step;
    try { step = drive(s); } catch (e) { throw new Error(`${ctx.tag}, action ${log.length}: ${e.message}`); }
    const { a, ev, needed } = step;
    log.push(a);
    ctx.touched = a.t === 'turn' ? [G.key(a.x, a.y), ...(a.bridge ? [a.bridge.key] : [])] : [];
    ctx.bagCheck = log.length % 8 === 0 || ['discard', 'bazaar', 'turn'].includes(a.t) && ev.some((e) => /^bazaar|discard/.test(e.kind));
    noteCoverage(cov, s, a, ev, pre, needed);
    checkInvariants(s, ctx, ev, pre);
    if (snapshots >= 1 || rnd() < snapshots) checkpoints.push([log.length, JSON.stringify(s)]);
  }
  ctx.full = true;
  checkInvariants(s, ctx, s.finalEvents);
  for (const e of s.finalEvents) {
    if (e.kind === 'castleEnd') { cov['final.castleEnd'] = (cov['final.castleEnd'] || 0) + 1; assert.equal(e.points, 0); }
    if (e.kind === 'field' && e.castleCount) cov['final.fieldWithCastle'] = (cov['final.fieldWithCastle'] || 0) + 1;
  }
  // lockstep: the room stores the start state and the actions as JSON; another phone replays them
  const room = JSON.parse(JSON.stringify({ init: JSON.parse(initWire), actions: log }));
  const rep = room.init;
  let c = 0;
  room.actions.forEach((a, i) => {
    if (a.t === '__rig') rigSwap(rep, a.i); else engine.applyAction(rep, a);
    for (; c < checkpoints.length && checkpoints[c][0] === i + 1; c++) {
      if (JSON.stringify(rep) !== checkpoints[c][1]) throw new Error(`${ctx.tag}: the replay differs after action ${i + 1}`);
    }
  });
  if (JSON.stringify(rep) !== JSON.stringify(s)) throw new Error(`${ctx.tag}: the replay differs at the end`);
  cov.games = (cov.games || 0) + 1;
  cov.actions = (cov.actions || 0) + log.length;
  return { s, log, cov };
}

// another phone: a separate instance of the engine module (its own caches)
const fresh = await import('../public/js/game.js?another-phone');

test('CI1: random games in all 128 combinations of the seven expansions (2 to 6 players) keep every H.2.11 invariant, score castles as BC22-BC25 say, and replay identically', () => {
  const cov = newCoverage();
  const players = {};
  for (let mask = 0; mask < 128; mask++) {
    const exps = expsOf(mask);
    const n = 2 + ((mask * 7 + 1) % (maxPlayers(exps) - 1));
    players[n] = (players[n] || 0) + 1;
    playRandom(fresh, exps, n, 1000 + mask, { cov, rig: exps.bridges ? 0.05 : 0 });
  }
  console.log('CI1 128 combinations:', JSON.stringify(players), JSON.stringify(Object.fromEntries(Object.entries(cov).sort())));
  assert.equal(cov.games, 128);
  assert.deepEqual(Object.keys(players).map(Number), [2, 3, 4, 5, 6]);
  // the driver really exercises castles, auctions and bridges (fixed seeds: these are deterministic)
  for (const k of ['castle.build', 'castle.takePoints', 'castle.decidedByNonActiveOwner', 'castle.decidedInBazaarTurn', 'event.castle',
    'castleScoredBy.road', 'castleScoredBy.city', 'auction.pick.bid', 'auction.bid.bid', 'auction.bid.pass', 'auction.decide.buy',
    'auction.decide.sell', 'deal.bank', 'deal.free', 'event.bazaarSkip', 'bridge.needed.newTile', 'bridge.needed.neighbour',
    'bridge.optional.newTile', 'bridge.optional.neighbour', 'bridge.figureOnIt', 'bridge.riverPhase', 'bridge.inBazaarTurn',
    'ransom.inBazaarTurn', 'bazaar.dragonFliesInRound', 'negativeScore', 'final.castleEnd', 'final.fieldWithCastle', 'fairy.byCastellan']) {
    assert.ok(cov[k] > 0, `the random games never hit ${k}`);
  }
});

test('CI1: everything on with 2 to 6 players, the no-bidding variant, and each part of the expansion switched off', () => {
  const cov = newCoverage();
  for (let n = 2; n <= 6; n++) playRandom(fresh, ALL, n, 2000 + n, { cov, rig: 0.05 });
  const variant = newCoverage();
  for (let n = 2; n <= 6; n++) playRandom(fresh, ALL, n, 2100 + n, { cov: variant, bcb: { auction: false } });
  assert.ok(variant['auction.take.take'] > 0 && !variant['auction.pick.bid'], 'the no-bidding variant takes tiles and never bids');
  const parts = [{ bridges: false }, { castles: false }, { bazaars: false }, { bridges: false, castles: false }, { castles: false, bazaars: false },
    { bridges: false, bazaars: false }, { bridges: false, castles: false, bazaars: false }, { bazaars: false, auction: false }];
  parts.forEach((bcb, i) => {
    const pc = newCoverage();
    const { s } = playRandom(fresh, ALL, 2 + (i % 5), 2200 + i, { cov: pc, bcb, rig: 0.05 });
    if (bcb.bridges === false) assert.ok(!pc['action.turn'] || !Object.keys(pc).some((k) => k.startsWith('bridge.')), 'no bridges with bridges off');
    if (bcb.castles === false) assert.ok(!pc['action.castle'] && !s.castles.length, 'no castles with castles off');
    if (bcb.bazaars === false) assert.ok(!pc['event.bazaarOpen'], 'no bazaars with bazaars off');
    if (bcb.bridges !== false) assert.ok(Object.keys(pc).some((k) => k.startsWith('bridge.')), `bridges came up with ${JSON.stringify(bcb)}`);
  });
  console.log('CI1 everything on:', JSON.stringify(Object.fromEntries(Object.entries(cov).sort())));
  for (const k of ['castle.build', 'event.castle', 'deal.buy', 'deal.sell', 'deal.bank', 'deal.free', 'bridge.needed.newTile']) assert.ok(cov[k] > 0, `never hit ${k}`);
});

test('CI1: tiles that fit only with a bridge are thrown away and play goes on (normal turns and bazaar turns), invariants kept', () => {
  const cov = newCoverage();
  for (let g = 0; g < 16; g++) {
    const exps = g % 2 ? ALL : { bridges: true, traders: true, ...(g % 4 === 2 ? { dragon: true } : {}) };
    playRandom(fresh, exps, 2 + (g % 5), 3000 + g, { cov, rig: 0.08, drv: { close: 0.9, discard: 0.6 } });
  }
  console.log('CI1 bridge-only tiles:', JSON.stringify({ bridgeOnly: cov.bridgeOnlyTile, discard: cov.discard, part2: cov['discard.part2'], bazaarTurn: cov['discard.inBazaarTurn'], emptyPile: cov['discard.emptyPile'], removed: cov.unplaceableRemoved }));
  assert.ok(cov.discard >= 10, `only ${cov.discard || 0} discards`);
  assert.ok(cov['discard.inBazaarTurn'] > 0, 'a bought tile was thrown away in a bazaar turn');
});

// A hand-built board for the rare discard situations: around D, W and X every open square faces a
// road or a city, so a tile without roads or cities (B) fits only with a bridge.
function handBoard(n, exps, board, drawn, deck) {
  const s = G.newGame(COLS.slice(0, n).map((c) => ({ name: c, color: c })), { expansions: exps }, () => 0.5);
  s.board = {};
  board.forEach(([k, t, r], i) => { s.board[k] = { t, r, pieces: [], n: i }; });
  s.placed = board.length; s.drawn = drawn; s.phase = 'place'; s.current = 0; s.setAside = []; s.deck = deck.slice();
  return s;
}
const CLOSED = [['0,0', 'D', 0], ['0,1', 'W', 0], ['1,0', 'X', 0]];

test('CI1: a bridge-only tile thrown away in builder part 2 keeps part 2; with an empty pile it ends the game, but inside a bazaar round it only ends that turn (BC9, BC40, BC46)', () => {
  // part 2: X extends the builder's road, the bonus draw is B (bridge-only), thrown away, U drawn for part 2
  const s = handBoard(2, { bridges: true, traders: true }, CLOSED.slice(0, 2), 'X', ['U', 'B']);
  s.board['0,0'].pieces.push({ p: 0, f: 1, k: 'meeple' }, { p: 0, f: 1, k: 'builder' });
  s.players[0].supply.meeple--; s.players[0].supply.builder--;
  G.applyAction(s, { t: 'turn', x: 1, y: 0, r: 0, act: null });
  assert.deepEqual([s.part, s.current, s.drawn, G.canDiscard(s)], [2, 0, 'B', true]);
  G.applyAction(s, { t: 'discard' });
  assert.deepEqual([s.part, s.current, s.drawn, s.phase, s.discarded], [2, 0, 'U', 'place', ['B']]);
  // empty pile outside a bazaar: game over
  const e = handBoard(2, { bridges: true }, CLOSED, 'B', []);
  G.applyAction(e, { t: 'discard' });
  assert.equal(e.phase, 'over');
  // empty pile inside a bazaar round: the next bazaar turn, the game ends after the round
  const b = handBoard(2, { bridges: true }, CLOSED, 'BB/Cccc.b', ['B', 'B']);
  G.applyAction(b, { t: 'turn', x: 0, y: -1, r: 0, act: null });
  G.applyAction(b, { t: 'bazaar', pick: 0, bid: 0 });
  G.applyAction(b, { t: 'bazaar', pass: true });
  assert.deepEqual([b.current, b.drawn, G.canDiscard(b), b.deck.length], [1, 'B', true, 0]);
  G.applyAction(b, { t: 'discard' });
  assert.deepEqual([b.phase, b.current, b.drawn, !!b.bazaar], ['place', 0, 'B', true], 'the host still plays his bought tile');
  G.applyAction(b, { t: 'discard' });
  assert.equal(b.phase, 'over');
  assert.equal(b.bazaar, null);
});

test('CI2: the room\'s JSON action log replays on a fresh engine to an identical state after every action (bridges, discards, castles, auctions, seat switches)', () => {
  const kinds = new Set();
  const cov = newCoverage();
  for (const [seed, n, bcb, close] of [[4001, 4, undefined, 0], [4002, 3, undefined, 0.9], [4003, 5, { auction: false }, 0], [4004, 6, undefined, 0.9]]) {
    // every intermediate state is compared (snapshots: 1), on a second instance of the engine
    const { log } = playRandom(fresh, ALL, n, seed, { cov, bcb, rig: 0.08, kindSwitch: 0.01, snapshots: 1, drv: { close, discard: 0.8 } });
    for (const a of log) {
      if (a.t === 'turn') kinds.add(a.bridge ? 'turn with a bridge' : 'turn');
      else if (a.t === 'castle') kinds.add(`castle build=${a.build}`);
      else if (a.t === 'bazaar') kinds.add(`bazaar ${a.pass ? 'pass' : a.sell !== undefined ? (a.sell ? 'sell' : 'buy') : a.take !== undefined ? 'take' : a.pick !== undefined ? 'pick' : 'raise'}`);
      else kinds.add(a.t);
    }
  }
  console.log('CI2 action kinds replayed:', [...kinds].sort().join(', '));
  for (const k of ['turn', 'turn with a bridge', 'castle build=true', 'castle build=false', 'discard', 'dragon', 'ransom', 'kind',
    'bazaar pick', 'bazaar raise', 'bazaar pass', 'bazaar buy', 'bazaar sell', 'bazaar take']) {
    assert.ok(kinds.has(k), `the replayed logs contain "${k}"`);
  }
});

// ---------- the real computer players ----------
// Games driven exactly like controller.js drives bots (aiTurn, dragonPhase, castlePhase,
// bazaarPhase). Piles are trimmed to keep this quick, with bazaar tiles and city caps on top so
// that auctions and castle decisions come up; full-length games are timed separately.
function aiGame(exps, levels, seed, { trim = 0, bcb, times, rig = 0, prepare } = {}) {
  const rnd = mulberry(seed);
  const s = G.newGame(levels.map((l, i) => ({ name: `${l}${i}`, color: COLS[i], kind: 'ai', level: l })), { expansions: exps, ...(bcb ? { bcb } : {}) }, rnd);
  if (trim) {
    const land = s.deck.filter((t) => TILE_TYPES[t].exp !== 'river');
    const river = s.deck.slice(land.length); // the lake, then the river tiles (drawn first)
    const early = (t) => TILE_TYPES[t].tags.includes('bazaar') || ['E', 'H', 'I', 'BB/CCCR'].includes(t);
    const top = land.filter(early), rest = land.filter((t) => !early(t));
    s.deck = [...rest.slice(-Math.max(0, trim - top.length)), ...top.slice(-trim), ...river];
    s.deckSize = s.deck.length;
  }
  prepare?.(s);
  const init = JSON.stringify(s);
  const ctx = { tag: `AI seed ${seed}, ${levels.join('/')}, ${Object.keys(exps).join('+')}`, step: 0, figs: figureTable(s), bag: tileBag(s), total: tileCount(s), touched: [], full: false, bagCheck: true };
  const log = [];
  const used = new Set();
  const timed = (fn, f) => { const t0 = performance.now(); const r = f(); (times[fn] ||= []).push(performance.now() - t0); return r; };
  const apply = (a) => {
    const pre = { castles: s.castles.map((c) => ({ ...c })) };
    const ev = G.applyAction(s, json(a));
    log.push(a);
    ctx.step = log.length;
    ctx.touched = a.t === 'turn' ? [G.key(a.x, a.y), ...(a.bridge ? [a.bridge.key] : [])] : [];
    checkInvariants(s, ctx, ev, pre);
  };
  while (s.phase !== 'over') {
    if (log.length > 2000) throw new Error(`${ctx.tag}: the game did not end`);
    if (rig && rnd() < rig) { const i = findRig(s); if (i >= 0) { rigSwap(s, i); log.push({ t: '__rig', i }); } }
    const lvl = s.players[G.actingSeat(s)].level;
    if (s.phase === 'dragon') { apply({ t: 'dragon', key: timed('chooseDragonMove', () => chooseDragonMove(s, lvl, rnd)) }); continue; }
    if (s.phase === 'castle') { const a = timed('chooseCastle', () => chooseCastle(s, lvl, rnd)); used.add('castle'); apply(a); continue; }
    if (s.phase === 'bazaar') { const st = s.bazaar.stage; const a = timed('chooseBazaarAction', () => chooseBazaarAction(s, lvl, rnd)); used.add(`bazaar ${st}`); apply(a); continue; }
    assert.equal(s.phase, 'place', `${ctx.tag}: unexpected phase ${s.phase}`);
    const ro = timed('chooseRansom', () => chooseRansom(s, lvl));
    if (ro) { used.add('ransom'); apply({ t: 'ransom', from: ro.from, k: ro.k }); }
    const mv = timed('chooseMove', () => chooseMove(s, lvl, rnd));
    if (G.canDiscard(s)) used.add(`bridge-only tile → ${mv.discard ? 'discard' : 'bridge'}`);
    if (mv.discard) { used.add('discard'); apply({ t: 'discard' }); continue; }
    if (mv.bridge) used.add('bridge');
    apply({ t: 'turn', x: mv.x, y: mv.y, r: mv.r, ...(mv.bridge ? { bridge: mv.bridge } : {}), act: mv.act || null });
  }
  ctx.full = true;
  checkInvariants(s, ctx, s.finalEvents);
  const rep = JSON.parse(init);
  for (const a of JSON.parse(JSON.stringify(log))) { if (a.t === '__rig') rigSwap(rep, a.i); else fresh.applyAction(rep, a); }
  assert.equal(JSON.stringify(rep), JSON.stringify(s), `${ctx.tag}: the replay differs`);
  return { s, used };
}

test('AI: the computer players finish games in many combinations with 2 to 6 players, without exceptions', () => {
  const LV = ['easy', 'medium', 'hard'];
  const times = {};
  const used = new Set();
  const seen = [];
  let g = 0;
  for (let mask = 64; mask < 128; mask += 4) { // every combination with Bridges, Castles & Bazaars, in steps
    const exps = expsOf(mask);
    const n = 2 + (g % (maxPlayers(exps) - 1));
    const levels = Array.from({ length: n }, (_, i) => LV[(g + i) % 3]);
    const { s, used: u } = aiGame(exps, levels, 5000 + mask, { trim: 26, times, rig: 0.15, bcb: g % 5 === 4 ? { auction: false } : undefined });
    assert.equal(s.phase, 'over');
    u.forEach((k) => used.add(k));
    seen.push(n);
    g++;
  }
  const worst = Object.fromEntries(Object.entries(times).map(([k, v]) => [k, `${v.length} calls, avg ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} ms, max ${Math.max(...v).toFixed(0)} ms`]));
  console.log('AI games:', seen.join(','), [...used].sort().join(', '), JSON.stringify(worst));
  assert.deepEqual([...new Set(seen)].sort(), [2, 3, 4, 5, 6]);
  // every level also starts once from a closed board, where its first tiles fit only with a bridge
  for (const [i, lvl] of ['easy', 'medium', 'hard'].entries()) {
    const { s, used: u } = aiGame({ bridges: true, traders: true, ...(i === 2 ? { ...ALL, river: false } : {}) }, [lvl, LV[(i + 1) % 3], lvl], 5200 + i, {
      trim: 20, times, prepare: (st) => {
        st.board = Object.fromEntries(CLOSED.map(([k, t, r], j) => [k, { t, r, pieces: [], n: j }]));
        st.placed = 3; st.river = undefined; st.deck.push('BB/F.b'); st.drawn = 'B'; st.current = 0;
      },
    });
    assert.equal(s.phase, 'over');
    u.forEach((k) => used.add(k));
  }
  console.log('AI decisions seen:', [...used].sort().join(', '));
  for (const k of ['castle', 'bazaar pick', 'bazaar bid', 'bazaar decide', 'bazaar take', 'bridge']) assert.ok(used.has(k), `the bots never had to decide: ${k}`);
  assert.ok([...used].some((k) => k.startsWith('bridge-only tile')), 'the bots met a tile that fits only with a bridge');
  // generous: only pathological slowness fails here (the 1.5 s budget is measured on full games)
  assert.ok(Math.max(...Object.values(times).flat()) < 10000);
});
