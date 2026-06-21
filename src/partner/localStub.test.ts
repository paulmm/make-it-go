import { describe, it, expect } from 'vitest';
import { localStub } from './localStub';
import type { PartnerContext } from './types';
import { LEVEL_1 } from '../engine/levels';
import { run } from '../engine/interpreter';
import type { Action, Outcome } from '../engine/types';

function ctx(partial: Partial<PartnerContext> = {}): PartnerContext {
  return {
    themeId: 'meadow',
    nouns: { hero: 'bunny', goal: 'carrot' },
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

function afterPlan(plan: Action[], recentHistory: Outcome[] = []): PartnerContext {
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
  it('introduces the anchor at the start of the level', async () => {
    const r = await localStub(ctx());
    expect(r.introduceConcept).toBe('exactly-what-you-say');
    expect(r.celebrate).toBe(false);
    expect(r.say.length).toBeGreaterThan(0);
  });

  it('celebrates a clean win and reinforces the anchor', async () => {
    const r = await localStub(afterPlan(['JUMP']));
    expect(r.celebrate).toBe(true);
    expect(r.introduceConcept).toBe('exactly-what-you-say');
  });

  it('does not celebrate a win with extra steps; asks to remove them', async () => {
    const r = await localStub(afterPlan(['JUMP', 'CLIMB']));
    expect(r.celebrate).toBe(false);
    expect(r.say.toLowerCase()).toContain('extra');
  });

  it('on a stumble, points at the wrong action and treats it as information', async () => {
    const r = await localStub(afterPlan(['CLIMB']));
    expect(r.celebrate).toBe(false);
    expect(r.scaffold).toEqual({ kind: 'highlight-step', stepIndex: 0 });
    expect(r.say.toLowerCase()).toContain('exactly what you said');
  });

  it('offers the right action after a repeated stumble', async () => {
    const r = await localStub(afterPlan(['CLIMB'], ['STUMBLE']));
    expect(r.scaffold).toEqual({ kind: 'offer-action', action: 'JUMP' });
  });

  it('nudges to add an action when the plan is incomplete', async () => {
    const r = await localStub(afterPlan([]));
    expect(r.celebrate).toBe(false);
    expect(r.say.toLowerCase()).toContain('add');
  });
});
