import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import { LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVELS } from './levels';
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

describe('LEVEL_3 — iteration', () => {
  it('is several identical points, so doing the same step again and again is the natural solve', () => {
    expect(LEVEL_3.points.length).toBeGreaterThanOrEqual(3);
    expect(new Set(LEVEL_3.points).size).toBe(1);
  });

  it('offers a single action, so bundling — not choosing — is the new idea', () => {
    expect(LEVEL_3.allowedActions).toHaveLength(1);
    expect(LEVEL_3.allowedActions[0]).toBe(REQUIRED_ACTION[LEVEL_3.points[0]]);
  });

  it('is reached when every point gets its action', () => {
    const plan: Action[] = LEVEL_3.points.map((p) => REQUIRED_ACTION[p]);
    expect(run(LEVEL_3, plan).outcome).toBe('WIN');
  });

  it('is incomplete when too few actions are queued for the run of points', () => {
    expect(run(LEVEL_3, [REQUIRED_ACTION[LEVEL_3.points[0]]]).outcome).toBe('INCOMPLETE');
  });

  it('plants the bundle-and-repeat anchor and gates on bundling', () => {
    expect(LEVEL_3.anchorId).toBe('bundle-and-repeat');
    expect(LEVEL_3.mastery.kind).toBe('bundle-to-goal');
  });
});

describe('LEVEL_4 — decomposition (key then gate)', () => {
  it('is two subgoals: a key to grab and a gate to open', () => {
    expect(LEVEL_4.points).toEqual(['KEY', 'GATE']);
    expect(LEVEL_4.allowedActions).toEqual(['GRAB', 'OPEN']);
  });

  it('is solved by grabbing the key then opening the gate', () => {
    expect(run(LEVEL_4, ['GRAB', 'OPEN']).outcome).toBe('WIN');
  });

  it('locks the gate when she forgets the key', () => {
    expect(run(LEVEL_4, ['OPEN', 'OPEN']).outcome).toBe('LOCKED');
  });

  it('plants the find-and-fix anchor', () => {
    expect(LEVEL_4.anchorId).toBe('find-and-fix');
  });

  it('is the fourth rung of the ladder', () => {
    expect(LEVELS[3]).toBe(LEVEL_4);
  });
});
