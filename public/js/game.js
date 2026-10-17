// Pure, deterministic rules engine for Carcassonne (3rd-edition rules).
// Every state change is driven by serialisable actions so that several phones
// can replay exactly the same game (see applyAction).
import { TILE_TYPES, buildDeck, rotPort, oppositePort, SIDE_DELTA } from './tiles.js';

export const MEEPLES_PER_PLAYER = 7;
export const PLAYER_COLORS = {
  red: { name: 'Red', main: '#b8342c', dark: '#6e1a14', light: '#f08070' },
  blue: { name: 'Blue', main: '#2d5aa0', dark: '#16305f', light: '#8fb0e8' },
  green: { name: 'Green', main: '#3f7d3a', dark: '#1d421b', light: '#9ad88f' },
  yellow: { name: 'Yellow', main: '#d9a72a', dark: '#7a5a0c', light: '#ffe08a' },
  black: { name: 'Black', main: '#2b2b2b', dark: '#0e0e0e', light: '#a0a0a8' },
  grey: { name: 'Grey', main: '#8c8c88', dark: '#4a4a47', light: '#d6d6d0' },
};

// Figures a player can have on the board. weight = strength when counting
// who has the most followers in a feature.
export const PIECES = {
  meeple: { weight: 1, follower: true, name: 'Meeple' },
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

export function newGame(players, options = {}, rnd = Math.random) {
  const opts = { farmers: true, hints: true, ...options, expansions: { ...(options.expansions || {}) } };
  const { start, deck } = buildDeck(opts.expansions, rnd);
  const state = {
    version: 2,
    options: opts,
    players: players.map((p) => ({
      name: p.name, color: p.color, kind: p.kind || 'human', level: p.level || 'medium',
      score: 0,
      supply: { meeple: MEEPLES_PER_PLAYER },
      breakdown: { road: 0, city: 0, monastery: 0, field: 0 },
    })),
    board: { [key(0, 0)]: { t: start, r: 0, pieces: [], n: 0 } },
    deck,
    current: 0,
    drawn: null,
    phase: 'place',
    turn: 1,
    placed: 1,
    last: null,
    discarded: [],
    seq: 0,
  };
  drawTile(state);
  return state;
}

export const cloneState = (s) => JSON.parse(JSON.stringify(s));

// Bring a saved game from an older version of the app up to date.
export function migrate(s) {
  if (!s || s.version >= 2) return s;
  for (const t of Object.values(s.board)) {
    t.pieces = t.m ? [{ p: t.m.p, f: t.m.f, k: 'meeple' }] : [];
    delete t.m;
  }
  for (const p of s.players) {
    p.supply = { meeple: p.meeples ?? MEEPLES_PER_PLAYER };
    delete p.meeples;
  }
  s.options.expansions = s.options.expansions || {};
  s.seq = s.seq || 0;
  s.version = 2;
  return s;
}

// ---------- tile geometry helpers ----------
export function featureAtPort(tile, worldPort) {
  const local = (worldPort - 3 * tile.r + 12) % 12;
  return TILE_TYPES[tile.t].portFeature[local];
}
export function edgeType(tile, side) {
  const fi = featureAtPort(tile, 3 * side + 1);
  return TILE_TYPES[tile.t].features[fi].type;
}
export function worldPorts(tile, fi) {
  return TILE_TYPES[tile.t].features[fi].ports.map((p) => rotPort(p, tile.r));
}
export function neighbour(board, x, y, side) {
  const [dx, dy] = SIDE_DELTA[side];
  return board[key(x + dx, y + dy)];
}
export const featureOf = (tile, fi) => TILE_TYPES[tile.t].features[fi];

export function canPlace(state, x, y, t, r) {
  const board = state.board;
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
export function validPlacements(state, t = state.drawn) {
  const res = [];
  if (!t) return res;
  for (const [x, y] of frontier(state.board)) {
    const rots = [];
    for (let r = 0; r < 4; r++) if (canPlace(state, x, y, t, r)) rots.push(r);
    if (rots.length) res.push({ x, y, rots });
  }
  return res;
}

// ---------- feature groups ----------
const weightOf = (k) => PIECES[k]?.weight ?? 0;

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
    if (feat.pennants) pennants += feat.pennants;
    for (const pc of tile.pieces) if (pc.f === cf) meeples.push({ key: ck, p: pc.p, f: cf, k: pc.k, w: weightOf(pc.k) });
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
  let id = null;
  for (const s of seen) if (id === null || s < id) id = s;
  return { id, type, nodes, tiles, openEdges, pennants, meeples, complete: type !== 'field' && openEdges === 0 };
}

export function monasteryNeighbours(board, x, y) {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if ((dx || dy) && board[key(x + dx, y + dy)]) n++;
  }
  return n;
}

// Players with the most follower strength among the given pieces.
export function owners(meeples) {
  const counts = {};
  for (const m of meeples) {
    const w = m.w ?? weightOf(m.k);
    if (w > 0) counts[m.p] = (counts[m.p] || 0) + w;
  }
  const max = Math.max(0, ...Object.values(counts));
  return max === 0 ? [] : Object.keys(counts).filter((p) => counts[p] === max).map(Number);
}

export function groupPoints(g) {
  if (g.type === 'road') return g.tiles.size;
  if (g.type === 'city') return (g.tiles.size + g.pennants) * (g.complete ? 2 : 1);
  return 0;
}

// Completed cities bordering a field group.
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
    if (validPlacements(state, t).length) { state.drawn = t; return t; }
    state.discarded.push(t); // unplayable tiles are removed from the game
  }
  return null;
}

export function placeTile(state, x, y, r) {
  if (state.phase !== 'place') throw new Error('Not in place phase');
  if (!canPlace(state, x, y, state.drawn, r)) throw new Error('Illegal placement');
  const k = key(x, y);
  state.board[k] = { t: state.drawn, r, pieces: [], n: state.placed++ };
  state.last = k;
  state.drawn = null;
  state.phase = 'action';
}

// Everything the current player may do after placing a tile (besides passing).
// Each option is an action object accepted by finishTurn.
export function followerOptions(state) {
  if (state.phase !== 'action' || !state.last) return [];
  const pl = state.players[state.current];
  const out = [];
  const k = state.last;
  const tile = state.board[k];
  const feats = TILE_TYPES[tile.t].features;
  if (pl.supply.meeple > 0) {
    feats.forEach((f, fi) => {
      if (f.type === 'field' && !state.options.farmers) return;
      if (f.type === 'river' || f.type === 'garden') return;
      if (f.type === 'monastery') { out.push({ kind: 'follower', key: k, fi, k: 'meeple' }); return; }
      if (getGroup(state.board, k, fi).meeples.some((m) => m.w > 0)) return;
      out.push({ kind: 'follower', key: k, fi, k: 'meeple' });
    });
  }
  return out;
}

// Backwards-compatible helper: feature indexes where a meeple may go.
export function meepleOptions(state) {
  return followerOptions(state).filter((o) => o.kind === 'follower' && o.k === 'meeple').map((o) => o.fi);
}

function award(state, players, pts, kind) {
  for (const p of players) {
    state.players[p].score += pts;
    state.players[p].breakdown[kind] = (state.players[p].breakdown[kind] || 0) + pts;
  }
}

function returnPieces(state, pieces) {
  for (const m of pieces) {
    const tile = state.board[m.key];
    const i = tile.pieces.findIndex((pc) => pc.p === m.p && pc.f === m.f && pc.k === m.k);
    if (i < 0) continue;
    tile.pieces.splice(i, 1);
    state.players[m.p].supply[m.k] = (state.players[m.p].supply[m.k] || 0) + 1;
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
    if (!mt) continue;
    for (const pc of mt.pieces) {
      const feat = TILE_TYPES[mt.t].features[pc.f];
      if (feat.type !== 'monastery') continue;
      if (monasteryNeighbours(board, x + dx, y + dy) === 8) {
        events.push({ kind: 'monastery', winners: [pc.p], points: 9, nodes: [[mk, pc.f]], meeples: [{ key: mk, p: pc.p, f: pc.f, k: pc.k }], complete: true, tiles: 9 });
      }
    }
  }
  if (apply) {
    for (const e of events) {
      if (e.winners.length) award(state, e.winners, e.points, e.kind);
      returnPieces(state, e.meeples);
    }
  }
  return events;
}

function sameAction(a, b) {
  return a.kind === b.kind && a.key === b.key && a.fi === b.fi && a.k === b.k;
}

// Finish the current turn: perform the follower-phase action (or pass with
// null), score, then hand over to the next player and draw their tile.
export function finishTurn(state, act = null) {
  if (state.phase !== 'action') throw new Error('Not in action phase');
  if (typeof act === 'number') act = { kind: 'follower', key: state.last, fi: act, k: 'meeple' };
  const events = [];
  if (act) {
    const legal = followerOptions(state).find((o) => sameAction(o, act));
    if (!legal) throw new Error('Illegal action');
    if (act.kind === 'follower') {
      state.board[act.key].pieces.push({ p: state.current, f: act.fi, k: act.k });
      state.players[state.current].supply[act.k]--;
    }
  }
  events.push(...scoreAfterPlacement(state, state.last, true));
  endTurn(state);
  return events;
}

function endTurn(state) {
  state.current = (state.current + 1) % state.players.length;
  state.turn++;
  drawTile(state);
  if (!state.drawn) {
    state.phase = 'over';
    state.finalEvents = finalScoring(state);
  } else {
    state.phase = 'place';
  }
}

// Apply one serialisable action (used for network play and replays).
//   { t: 'turn', x, y, r, act }   place the drawn tile, then do act (or null)
//   { t: 'kind', seat, kind, level }   switch a seat between person and bot
export function applyAction(state, a) {
  let events = [];
  if (a.t === 'turn') {
    placeTile(state, a.x, a.y, a.r);
    events = finishTurn(state, a.act || null);
  } else if (a.t === 'kind') {
    const p = state.players[a.seat];
    p.kind = a.kind;
    if (a.level) p.level = a.level;
  } else {
    throw new Error(`Unknown action ${a.t}`);
  }
  state.seq = (state.seq || 0) + 1;
  return events;
}

// End-of-game scoring of everything still on the board.
export function finalScoring(state, apply = true) {
  const board = state.board;
  const events = [];
  const seen = new Set();
  for (const [k, tile] of Object.entries(board)) {
    for (const pc of tile.pieces) {
      const feat = TILE_TYPES[tile.t].features[pc.f];
      if (feat.type === 'monastery') {
        const [x, y] = parseKey(k);
        const n = monasteryNeighbours(board, x, y);
        events.push({ kind: 'monastery', winners: [pc.p], points: 1 + n, nodes: [[k, pc.f]], meeples: [{ key: k, p: pc.p, f: pc.f, k: pc.k }], complete: false, tiles: 1 + n });
        continue;
      }
      const g = getGroup(board, k, pc.f);
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      if (g.type === 'field') {
        const cities = fieldCities(board, g).filter((c) => c.complete);
        events.push({ kind: 'field', winners: owners(g.meeples), points: 3 * cities.length, nodes: g.nodes, meeples: g.meeples, cities: cities.map((c) => c.nodes), complete: false, tiles: g.tiles.size });
      } else {
        events.push({ kind: g.type, winners: owners(g.meeples), points: groupPoints(g), nodes: g.nodes, meeples: g.meeples, complete: false, tiles: g.tiles.size });
      }
    }
  }
  // Order like the rulebook: roads, cities, monasteries, then farms.
  const order = { road: 0, city: 1, monastery: 2, field: 3 };
  events.sort((a, b) => order[a.kind] - order[b.kind]);
  if (apply) {
    for (const e of events) {
      if (e.winners.length && e.points) award(state, e.winners, e.points, e.kind);
      returnPieces(state, e.meeples);
    }
  }
  return events;
}

// Snapshot of what a feature would score right now (for UI hints).
export function describeGroup(state, k, fi) {
  const g = getGroup(state.board, k, fi);
  return { ...g, points: groupPoints(g), owners: owners(g.meeples) };
}

// Pieces currently on the board, as a flat list.
export function piecesOnBoard(state) {
  const out = [];
  for (const [k, t] of Object.entries(state.board)) for (const pc of t.pieces) out.push({ key: k, ...pc });
  return out;
}
