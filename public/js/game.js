// Pure, deterministic rules engine for Carcassonne (3rd-edition rules) with
// the expansions The River, The Abbot, Inns & Cathedrals, Traders & Builders.
// Every state change is driven by serialisable actions so that several phones
// can replay exactly the same game (see applyAction).
import { TILE_TYPES, buildDeck, rotPort, oppositePort, SIDE_DELTA, RIVER_SPRING, isRiverTile } from './tiles.js';

export const MEEPLES_PER_PLAYER = 7;
export const PLAYER_COLORS = {
  red: { name: 'Red', main: '#b8342c', dark: '#6e1a14', light: '#f08070' },
  blue: { name: 'Blue', main: '#2d5aa0', dark: '#16305f', light: '#8fb0e8' },
  green: { name: 'Green', main: '#3f7d3a', dark: '#1d421b', light: '#9ad88f' },
  yellow: { name: 'Yellow', main: '#d9a72a', dark: '#7a5a0c', light: '#ffe08a' },
  black: { name: 'Black', main: '#2b2b2b', dark: '#0e0e0e', light: '#a0a0a8' },
  pink: { name: 'Pink', main: '#c4568f', dark: '#6a2349', light: '#f5a8cf' },
};

// Figures a player can have on the board. weight = strength when counting
// who has the most followers in a feature (builder and pig never count).
export const PIECES = {
  meeple: { weight: 1, follower: true, name: 'Meeple' },
  large: { weight: 2, follower: true, name: 'Big meeple' },
  abbot: { weight: 1, follower: true, name: 'Abbot' },
  builder: { weight: 0, follower: false, name: 'Builder' },
  pig: { weight: 0, follower: false, name: 'Pig' },
};
export const GOODS = ['wine', 'grain', 'cloth'];

export const key = (x, y) => `${x},${y}`;
export const parseKey = (k) => k.split(',').map(Number);
export const hasExp = (state, id) => !!state.options?.expansions?.[id];

export function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newGame(players, options = {}, rnd = Math.random) {
  const opts = { farmers: true, hints: true, ...options, expansions: { ...(options.expansions || {}) } };
  const exp = opts.expansions;
  const { start, deck } = buildDeck(exp, rnd);
  const supply = () => {
    const s = { meeple: MEEPLES_PER_PLAYER };
    if (exp.inns) s.large = 1;
    if (exp.abbot) s.abbot = 1;
    if (exp.traders) { s.builder = 1; if (opts.farmers !== false) s.pig = 1; }
    return s;
  };
  const state = {
    version: 3,
    options: opts,
    players: players.map((p) => ({
      name: p.name, color: p.color, kind: p.kind || 'human', level: p.level || 'medium',
      score: 0,
      supply: supply(),
      goods: exp.traders ? { wine: 0, grain: 0, cloth: 0 } : undefined,
      breakdown: { road: 0, city: 0, monastery: 0, field: 0, goods: 0 },
    })),
    board: { [key(0, 0)]: { t: start, r: 0, pieces: [], n: 0 } },
    deck,
    current: 0,
    drawn: null,
    phase: 'place',
    turn: 1,
    part: 1, // 2 = the builder's extra tile
    bonus: false,
    placed: 1,
    last: null,
    discarded: [],
    seq: 0,
  };
  if (start === RIVER_SPRING) {
    const rs = riverSidesWorld(start, 0);
    state.river = { open: { x: 0, y: 0, side: rs[0] }, lastIn: null };
  }
  drawTile(state);
  return state;
}

export const cloneState = (s) => JSON.parse(JSON.stringify(s));

// Bring a saved game from an older version of the app up to date.
export function migrate(s) {
  if (!s) return s;
  if (s.version < 2) {
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
  }
  if (s.version < 3) {
    s.part = s.part || 1;
    s.bonus = !!s.bonus;
    for (const p of s.players) p.breakdown.goods = p.breakdown.goods || 0;
    s.version = 3;
  }
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
export function riverSidesWorld(t, r) {
  const f = TILE_TYPES[t].features.find((ff) => ff.type === 'river');
  return f ? f.sides.map((s) => (s + r) % 4) : [];
}

function edgesMatch(board, x, y, t, r) {
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

export function canPlace(state, x, y, t, r) {
  const board = state.board;
  if (board[key(x, y)]) return false;
  if (!edgesMatch(board, x, y, t, r)) return false;
  if (isRiverTile(t)) {
    // The River: continue the open end, never two bends the same way in a row.
    const rv = state.river;
    if (!rv || !rv.open) return false;
    const [dx, dy] = SIDE_DELTA[rv.open.side];
    if (x !== rv.open.x + dx || y !== rv.open.y + dy) return false;
    const rs = riverSidesWorld(t, r);
    const entry = (rv.open.side + 2) % 4;
    if (!rs.includes(entry)) return false;
    const exit = rs.find((s) => s !== entry);
    if (exit !== undefined && rv.lastIn !== null && exit === (rv.lastIn + 2) % 4) return false;
  }
  return true;
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
  let openEdges = 0, pennants = 0, inn = false, cathedral = false;
  const goods = {};
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
    if (feat.inn) inn = true;
    if (feat.cathedral) cathedral = true;
    if (feat.goods) goods[feat.goods] = (goods[feat.goods] || 0) + 1;
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
  const singular = type === 'monastery' || type === 'garden';
  return {
    id, type, nodes, tiles, openEdges, pennants, inn, cathedral, goods, meeples,
    complete: type !== 'field' && !singular && openEdges === 0,
  };
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

// Points a road or city is worth. Unfinished values are those of the final
// scoring (an unfinished road with an inn or city with a cathedral scores 0).
export function groupPoints(g) {
  if (g.type === 'road') {
    if (g.complete) return g.tiles.size * (g.inn ? 2 : 1);
    return g.inn ? 0 : g.tiles.size;
  }
  if (g.type === 'city') {
    if (g.complete) return (g.tiles.size + g.pennants) * (g.cathedral ? 3 : 2);
    return g.cathedral ? 0 : g.tiles.size + g.pennants;
  }
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
  const t = state.drawn;
  state.board[k] = { t, r, pieces: [], n: state.placed++ };
  state.last = k;
  state.drawn = null;
  state.phase = 'action';
  if (isRiverTile(t) && state.river?.open) {
    const entry = (state.river.open.side + 2) % 4;
    const exit = riverSidesWorld(t, r).find((s) => s !== entry);
    state.river = { lastIn: state.river.open.side, open: exit === undefined ? null : { x, y, side: exit } };
  }
  // Traders & Builders: extending the road/city with your builder earns a second tile.
  state.bonus = false;
  if (state.part === 1 && hasExp(state, 'traders')) {
    const b = findPiece(state, state.current, 'builder');
    if (b) {
      const feats = TILE_TYPES[t].features;
      for (let fi = 0; fi < feats.length && !state.bonus; fi++) {
        if (feats[fi].type !== 'road' && feats[fi].type !== 'city') continue;
        const g = getGroup(state.board, k, fi);
        if (g.nodes.some(([nk, nf]) => nk === b.key && nf === b.f)) state.bonus = true;
      }
    }
  }
}

export function findPiece(state, p, kind) {
  for (const [k, t] of Object.entries(state.board)) {
    for (const pc of t.pieces) if (pc.p === p && pc.k === kind) return { key: k, ...pc };
  }
  return null;
}

const isFollower = (m) => (m.w ?? weightOf(m.k)) > 0;
const supportsFigure = (m, p) => m.p === p && (m.k === 'meeple' || m.k === 'large');

// Everything the current player may do after placing a tile (besides passing).
// Each option is an action object accepted by finishTurn.
export function followerOptions(state) {
  if (state.phase !== 'action' || !state.last) return [];
  const p = state.current;
  const pl = state.players[p];
  const out = [];
  const k = state.last;
  const tile = state.board[k];
  const feats = TILE_TYPES[tile.t].features;
  const farmers = state.options.farmers !== false;
  const sizes = ['meeple', 'large'].filter((s) => pl.supply[s] > 0);
  feats.forEach((f, fi) => {
    if (f.type === 'river') return;
    if (f.type === 'garden') {
      if (pl.supply.abbot > 0 && !tile.pieces.some((pc) => pc.f === fi)) out.push({ kind: 'follower', key: k, fi, k: 'abbot' });
      return;
    }
    if (f.type === 'monastery') {
      if (tile.pieces.some((pc) => pc.f === fi)) return;
      for (const s of sizes) out.push({ kind: 'follower', key: k, fi, k: s });
      if (pl.supply.abbot > 0) out.push({ kind: 'follower', key: k, fi, k: 'abbot' });
      return;
    }
    if (f.type === 'field' && !farmers) return;
    const g = getGroup(state.board, k, fi);
    const occupied = g.meeples.some(isFollower);
    if (!occupied) for (const s of sizes) out.push({ kind: 'follower', key: k, fi, k: s });
    // Traders & Builders: builder next to your own knight/highwayman, pig next to your farmer
    if ((f.type === 'road' || f.type === 'city') && pl.supply.builder > 0 && !g.complete && g.meeples.some((m) => supportsFigure(m, p))) {
      out.push({ kind: 'follower', key: k, fi, k: 'builder' });
    }
    if (f.type === 'field' && pl.supply.pig > 0 && g.meeples.some((m) => supportsFigure(m, p))) {
      out.push({ kind: 'follower', key: k, fi, k: 'pig' });
    }
  });
  // The Abbot: call your abbot home from an unfinished monastery or garden and score it now.
  if (hasExp(state, 'abbot')) {
    const a = findPiece(state, p, 'abbot');
    if (a) {
      const [x, y] = parseKey(a.key);
      if (monasteryNeighbours(state.board, x, y) < 8) out.push({ kind: 'recall', key: a.key, fi: a.f });
    }
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

// Builders and pigs need one of their owner's meeples in the same feature;
// when the last one leaves (scoring, dragon, princess, tower) they go home.
export function unsupportedFigures(state) {
  const out = [];
  for (const [k, tile] of Object.entries(state.board)) {
    for (const pc of tile.pieces) {
      if (pc.k !== 'builder' && pc.k !== 'pig') continue;
      const g = getGroup(state.board, k, pc.f);
      if (!g.meeples.some((m) => supportsFigure(m, pc.p))) out.push({ key: k, p: pc.p, f: pc.f, k: pc.k });
    }
  }
  return out;
}

// Monasteries and gardens around (x, y) holding a figure and now surrounded.
function completedCloisters(board, x, y) {
  const out = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const mk = key(x + dx, y + dy);
    const mt = board[mk];
    if (!mt) continue;
    for (const pc of mt.pieces) {
      const feat = TILE_TYPES[mt.t].features[pc.f];
      if (feat.type !== 'monastery' && feat.type !== 'garden') continue;
      if (monasteryNeighbours(board, x + dx, y + dy) === 8) {
        out.push({ kind: feat.type, winners: [pc.p], points: 9, nodes: [[mk, pc.f]], meeples: [{ key: mk, p: pc.p, f: pc.f, k: pc.k }], complete: true, tiles: 9 });
      }
    }
  }
  return out;
}

// Scoring caused by the tile at k. Mutates state when apply=true.
export function scoreAfterPlacement(state, k, apply = true) {
  const events = [];
  const board = state.board;
  const tile = board[k];
  const seen = new Set();
  const goodsEvents = [];
  TILE_TYPES[tile.t].features.forEach((f, fi) => {
    if (f.type !== 'road' && f.type !== 'city') return;
    const g = getGroup(board, k, fi);
    if (seen.has(g.id)) return;
    seen.add(g.id);
    if (!g.complete) return;
    const winners = owners(g.meeples);
    const pts = groupPoints(g);
    events.push({
      kind: g.type, winners, points: pts, nodes: g.nodes, meeples: g.meeples, complete: true, tiles: g.tiles.size,
      inn: g.inn, cathedral: g.cathedral,
    });
    // Traders & Builders: the player who completes a city takes its goods
    if (g.type === 'city' && Object.keys(g.goods).length) {
      goodsEvents.push({ kind: 'goods', winners: [], player: state.current, goods: { ...g.goods }, points: 0, nodes: g.nodes, meeples: [] });
    }
  });
  const [x, y] = parseKey(k);
  events.push(...completedCloisters(board, x, y));
  if (apply) {
    for (const e of events) {
      if (e.winners.length) award(state, e.winners, e.points, e.kind === 'garden' ? 'monastery' : e.kind);
      returnPieces(state, e.meeples);
    }
    for (const e of goodsEvents) {
      const pl = state.players[e.player];
      for (const [gname, n] of Object.entries(e.goods)) pl.goods[gname] = (pl.goods[gname] || 0) + n;
    }
  }
  return events.concat(goodsEvents);
}

function sameAction(a, b) {
  return a.kind === b.kind && a.key === b.key && a.fi === b.fi && (a.k || null) === (b.k || null);
}

// Finish the current part of the turn: perform the follower-phase action (or
// pass with null), score, then continue with the builder's extra tile or hand
// over to the next player.
export function finishTurn(state, act = null) {
  if (state.phase !== 'action') throw new Error('Not in action phase');
  if (typeof act === 'number') act = { kind: 'follower', key: state.last, fi: act, k: 'meeple' };
  const events = [];
  if (act) {
    const legal = followerOptions(state).find((o) => sameAction(o, act));
    if (!legal) throw new Error('Illegal action');
    const pl = state.players[state.current];
    if (act.kind === 'follower') {
      state.board[act.key].pieces.push({ p: state.current, f: act.fi, k: act.k });
      pl.supply[act.k]--;
    } else if (act.kind === 'recall') {
      const [x, y] = parseKey(act.key);
      const pts = 1 + monasteryNeighbours(state.board, x, y);
      const piece = { key: act.key, p: state.current, f: act.fi, k: 'abbot' };
      award(state, [state.current], pts, 'monastery');
      returnPieces(state, [piece]);
      events.push({ kind: 'recall', winners: [state.current], points: pts, nodes: [[act.key, act.fi]], meeples: [piece], label: 'Abbot comes home' });
    }
  }
  events.push(...scoreAfterPlacement(state, state.last, true));
  const loose = unsupportedFigures(state);
  if (loose.length) {
    returnPieces(state, loose);
    events.push({ kind: 'return', winners: [], points: 0, nodes: [], meeples: loose });
  }
  endPart(state, events);
  return events;
}

function endPart(state, events) {
  if (state.bonus && state.part === 1) {
    // the builder's extra tile: same player, draw again
    state.part = 2;
    state.bonus = false;
    drawTile(state);
    if (state.drawn) {
      state.phase = 'place';
      events.push({ kind: 'bonus', winners: [], points: 0, nodes: [], meeples: [], player: state.current });
      return;
    }
    gameOver(state);
    return;
  }
  endTurn(state);
}

function endTurn(state) {
  state.part = 1;
  state.bonus = false;
  state.current = (state.current + 1) % state.players.length;
  state.turn++;
  drawTile(state);
  if (!state.drawn) gameOver(state);
  else state.phase = 'place';
}

function gameOver(state) {
  state.phase = 'over';
  state.finalEvents = finalScoring(state);
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
      if (feat.type === 'monastery' || feat.type === 'garden') {
        if (!isFollower(pc)) continue;
        const [x, y] = parseKey(k);
        const n = monasteryNeighbours(board, x, y);
        events.push({ kind: feat.type, winners: [pc.p], points: 1 + n, nodes: [[k, pc.f]], meeples: [{ key: k, p: pc.p, f: pc.f, k: pc.k }], complete: false, tiles: 1 + n });
        continue;
      }
      const g = getGroup(board, k, pc.f);
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      if (g.type === 'field') {
        const cities = fieldCities(board, g).filter((c) => c.complete);
        const winners = owners(g.meeples);
        events.push({ kind: 'field', winners, points: 3 * cities.length, nodes: g.nodes, meeples: g.meeples, cities: cities.map((c) => c.nodes), cityCount: cities.length, complete: false, tiles: g.tiles.size });
        // Traders & Builders: a winning farmer with their pig earns +1 per city
        const pigs = [...new Set(g.meeples.filter((m) => m.k === 'pig' && winners.includes(m.p)).map((m) => m.p))];
        if (pigs.length && cities.length) {
          events.push({ kind: 'pig', winners: pigs, points: cities.length, nodes: g.nodes, meeples: [], label: 'Pig bonus', complete: false });
        }
      } else {
        events.push({ kind: g.type, winners: owners(g.meeples), points: groupPoints(g), nodes: g.nodes, meeples: g.meeples, complete: false, tiles: g.tiles.size, inn: g.inn, cathedral: g.cathedral });
      }
    }
  }
  // Order like the rulebook: roads, cities, monasteries & gardens, farms (+ pig bonus).
  const order = { road: 0, city: 1, monastery: 2, garden: 2, field: 3, pig: 4 };
  events.sort((a, b) => order[a.kind] - order[b.kind]);
  // Traders & Builders: 10 points for the most of each trade good (ties all score)
  if (hasExp(state, 'traders')) {
    for (const gname of GOODS) {
      const counts = state.players.map((p) => p.goods?.[gname] || 0);
      const max = Math.max(...counts);
      if (max <= 0) continue;
      const winners = counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
      events.push({ kind: 'goods', good: gname, winners, points: 10, nodes: [], meeples: [], label: `Most ${gname}`, complete: false });
    }
  }
  if (apply) {
    for (const e of events) {
      const cat = e.kind === 'garden' ? 'monastery' : e.kind === 'pig' ? 'field' : e.kind;
      if (e.winners.length && e.points) award(state, e.winners, e.points, cat);
      if (e.meeples?.length) returnPieces(state, e.meeples);
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
