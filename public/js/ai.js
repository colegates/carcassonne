// Computer opponents. They look at every legal placement & follower choice,
// simulate the immediate scoring and estimate the long-term value.
import { hasTag, SIDE_DELTA } from './tiles.js';
import {
  key, parseKey, validPlacements, getGroup, owners, groupPoints, monasteryNeighbours,
  scoreAfterPlacement, fieldCities, followerOptions, captureTargets, dragonMoves, dragonMover,
  ransomOptions, hasExp, DRAGON_STEPS, PIECES, featuresOf,
} from './game.js';

const LEVELS = {
  easy: { noise: 9, farmers: false, opp: 0.2, lookMeeple: 0.6, portal: 0, smart: false },
  medium: { noise: 4, farmers: true, opp: 0.5, lookMeeple: 1, portal: 3, smart: true },
  hard: { noise: 0.15, farmers: true, opp: 1, lookMeeple: 1, portal: 6, smart: true },
};

export const P = {
  hand: 3.2, handExtra: 1, cityGrow: 2.5, roadGrow: 1.2, fieldOpen: 0.4, decay: 0.6, base: 1.6, monBase: 2.2, oppScale: 0.9,
  large: 6.5, abbot: 4, builder: 3, pig: 1, goods: 1.5, floor: 0.25, towerRisk: 0.35, dragonRisk: 0.5, bridge: 1.2,
};

function completionChance(openEdges, remaining) {
  if (openEdges === 0) return 1;
  const base = Math.min(1, remaining * P.base);
  return Math.max(0.02, base * Math.pow(P.decay, openEdges - 1));
}

const pieceId = (m) => `${m.key}|${m.f}|${m.k}|${m.p}`;
const isFollowerKind = (k) => (PIECES[k]?.weight ?? 0) > 0;

// While choosing a move the board only changes around the trial tile, so
// feature groups elsewhere are computed once and reused.
let memo = null; // { groups: Map, dirty: Set of tile keys that differ from the real board }
function grp(board, k, fi) {
  if (!memo) return getGroup(board, k, fi);
  const id = `${k}#${fi}`;
  const hit = memo.groups.get(id);
  if (hit && !memo.dirty.has(k) && ![...hit.tiles].some((t) => memo.dirty.has(t))) return hit;
  const g = getGroup(board, k, fi);
  if (![...g.tiles].some((t) => memo.dirty.has(t))) for (const [nk, nf] of g.nodes) memo.groups.set(`${nk}#${nf}`, g);
  return g;
}
function fcities(board, g) {
  const out = new Map();
  for (const [k, fi] of g.nodes) {
    for (const ci of featuresOf(board[k])[fi].cities || []) {
      const cg = grp(board, k, ci);
      if (!out.has(cg.id)) out.set(cg.id, cg);
    }
  }
  return [...out.values()];
}
function setDirty(k, extra = []) {
  if (!memo) return;
  const [x, y] = parseKey(k);
  memo.dirty = new Set([k, ...SIDE_DELTA.map(([dx, dy]) => key(x + dx, y + dy)), ...extra]);
}

// Estimated final points for every player given the current board.
function estimate(state, adjust) {
  const n = state.players.length;
  const est = state.players.map((p, i) => p.score + (adjust.points[i] || 0));
  // tiles left, compared to a base game (completion chances) and to this game's deck (figures in hand)
  const remaining = Math.min(1.2, state.deck.length / 71);
  const frac = state.deck.length / Math.max(71, state.deckSize || 71);
  const seen = new Set();
  const board = state.board;
  const pieceVal = []; // [key, p, value] of followers, for the risk terms below
  for (const [k, tile] of Object.entries(board)) {
    for (const pc of tile.pieces) {
      if (adjust.returned.has(pieceId({ key: k, ...pc }))) continue;
      const feat = featuresOf(tile)[pc.f];
      if (feat.type === 'monastery' || feat.type === 'garden') {
        if (!isFollowerKind(pc.k)) continue;
        const [x, y] = parseKey(k);
        const nb = monasteryNeighbours(board, x, y);
        const pc2 = Math.min(1, remaining * P.monBase) * Math.pow(0.8, 8 - nb);
        const v = 9 * pc2 + (1 + nb) * (1 - pc2);
        est[pc.p] += v;
        pieceVal.push([k, pc.p, v]);
        continue;
      }
      if (pc.k === 'builder') { est[pc.p] += P.builder * remaining * 2; continue; }
      const g = grp(board, k, pc.f);
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      const win = owners(g.meeples.filter((m) => !adjust.returned.has(pieceId(m))));
      if (!win.length) continue;
      let v;
      if (g.type === 'field') {
        const cities = fcities(board, g);
        v = 0;
        for (const c of cities) v += c.complete ? 3 : 3 * completionChance(c.openEdges, remaining) * P.fieldOpen;
        if (g.meeples.some((m) => m.k === 'pig' && win.includes(m.p))) v *= 4 / 3;
      } else {
        const pc2 = completionChance(g.openEdges, remaining);
        const now = groupPoints(g);
        const mult = g.type === 'city' ? (g.cathedral ? 3 : 2) : (g.inn ? 2 : 1);
        if (g.type === 'city') {
          const done = (g.tiles.size + g.pennants) * mult;
          v = pc2 * (done + P.cityGrow * remaining) + (1 - pc2) * now;
        } else {
          v = pc2 * (g.tiles.size * mult + 1) + (1 - pc2) * now + remaining * P.roadGrow;
        }
      }
      for (const p of win) est[p] += v;
      for (const m of g.meeples) if (win.includes(m.p) && isFollowerKind(m.k)) pieceVal.push([m.key, m.p, v / Math.max(1, win.length)]);
    }
  }
  // figures in hand are valuable while there are tiles left to play
  for (let i = 0; i < n; i++) {
    const s = state.players[i].supply;
    const m = s.meeple + (adjust.meeples[i] || 0);
    est[i] += (Math.min(m, 3) * P.hand + Math.max(0, m - 3) * P.handExtra) * frac;
    if ((s.large || 0) + (adjust.large?.[i] || 0) > 0) est[i] += P.large * frac;
    if ((s.abbot || 0) + (adjust.abbot?.[i] || 0) > 0) est[i] += P.abbot * frac;
    if (s.builder) est[i] += P.builder * frac * 0.5;
  }
  // The Princess & the Dragon: the fairy's +1 per turn and +3 later. Others usually take
  // her straight back, so she is worth little more than a point to whoever holds her,
  // and taking her only to deny a rival is not counted (bots would just swap her round).
  const fy = adjust.fairy || state.fairy;
  if (fy && fy.p !== null && fy.p !== undefined && fy.p === adjust.me) {
    const rivals = state.players.some((q, i) => i !== fy.p && Object.values(state.board).some((t) => t.pieces.some((pc) => pc.p === i && isFollowerKind(pc.k))));
    est[fy.p] += rivals ? 0.6 : 2.5;
  }
  // The Tower: followers that an open tower could reach next turn are at risk
  if (hasExp(state, 'tower')) {
    const towers = Object.entries(state.towers).filter(([, t]) => !t.top);
    for (const [k, p, v] of pieceVal) {
      const [x, y] = parseKey(k);
      for (const [tk, t] of towers) {
        const [tx, ty] = parseKey(tk);
        const reach = t.h + 1;
        if ((tx === x && Math.abs(ty - y) <= reach) || (ty === y && Math.abs(tx - x) <= reach)) {
          const threat = state.players.some((q, i) => i !== p && q.floors > 0) ? 1 : 0;
          est[p] -= threat * P.towerRisk * (2 + v * 0.5);
          break;
        }
      }
    }
  }
  // The Princess & the Dragon: followers near the dragon may be eaten
  if (state.dragon) {
    const [dx, dy] = parseKey(state.dragon);
    const odds = Math.min(1, (state.deck.length ? 12 / 71 : 0) * n);
    for (const [k, p, v] of pieceVal) {
      const [x, y] = parseKey(k);
      const d = Math.abs(x - dx) + Math.abs(y - dy);
      if (d <= DRAGON_STEPS && (!state.fairy || state.fairy.key !== k)) est[p] -= odds * P.dragonRisk * (2 + v * 0.5) * (DRAGON_STEPS + 1 - d) / DRAGON_STEPS;
    }
  }
  return est;
}

function valueFor(est, me, oppWeight) {
  let worst = -Infinity, sum = 0;
  est.forEach((v, i) => { if (i !== me) { worst = Math.max(worst, v); sum += v; } });
  const others = est.length > 1 ? oppWeight * worst + (1 - oppWeight) * (sum / (est.length - 1)) : 0;
  return est[me] - others * P.oppScale;
}

// Pretend the drawn tile lies at k (with its volcano / tower effects) while fn runs.
function withTile(state, k, t, r, fn, bridge = null) {
  const saved = { dragon: state.dragon, phase: state.phase, last: state.last, tower: state.towers?.[k] };
  state.board[k] = { t, r, pieces: [], n: 999 };
  if (hasExp(state, 'dragon') && hasTag(t, 'volcano')) state.dragon = k;
  if (hasExp(state, 'tower') && hasTag(t, 'tower')) state.towers[k] = { h: 0, top: null };
  if (bridge) state.board[bridge.key].bridge = bridge.axis;
  state.phase = 'action'; state.last = k;
  try { return fn(); } finally {
    if (bridge && bridge.key !== k) delete state.board[bridge.key].bridge;
    delete state.board[k];
    state.dragon = saved.dragon; state.phase = saved.phase; state.last = saved.last;
    if (state.towers) { if (saved.tower) state.towers[k] = saved.tower; else delete state.towers[k]; }
  }
}

// tiles whose groups a bridge on a neighbour can change (besides the new tile's own neighbours)
function bridgeDirty(b) {
  if (!b) return [];
  const [bx, by] = parseKey(b.key);
  return [b.key, ...SIDE_DELTA.map(([dx, dy]) => key(bx + dx, by + dy))];
}

// Expand tower floors into one option per capture choice. Floors and tower tops that
// change nothing nearby are left out: late in a big game there are dozens of towers.
function expandOptions(state, opts) {
  const me = state.current;
  const out = [];
  let bare = 0;
  const closing = new Set();
  for (const o of opts) {
    if (o.kind === 'floor') {
      const h = state.towers[o.key].h + 1;
      // capturing your own figure only helps when you have no meeples left
      for (const c of captureTargets(state, o.key, h)) if (c.p !== me || !state.players[me].supply.meeple) out.push({ ...o, capture: c });
      // a floor on its own: only where other players' figures come within reach next time
      if (bare < 2 && captureTargets(state, o.key, h + 1).some((c) => c.p !== me)) { out.push(o); bare++; }
    } else if (o.kind === 'towerTop') {
      // closing a tower: only one that could otherwise grow to reach my figures
      if (!closing.has(o.key) && closing.size >= 2) continue;
      if (closing.has(o.key) || captureTargets(state, o.key, state.towers[o.key].h + 1).some((c) => c.p === me)) { closing.add(o.key); out.push(o); }
    } else out.push(o);
  }
  return out;
}

// Does the tile at k extend a road or city holding my builder (a second tile)?
function builderBonus(state, k, me) {
  if (state.part !== 1 || !hasExp(state, 'traders')) return 0;
  let at = null;
  for (const [bk, bt] of Object.entries(state.board)) for (const pc of bt.pieces) if (pc.p === me && pc.k === 'builder') at = [bk, pc.f];
  if (!at) return 0;
  const feats = featuresOf(state.board[k]);
  for (let fi = 0; fi < feats.length; fi++) {
    if (feats[fi].type !== 'road' && feats[fi].type !== 'city') continue;
    if (getGroup(state.board, k, fi).nodes.some(([nk, nf]) => nk === at[0] && nf === at[1])) return 4;
  }
  return 0;
}

// Value of doing act after placing the tile at k (the tile is already on the board).
function evaluate(state, k, act, me, lvl, extra = 0) {
  const undo = [];
  const adjust = { points: {}, meeples: {}, large: {}, abbot: {}, returned: new Set(), fairy: null, me };
  const addPts = (p, v) => { adjust.points[p] = (adjust.points[p] || 0) + v; };
  const handDelta = (p, kind, d) => {
    if (kind === 'meeple') adjust.meeples[p] = (adjust.meeples[p] || 0) + d;
    if (kind === 'large') adjust.large[p] = (adjust.large[p] || 0) + d;
    if (kind === 'abbot') adjust.abbot[p] = (adjust.abbot[p] || 0) + d;
  };
  const lift = (key2, f, kind, p) => {
    if (f === 'top') { const tw = state.towers[key2]; const top = tw.top; tw.top = null; undo.push(() => { tw.top = top; }); return; }
    const tile = state.board[key2];
    const i = tile.pieces.findIndex((pc) => pc.p === p && pc.f === f && pc.k === kind);
    if (i < 0) return;
    const [pc] = tile.pieces.splice(i, 1);
    undo.push(() => tile.pieces.splice(i, 0, pc));
  };
  let bonus = extra;
  // tiles whose figures change with this act
  const touched = [];
  if (act?.key && act.kind !== 'fairy' && act.kind !== 'floor' && act.kind !== 'towerTop') touched.push(act.key);
  if (act?.capture) touched.push(act.capture.key);
  setDirty(k, touched);
  if (act) {
    if (act.kind === 'follower') {
      const tile = state.board[act.key];
      tile.pieces.push({ p: me, f: act.fi, k: act.k });
      undo.push(() => tile.pieces.pop());
      handDelta(me, act.k, -1);
      // a figure on my own dragon tile may well be eaten in the flight that follows
      if (act.key === k && state.dragon && hasTag(state.board[k].t, 'dragon')) {
        const [dx, dy] = parseKey(state.dragon), [kx, ky] = parseKey(k);
        const d = Math.abs(dx - kx) + Math.abs(dy - ky);
        if (d <= DRAGON_STEPS) bonus -= d <= 3 ? 3.5 : 1.8;
      }
      if (act.k === 'pig') {
        const g = grp(state.board, act.key, act.fi);
        bonus += P.pig * fcities(state.board, g).filter((c) => c.complete).length;
      }
    } else if (act.kind === 'recall') {
      const [x, y] = parseKey(act.key);
      addPts(me, 1 + monasteryNeighbours(state.board, x, y));
      lift(act.key, act.fi, 'abbot', me);
      handDelta(me, 'abbot', 1);
    } else if (act.kind === 'princess') {
      lift(act.key, act.fi, act.k, act.p);
      handDelta(act.p, act.k, 1);
    } else if (act.kind === 'fairy') {
      // only worth it to guard figures from the dragon, for a +3 coming up, or when nobody can take her back
      bonus -= 0.9;
      adjust.fairy = { key: act.key, f: act.fi, k: act.k, p: me };
      const saved = state.fairy;
      state.fairy = adjust.fairy;
      undo.push(() => { state.fairy = saved; });
    } else if (act.kind === 'floor') {
      const tw = state.towers[act.key];
      tw.h++;
      undo.push(() => { tw.h--; });
      bonus -= P.floor;
      const c = act.capture;
      if (c) {
        lift(c.key, c.fi, c.k, c.p);
        if (c.p === me) handDelta(me, c.k, 1);
        else {
          const mine = state.players[c.p].prisoners.filter((q) => q.p === me);
          if (mine.length) { handDelta(me, mine[0].k, 1); handDelta(c.p, c.k, 1); }
        }
      }
    } else if (act.kind === 'towerTop') {
      const tw = state.towers[act.key];
      tw.top = { p: me, k: act.k };
      undo.push(() => { tw.top = null; });
      handDelta(me, act.k, -1);
    }
  }
  try {
    const events = scoreAfterPlacement(state, k, false);
    for (const e of events) {
      for (const p of e.winners) addPts(p, e.points);
      for (const m of e.meeples) {
        handDelta(m.p, m.k, 1);
        adjust.returned.add(pieceId(m));
      }
      if (e.kind === 'goods' && e.player === me) bonus += P.goods * Object.values(e.goods).reduce((a, b) => a + b, 0);
    }
    return valueFor(estimate(state, adjust), me, lvl.opp) + bonus;
  } finally {
    for (const f of undo.reverse()) f();
  }
}

// Options that do not depend much on where the tile goes (portal, fairy,
// towers) are only tried for the most promising placements.
const isGlobal = (o) => o.portal || o.kind === 'fairy' || o.kind === 'floor' || o.kind === 'towerTop';

// The magic portal can reach every open feature on the map: keep the ones
// that look most promising at a glance (big cities, busy monasteries, rich fields).
function portalShortlist(state, opts, n = 12) {
  const portal = opts.filter((o) => o.portal);
  if (portal.length <= n) return opts;
  const score = (o) => {
    const f = featuresOf(state.board[o.key])[o.fi];
    if (f.type === 'monastery' || f.type === 'garden') { const [x, y] = parseKey(o.key); return 1.2 * monasteryNeighbours(state.board, x, y); }
    const g = grp(state.board, o.key, o.fi);
    if (g.type === 'field') return 3 * fcities(state.board, g).filter((c) => c.complete).length;
    return (g.type === 'city' ? 2 : 1) * (g.tiles.size + g.pennants) / (1 + 0.5 * g.openEdges);
  };
  const keep = new Set(portal.map((o) => [o, score(o)]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([o]) => o));
  return opts.filter((o) => !o.portal || keep.has(o));
}

export function chooseMove(state, levelName = 'medium', rnd = Math.random) {
  const lvl = LEVELS[levelName] || LEVELS.medium;
  const me = state.current;
  const t = state.drawn;
  const moves = [];
  const later = [];
  memo = { groups: new Map(), dirty: new Set() };
  try {
    for (const { x, y, rots, needsBridge } of validPlacements(state, t)) {
      const k = key(x, y);
      // (a turn that only fits with a bridge tries each place the bridge could go)
      for (const r of rots) for (const bridge of needsBridge?.[r] || [null]) {
        withTile(state, k, t, r, () => {
          setDirty(k, bridgeDirty(bridge)); // groups around the trial tile must not be taken from the memo
          const options = [null];
          const global = [];
          if (rnd() < lvl.lookMeeple + 0.0001) {
            // (tower floors and tops are worked out later, for the most promising placements only)
            for (const o of portalShortlist(state, followerOptions(state))) {
              if (o.kind === 'follower' && !lvl.farmers && featuresOf(state.board[o.key])[o.fi].type === 'field') continue;
              if (!lvl.smart && o.kind !== 'follower' && o.kind !== 'recall') continue;
              if (o.portal && !lvl.portal) continue;
              (isGlobal(o) ? global : options).push(o);
            }
          }
          let best = -Infinity;
          // a bridge is worth keeping for later
          const extra = builderBonus(state, k, me) - (bridge ? P.bridge : 0);
          setDirty(k, bridgeDirty(bridge));
          const completes = scoreAfterPlacement(state, k, false).some((e) => e.winners.length);
          for (const act of options) {
            const v = evaluate(state, k, act, me, lvl, extra) + (rnd() - 0.5) * lvl.noise;
            best = Math.max(best, v);
            moves.push({ x, y, r, bridge, act, v, meeple: act && act.kind === 'follower' ? act.fi : null });
          }
          if (global.length) later.push({ x, y, r, bridge, k, best, global, extra, completes });
        }, bridge);
      }
    }
    // a tile that completes something may pair well with a capture or the fairy
    later.sort((a, b) => b.best - a.best);
    const top = Math.max(2, lvl.portal);
    let completing = 0;
    for (const pl of later.filter((l, i) => i < top || (l.completes && completing++ < 4))) {
      withTile(state, pl.k, t, pl.r, () => {
        setDirty(pl.k, bridgeDirty(pl.bridge));
        for (const act of expandOptions(state, pl.global)) {
          const v = evaluate(state, pl.k, act, me, lvl, pl.extra) + (rnd() - 0.5) * lvl.noise;
          moves.push({ x: pl.x, y: pl.y, r: pl.r, bridge: pl.bridge, act, v, meeple: null });
        }
      }, pl.bridge);
    }
  } finally {
    memo = null;
  }
  moves.sort((a, b) => b.v - a.v);
  return moves[0];
}

// A friendly suggestion for a human player (uses the hard evaluator).
export function suggestMove(state) {
  return chooseMove(state, 'hard', () => 0.5);
}

// ---------- The Princess & the Dragon: steering the dragon ----------
function figureValues(state) {
  const n = state.players.length;
  const vals = new Map();
  const add = (k, p, v) => {
    if (!vals.has(k)) vals.set(k, new Array(n).fill(0));
    vals.get(k)[p] += v;
  };
  for (const [k, tile] of Object.entries(state.board)) {
    const [x, y] = parseKey(k);
    for (const pc of tile.pieces) {
      const f = featuresOf(tile)[pc.f];
      let v = 2.5;
      if (f.type === 'monastery' || f.type === 'garden') v += 1 + monasteryNeighbours(state.board, x, y) * 0.8;
      else if (isFollowerKind(pc.k)) {
        const g = getGroup(state.board, k, pc.f);
        const win = owners(g.meeples);
        if (win.includes(pc.p)) v += (g.type === 'field' ? 3 * fieldCities(state.board, g).filter((c) => c.complete).length : groupPoints(g) * (g.type === 'city' ? 1.6 : 1)) / win.length;
      }
      add(k, pc.p, v);
    }
    const tw = state.towers?.[k];
    if (tw?.top) add(k, tw.top.p, 1.5);
  }
  return vals;
}

export function chooseDragonMove(state, levelName = 'medium', rnd = Math.random) {
  const moves = dragonMoves(state);
  if (moves.length <= 1) return moves[0] || null;
  const lvl = LEVELS[levelName] || LEVELS.medium;
  if (!lvl.smart && rnd() < 0.5) return moves[Math.floor(rnd() * moves.length)];
  const n = state.players.length;
  const vals = figureValues(state);
  const zero = () => new Array(n).fill(0);
  const utility = (i, loss) => loss.reduce((a, l, j) => a + (j === i ? -2 * l : l), 0);
  const step0 = state.flight.moves;
  const search = (pos, visited, step) => {
    if (step >= DRAGON_STEPS) return zero();
    const mover = (state.current + step) % n;
    const [x, y] = parseKey(pos);
    let best = null, bestU = -Infinity;
    for (const [dx, dy] of SIDE_DELTA) {
      const nk = key(x + dx, y + dy);
      if (!state.board[nk] || visited.has(nk) || state.fairy?.key === nk) continue;
      visited.add(nk);
      const rest = search(nk, visited, step + 1);
      visited.delete(nk);
      const eat = vals.get(nk) || zero();
      const tot = rest.map((v, i) => v + eat[i]);
      const u = utility(mover, tot);
      if (u > bestU) { bestU = u; best = tot; }
    }
    return best || zero();
  };
  const me = dragonMover(state);
  let pick = moves[0], bestU = -Infinity;
  for (const m of moves) {
    const visited = new Set([...state.flight.visited, m]);
    const rest = search(m, visited, step0 + 1);
    const eat = vals.get(m) || zero();
    const u = utility(me, rest.map((v, i) => v + eat[i])) + (rnd() - 0.5) * lvl.noise * 0.2;
    if (u > bestU) { bestU = u; pick = m; }
  }
  return pick;
}

// ---------- The Tower: buying a prisoner back ----------
export function chooseRansom(state, levelName = 'medium') {
  const opts = ransomOptions(state);
  if (!opts.length || levelName === 'easy') return null;
  const me = state.current;
  const pl = state.players[me];
  // 3 points to another player is a lot: only buy a meeple back when none are left,
  // and (hard bots) the big meeple or abbot when few are left
  if (state.deck.length < 15 || pl.score < 10) return null;
  const pool = !pl.supply.meeple ? opts : levelName === 'hard' && pl.supply.meeple < 2 ? opts.filter((o) => o.k !== 'meeple') : [];
  if (!pool.length) return null;
  // prefer the big meeple, and paying the player furthest behind
  pool.sort((a, b) => (a.k === 'large' ? -1 : 0) - (b.k === 'large' ? -1 : 0) || state.players[a.from].score - state.players[b.from].score);
  return pool[0];
}
