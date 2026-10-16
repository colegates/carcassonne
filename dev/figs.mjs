import * as G from '../public/js/game.js';
const figs = {
  goal: { tiles: [[0, 0, 'D', 0], [1, 0, 'V'], [0, -1, 'R'], [-1, 0, 'W'], [-1, -1, 'B', 0], [1, -1, 'N'], [-1, 1, 'V'], [0, 1, 'A']] },
  turn: { tiles: [[0, 0, 'D', 0], [1, 0, 'K'], [0, -1, 'E']] },
  road: { tiles: [[0, 0, 'X', 0], [1, 0, 'U'], [2, 0, 'L']], check: (b) => G.getGroup(b, '1,0', 0).complete },
  city: { tiles: [[0, 0, 'E'], [0, -1, 'M'], [1, -1, 'E']], check: (b) => G.getGroup(b, '0,0', 0).complete },
  mon: { tiles: [[0, 0, 'B', 0], [-1, -1, 'V'], [0, -1, 'U'], [1, -1, 'V'], [-1, 0, 'U'], [1, 0, 'U'], [-1, 1, 'V'], [0, 1, 'U'], [1, 1, 'V']] },
  share: { tiles: [[0, 0, 'E'], [0, 1, 'C', 0], [1, 1, 'E'], [0, 2, 'E'], [-1, 1, 'E']], check: (b) => G.getGroup(b, '0,1', 0).complete },
  farm: { tiles: [[0, 0, 'E', 0], [0, -1, 'E'], [1, 0, 'U'], [-1, 0, 'H']], check: (b) => G.getGroup(b, '0,0', 0).complete },
};
for (const [name, f] of Object.entries(figs)) {
  const free = f.tiles.filter((t) => t[3] === undefined);
  let found = null;
  for (let code = 0; code < 4 ** free.length && !found; code++) {
    let c = code; free.forEach((t) => { t[4] = c % 4; c = Math.floor(c / 4); });
    const b = {};
    for (const t of f.tiles) b[G.key(t[0], t[1])] = { t: t[2], r: t[3] ?? t[4], m: null };
    let ok = true;
    for (const t of f.tiles) for (const s of [1, 2]) { const nb = G.neighbour(b, t[0], t[1], s); if (nb && G.edgeType(b[G.key(t[0], t[1])], s) !== G.edgeType(nb, (s + 2) % 4)) ok = false; }
    if (ok && f.check && !f.check(b)) ok = false;
    if (ok) found = f.tiles.map((t) => [t[0], t[1], t[2], t[3] ?? t[4]]);
  }
  console.log(name, JSON.stringify(found));
}
