// Computer opponents. They look at every legal placement & follower choice,
// simulate the immediate scoring and estimate the long-term value.
import { TILE_TYPES } from './tiles.js';
import {
  key, parseKey, validPlacements, getGroup, owners, groupPoints, monasteryNeighbours,
  scoreAfterPlacement, fieldCities,
} from './game.js';

const LEVELS = {
  easy: { noise: 9, farmers: false, opp: 0.2, lookMeeple: 0.6 },
  medium: { noise: 4, farmers: true, opp: 0.5, lookMeeple: 1 },
  hard: { noise: 0.15, farmers: true, opp: 1, lookMeeple: 1 },
};

export const P = { hand: 3.2, handExtra: 1, cityGrow: 2.5, roadGrow: 1.2, fieldOpen: 0.4, decay: 0.6, base: 1.6, monBase: 2.2, oppScale: 0.9 };

function completionChance(openEdges, remaining) {
  if (openEdges === 0) return 1;
  const base = Math.min(1, remaining * P.base);
  return Math.max(0.02, base * Math.pow(P.decay, openEdges - 1));
}

// Estimated final points for every player given the current board.
function estimate(state, adjust) {
  const n = state.players.length;
  const est = state.players.map((p, i) => p.score + (adjust.points[i] || 0));
  const remaining = state.deck.length / 71;
  const seen = new Set();
  const board = state.board;
  for (const [k, tile] of Object.entries(board)) {
    if (!tile.m || adjust.returned.has(k)) continue;
    const feat = TILE_TYPES[tile.t].features[tile.m.f];
    if (feat.type === 'monastery') {
      const [x, y] = parseKey(k);
      const nb = monasteryNeighbours(board, x, y);
      const pc = Math.min(1, remaining * P.monBase) * Math.pow(0.8, 8 - nb);
      est[tile.m.p] += 9 * pc + (1 + nb) * (1 - pc);
      continue;
    }
    const g = getGroup(board, k, tile.m.f);
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    const win = owners(g.meeples.filter((m) => !adjust.returned.has(m.key)));
    if (!win.length) continue;
    let v;
    if (g.type === 'field') {
      const cities = fieldCities(board, g);
      v = 0;
      for (const c of cities) v += c.complete ? 3 : 3 * completionChance(c.openEdges, remaining) * P.fieldOpen;
    } else {
      const pc = completionChance(g.openEdges, remaining);
      const now = groupPoints(g);
      if (g.type === 'city') {
        v = pc * (now * 2 + P.cityGrow * remaining) + (1 - pc) * now;
      } else {
        v = now + pc * 1 + remaining * P.roadGrow;
      }
    }
    for (const p of win) est[p] += v;
  }
  // followers in hand are valuable while there are tiles left to play
  for (let i = 0; i < n; i++) {
    const m = state.players[i].meeples + (adjust.meeples[i] || 0);
    est[i] += (Math.min(m, 3) * P.hand + Math.max(0, m - 3) * P.handExtra) * remaining;
  }
  return est;
}

function valueFor(est, me, oppWeight) {
  let worst = -Infinity, sum = 0;
  est.forEach((v, i) => { if (i !== me) { worst = Math.max(worst, v); sum += v; } });
  const others = est.length > 1 ? oppWeight * worst + (1 - oppWeight) * (sum / (est.length - 1)) : 0;
  return est[me] - others * P.oppScale;
}

export function chooseMove(state, levelName = 'medium', rnd = Math.random) {
  const lvl = LEVELS[levelName] || LEVELS.medium;
  const me = state.current;
  const t = state.drawn;
  const board = state.board;
  const feats = TILE_TYPES[t].features;
  const moves = [];
  const meeplesLeft = state.players[me].meeples;
  for (const { x, y, rots } of validPlacements(board, t)) {
    const k = key(x, y);
    for (const r of rots) {
      board[k] = { t, r, m: null, n: 999 };
      const options = [null];
      if (meeplesLeft > 0 && rnd() < lvl.lookMeeple + 0.0001) {
        feats.forEach((f, fi) => {
          if (f.type === 'field' && (!state.options.farmers || !lvl.farmers)) return;
          if (f.type === 'monastery' || getGroup(board, k, fi).meeples.length === 0) options.push(fi);
        });
      }
      for (const fi of options) {
        board[k].m = fi === null ? null : { p: me, f: fi };
        const events = scoreAfterPlacement(state, k, false);
        const adjust = { points: {}, meeples: {}, returned: new Set() };
        if (fi !== null) adjust.meeples[me] = -1;
        for (const e of events) {
          for (const p of e.winners) adjust.points[p] = (adjust.points[p] || 0) + e.points;
          for (const m of e.meeples) { adjust.meeples[m.p] = (adjust.meeples[m.p] || 0) + 1; adjust.returned.add(m.key); }
        }
        const v = valueFor(estimate(state, adjust), me, lvl.opp) + (rnd() - 0.5) * lvl.noise;
        moves.push({ x, y, r, meeple: fi, v });
      }
      delete board[k];
    }
  }
  moves.sort((a, b) => b.v - a.v);
  return moves[0];
}

// A friendly suggestion for a human player (uses the hard evaluator).
export function suggestMove(state) {
  return chooseMove(state, 'hard', () => 0.5);
}
