// Illustrated "How to play" guide, drawn with the same tile art as the game.
import { TILE_TYPES } from './tiles.js';
import { getTileArt, drawPiece, drawTower, drawBridge, drawCastle, rotUnit, getTableTexture, DRAGON_COLOR, FAIRY_COLOR } from './art.js';
import { PLAYER_COLORS, getGroup, key, neighbour, edgeType, bridgeFeature } from './game.js';
import { featureMask } from './board.js';

// tiles: [[x, y, type, rot, meeple?: [colorName, featureIndex, kind?], bridgeAxis?]]
// extras: [{ kind: 'dragon' | 'fairy' | 'tower', x, y, u?, v?, h?, top?: colorName },
//          { kind: 'castle', a: [x, y], b: [x, y], top?: colorName }, { kind: 'area', cells: [[x, y]] }]
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
  for (const [x, y, t, r, , b] of tiles) board[key(x, y)] = { t, r, pieces: [], ...(b === undefined ? {} : { bridge: b }) };
  for (const [x, y] of tiles) for (const s of [1, 2]) {
    const nb = neighbour(board, x, y, s);
    if (nb && edgeType(board[key(x, y)], s) !== edgeType(nb, (s + 2) % 4)) console.warn(`rules figure mismatch at ${x},${y} side ${s}`);
  }
  for (const [x, y, t, r, , b] of tiles) {
    const [sx, sy] = pos(x, y);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate((r * Math.PI) / 2);
    ctx.drawImage(getTileArt(t).canvas, -px / 2, -px / 2, px, px);
    ctx.restore();
    if (b !== undefined) drawBridge(ctx, sx, sy, px, b);
  }
  if (highlight) {
    const [hx, hy, hfi] = highlight;
    const g = getGroup(board, key(hx, hy), hfi);
    ctx.save(); ctx.globalAlpha = 0.42;
    for (const [k, fi] of g.nodes) {
      if (fi === bridgeFeature(board[k])) continue; // (a bridge's road is not printed on the tile)
      const [x, y] = k.split(',').map(Number); const { t, r } = board[k];
      const [sx, sy] = pos(x, y);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate((r * Math.PI) / 2);
      ctx.drawImage(featureMask(t, fi, highlightColor), -px / 2, -px / 2, px, px);
      ctx.restore();
    }
    ctx.restore();
  }
  for (const [x, y, t, r, m, b] of tiles) {
    if (!m) continue;
    const [sx, sy] = pos(x, y);
    if (b !== undefined && m[1] === bridgeFeature(board[key(x, y)])) {
      // standing on the bridge
      drawPiece(ctx, m[2] || 'meeple', b === 0 ? sx : sx + px * 0.22, b === 0 ? sy - px * 0.22 : sy, px * 0.32, PLAYER_COLORS[m[0]]);
      continue;
    }
    const [ax, ay] = getTileArt(t).anchors[m[1]];
    const [rx, ry] = rotUnit(ax, ay, r);
    drawPiece(ctx, m[2] || 'meeple', sx + (rx - 0.5) * px, sy + (ry - 0.5) * px, px * 0.32, PLAYER_COLORS[m[0]], { lying: TILE_TYPES[t].features[m[1]].type === 'field' });
  }
  for (const e of extras.filter((q) => q.kind === 'area')) {
    for (const [x, y] of e.cells) {
      const [sx, sy] = pos(x, y);
      ctx.fillStyle = 'rgba(255,216,74,0.16)';
      ctx.fillRect(sx - px / 2 + 3, sy - px / 2 + 3, px - 6, px - 6);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2.5; ctx.setLineDash([px * 0.1, px * 0.07]);
      ctx.strokeRect(sx - px / 2 + 3, sy - px / 2 + 3, px - 6, px - 6);
      ctx.setLineDash([]);
    }
  }
  for (const e of extras) {
    if (e.kind === 'area') continue;
    if (e.kind === 'castle') {
      const [ax, ay] = pos(...e.a), [bx, by] = pos(...e.b);
      const top = drawCastle(ctx, (ax + bx) / 2, (ay + by) / 2 + px * 0.15, px * 0.9);
      if (e.top) drawPiece(ctx, 'meeple', (ax + bx) / 2, top - px * 0.12, px * 0.28, PLAYER_COLORS[e.top]);
      continue;
    }
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
  for (const [x, y, text, color, u = 0.5, v = 0.5] of marks) {
    const [cx, cy] = pos(x, y);
    const sx = cx + (u - 0.5) * px, sy = cy + (v - 0.5) * px;
    ctx.font = `900 ${Math.round(px * 0.42)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(text, sx, sy);
    ctx.fillStyle = color || '#fff'; ctx.fillText(text, sx, sy);
  }
  return c;
}

// Tile pictures in the galleries are painted only when scrolled into view,
// a few per frame, so the rules open instantly.
let observer = null;
const paintQueue = [];
let painting = false;
function paintSome() {
  const t0 = performance.now();
  while (paintQueue.length && performance.now() - t0 < 14) {
    const c = paintQueue.shift();
    c.getContext('2d').drawImage(getTileArt(c.dataset.tile).canvas, 0, 0, c.width, c.height);
  }
  if (paintQueue.length) requestAnimationFrame(paintSome); else painting = false;
}
function lazyTile(id, size = 124) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.dataset.tile = id;
  if (!('IntersectionObserver' in window)) { paintQueue.push(c); if (!painting) { painting = true; requestAnimationFrame(paintSome); } return c; }
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        observer.unobserve(e.target);
        paintQueue.push(e.target);
        if (!painting) { painting = true; requestAnimationFrame(paintSome); }
      }
    }, { rootMargin: '300px' });
  }
  observer.observe(c);
  return c;
}

function appendFigs(el, figs) {
  for (const [canvas, cap] of figs) {
    const f = document.createElement('div'); f.className = 'fig'; f.appendChild(canvas); el.appendChild(f);
    if (cap) { const c = document.createElement('div'); c.className = 'cap'; c.innerHTML = cap; el.appendChild(c); }
  }
}

function section(icon, title, html, figs = []) {
  const el = document.createElement('div');
  el.className = 'rule';
  el.innerHTML = `<h3><span>${icon}</span>${title}</h3>${html}`;
  appendFigs(el, figs);
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
     </div>
     <p><small>With expansions: an unfinished road with an inn or city with a cathedral scores 0; gardens with an abbot score like monasteries; the most of each trade good scores 10.</small></p>`);

  add('💡', 'Tips for Young Knights',
    `<p>• Keep a couple of followers in reserve — running out is painful!</p>
     <p>• Small cities are quick points; big cities with shields are worth a lot but may never be finished.</p>
     <p>• Monasteries in the middle of the map fill up fast.</p>
     <p>• Put a farmer down mid-game next to lots of cities — but remember they never come back.</p>
     <p>• Watch out: a tile that fits nowhere is thrown out and you draw again.</p>
     <p>• Some tiles show a little flower garden. It only matters if you play with <b>The Abbot</b>.</p>`);

  add('📱', 'Playing on Separate Phones',
    `<p><b>One phone, pass it round:</b> choose <b>📱 One phone</b> when you start a new game.</p>
     <p><b>A phone each:</b> one player chooses <b>📲 Everyone on their own phone</b> and taps <b>Create Online Game</b>. Everyone else taps <b>Join a Game</b> and types the 4-letter code — or scans the QR code or opens the invite link. The host picks the expansions, can add computer players, and presses <b>Start</b>. Two people can share a phone too: tap <b>+ Player on this phone</b> in the lobby.</p>
     <p>Every phone shows the whole map and the scores. You play on your own turn; your name on the player cards has a gold dot •.</p>
     <p><b>Phone went to sleep?</b> Just open the game again — it catches up by itself. From the home screen, <b>Rejoin</b> takes you back in.</p>
     <p><b>Someone's phone stays offline?</b> After a few seconds anyone can tap <b>Let a bot play</b> so the game goes on. When they're back they tap <b>Take back</b> and play on.</p>`);

  // Tile gallery
  const gallery = document.createElement('div');
  gallery.className = 'tile-strip';
  for (const [id, t] of Object.entries(TILE_TYPES)) {
    if (t.exp !== 'base' || t.replaces) continue;
    const fig = document.createElement('figure');
    fig.appendChild(lazyTile(id));
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
      fig.appendChild(lazyTile(id));
      fig.appendChild(document.createTextNode(`×${t.count}`));
      strip.appendChild(fig);
    }
    return strip;
  };
  // the expansion pictures are drawn just after the page opens, one section at a time
  const later = [];
  const addExp = (icon, title, html, figs, exp) => {
    const el = section(icon, title, html);
    el.id = `rules-${exp}`;
    root.appendChild(el);
    later.push(() => {
      appendFigs(el, figs());
      if (exp) el.appendChild(expGallery(exp));
    });
  };
  const runLater = () => { const f = later.shift(); if (!f) return; f(); setTimeout(runLater, 30); };
  setTimeout(runLater, 60);
  const riverTiles = [[0, 0, 'RI/s', 1], [0, 1, 'RI.1/IFI', 1], [0, 2, 'RI.1/IIG', 2], [1, 2, 'RI.1/LIRI', 0], [2, 2, 'RI.1/CcII', 1], [2, 3, 'RI.1/RIrI', 0], [2, 4, 'RI.1/II', 1], [1, 4, 'RI.1/CICI', 0], [0, 4, 'RI.1/RrII', 3], [0, 5, 'RI.1/IFI', 1], [0, 6, 'RI.1/CIRI', 1], [0, 7, 'RI.1/I.e', 1]];

  addExp('🌊', 'The River',
    `<p>The game starts with a river instead of the normal start tile. The <b>spring</b> goes in the middle; then everyone plays <b>river tiles</b> first, one per turn, until the <b>lake</b> (always the last river tile) closes the river. After that the normal tiles follow.</p>
     <p>Each river tile must <b>make the river longer</b>: its water joins the open end, and all its other edges must match too.</p>
     <p><b>No U-turns:</b> two bends in a row may not turn the same way. And a <b>third</b> bend the same way is not allowed either, even with straight pieces in between. A bend, a straight piece, then a bend the same way (a wide U) is fine.</p>
     <p>You may put a follower on the river tile as usual — on a road, city, monastery or field — but <b>never in the water</b>. The river splits the meadows into separate fields, except around the spring and the lake where the meadow goes all the way round. The river tile with a garden is for the abbot (if you play with The Abbot).</p>`,
    () => [[renderMini([[0, 0, 'RI/s', 1], [0, 1, 'RI.1/II', 2], [1, 1, 'RI.1/II', 1]], { px: 70, marks: [[1, 1, '✗', '#ff6b5b']] }), 'Not allowed: two bends the same way make a U-turn.'],
     [renderMini([[0, 0, 'RI/s', 1], [0, 1, 'RI.1/II', 2], [1, 1, 'RI.1/IFI', 0], [2, 1, 'RI.1/II', 1]], { px: 64, marks: [[2, 1, '✓', '#6dff6d']] }), 'Fine: bend, straight, then a bend the same way (a wide U).'],
     [renderMini(riverTiles, { px: 44 }), 'A whole river from spring to lake.']], 'river');

  addExp('⛪', 'The Abbot',
    `<p>Everyone gets an <b>abbot</b> (the figure in the long robe). Some tiles show a colourful <b>garden</b>. Instead of a meeple you may put your abbot on the new tile's <b>garden or monastery</b> — only there. Gardens are for abbots only: meeples, big meeples, builders and pigs never go on them.</p>
     <p>A garden scores like a monastery: <span class="pts">9 points</span> when all 8 tiles around it are filled, and your abbot comes back.</p>
     <p><b>Abbot's trick:</b> instead of placing a figure, call your abbot home from an unfinished garden or monastery (anywhere on the map) and score <span class="pts">1 + 1 per tile around it</span> straight away. You may do this even with no meeples left. If your tile just filled the 8th space, there's no need: it scores 9 by itself.</p>
     <p><b>End of the game:</b> an abbot still on the board scores 1 + 1 per neighbouring tile, like a monk. Gardens without an abbot score nothing.</p>
     <p><b>With other expansions:</b> the dragon eats abbots — call yours home before it flies! A magic portal can send your abbot to any free garden or monastery. A tower can capture your abbot (buy him back for 3), but he never stands on a tower. The fairy gives no bonus when the abbot is called home.</p>`,
    () => [[renderMini([[0, 0, 'BA/CG', 0], [1, 0, 'B', 0, ['blue', 0, 'abbot']]], { px: 80 }), 'A garden waiting for an abbot, and Blue\'s abbot on a monastery.'],
     [renderMini([[0, 0, 'B', 0, ['red', 0, 'abbot']], [-1, 0, 'V', 1], [-1, -1, 'U', 0], [0, -1, 'E', 0], [1, -1, 'B', 0], [1, 0, 'E', 1]], { px: 62, highlight: [0, 0, 0] }), 'Red calls the abbot home: 1 + 5 neighbours = <b>6 points</b> now.']], 'abbot');

  addExp('🍺', 'Inns &amp; Cathedrals',
    `<p><b>Inns:</b> some roads pass an inn by a little lake. A finished road with an inn scores <span class="pts">2 per tile</span> instead of 1 — but if it is still <b>unfinished at the end, it scores 0</b>.</p>
     <p><b>Cathedrals:</b> a finished city with a cathedral scores <span class="pts">3 per tile and per shield</span> instead of 2 — but <b>0 if unfinished</b> at the end. A second inn on the same road, or a second cathedral in the same city, adds nothing more.</p>
     <p><b>Sneaky tip:</b> you can add an inn or a cathedral to someone else's road or city. If they can't finish it, they get nothing!</p>
     <p><b>Big meeple:</b> everyone gets one. Place it instead of a normal meeple, with the normal rules: on the tile you just placed, only on a road, city, field or monastery nobody has claimed (never on a garden). When working out who has the most followers somewhere it counts as <b>two</b>; ties still share. It does not double the points. Pink figures let a <b>6th player</b> join.</p>
     <p><b>Tricky tiles:</b> the crossroads with the inn counts the inn for the left and right roads only. On the village tile the little paths to the gates are not roads, so they just split the meadows. The monastery on the road cuts the road in two. The tile with four small cities has four separate cities and a meadow in the middle.</p>`,
    () => [[renderMini([[-1, 0, 'X', 0], [0, 0, 'IC/RFr.iG', 0, ['yellow', 0]], [1, 0, 'L', 0]], { px: 76, highlight: [0, 0, 0] }), 'A finished road with an inn: 3 tiles × 2 = <b>6 points</b>.'],
     [renderMini([[0, 0, 'IC/Cccc.c', 0], [0, -1, 'E', 2, ['blue', 0, 'large']], [1, 0, 'E', 3], [0, 1, 'E', 0], [-1, 0, 'E', 1]], { px: 60, highlight: [0, 0, 0] }), 'A finished cathedral city: 5 tiles × 3 = <b>15 points</b> for Blue\'s big meeple.']], 'inns');

  addExp('🔨', 'Traders &amp; Builders',
    `<p><b>Goods:</b> some city tiles show 🍷 wine, 🌾 grain or 🧵 cloth. Whoever places the tile that <b>finishes</b> a city takes one token for every symbol in it — even without a knight there. At the end, the most of each kind scores <span class="pts">10 points</span> (ties all score).</p>
     <p><b>One figure per tile:</b> after placing your tile you put a meeple <b>or</b> your builder <b>or</b> your pig.</p>
     <p><b>Builder:</b> put it on the new tile's road or city where you already have a meeple. Each time you later add a tile to that road or city, you get a <b>bonus tile</b>: when your first tile has been scored, draw another and play it (you may skip it). Only one bonus tile per turn.</p>
     <p><b>Pig:</b> put it in a field where you already have a farmer (only when playing with farmers). If you win that field at the end — a tie counts — each finished city there gives you <span class="pts">4</span> instead of 3.</p>
     <p>Builder and pig never count when deciding who has the most meeples. They go home when your last meeple in their road, city or field leaves. The bridge tile is not a crossroads: the two roads cross without meeting. The monastery tile with three roads cuts them into three separate roads.</p>`,
    () => [[renderMini([[0, 0, 'TB/RCc.g', 0, ['green', 0]], [0, -1, 'E', 2], [-1, 0, 'E', 1]], { px: 76, highlight: [0, 0, 0] }), 'Finishing this city earns its 🌾 grain token.'],
     [renderMini([[0, 0, 'U', 1, ['red', 0]], [1, 0, 'U', 1, ['red', 0, 'builder']], [2, 0, 'V', 1]], { px: 70, highlight: [0, 0, 0] }), 'Red\'s builder (with the hammer) waits on the road: extend it to play two tiles in one turn.']], 'traders');

  addExp('🐉', 'The Princess &amp; the Dragon',
    `<p>Every new tile has one picture:</p>
     <p>🌋 <b>Volcano:</b> the dragon flies onto it at once. Nobody may put a figure on that tile this turn (you may move the fairy instead).</p>
     <p>🐲 <b>Dragon:</b> after placing (and perhaps a meeple), the dragon flies <b>6 steps</b>. Starting with you and going round the table, each player <b>must</b> move it one tile up, down, left or right. It never goes back over its own path, never lands on the fairy's tile, and stops early if stuck. It <b>eats every figure</b> on each tile it lands on. Dragon tiles drawn before the first volcano are put aside and come back later. No figure may ever go on the dragon's tile.</p>
     <p>👸 <b>Princess:</b> if her city joins a city with knights, you may send <b>one</b> knight home — but then you place nothing else this turn.</p>
     <p>🌀 <b>Magic portal:</b> put your follower on <b>any</b> empty, unfinished road, city, field or monastery on the map — or your abbot on any free garden or monastery (not the builder or pig, and never onto the dragon's tile).</p>
     <p>🧚 <b>Fairy:</b> instead of placing, move her next to one of your followers. She keeps the dragon off her tile, gives <span class="pts">+1</span> at the start of each of your turns, and <span class="pts">+3</span> when that follower's road, city, monastery or field is scored — even if someone else wins it, and also at the end of the game. When the follower leaves, she stays behind on that tile until someone moves her.</p>
     <p><b>Remember:</b> the dragon flies <b>before</b> anything is scored, so a knight it eats scores nothing. A road or city finished by a volcano tile still scores as normal.</p>`,
    () => [[renderMini([[0, 0, 'DG/RFr.v', 0], [1, 0, 'U', 1, ['blue', 0]], [2, 0, 'DG/Rr.d', 0], [2, 1, 'U', 0], [-1, 0, 'U', 1, ['red', 0]]], { px: 64, extras: [{ kind: 'dragon', x: 0, y: 0 }], marks: [[1, 0, '1', '#ff7b6b', 0.78, 0.22], [2, 0, '2', '#ff7b6b', 0.78, 0.22], [2, 1, '3', '#ff7b6b', 0.78, 0.22]] }), 'The dragon leaves the volcano and flies 1 → 2 → 3, eating Blue\'s meeple. After 3 it is boxed in, so this flight ends early.'],
     [renderMini([[0, 0, 'E', 0, ['green', 0]], [0, -1, 'DG/Ccc.p', 2]], { px: 76, extras: [{ kind: 'fairy', x: 0, y: 0, u: 0.72, v: 0.3 }] }), 'The fairy stands by Green\'s knight: +1 every turn and safe from the dragon.']], 'dragon');

  addExp('🏰', 'The Tower',
    `<p>Tower tiles have a stone <b>foundation</b>, and everyone gets tower floors (2 players 10 each, 3: 9, 4: 7, 5: 6, 6: 5).</p>
     <p>After placing your tile, do <b>one</b> of these: place a follower normally (or any other expansion's choice), <b>or</b> add a floor to <b>any</b> foundation or open tower on the map, <b>or</b> close a tower that has at least one floor by putting a meeple or big meeple on top. Nobody can build a closed tower higher; the figure up there scores nothing and stays until another tower captures it (or the dragon eats it) — then the tower is open again.</p>
      <p>Each time you add a floor you may <b>capture one figure</b> on the tower's tile or up to as many tiles away as the tower is tall, counting the floor you just added — straight up, down, left or right (gaps count, no diagonals). Your own figure goes home; someone else's becomes your <b>prisoner</b>.</p>
      <p>If two players hold each other's figures they swap them back at once, one for one (if you could get back different figures, you choose which). Once per turn you may <b>buy back</b> one of your figures for <span class="pts">3 points</span> paid to whoever holds it (tap ⛓️) — you need at least 3 points. Builders, pigs, the fairy and the dragon can't be captured. Towers score nothing, and prisoners still held at the end are worth nothing.</p>`,
    () => [[renderMini([[0, 0, 'TO/C', 2], [0, -1, 'D', 0, ['blue', 0]], [1, 0, 'B', 0], [0, -2, 'E', 2]], { px: 66, extras: [{ kind: 'tower', x: 0, y: 0, h: 2 }], marks: [[0, -1, '⚔', '#ff7b6b', 0.82, 0.18], [1, 0, '⚔', '#ff7b6b', 0.82, 0.18], [0, -2, '⚔', '#ff7b6b', 0.82, 0.18]] }), 'A tower 2 floors tall reaches 2 tiles in a straight line: Blue\'s knight can be captured.']], 'tower');

  addExp('🌉', 'Bridges, Castles &amp; Bazaars',
    `<p><b>Bridges.</b> You have 3 bridges (2 with 5 or 6 players). When you place a tile you may build <b>one</b> bridge, on your new tile or on a tile right next to it. It goes straight across, side to opposite side, and both ends must stand on <b>grass</b> — never on a city, road or river. In between it can cross anything. A bridge is a road worth <span class="pts">1 per tile</span>, and it never cuts a field or a city in two.</p>
     <p><b>A bridge can rescue a tile:</b> your tile's road may run into grass if a bridge carries it on. A tile that only fits with a bridge may also be thrown away (🗑) — then you draw another. Your meeple may stand on a bridge on your new tile (not on one next door).</p>
     <p><small>In the app, squares marked 🌉 only fit with a bridge; it is added for you. After placing, the <b>🌉 Bridge</b> choice builds a bridge or moves it.</small></p>
     <p><b>Castles.</b> When a tile finishes a tiny city of two half-round pieces, the player whose knight is in it chooses: take the <span class="pts">4 points</span>, or build a <b>castle</b>. The knight climbs onto the castle, which watches <b>6 squares</b>: its two tiles and the two beside each. Pointed cities (with a gate road or a corner) can't become castles.</p>
     <p>On a <b>later</b> turn, the first road, city, monastery or garden finished there (a monastery or garden must sit on one of the squares) gives the castle's owner the <b>same points</b> — even if nobody owned it! Then the knight comes home. If several finish at once, the castle takes the best, and a scoring castle can set off a neighbouring castle.</p>
     <p>Castles still waiting at the end score nothing, but every castle is worth <span class="pts">4</span> to farmers instead of 3.</p>
     <p><b>Bazaars.</b> After a turn with a bazaar tile (the market stall), one tile per player is turned over. Starting on the left, a player picks a tile and bids (0 is fine). Everyone else without a tile may raise once, going round. Then the picker <b>keeps</b> it (paying the top bidder) or <b>sells</b> it (the top bidder pays the picker). Scores can even drop below zero! Next, the first player after the picker who still has no tile chooses. The last tile is free. Then everyone plays their tile as a normal turn, starting on the bazaar player's left, and the game goes on after the bazaar player. There's no bazaar when fewer tiles are left than players, and none starts during a bazaar.</p>
     <p><small>Options: each part can be switched off in the setup. Without <b>bidding</b> (an official variant) everyone simply takes a tile in turn.</small></p>`,
    () => [[renderMini([[-1, 0, 'U', 1, ['blue', 0]], [0, 0, 'F', 1, null, 1], [1, 0, 'U', 1]], { px: 74 }), 'Blue\'s road meets a meadow: the new tile carries it across the city on a bridge.'],
     [renderMini([[-1, 0, 'U', 1, ['red', 0]], [0, 0, 'B', 0, null, 1]], { px: 74 }), 'A bridge on the tile next door carries Red\'s road over the monastery\'s meadow. Its far end must face an empty square or a road.'],
     [renderMini([[0, 0, 'E', 2], [0, 1, 'E', 0], [-1, 0, 'B', 0], [1, 0, 'A', 0], [1, 1, 'U', 0], [0, 2, 'B', 0]], { px: 62, extras: [{ kind: 'area', cells: [[0, 0], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }, { kind: 'castle', a: [0, 0], b: [0, 1], top: 'red' }], marks: [[-1, 0, '✓', '#6dff6d', 0.8, 0.2], [1, 0, '✓', '#6dff6d', 0.8, 0.2], [0, 2, '✗', '#ff6b5b', 0.8, 0.2]] }),
       'Red\'s castle watches the 6 gold squares (empty ones too): the monasteries and the road there can set it off. The monastery below is outside.']], 'bridges');

  add('🧩', 'Mixing Expansions',
    `<p>After placing your tile you do <b>one</b> thing: place a figure (meeple, big meeple, abbot, builder or pig), <b>or</b> call your abbot home, <b>or</b> move the fairy, <b>or</b> use the magic portal or the princess, <b>or</b> add a tower floor, <b>or</b> put a meeple on top of a tower.</p>
     <p>The dragon always flies <b>before</b> anything is scored, and tower captures happen before the dragon flies.</p>
     <p>The fairy's +1 and buying back a prisoner happen at most <b>once per turn</b> — even when the builder gives you a bonus tile.</p>
     <p>A bridge goes down with your tile, before your figure. Castles are decided after the dragon, before scoring. The bazaar comes after the whole turn, before the builder's bonus tile.</p>`);

  add('📱', 'Using the App',
    `<p>• <b>Drag</b> to move around the map, <b>pinch</b> to zoom. ⌖ shows the whole map.</p>
     <p>• Tap a <b>glowing square</b> to put your tile there. Tap the tile again or ⟳ to turn it. Bright gold squares fit the way your tile is turned right now.</p>
     <p>• Press <b>✓</b> to lock it in. Then tap a <b>ghost meeple</b> to claim something (the whole road/city lights up), or just press ✓ to skip.</p>
     <p>• <b>↶</b> takes back your tile before you finish your turn. <b>💡</b> gives a hint.</p>`);
}
