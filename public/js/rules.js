// Illustrated "How to play" guide, drawn with the same tile art as the game.
import { TILE_TYPES } from './tiles.js';
import { getTileArt, drawMeeple, rotUnit, getTableTexture } from './art.js';
import { PLAYER_COLORS, getGroup, key, neighbour, edgeType } from './game.js';
import { featureMask } from './board.js';

// tiles: [[x, y, type, rot, meeple?: [colorName, featureIndex]]]
export function renderMini(tiles, { px = 74, highlight = null, highlightColor = '#ffd84a', pad = 0.35, marks = [] } = {}) {
  const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = (maxX - minX + 1 + pad * 2) * px, H = (maxY - minY + 1 + pad * 2) * px;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = W * dpr; c.height = H * dpr; c.style.width = `${W}px`; c.style.height = `${H}px`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const pat = ctx.createPattern(getTableTexture(), 'repeat');
  pat.setTransform(new DOMMatrix().scale(0.6));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  const pos = (x, y) => [(x - minX + pad + 0.5) * px, (y - minY + pad + 0.5) * px];
  for (const [x, y] of tiles) {
    const [sx, sy] = pos(x, y);
    ctx.fillStyle = 'rgba(10,5,0,0.45)'; ctx.fillRect(sx - px / 2 + px * 0.04, sy - px / 2 + px * 0.06, px, px);
  }
  const board = {};
  for (const [x, y, t, r] of tiles) board[key(x, y)] = { t, r, m: null };
  for (const [x, y] of tiles) for (const s of [1, 2]) {
    const nb = neighbour(board, x, y, s);
    if (nb && edgeType(board[key(x, y)], s) !== edgeType(nb, (s + 2) % 4)) console.warn(`rules figure mismatch at ${x},${y} side ${s}`);
  }
  for (const [x, y, t, r] of tiles) {
    const [sx, sy] = pos(x, y);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate((r * Math.PI) / 2);
    ctx.drawImage(getTileArt(t).canvas, -px / 2, -px / 2, px, px);
    ctx.restore();
  }
  if (highlight) {
    const [hx, hy, hfi] = highlight;
    const g = getGroup(board, key(hx, hy), hfi);
    ctx.save(); ctx.globalAlpha = 0.42;
    for (const [k, fi] of g.nodes) {
      const [x, y] = k.split(',').map(Number); const { t, r } = board[k];
      const [sx, sy] = pos(x, y);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate((r * Math.PI) / 2);
      ctx.drawImage(featureMask(t, fi, highlightColor), -px / 2, -px / 2, px, px);
      ctx.restore();
    }
    ctx.restore();
  }
  for (const [x, y, t, r, m] of tiles) {
    if (!m) continue;
    const [sx, sy] = pos(x, y);
    const [ax, ay] = getTileArt(t).anchors[m[1]];
    const [rx, ry] = rotUnit(ax, ay, r);
    drawMeeple(ctx, sx + (rx - 0.5) * px, sy + (ry - 0.5) * px, px * 0.32, PLAYER_COLORS[m[0]], { lying: TILE_TYPES[t].features[m[1]].type === 'field' });
  }
  for (const [x, y, text, color] of marks) {
    const [sx, sy] = pos(x, y);
    ctx.font = `900 ${Math.round(px * 0.42)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(text, sx, sy);
    ctx.fillStyle = color || '#fff'; ctx.fillText(text, sx, sy);
  }
  return c;
}

function section(icon, title, html, figs = []) {
  const el = document.createElement('div');
  el.className = 'rule';
  el.innerHTML = `<h3><span>${icon}</span>${title}</h3>${html}`;
  for (const [canvas, cap] of figs) {
    const f = document.createElement('div'); f.className = 'fig'; f.appendChild(canvas); el.appendChild(f);
    if (cap) { const c = document.createElement('div'); c.className = 'cap'; c.innerHTML = cap; el.appendChild(c); }
  }
  return el;
}

export function buildRules(root) {
  root.innerHTML = '';
  const add = (...a) => root.appendChild(section(...a));

  add('🏰', 'The Goal',
    `<p>Together you build the countryside around the French city of <b>Carcassonne</b>, one tile at a time. Put your <b>followers</b> (meeples) on roads, cities, monasteries and fields to score points.</p>
     <p>When the last tile is placed, the player with the <b>most points wins!</b></p>`,
    [[renderMini([[0, 0, 'D', 0, ['red', 1]], [1, 0, 'V', 0], [0, -1, 'R', 1, ['blue', 0]], [-1, 0, 'W', 0], [-1, -1, 'B', 0, ['green', 0]], [1, -1, 'N', 0], [-1, 1, 'V', 1], [0, 1, 'A', 0]], { px: 70 }), 'A small Carcassonne countryside with three followers.']]);

  add('🎲', 'Your Turn (3 steps)',
    `<p><b>1. Place a tile.</b> Every tile must touch the map, and <b>every edge must match</b>: road to road, city to city, field to field. Tap a glowing square, then tap again (or ⟳) to spin it.</p>
     <p><b>2. Place a follower</b> <i>(if you want)</i> on the tile you just placed — but only on a road, city, monastery or field that <b>nobody has claimed yet</b>.</p>
     <p><b>3. Score</b> any road, city or monastery that got finished. The followers on it come back to their owners!</p>`,
    [[renderMini([[0, 0, 'D', 0], [1, 0, 'K', 0], [0, -1, 'E', 2]], { px: 78, marks: [[1, 0, '✓', '#6dff6d']] }), 'The new tile on the right matches its road and city edges.']]);

  add('🛣️', 'Roads — the Thief',
    `<p>A road is <b>finished</b> when both ends stop at a crossroads, a city, a monastery, or it loops around.</p>
     <p>Scores <span class="pts">1 point per tile</span>.</p>`,
    [[renderMini([[0, 0, 'X', 0], [1, 0, 'U', 1, ['red', 0]], [2, 0, 'L', 0]], { px: 78, highlight: [1, 0, 0] }), 'A finished 3-tile road: Red scores <b>3</b>.']]);

  add('🏯', 'Cities — the Knight',
    `<p>A city is <b>finished</b> when its walls are fully closed with no gaps.</p>
     <p>Scores <span class="pts">2 per tile</span> + <span class="pts">2 per blue shield</span> 🛡️.</p>`,
    [[renderMini([[0, 0, 'E', 0, ['blue', 0]], [0, -1, 'M', 2], [1, -1, 'E', 3]], { px: 78, highlight: [0, 0, 0] }), '3 tiles + 1 shield = <b>8 points</b> for Blue.']]);

  add('⛪', 'Monasteries — the Monk',
    `<p>A monastery is finished when it is <b>completely surrounded</b> by 8 tiles.</p>
     <p>Scores <span class="pts">9 points</span> (1 for itself + 1 for each neighbour).</p>`,
    [[renderMini([[0, 0, 'B', 0, ['yellow', 0]], [-1, -1, 'V', 3], [0, -1, 'U', 1], [1, -1, 'V', 0], [-1, 0, 'U', 0], [1, 0, 'U', 0], [-1, 1, 'V', 2], [0, 1, 'U', 1], [1, 1, 'V', 1]], { px: 60, highlight: [0, 0, 0] }), 'Surrounded on all sides — Yellow scores <b>9</b>!']]);

  add('🤝', 'Sharing &amp; Stealing',
    `<p>You can't put a follower on a road or city that is <b>already claimed</b>. But — sneaky trick — you can place one on a <b>separate</b> piece and join them up later!</p>
     <p>When it scores, whoever has <b>the most followers</b> on it gets all the points. <b>Ties?</b> Everyone tied gets the full points.</p>`,
    [[renderMini([[0, 0, 'E', 2, ['red', 0]], [0, 1, 'C', 0], [1, 1, 'E', 3, ['blue', 0]], [0, 2, 'E', 0], [-1, 1, 'E', 1]], { px: 64, highlight: [0, 1, 0] }), 'Red and Blue joined their cities — a tie, so both score <b>12</b>.']]);

  add('🌾', 'Fields — the Farmer',
    `<p>Farmers <b>lie down</b> in a field and stay there until the end of the game. Fields are split up by roads and city walls.</p>
     <p>At the end each field scores <span class="pts">3 per finished city</span> it touches, for the player with the most farmers in it.</p>`,
    [[renderMini([[0, 0, 'E', 0, ['green', 1]], [0, -1, 'E', 2], [1, 0, 'U', 0], [-1, 0, 'H', 1]], { px: 74, highlight: [0, 0, 1], highlightColor: '#aaff66' }), 'The green field touches 1 finished city → <b>3 points</b> at the end.']]);

  add('🏁', 'End of the Game',
    `<p>After the last tile, unfinished things still score for their followers:</p>
     <div class="score-grid">
       <div class="h"></div><div class="h">Finished</div><div class="h">Unfinished</div>
       <div>🛣️ Road</div><div>1 / tile</div><div>1 / tile</div>
       <div>🏯 City</div><div>2 / tile + 2 / 🛡️</div><div>1 / tile + 1 / 🛡️</div>
       <div>⛪ Monastery</div><div>9</div><div>1 + neighbours</div>
       <div>🌾 Field</div><div>—</div><div>3 / finished city</div>
     </div>`);

  add('💡', 'Tips for Young Knights',
    `<p>• Keep a couple of followers in reserve — running out is painful!</p>
     <p>• Small cities are quick points; big cities with shields are worth a lot but may never be finished.</p>
     <p>• Monasteries in the middle of the map fill up fast.</p>
     <p>• Put a farmer down mid-game next to lots of cities — but remember they never come back.</p>
     <p>• Watch out: a tile that fits nowhere is thrown out and you draw again.</p>`);

  // Tile gallery
  const gallery = document.createElement('div');
  gallery.className = 'tile-strip';
  for (const [id, t] of Object.entries(TILE_TYPES)) {
    const fig = document.createElement('figure');
    const c = document.createElement('canvas'); c.width = c.height = 124;
    c.getContext('2d').drawImage(getTileArt(id).canvas, 0, 0, 124, 124);
    fig.appendChild(c);
    fig.appendChild(document.createTextNode(`×${t.count}${id === 'D' ? ' ★' : ''}`));
    gallery.appendChild(fig);
  }
  const g = section('🧩', 'All 72 Tiles', '<p>The full base-game set. ★ includes the start tile.</p>');
  g.appendChild(gallery);
  root.appendChild(g);

  add('📱', 'Using the App',
    `<p>• <b>Drag</b> to move around the map, <b>pinch</b> to zoom. ⌖ shows the whole map.</p>
     <p>• Tap a <b>glowing square</b> to put your tile there. Tap the tile again or ⟳ to turn it. Bright gold squares fit the way your tile is turned right now.</p>
     <p>• Press <b>✓</b> to lock it in. Then tap a <b>ghost meeple</b> to claim something (the whole road/city lights up), or just press ✓ to skip.</p>
     <p>• <b>↶</b> takes back your tile before you finish your turn. <b>💡</b> gives a hint.</p>`);
}
