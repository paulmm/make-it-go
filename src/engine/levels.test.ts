import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import { LEVEL_1, LEVEL_2 } from './levels';
import { REQUIRED_ACTION } from './types';
import type { Action } from './types';

describe('LEVEL_1', () => {
  it('is a single event point with at least two action choices on the tray', () => {
    expect(LEVEL_1.points).toHaveLength(1);
    expect(LEVEL_1.allowedActions.length).toBeGreaterThanOrEqual(2);
  });

  it('is solved by the action its point requires', () => {
    const required = REQUIRED_ACTION[LEVEL_1.points[0]];
    expect(run(LEVEL_1, [required]).outcome).toBe('WIN');
  });

  it('stumbles on a wrong action choice', () => {
    const required = REQUIRED_ACTION[LEVEL_1.points[0]];
    const wrong = LEVEL_1.allowedActions.find((a) => a !== required) as Action;
    expect(run(LEVEL_1, [wrong]).outcome).toBe('STUMBLE');
  });

  it('plants the root anchor (the right action — it does exactly what you say)', () => {
    expect(LEVEL_1.anchorId).toBe('exactly-what-you-say');
  });
});

describe('LEVEL_2 — order matters', () => {
  it('wins with the right actions in order', () => {
    expect(run(LEVEL_2, ['JUMP', 'CLIMB']).outcome).toBe('WIN');
  });

  it('stumbles on the right actions in the wrong order', () => {
    expect(run(LEVEL_2, ['CLIMB', 'JUMP']).outcome).toBe('STUMBLE');
  });

  it('stumbles when the second obstacle gets the wrong action', () => {
    expect(run(LEVEL_2, ['JUMP', 'JUMP']).outcome).toBe('STUMBLE');
  });

  it('plants the steps-in-order anchor', () => {
    expect(LEVEL_2.anchorId).toBe('steps-in-order');
  });
});
