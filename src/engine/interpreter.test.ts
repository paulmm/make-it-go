import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import type { EventKind, Level } from './types';

function makeLevel(points: EventKind[], overrides: Partial<Level> = {}): Level {
  return {
    id: 'test',
    points,
    allowedActions: ['JUMP', 'DUCK', 'CLIMB'],
    anchorId: 'exactly-what-you-say',
    mastery: { kind: 'reach-goal' },
    ...overrides,
  };
}

describe('run — event-point execution', () => {
  it('wins when each point gets its required action, in order', () => {
    const trace = run(makeLevel(['GAP', 'STEP']), ['JUMP', 'CLIMB']);
    expect(trace.outcome).toBe('WIN');
    expect(trace.clearedPoints).toBe(2);
  });

  it('wins a single-point level with the right action', () => {
    const trace = run(makeLevel(['GAP']), ['JUMP']);
    expect(trace.outcome).toBe('WIN');
    expect(trace.clearedPoints).toBe(1);
  });

  it('stumbles on the wrong action at a point', () => {
    const trace = run(makeLevel(['GAP']), ['CLIMB']);
    expect(trace.outcome).toBe('STUMBLE');
    expect(trace.clearedPoints).toBe(0);
    expect(trace.steps[0].result).toBe('WRONG');
  });

  it('stumbles on right actions in the wrong order, at the first mismatch', () => {
    const trace = run(makeLevel(['GAP', 'STEP']), ['CLIMB', 'JUMP']);
    expect(trace.outcome).toBe('STUMBLE');
    expect(trace.clearedPoints).toBe(0);
    expect(trace.steps).toHaveLength(1); // stops at the first failed point
    expect(trace.steps[0].pointIndex).toBe(0);
  });

  it('is INCOMPLETE when she runs out of tokens at a point', () => {
    const trace = run(makeLevel(['GAP', 'STEP']), ['JUMP']);
    expect(trace.outcome).toBe('INCOMPLETE');
    expect(trace.clearedPoints).toBe(1);
    expect(trace.steps[1].result).toBe('MISSING');
  });

  it('stops at the first failure — no execution past the stumble', () => {
    // point 1 (STEP) needs CLIMB; she played DUCK -> wrong there.
    const trace = run(makeLevel(['GAP', 'STEP', 'BRANCH']), ['JUMP', 'DUCK', 'DUCK']);
    expect(trace.outcome).toBe('STUMBLE');
    expect(trace.steps).toHaveLength(2);
    expect(trace.clearedPoints).toBe(1);
  });

  it('records required vs played for each step', () => {
    const trace = run(makeLevel(['GAP', 'BRANCH']), ['JUMP', 'DUCK']);
    expect(trace.steps.map((s) => [s.required, s.played])).toEqual([
      ['JUMP', 'JUMP'],
      ['DUCK', 'DUCK'],
    ]);
  });

  it('counts trailing extra tokens as redundancy on a win', () => {
    const trace = run(makeLevel(['GAP']), ['JUMP', 'JUMP']);
    expect(trace.outcome).toBe('WIN');
    expect(trace.redundantTokens).toBe(1);
  });

  it('reports zero redundancy for non-wins', () => {
    const trace = run(makeLevel(['GAP']), ['CLIMB']);
    expect(trace.redundantTokens).toBe(0);
  });

  it('is INCOMPLETE for an empty plan against a level with points', () => {
    const trace = run(makeLevel(['GAP']), []);
    expect(trace.outcome).toBe('INCOMPLETE');
    expect(trace.clearedPoints).toBe(0);
  });
});

describe('run — key and gate (decomposition with carry state)', () => {
  it('wins when she grabs the key, then opens the gate', () => {
    const trace = run(makeLevel(['KEY', 'GATE']), ['GRAB', 'OPEN']);
    expect(trace.outcome).toBe('WIN');
    expect(trace.clearedPoints).toBe(2);
  });

  it('locks the gate when she opens it without the key', () => {
    const trace = run(makeLevel(['KEY', 'GATE']), ['OPEN', 'OPEN']);
    expect(trace.outcome).toBe('LOCKED');
    expect(trace.steps[1].result).toBe('LOCKED');
  });

  it('treats a missed key as non-fatal — she walks on and meets the locked gate', () => {
    const trace = run(makeLevel(['KEY', 'GATE']), ['OPEN', 'OPEN']);
    expect(trace.steps[0].result).toBe('MISSED'); // walked past the key, no trip
    expect(trace.steps).toHaveLength(2); // did not stop at the key
  });

  it('stumbles when she grabs at the gate (wrong action, even with the key)', () => {
    const trace = run(makeLevel(['KEY', 'GATE']), ['GRAB', 'GRAB']);
    expect(trace.outcome).toBe('STUMBLE');
    expect(trace.steps[1].result).toBe('WRONG');
  });

  it('is INCOMPLETE when she grabs the key but has nothing for the gate', () => {
    const trace = run(makeLevel(['KEY', 'GATE']), ['GRAB']);
    expect(trace.outcome).toBe('INCOMPLETE');
    expect(trace.steps[1].result).toBe('MISSING');
  });
});
