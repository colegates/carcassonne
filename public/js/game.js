// Pure rules engine for Carcassonne (base game, 3rd-edition scoring).
import { TILE_TYPES, START_TILE, buildDeck, rotPort, oppositePort, SIDE_DELTA } from './tiles.js';

export const MEEPLES_PER_PLAYER = 7;
export const PLAYER_COLORS = {
  red: { name: 'Red', main: '#d8322b', dark: '#7d1410', light: '#ff8a7a' },
  blue: { name: 'Blue', main: '#2a62d6', dark: '#0f2c73', light: '#8fb4ff' },
  green: { name: 'Green', main: '#2f9e3a', dark: '#0f5016', light: '#93e08d' },
  yellow: { name: 'Yellow', main: '#f2c21b', dark: '#8a6500', light: '#fff09a' },
  black: { name: 'Black', main: '#3a3a40', dark: '#0b0b0e', light: '#9a9aa6' },
  pink: { name: 'Pink', main: '#e0559f', dark: '#7a1a4e', light: '#ffb0d8' },
};

export const key = (x, y) => `${x},${y}`;
export const parseKey = (k) => k.split(',').map(Number);

export function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newGame(players, options = {}) {
  const state = {
    version: 1,
    options: { farmers: true, ...options },
    players: players.map((p) => ({
      name: p.name, color: p.color, kind: p.kind || 'human', level: p.level || 'medium',
      score: 0, meeples: MEEPLES_PER_PLAYER,
      breakdown: { road: 0, city: 0, monastery: 0, field: 0 },
    })),
    board: { [key(0, 0)]: { t: START_TILE, r: 0, m: null, n: 0 } },
    deck: shuffle(buildDeck()),
    current: 0,
    drawn: null,
    phase: 'place',
    turn: 1,
    placed: 1,
    last: null,
    discarded: [],
  };
  drawTile(state);
  return state;
}

export const cloneState = (s) => JSON.parse(JSON.stringify(s));

// ---------- tile geometry helpers ----------
export function featureAtPort(tile, worldPort) {
  const local = (worldPort - 3 * tile.r + 12) % 12;
  return TILE_TYPES[tile.t].portFeature[local];
}
export function edgeType(tile, side) {
  return TILE_TYPES[tile.t].features[featureAtPort(tile, 3 * side + 1)].type;
}
export function worldPorts(tile, fi) {
  return TILE_TYPES[tile.t].features[fi].ports.map((p) => rotPort(p, tile.r));
}
export function neighbour(board, x, y, side) {
  const [dx, dy] = SIDE_DELTA[side];
  return board[key(x + dx, y + dy)];
}

export function canPlace(board, x, y, t, r) {
  if (board[key(x, y)]) return false;
  const tile = { t, r };
  let touching = 0;
  for (let s = 0; s < 4; s++) {
    const nb = neighbour(board, x, y, s);
    if (!nb) continue;
    touching++;
    if (edgeType(tile, s) !== edgeType(nb, (s + 2) % 4)) return false;
  }
  return touching > 0;
}

export function frontier(board) {
  const out = new Set();
  for (const k of Object.keys(board)) {
    const [x, y] = parseKey(k);
    for (const [dx, dy] of SIDE_DELTA) {
      const nk = key(x + dx, y + dy);
      if (!board[nk]) out.add(nk);
    }
  }
  return [...out].map(parseKey);
}

// Returns [{x, y, rots: [r...]}] for every legal spot of tile type t.
export function validPlacements(board, t) {
  const res = [];
  const seenShapes = TILE_TYPES[t];
  for (const [x, y] of frontier(board)) {
    const rots = [];
    for (let r = 0; r < 4; r++) if (canPlace(board, x, y, t, r)) rots.push(r);
    if (rots.length) res.push({ x, y, rots });
  }
  void seenShapes;
  return res;
}

// ---------- feature groups ----------
// A group is the connected feature (road/city/field) spanning tiles.
export function getGroup(board, k, fi) {
  const start = board[k];
  const type = TILE_TYPES[start.t].features[fi].type;
  const nodes = [];
  const seen = new Set();
  const tiles = new Set();
  let openEdges = 0, pennants = 0;
  const meeples = [];
  const stack = [[k, fi]];
  seen.add(`${k}#${fi}`);
  while (stack.length) {
    const [ck, cf] = stack.pop();
    const tile = board[ck];
    const feat = TILE_TYPES[tile.t].features[cf];
    nodes.push([ck, cf]);
    tiles.add(ck);
    if (feat.pennant) pennants++;
    if (tile.m && tile.m.f === cf) meeples.push({ key: ck, p: tile.m.p, f: cf });
    const [x, y] = parseKey(ck);
    for (const wp of worldPorts(tile, cf)) {
      const s = Math.floor(wp / 3);
      const [dx, dy] = SIDE_DELTA[s];
      const nk = key(x + dx, y + dy);
      const nb = board[nk];
      if (!nb) {
        if (wp % 3 === 1) openEdges++;
        continue;
      }
      const nf = featureAtPort(nb, oppositePort(wp));
      const id = `${nk}#${nf}`;
      if (!seen.has(id)) { seen.add(id); stack.push([nk, nf]); }
    }
  }
  const id = [...seen].sort()[0];
  return { id, type, nodes, tiles, openEdges, pennants, meeples, complete: type !== 'field' && openEdges === 0 };
}

export function monasteryNeighbours(board, x, y) {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if ((dx || dy) && board[key(x + dx, y + dy)]) n++;
  }
  return n;
}

export function owners(meeples) {
  const counts = {};
  for (const m of meeples) counts[m.p] = (counts[m.p] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  return max === 0 ? [] : Object.keys(counts).filter((p) => counts[p] === max).map(Number);
}

export function groupPoints(g, endGame) {
  if (g.type === 'road') return g.tiles.size;
  if (g.type === 'city') return (g.tiles.size + g.pennants) * (g.complete ? 2 : 1);
  return 0;
}

// Field scoring: 3 points per completed city bordering the field.
export function fieldCities(board, g) {
  const cities = new Map();
  for (const [k, fi] of g.nodes) {
    const tile = board[k];
    for (const ci of TILE_TYPES[tile.t].features[fi].cities) {
      const cg = getGroup(board, k, ci);
      if (!cities.has(cg.id)) cities.set(cg.id, cg);
    }
  }
  return [...cities.values()];
}

// ---------- turn flow ----------
export function drawTile(state) {
  state.drawn = null;
  while (state.deck.length) {
    const t = state.deck.pop();
    if (validPlacements(state.board, t).length) { state.drawn = t; return t; }
    state.discarded.push(t); // unplayable tiles are removed from the game
  }
  return null;
}

export function placeTile(state, x, y, r) {
  if (state.phase !== 'place') throw new Error('Not in place phase');
  if (!canPlace(state.board, x, y, state.drawn, r)) throw new Error('Illegal placement');
  const k = key(x, y);
  state.board[k] = { t: state.drawn, r, m: null, n: state.placed++ };
  state.last = k;
  state.drawn = null;
  state.phase = 'meeple';
}

// Feature indices of the last-placed tile on which the current player may put a meeple.
export function meepleOptions(state) {
  if (state.phase !== 'meeple' || !state.last) return [];
  if (state.players[state.current].meeples <= 0) return [];
  const tile = state.board[state.last];
  const feats = TILE_TYPES[tile.t].features;
  const out = [];
  feats.forEach((f, fi) => {
    if (f.type === 'field' && !state.options.farmers) return;
    if (f.type === 'monastery') { out.push(fi); return; }
    if (getGroup(state.board, state.last, fi).meeples.length === 0) out.push(fi);
  });
  return out;
}

function award(state, players, pts, kind) {
  for (const p of players) {
    state.players[p].score += pts;
    state.players[p].breakdown[kind] += pts;
  }
}

function returnMeeples(state, meeples) {
  for (const m of meeples) {
    state.board[m.key].m = null;
    state.players[m.p].meeples++;
  }
}

// Scoring caused by the tile at k. Mutates state when apply=true.
export function scoreAfterPlacement(state, k, apply = true) {
  const events = [];
  const board = state.board;
  const tile = board[k];
  const seen = new Set();
  TILE_TYPES[tile.t].features.forEach((f, fi) => {
    if (f.type !== 'road' && f.type !== 'city') return;
    const g = getGroup(board, k, fi);
    if (seen.has(g.id)) return;
    seen.add(g.id);
    if (!g.complete) return;
    const winners = owners(g.meeples);
    const pts = groupPoints(g);
    events.push({ kind: g.type, winners, points: pts, nodes: g.nodes, meeples: g.meeples, complete: true, tiles: g.tiles.size });
  });
  const [x, y] = parseKey(k);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const mk = key(x + dx, y + dy);
    const mt = board[mk];
    if (!mt || !mt.m) continue;
    const feat = TILE_TYPES[mt.t].features[mt.m.f];
    if (feat.type !== 'monastery') continue;
    if (monasteryNeighbours(board, x + dx, y + dy) === 8) {
      events.push({ kind: 'monastery', winners: [mt.m.p], points: 9, nodes: [[mk, mt.m.f]], meeples: [{ key: mk, p: mt.m.p, f: mt.m.f }], complete: true, tiles: 9 });
    }
  }
  if (apply) {
    for (const e of events) {
      if (e.winners.length) award(state, e.winners, e.points, e.kind);
      returnMeeples(state, e.meeples);
    }
  }
  return events;
}

export function finishTurn(state, featureIndex = null) {
  if (state.phase !== 'meeple') throw new Error('Not in meeple phase');
  if (featureIndex !== null && featureIndex !== undefined) {
    if (!meepleOptions(state).includes(featureIndex)) throw new Error('Illegal meeple');
    state.board[state.last].m = { p: state.current, f: featureIndex };
    state.players[state.current].meeples--;
  }
  const events = scoreAfterPlacement(state, state.last, true);
  state.current = (state.current + 1) % state.players.length;
  state.turn++;
  drawTile(state);
  if (!state.drawn) {
    state.phase = 'over';
    state.finalEvents = finalScoring(state);
  } else {
    state.phase = 'place';
  }
  return events;
}

// End-of-game scoring of everything still on the board.
export function finalScoring(state, apply = true) {
  const board = state.board;
  const events = [];
  const seen = new Set();
  for (const [k, tile] of Object.entries(board)) {
    if (!tile.m) continue;
    const feat = TILE_TYPES[tile.t].features[tile.m.f];
    if (feat.type === 'monastery') {
      const [x, y] = parseKey(k);
      const n = monasteryNeighbours(board, x, y);
      events.push({ kind: 'monastery', winners: [tile.m.p], points: 1 + n, nodes: [[k, tile.m.f]], meeples: [{ key: k, p: tile.m.p, f: tile.m.f }], complete: false, tiles: 1 + n });
      continue;
    }
    const g = getGroup(board, k, tile.m.f);
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    if (g.type === 'field') {
      const cities = fieldCities(board, g).filter((c) => c.complete);
      events.push({ kind: 'field', winners: owners(g.meeples), points: 3 * cities.length, nodes: g.nodes, meeples: g.meeples, cities: cities.map((c) => c.nodes), complete: false, tiles: g.tiles.size });
    } else {
      events.push({ kind: g.type, winners: owners(g.meeples), points: groupPoints(g, true), nodes: g.nodes, meeples: g.meeples, complete: false, tiles: g.tiles.size });
    }
  }
  // Order like the rulebook: roads, cities, monasteries, then farms.
  const order = { road: 0, city: 1, monastery: 2, field: 3 };
  events.sort((a, b) => order[a.kind] - order[b.kind]);
  if (apply) {
    for (const e of events) {
      if (e.winners.length && e.points) award(state, e.winners, e.points, e.kind);
      returnMeeples(state, e.meeples);
    }
  }
  return events;
}

// Snapshot of what a feature would score right now (for UI hints).
export function describeGroup(state, k, fi) {
  const g = getGroup(state.board, k, fi);
  return { ...g, points: groupPoints(g), owners: owners(g.meeples) };
}
