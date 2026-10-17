// Illustrated "How to play" guide, drawn with the same tile art as the game.
import { TILE_TYPES } from './tiles.js';
import { getTileArt, drawPiece, drawTower, rotUnit, getTableTexture, DRAGON_COLOR, FAIRY_COLOR } from './art.js';
import { PLAYER_COLORS, getGroup, key, neighbour, edgeType } from './game.js';
import { featureMask } from './board.js';

// tiles: [[x, y, type, rot, meeple?: [colorName, featureIndex, kind?]]]
// extras: [{ kind: 'dragon' | 'fairy' | 'tower', x, y, u?, v?, h?, top?: colorName }]
export function renderMini(tiles, { px = 74, highlight = null, highlightColor = '#ffd84a', pad = 0.35, marks = [], extras = [] } = {}) {
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
  for (const [x, y, t, r] of tiles) board[key(x, y)] = { t, r, pieces: [] };
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
    drawPiece(ctx, m[2] || 'meeple', sx + (rx - 0.5) * px, sy + (ry - 0.5) * px, px * 0.32, PLAYER_COLORS[m[0]], { lying: TILE_TYPES[t].features[m[1]].type === 'field' });
  }
  for (const e of extras) {
    const [sx, sy] = pos(e.x, e.y);
    const { t, r } = board[key(e.x, e.y)];
    if (e.kind === 'tower') {
      const f = TILE_TYPES[t].foundation || [0.5, 0.5];
      const [rx, ry] = rotUnit(f[0], f[1], r);
      const bx = sx + (rx - 0.5) * px, by = sy + (ry - 0.5) * px + px * 0.06;
      const top = drawTower(ctx, bx, by, px, e.h, { badge: true });
      if (e.top) drawPiece(ctx, 'meeple', bx, top - px * 0.15, px * 0.3, PLAYER_COLORS[e.top]);
      continue;
    }
    const u = e.u ?? 0.5, v = e.v ?? 0.5;
    drawPiece(ctx, e.kind, sx + (u - 0.5) * px, sy + (v - 0.5) * px, px * (e.kind === 'dragon' ? 0.4 : 0.3), e.kind === 'dragon' ? DRAGON_COLOR : FAIRY_COLOR);
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
    if (t.exp !== 'base' || t.replaces) continue;
    const fig = document.createElement('figure');
    const c = document.createElement('canvas'); c.width = c.height = 124;
    c.getContext('2d').drawImage(getTileArt(id).canvas, 0, 0, 124, 124);
    fig.appendChild(c);
    fig.appendChild(document.createTextNode(`×${t.count}${id === 'D' ? ' ★' : ''}`));
    gallery.appendChild(fig);
  }
  const g = section('🧩', 'All 72 Base Tiles', '<p>The full base-game set. ★ includes the start tile.</p>');
  g.appendChild(gallery);
  root.appendChild(g);

  // ---------- expansions ----------
  const intro = section('🧩', 'Expansions', `<p>Switch on any mix of expansions when you set up a new game. Everything below is only used when that expansion is on. The rules follow the current (3rd) edition of each box.</p>`);
  intro.classList.add('exp-intro');
  root.appendChild(intro);
  const expGallery = (exp, filter = () => true) => {
    const strip = document.createElement('div');
    strip.className = 'tile-strip';
    for (const [id, t] of Object.entries(TILE_TYPES)) {
      if (t.exp !== exp && !(exp === 'abbot' && t.replaces) || !filter(id, t)) continue;
      const fig = document.createElement('figure');
      const c = document.createElement('canvas'); c.width = c.height = 124;
      c.getContext('2d').drawImage(getTileArt(id).canvas, 0, 0, 124, 124);
      fig.appendChild(c);
      fig.appendChild(document.createTextNode(`×${t.count}`));
      strip.appendChild(fig);
    }
    return strip;
  };
  const addExp = (icon, title, html, figs, exp) => {
    const el = section(icon, title, html, figs);
    if (exp) el.appendChild(expGallery(exp));
    root.appendChild(el);
  };
  const riverTiles = [[0, 0, 'RI/s', 1], [0, 1, 'RI.1/IFI', 1], [0, 2, 'RI.1/IIG', 2], [1, 2, 'RI.1/LIRI', 0], [2, 2, 'RI.1/CcII', 1], [2, 3, 'RI.1/RIrI', 0], [2, 4, 'RI.1/II', 1], [1, 4, 'RI.1/CICI', 0], [0, 4, 'RI.1/RrII', 3], [0, 5, 'RI.1/IFI', 1], [0, 6, 'RI.1/CIRI', 1], [0, 7, 'RI.1/I.e', 1]];

  addExp('🌊', 'The River',
    `<p>The game starts with a river instead of the normal start tile. The <b>spring</b> goes in the middle; then everyone plays <b>river tiles</b> first, one per turn, until the <b>lake</b> (always last) ends the river. After that the normal tiles follow.</p>
     <p>Each river tile must <b>make the river longer</b>, and all its other edges must match too. Two bends in a row may not turn the <b>same way</b> (that would be a U-turn).</p>
     <p>You may put a follower on the river tile as usual — but <b>never in the water</b>. The river splits the meadows into separate fields.</p>`,
    [[renderMini(riverTiles, { px: 44 }), 'A whole river from spring to lake.']], 'river');

  addExp('🧑‍🌾', 'The Abbot',
    `<p>Everyone gets an <b>abbot</b>. Some tiles show a colourful <b>garden</b>. Instead of a meeple you may put your abbot on the new tile's <b>garden or monastery</b> (only there — gardens are for abbots only).</p>
     <p>A garden scores like a monastery: <span class="pts">9 points</span> when all 8 tiles around it are filled.</p>
     <p><b>Abbot's trick:</b> instead of placing a figure, call your abbot home from an unfinished garden or monastery and score <span class="pts">1 + 1 per neighbour</span> straight away.</p>`,
    [[renderMini([[0, 0, 'BA/CG', 0, ['red', 2, 'abbot']], [1, 0, 'B', 0, ['blue', 0, 'abbot']]], { px: 80 }), 'Abbots on a garden and on a monastery.']], 'abbot');

  addExp('🍺', 'Inns &amp; Cathedrals',
    `<p><b>Inns:</b> a finished road with an inn scores <span class="pts">2 per tile</span>, but <b>0</b> if it is unfinished at the end.</p>
     <p><b>Cathedrals:</b> a finished city with a cathedral scores <span class="pts">3 per tile and shield</span>, but <b>0</b> if unfinished at the end.</p>
     <p><b>Big meeple:</b> everyone gets one. It counts as <b>two</b> meeples when deciding who has the most in a road, city or field (it does not double the points). Pink figures let a <b>6th player</b> join.</p>`,
    [[renderMini([[-1, 0, 'X', 0], [0, 0, 'IC/RFr.iG', 0, ['yellow', 0]], [1, 0, 'L', 0]], { px: 76, highlight: [0, 0, 0] }), 'A finished road with an inn: 3 tiles × 2 = <b>6 points</b>.'],
     [renderMini([[0, 0, 'IC/Cccc.c', 0, ['blue', 0, 'large']], [0, -1, 'E', 2], [1, 0, 'E', 3], [0, 1, 'E', 0], [-1, 0, 'E', 1]], { px: 60, highlight: [0, 0, 0] }), 'A finished cathedral city: 5 tiles × 3 = <b>15 points</b> for Blue\'s big meeple.']], 'inns');

  addExp('🔨', 'Traders &amp; Builders',
    `<p><b>Goods:</b> whoever <b>finishes</b> a city takes one token for every 🍷 wine, 🌾 grain or 🧵 cloth symbol in it — even without a knight there. At the end, the most of each kind scores <span class="pts">10 points</span> (ties all score).</p>
     <p><b>Builder:</b> put it on the new tile's road or city where you already have a meeple. Each time you later extend that road or city, you play a <b>second tile</b> straight away (once per turn).</p>
     <p><b>Pig:</b> put it in a field where you have a farmer. If you win that field at the end, each finished city gives <span class="pts">4</span> instead of 3.</p>
     <p>Builder and pig go home when your last meeple in their road, city or field leaves.</p>`,
    [[renderMini([[0, 0, 'TB/RCc.g', 0, ['green', 0]], [0, -1, 'E', 2], [-1, 0, 'E', 1]], { px: 76, highlight: [0, 0, 0] }), 'Finishing this city earns its 🌾 grain token.'],
     [renderMini([[0, 0, 'U', 1, ['red', 0]], [1, 0, 'U', 1, ['red', 0, 'builder']], [2, 0, 'V', 1]], { px: 70, highlight: [0, 0, 0] }), 'Red\'s builder waits on the road: extend it to play two tiles in one turn.']], 'traders');

  addExp('🐉', 'The Princess &amp; the Dragon',
    `<p>Every new tile has one picture:</p>
     <p>🌋 <b>Volcano:</b> the dragon flies onto it at once. Nobody may put a figure on that tile this turn (you may move the fairy instead).</p>
     <p>🐲 <b>Dragon:</b> after placing (and perhaps a meeple), the dragon flies <b>6 steps</b>. Starting with you and going round the table, each player <b>must</b> move it one tile up, down, left or right. It never goes back over its own path, never lands on the fairy's tile, and stops early if stuck. It <b>eats every figure</b> on each tile it lands on. Dragon tiles drawn before the first volcano are put aside and come back later. No figure may ever go on the dragon's tile.</p>
     <p>👸 <b>Princess:</b> if her city joins a city with knights, you may send <b>one</b> knight home — but then you place nothing else this turn.</p>
     <p>🌀 <b>Magic portal:</b> put your follower on <b>any</b> empty, unfinished road, city, field or monastery on the map (not with builder or pig).</p>
     <p>🧚 <b>Fairy:</b> instead of placing, move her next to one of your followers. She keeps the dragon off her tile, gives <span class="pts">+1</span> at the start of each of your turns, and <span class="pts">+3</span> when that follower's feature scores.</p>`,
    [[renderMini([[0, 0, 'DG/RFr.v', 0], [1, 0, 'U', 1, ['blue', 0]], [2, 0, 'DG/Rr.d', 2], [2, 1, 'U', 0], [-1, 0, 'U', 1, ['red', 0]]], { px: 64, extras: [{ kind: 'dragon', x: 0, y: 0 }], marks: [[1, 0, '1', '#ff7b6b'], [2, 0, '2', '#ff7b6b'], [2, 1, '3', '#ff7b6b']] }), 'The dragon leaves the volcano and flies 1 → 2 → 3, eating Blue\'s meeple on the way.'],
     [renderMini([[0, 0, 'E', 0, ['green', 0]], [0, -1, 'DG/Ccc.p', 2]], { px: 76, extras: [{ kind: 'fairy', x: 0, y: 0, u: 0.72, v: 0.3 }] }), 'The fairy stands by Green\'s knight: +1 every turn and safe from the dragon.']], 'dragon');

  addExp('🏰', 'The Tower',
    `<p>Tower tiles have a stone <b>foundation</b>, and everyone gets tower floors (2 players 10 each, 3: 9, 4: 7, 5: 6, 6: 5).</p>
     <p>After placing your tile, do <b>one</b> of these: place a follower normally, <b>or</b> add a floor to <b>any</b> foundation or open tower, <b>or</b> put a meeple on top of any tower to close it for good.</p>
     <p>Each time you add a floor you may <b>capture one figure</b> on the tower's tile or up to as many tiles away as the tower is tall — straight up, down, left or right (gaps count, no diagonals). Your own figure goes home; someone else's becomes your <b>prisoner</b>.</p>
     <p>If two players hold each other's figures they swap them back at once. Once per turn you may <b>buy back</b> a prisoner for <span class="pts">3 points</span> paid to its holder (tap ⛓️). Builders, pigs, the fairy and the dragon can't be captured. Towers score nothing.</p>`,
    [[renderMini([[0, 0, 'TO/C', 2], [0, -1, 'D', 0, ['blue', 0]], [1, 0, 'V', 0], [0, -2, 'U', 0]], { px: 66, extras: [{ kind: 'tower', x: 0, y: 0, h: 2 }], marks: [[0, -1, '⚔', '#ff7b6b'], [1, 0, '⚔', '#ff7b6b'], [0, -2, '⚔', '#ff7b6b']] }), 'A tower 2 floors tall reaches 2 tiles in a straight line: Blue\'s knight can be captured.']], 'tower');

  add('📱', 'Using the App',
    `<p>• <b>Drag</b> to move around the map, <b>pinch</b> to zoom. ⌖ shows the whole map.</p>
     <p>• Tap a <b>glowing square</b> to put your tile there. Tap the tile again or ⟳ to turn it. Bright gold squares fit the way your tile is turned right now.</p>
     <p>• Press <b>✓</b> to lock it in. Then tap a <b>ghost meeple</b> to claim something (the whole road/city lights up), or just press ✓ to skip.</p>
     <p>• <b>↶</b> takes back your tile before you finish your turn. <b>💡</b> gives a hint.</p>`);
}
