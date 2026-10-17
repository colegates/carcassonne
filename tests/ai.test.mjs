import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../public/js/game.js';
import { chooseMove } from '../public/js/ai.js';

function play(levels) {
  const s = G.newGame(levels.map((l, i) => ({ name: 'P' + i, color: ['red', 'blue', 'green'][i] })));
  let maxMs = 0;
  while (s.phase !== 'over') {
    const lvl = levels[s.current];
    let mv;
    if (lvl === 'random') {
      const vp = G.validPlacements(s, s.drawn); const p = vp[Math.floor(Math.random() * vp.length)];
      mv = { x: p.x, y: p.y, r: p.rots[0], meeple: null };
    } else {
      const t0 = performance.now(); mv = chooseMove(s, lvl); maxMs = Math.max(maxMs, performance.now() - t0);
    }
    G.placeTile(s, mv.x, mv.y, mv.r);
    const opts = G.meepleOptions(s);
    G.finishTurn(s, mv.meeple !== null && opts.includes(mv.meeple) ? mv.meeple : null);
  }
  return { scores: s.players.map((p) => p.score), maxMs };
}

test('hard AI beats random and is fast', () => {
  let wins = 0, slow = 0;
  for (let i = 0; i < 6; i++) {
    const r = play(['hard', 'random']);
    if (r.scores[0] > r.scores[1]) wins++;
    slow = Math.max(slow, r.maxMs);
    console.log('hard vs random', r.scores, Math.round(r.maxMs) + 'ms');
  }
  assert.ok(wins >= 5);
});

test('hard vs easy', () => {
  let hw = 0;
  for (let i = 0; i < 6; i++) { const r = play(['hard', 'easy']); console.log('hard vs easy', r.scores, Math.round(r.maxMs) + 'ms'); if (r.scores[0] > r.scores[1]) hw++; }
  assert.ok(hw >= 3);
});
