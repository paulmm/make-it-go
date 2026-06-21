import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import { evaluateMastery } from './mastery';
import { LEVEL_1 } from './levels';
import { REQUIRED_ACTION } from './types';
import type { Action } from './types';

const REQ = REQUIRED_ACTION[LEVEL_1.points[0]];
const WRONG = LEVEL_1.allowedActions.find((a) => a !== REQ) as Action;

function evalPlan(plan: Action[]) {
  return evaluateMastery(LEVEL_1, plan, run(LEVEL_1, plan));
}

describe('evaluateMastery — L1 (reach-goal)', () => {
  it('masters on a clean win', () => {
    const r = evalPlan([REQ]);
    expect(r.mastered).toBe(true);
    expect(r.outcome).toBe('WIN');
    expect(r.redundantTokens).toBe(0);
  });

  it('does not master on a stumble', () => {
    const r = evalPlan([WRONG]);
    expect(r.mastered).toBe(false);
    expect(r.outcome).toBe('STUMBLE');
  });

  it('does not master on an incomplete (ran-out) plan', () => {
    const r = evalPlan([]);
    expect(r.mastered).toBe(false);
    expect(r.outcome).toBe('INCOMPLETE');
  });

  it('does not master a win with an extra token (clean solve required), but counts it', () => {
    const r = evalPlan([REQ, REQ]);
    expect(r.outcome).toBe('WIN');
    expect(r.mastered).toBe(false);
    expect(r.redundantTokens).toBe(1);
  });

  it('reports zero redundancy for non-wins', () => {
    const r = evalPlan([WRONG]);
    expect(r.redundantTokens).toBe(0);
  });
});
