import { describe, it, expect } from 'vitest';
import { localStub } from './localStub';
import type { PartnerContext } from './types';
import { LEVEL_1, LEVEL_3 } from '../engine/levels';
import { run } from '../engine/interpreter';
import type { Action, Outcome } from '../engine/types';

function ctx(partial: Partial<PartnerContext> = {}): PartnerContext {
  return {
    themeId: 'meadow',
    nouns: { hero: 'bunny', goal: 'carrot' },
    level: LEVEL_1,
    conceptsKnown: [],
    currentPlan: [],
    usedBundle: false,
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

describe('localStub partner — L3 (iteration)', () => {
  const full: Action[] = LEVEL_3.points.map(() => 'JUMP');

  function afterL3(plan: Action[], usedBundle: boolean): PartnerContext {
    const trace = run(LEVEL_3, plan);
    return ctx({ level: LEVEL_3, currentPlan: plan, usedBundle, lastOutcome: trace.outcome, lastTrace: trace });
  }

  it('offers the REPEAT fold after a brute-forced win (reached the goal one-by-one)', async () => {
    const r = await localStub(afterL3(full, false));
    expect(r.celebrate).toBe(false);
    expect(r.scaffold).toEqual({ kind: 'offer-repeat' });
    expect(r.say.toLowerCase()).toContain('bundle');
  });

  it('celebrates and plants the bundle anchor when she actually bundled', async () => {
    const r = await localStub(afterL3(full, true));
    expect(r.celebrate).toBe(true);
    expect(r.introduceConcept).toBe('bundle-and-repeat');
  });

  it('asks to grow the bundle when it was too small to reach the goal', async () => {
    const r = await localStub(afterL3(['JUMP', 'JUMP'], true));
    expect(r.scaffold).toEqual({ kind: 'offer-repeat' });
    expect(r.say.toLowerCase()).toContain('bigger');
  });
});
