import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import type { Level, Token } from './types';

// A focused test level mirroring L1's geometry:
// index:  0      1     2        3     4
// tile:   START  PATH  HAZARD   PATH  GOAL
function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: 'test',
    tiles: ['START', 'PATH', 'HAZARD', 'PATH', 'GOAL'],
    startIndex: 0,
    goalIndex: 4,
    optimalSteps: 3,
    anchorId: 'steps-in-order',
    allowedTokens: ['ADVANCE', 'LEAP'],
    mastery: { kind: 'reach-goal' },
    ...overrides,
  };
}

describe('run — literal execution', () => {
  it('wins when the plan lands exactly on the goal', () => {
    const plan: Token[] = ['ADVANCE', 'LEAP', 'ADVANCE']; // 0->1->3->4
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('WIN');
    expect(trace.finalIndex).toBe(4);
    expect(trace.executedTokens).toBe(3);
  });

  it('splashes when ADVANCE lands on the hazard tile', () => {
    const plan: Token[] = ['ADVANCE', 'ADVANCE']; // 0->1->2 (water)
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('SPLASH');
    expect(trace.finalIndex).toBe(2);
  });

  it('treats passing over the hazard with LEAP as safe (only the landing tile matters)', () => {
    const plan: Token[] = ['ADVANCE', 'LEAP']; // 0->1->3, flies over hazard at 2
    const trace = run(makeLevel(), plan);
    expect(trace.steps[1].passedOverIndex).toBe(2);
    expect(trace.steps[1].event).toBe('SAFE');
    expect(trace.outcome).toBe('INCOMPLETE'); // safe at 3, not yet at the goal
    expect(trace.finalIndex).toBe(3);
  });

  it('falls off when a LEAP overshoots past the goal', () => {
    const plan: Token[] = ['ADVANCE', 'LEAP', 'LEAP']; // 0->1->3->5 (off the end)
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('FELL_OFF');
    expect(trace.steps[2].passedOverIndex).toBe(4); // leapt over the goal itself
  });

  it('is INCOMPLETE when the plan ends before the goal with the hero safe', () => {
    const plan: Token[] = ['ADVANCE']; // 0->1
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('INCOMPLETE');
    expect(trace.finalIndex).toBe(1);
  });

  it('stops after a terminal step — no autocorrect, no continuing past a splash', () => {
    const plan: Token[] = ['ADVANCE', 'ADVANCE', 'ADVANCE', 'ADVANCE']; // splash at step index 1
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('SPLASH');
    expect(trace.executedTokens).toBe(2);
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[1].terminal).toBe(true);
  });

  it('records each step literally with from/to indices, in order', () => {
    const plan: Token[] = ['ADVANCE', 'LEAP', 'ADVANCE'];
    const trace = run(makeLevel(), plan);
    expect(trace.steps.map((s) => [s.fromIndex, s.toIndex])).toEqual([
      [0, 1],
      [1, 3],
      [3, 4],
    ]);
  });

  it('returns an empty, INCOMPLETE trace for an empty plan', () => {
    const trace = run(makeLevel(), []);
    expect(trace.outcome).toBe('INCOMPLETE');
    expect(trace.steps).toHaveLength(0);
    expect(trace.finalIndex).toBe(0);
    expect(trace.executedTokens).toBe(0);
  });

  it('wins mid-plan and ignores trailing tokens', () => {
    // reaches the goal on the 3rd token; the trailing ADVANCE must not execute
    const plan: Token[] = ['ADVANCE', 'LEAP', 'ADVANCE', 'ADVANCE'];
    const trace = run(makeLevel(), plan);
    expect(trace.outcome).toBe('WIN');
    expect(trace.executedTokens).toBe(3);
  });
});
