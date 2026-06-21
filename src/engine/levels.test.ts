import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import { LEVEL_1 } from './levels';
import type { Level, Token } from './types';

/** Brute-force the true minimum number of tokens needed to win, via BFS. */
function shortestWinningLength(level: Level): number {
  const queue: Token[][] = [[]];
  const maxLen = level.tiles.length + 2;
  while (queue.length > 0) {
    const plan = queue.shift() as Token[];
    if (plan.length > maxLen) break; // BFS is length-ordered, so we are done
    if (plan.length > 0 && run(level, plan).outcome === 'WIN') {
      return plan.length;
    }
    for (const token of level.allowedTokens) {
      queue.push([...plan, token]);
    }
  }
  return Infinity;
}

describe('LEVEL_1', () => {
  it('declares an optimalSteps that matches the true shortest win', () => {
    expect(shortestWinningLength(LEVEL_1)).toBe(LEVEL_1.optimalSteps);
    expect(LEVEL_1.optimalSteps).toBe(3);
  });

  it('is solved by ADVANCE, LEAP, ADVANCE', () => {
    expect(run(LEVEL_1, ['ADVANCE', 'LEAP', 'ADVANCE']).outcome).toBe('WIN');
  });

  it('splashes on the tempting first try ADVANCE, ADVANCE', () => {
    expect(run(LEVEL_1, ['ADVANCE', 'ADVANCE']).outcome).toBe('SPLASH');
  });

  it('plants the steps-in-order anchor', () => {
    expect(LEVEL_1.anchorId).toBe('steps-in-order');
  });
});
