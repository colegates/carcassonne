// Computer opponents. They look at every legal placement & follower choice,
// simulate the immediate scoring and estimate the long-term value.
import { TILE_TYPES } from './tiles.js';
import {
  key, parseKey, validPlacements, getGroup, owners, groupPoints, monasteryNeighbours,
  scoreAfterPlacement, fieldCities, followerOptions,
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

const pieceId = (m) => `${m.key}|${m.f}|${m.k}|${m.p}`;

// Estimated final points for every player given the current board.
function estimate(state, adjust) {
  const n = state.players.length;
  const est = state.players.map((p, i) => p.score + (adjust.points[i] || 0));
  const remaining = state.deck.length / 71;
  const seen = new Set();
  const board = state.board;
  for (const [k, tile] of Object.entries(board)) {
    for (const pc of tile.pieces) {
      if (adjust.returned.has(pieceId({ key: k, ...pc }))) continue;
      const feat = TILE_TYPES[tile.t].features[pc.f];
      if (feat.type === 'monastery') {
        const [x, y] = parseKey(k);
        const nb = monasteryNeighbours(board, x, y);
        const pc2 = Math.min(1, remaining * P.monBase) * Math.pow(0.8, 8 - nb);
        est[pc.p] += 9 * pc2 + (1 + nb) * (1 - pc2);
        continue;
      }
      const g = getGroup(board, k, pc.f);
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      const win = owners(g.meeples.filter((m) => !adjust.returned.has(pieceId(m))));
      if (!win.length) continue;
      let v;
      if (g.type === 'field') {
        const cities = fieldCities(board, g);
        v = 0;
        for (const c of cities) v += c.complete ? 3 : 3 * completionChance(c.openEdges, remaining) * P.fieldOpen;
      } else {
        const pc2 = completionChance(g.openEdges, remaining);
        const now = groupPoints(g);
        if (g.type === 'city') {
          v = pc2 * (now * 2 + P.cityGrow * remaining) + (1 - pc2) * now;
        } else {
          v = now + pc2 * 1 + remaining * P.roadGrow;
        }
      }
      for (const p of win) est[p] += v;
    }
  }
  // followers in hand are valuable while there are tiles left to play
  for (let i = 0; i < n; i++) {
    const m = state.players[i].supply.meeple + (adjust.meeples[i] || 0);
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

// Follower-phase options as if the drawn tile were already at k.
function optionsAt(state, k) {
  const saved = [state.phase, state.last];
  state.phase = 'action'; state.last = k;
  const opts = followerOptions(state);
  [state.phase, state.last] = saved;
  return opts;
}

export function chooseMove(state, levelName = 'medium', rnd = Math.random) {
  const lvl = LEVELS[levelName] || LEVELS.medium;
  const me = state.current;
  const t = state.drawn;
  const board = state.board;
  const moves = [];
  for (const { x, y, rots } of validPlacements(state, t)) {
    const k = key(x, y);
    for (const r of rots) {
      board[k] = { t, r, pieces: [], n: 999 };
      const options = [null];
      if (rnd() < lvl.lookMeeple + 0.0001) {
        for (const o of optionsAt(state, k)) {
          if (o.kind === 'follower' && TILE_TYPES[t].features[o.fi].type === 'field' && !lvl.farmers) continue;
          options.push(o);
        }
      }
      for (const act of options) {
        board[k].pieces = act && act.kind === 'follower' ? [{ p: me, f: act.fi, k: act.k }] : [];
        const events = scoreAfterPlacement(state, k, false);
        const adjust = { points: {}, meeples: {}, returned: new Set() };
        if (act && act.kind === 'follower') adjust.meeples[me] = -1;
        for (const e of events) {
          for (const p of e.winners) adjust.points[p] = (adjust.points[p] || 0) + e.points;
          for (const m of e.meeples) {
            if (m.k === 'meeple') adjust.meeples[m.p] = (adjust.meeples[m.p] || 0) + 1;
            adjust.returned.add(pieceId(m));
          }
        }
        const v = valueFor(estimate(state, adjust), me, lvl.opp) + (rnd() - 0.5) * lvl.noise;
        moves.push({ x, y, r, act, v, meeple: act && act.kind === 'follower' ? act.fi : null });
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
