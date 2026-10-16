// Carcassonne base game tile set (3rd edition, 72 tiles incl. start tile).
//
// Every tile edge is split into 3 "ports", numbered clockwise from the
// north-west corner:
//        0  1  2
//    11           3
//    10  (tile)   4
//     9           5
//        8  7  6
// Side s (0=N,1=E,2=S,3=W) owns ports 3s, 3s+1, 3s+2; the centre port 3s+1
// carries a road when there is one. A feature lists the ports it touches.
// Field features also list the indices of the city features they border.

export const N = 0, E = 1, S = 2, W = 3;
const side = (s) => [3 * s, 3 * s + 1, 3 * s + 2];

const city = (sides, pennant = false) => ({ type: 'city', sides, ports: sides.flatMap(side), pennant });
const road = (sides) => ({ type: 'road', sides, ports: sides.map((s) => 3 * s + 1) });
const field = (ports, cities = []) => ({ type: 'field', ports, cities });
const monastery = () => ({ type: 'monastery', sides: [], ports: [] });

export const TILE_TYPES = {
  A: { count: 2, name: 'Monastery with road', features: [monastery(), road([S]), field([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11])] },
  B: { count: 4, name: 'Monastery', features: [monastery(), field([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])] },
  C: { count: 1, name: 'Fortified city', features: [city([N, E, S, W], true)] },
  D: { count: 4, name: 'City with straight road', features: [city([N]), road([W, E]), field([11, 3], [0]), field([5, 6, 7, 8, 9])] },
  E: { count: 5, name: 'City edge', features: [city([N]), field([3, 4, 5, 6, 7, 8, 9, 10, 11], [0])] },
  F: { count: 2, name: 'City bridge with shield', features: [city([E, W], true), field([0, 1, 2], [0]), field([6, 7, 8], [0])] },
  G: { count: 1, name: 'City bridge', features: [city([E, W]), field([0, 1, 2], [0]), field([6, 7, 8], [0])] },
  H: { count: 3, name: 'Two city caps', features: [city([E]), city([W]), field([0, 1, 2, 6, 7, 8], [0, 1])] },
  I: { count: 2, name: 'Corner city caps', features: [city([N]), city([E]), field([6, 7, 8, 9, 10, 11], [0, 1])] },
  J: { count: 3, name: 'City with right bend', features: [city([N]), road([E, S]), field([5, 6]), field([8, 9, 10, 11, 3], [0])] },
  K: { count: 3, name: 'City with left bend', features: [city([N]), road([S, W]), field([8, 9]), field([11, 3, 4, 5, 6], [0])] },
  L: { count: 3, name: 'City with crossroads', features: [city([N]), road([E]), road([S]), road([W]), field([5, 6]), field([8, 9]), field([11, 3], [0])] },
  M: { count: 2, name: 'City corner with shield', features: [city([N, W], true), field([3, 4, 5, 6, 7, 8], [0])] },
  N: { count: 3, name: 'City corner', features: [city([N, W]), field([3, 4, 5, 6, 7, 8], [0])] },
  O: { count: 2, name: 'City corner, shield & road', features: [city([N, W], true), road([E, S]), field([5, 6]), field([3, 8], [0])] },
  P: { count: 3, name: 'City corner & road', features: [city([N, W]), road([E, S]), field([5, 6]), field([3, 8], [0])] },
  Q: { count: 1, name: 'Big city with shield', features: [city([N, E, W], true), field([6, 7, 8], [0])] },
  R: { count: 3, name: 'Big city', features: [city([N, E, W]), field([6, 7, 8], [0])] },
  S: { count: 2, name: 'Big city, shield & gate', features: [city([N, E, W], true), road([S]), field([6], [0]), field([8], [0])] },
  T: { count: 1, name: 'Big city & gate', features: [city([N, E, W]), road([S]), field([6], [0]), field([8], [0])] },
  U: { count: 8, name: 'Straight road', features: [road([N, S]), field([2, 3, 4, 5, 6]), field([8, 9, 10, 11, 0])] },
  V: { count: 9, name: 'Curved road', features: [road([S, W]), field([8, 9]), field([11, 0, 1, 2, 3, 4, 5, 6])] },
  W: { count: 4, name: 'Three-way junction', features: [road([E]), road([S]), road([W]), field([5, 6]), field([8, 9]), field([11, 0, 1, 2, 3])] },
  X: { count: 1, name: 'Crossroads', features: [road([N]), road([E]), road([S]), road([W]), field([2, 3]), field([5, 6]), field([8, 9]), field([11, 0])] },
};

export const START_TILE = 'D';

for (const [id, t] of Object.entries(TILE_TYPES)) {
  t.id = id;
  // portFeature[p] = index of the feature touching port p (unrotated)
  t.portFeature = new Array(12).fill(-1);
  t.features.forEach((f, i) => f.ports.forEach((p) => {
    if (t.portFeature[p] !== -1) throw new Error(`Tile ${id}: port ${p} claimed twice`);
    t.portFeature[p] = i;
  }));
  if (!t.features.some((f) => f.type === 'city' && f.sides.length === 4) && t.portFeature.includes(-1)) {
    throw new Error(`Tile ${id}: unassigned port ${t.portFeature.indexOf(-1)}`);
  }
  // edge type of each side, unrotated
  t.edges = [0, 1, 2, 3].map((s) => t.features[t.portFeature[3 * s + 1]].type);
}

export function buildDeck() {
  const deck = [];
  for (const [id, t] of Object.entries(TILE_TYPES)) {
    const n = id === START_TILE ? t.count - 1 : t.count;
    for (let i = 0; i < n; i++) deck.push(id);
  }
  return deck; // 71 tiles; the start tile is placed separately
}

// Rotate an unrotated port by `rot` clockwise quarter turns.
export const rotPort = (p, rot) => (p + 3 * rot) % 12;
// The port on the neighbouring tile that touches world port p.
export const oppositePort = (p) => {
  const s = Math.floor(p / 3), i = p % 3;
  return 3 * ((s + 2) % 4) + (2 - i);
};
export const SIDE_DELTA = [[0, -1], [1, 0], [0, 1], [-1, 0]];
