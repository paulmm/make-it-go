import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import { evaluateMastery } from './mastery';
import { LEVEL_1 } from './levels';
import type { Token } from './types';

function evalPlan(plan: Token[]) {
  return evaluateMastery(LEVEL_1, plan, run(LEVEL_1, plan));
}

describe('evaluateMastery — L1 (reach-goal)', () => {
  it('masters on a clean win', () => {
    const r = evalPlan(['ADVANCE', 'LEAP', 'ADVANCE']);
    expect(r.mastered).toBe(true);
    expect(r.outcome).toBe('WIN');
    expect(r.redundantSteps).toBe(0);
  });

  it('does not master on a splash', () => {
    const r = evalPlan(['ADVANCE', 'ADVANCE']);
    expect(r.mastered).toBe(false);
    expect(r.outcome).toBe('SPLASH');
  });

  it('does not master on an incomplete plan', () => {
    const r = evalPlan(['ADVANCE']);
    expect(r.mastered).toBe(false);
    expect(r.outcome).toBe('INCOMPLETE');
  });

  it('still masters a win carrying one redundant trailing step, and counts the redundancy', () => {
    // L1's gate is reaching the goal, not efficiency. Wins on the 3rd token;
    // the trailing ADVANCE is one redundant step recorded for telemetry.
    const r = evalPlan(['ADVANCE', 'LEAP', 'ADVANCE', 'ADVANCE']);
    expect(r.mastered).toBe(true);
    expect(r.redundantSteps).toBe(1);
  });

  it('reports zero redundancy for non-wins', () => {
    const r = evalPlan(['ADVANCE', 'ADVANCE', 'ADVANCE']);
    expect(r.redundantSteps).toBe(0);
  });
});
