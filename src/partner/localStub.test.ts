import { describe, it, expect } from 'vitest';
import { localStub } from './localStub';
import type { PartnerContext } from './types';
import { CARRY_LEVEL, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4 } from '../engine/levels';
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

  it('opens by naming this level’s specific challenge, not a generic prompt', async () => {
    const l1 = await localStub(ctx({ level: LEVEL_1 }));
    expect(l1.say.toLowerCase()).toContain('gap');
    const l2 = await localStub(ctx({ level: LEVEL_2 }));
    expect(l2.say.toLowerCase()).toContain('order');
    const l3 = await localStub(ctx({ level: LEVEL_3 }));
    expect(l3.say.toLowerCase()).toContain('every');
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

describe('localStub partner — speaks about the hero by its theme noun', () => {
  it('never says "she" — the hero may be a truck', async () => {
    const truck = { nouns: { hero: 'truck', goal: 'flag' } };
    const noShe = (say: string) => expect(say).not.toMatch(/\bshe\b/i);

    const stumble = run(LEVEL_1, ['CLIMB']);
    const s = await localStub(ctx({ ...truck, currentPlan: ['CLIMB'], lastOutcome: stumble.outcome, lastTrace: stumble, attemptsThisLevel: 1 }));
    expect(s.say.toLowerCase()).toContain('truck');
    noShe(s.say);

    const incomplete = run(LEVEL_1, []);
    const i = await localStub(ctx({ ...truck, lastOutcome: incomplete.outcome, lastTrace: incomplete, attemptsThisLevel: 1 }));
    noShe(i.say);

    const locked = run(LEVEL_4, ['OPEN', 'OPEN']);
    const l = await localStub(ctx({ ...truck, level: LEVEL_4, currentPlan: ['OPEN', 'OPEN'], lastOutcome: locked.outcome, lastTrace: locked, attemptsThisLevel: 1 }));
    expect(l.say.toLowerCase()).toContain('truck');
    noShe(l.say);
  });
});

describe('localStub partner — L8 (carry: key, gap, gate)', () => {
  function afterL8(plan: Action[]): PartnerContext {
    const trace = run(CARRY_LEVEL, plan);
    return ctx({ level: CARRY_LEVEL, currentPlan: plan, lastOutcome: trace.outcome, lastTrace: trace });
  }

  it('points at the stumble, not the harmlessly missed key before it', async () => {
    // KEY+JUMP -> she walks past (MISSED, non-fatal); GAP+OPEN -> the run actually ends here.
    const r = await localStub(afterL8(['JUMP', 'OPEN', 'OPEN']));
    expect(r.scaffold).toEqual({ kind: 'highlight-step', stepIndex: 1 });
    expect(r.say.toLowerCase()).toContain('gap');
    expect(r.say.toLowerCase()).not.toContain('key');
  });

  it('names the point she actually ran out at, not the missed key', async () => {
    // KEY+JUMP -> MISSED; the GAP has no token left, so the run ends there.
    const r = await localStub(afterL8(['JUMP']));
    expect(r.say.toLowerCase()).toContain('gap');
    expect(r.say.toLowerCase()).not.toContain('key');
  });
});

describe('localStub partner — L4 (decomposition)', () => {
  function afterL4(plan: Action[]): PartnerContext {
    const trace = run(LEVEL_4, plan);
    return ctx({ level: LEVEL_4, currentPlan: plan, lastOutcome: trace.outcome, lastTrace: trace });
  }

  it('frames the two subgoals at the start of the level', async () => {
    const r = await localStub(ctx({ level: LEVEL_4 }));
    expect(r.say.toLowerCase()).toContain('key');
    expect(r.say.toLowerCase()).toContain('gate');
  });

  it('explains the locked gate and offers the key when she forgets it', async () => {
    const r = await localStub(afterL4(['OPEN', 'OPEN']));
    expect(r.celebrate).toBe(false);
    expect(r.scaffold).toEqual({ kind: 'offer-action', action: 'GRAB' });
    expect(r.say.toLowerCase()).toContain('locked');
  });

  it('celebrates getting the key then the gate, and plants find-and-fix', async () => {
    const r = await localStub(afterL4(['GRAB', 'OPEN']));
    expect(r.celebrate).toBe(true);
    expect(r.introduceConcept).toBe('find-and-fix');
  });
});
