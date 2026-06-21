import { describe, it, expect } from 'vitest';
import { localStub } from './localStub';
import type { PartnerContext } from './types';
import { LEVEL_1 } from '../engine/levels';
import { run } from '../engine/interpreter';
import type { Outcome, Token } from '../engine/types';

function ctx(partial: Partial<PartnerContext> = {}): PartnerContext {
  return {
    themeId: 'meadow',
    nouns: { hero: 'bunny', goal: 'carrot', hazard: 'water' },
    level: LEVEL_1,
    conceptsKnown: [],
    currentPlan: [],
    lastOutcome: null,
    lastTrace: null,
    attemptsThisLevel: 0,
    recentHistory: [],
    ...partial,
  };
}

function afterPlan(plan: Token[], recentHistory: Outcome[] = []): PartnerContext {
  const trace = run(LEVEL_1, plan);
  return ctx({
    currentPlan: plan,
    lastOutcome: trace.outcome,
    lastTrace: trace,
    attemptsThisLevel: recentHistory.length + 1,
    recentHistory,
  });
}

describe('localStub partner — L1', () => {
  it('introduces the steps-in-order anchor at the start of the level', async () => {
    const r = await localStub(ctx());
    expect(r.introduceConcept).toBe('steps-in-order');
    expect(r.celebrate).toBe(false);
    expect(r.say.length).toBeGreaterThan(0);
  });

  it('celebrates a win and reinforces the anchor', async () => {
    const r = await localStub(afterPlan(['ADVANCE', 'LEAP', 'ADVANCE']));
    expect(r.celebrate).toBe(true);
    expect(r.introduceConcept).toBe('steps-in-order');
  });

  it('on a splash, points at the wrong step and treats it as information (no shame)', async () => {
    const r = await localStub(afterPlan(['ADVANCE', 'ADVANCE']));
    expect(r.celebrate).toBe(false);
    expect(r.scaffold).toEqual({ kind: 'highlight-step', stepIndex: 1 });
    expect(r.say.toLowerCase()).toContain('exactly what you said');
  });

  it('offers the LEAP tool after a repeated splash', async () => {
    const r = await localStub(afterPlan(['ADVANCE', 'ADVANCE'], ['SPLASH']));
    expect(r.scaffold).toEqual({ kind: 'offer-token', token: 'LEAP' });
  });

  it('nudges to add a step when the plan is incomplete', async () => {
    const r = await localStub(afterPlan(['ADVANCE']));
    expect(r.celebrate).toBe(false);
    expect(r.say.toLowerCase()).toContain('add');
  });
});
