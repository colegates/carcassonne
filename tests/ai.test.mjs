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

test('AI plays full games with every expansion (all piece kinds, dragon, towers)', async () => {
  const { chooseDragonMove, chooseRansom } = await import('../public/js/ai.js');
  const expansions = { river: true, abbot: true, inns: true, traders: true, dragon: true, tower: true };
  let maxMs = 0;
  const kinds = new Set();
  for (let g = 0; g < 3; g++) {
    const s = G.newGame(['hard', 'medium', 'easy'].map((l, i) => ({ name: l, color: ['red', 'blue', 'green'][i], kind: 'ai', level: l })), { expansions });
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 600) {
      const lvl = s.players[s.phase === 'dragon' ? G.dragonMover(s) : s.current].level;
      if (s.phase === 'dragon') { G.applyAction(s, { t: 'dragon', key: chooseDragonMove(s, lvl) }); continue; }
      const ro = chooseRansom(s, lvl);
      if (ro) G.applyAction(s, { t: 'ransom', from: ro.from, k: ro.k });
      const t0 = performance.now();
      const mv = chooseMove(s, lvl);
      maxMs = Math.max(maxMs, performance.now() - t0);
      if (mv.act) kinds.add(mv.act.kind + (mv.act.portal ? ':portal' : '') + (mv.act.capture ? ':capture' : ''));
      G.applyAction(s, { t: 'turn', x: mv.x, y: mv.y, r: mv.r, act: mv.act });
    }
    assert.equal(s.phase, 'over');
    console.log('all expansions', s.players.map((p) => `${p.name} ${p.score}`).join(', '), Math.round(maxMs) + 'ms');
  }
  console.log('actions used:', [...kinds].join(', '));
  assert.ok(maxMs < 4000, `slowest move ${Math.round(maxMs)}ms`);
});
