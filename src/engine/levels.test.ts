import { describe, it, expect } from 'vitest';
import { run } from './interpreter';
import {
  GAP_LEVEL,
  BRANCH_LEVEL,
  ORDER_LEVEL,
  REPEAT_LEVEL,
  KEY_GATE_LEVEL,
  MIXED_LEVEL,
  RUN_THEN_LEVEL,
  CARRY_LEVEL,
  CAPSTONE_LEVEL,
  LEVELS,
} from './levels';
import { REQUIRED_ACTION } from './types';
import type { Action, Level } from './types';

/** The clean solve: the required action at each point, in order. */
const solve = (level: Level): Action[] => level.points.map((p) => REQUIRED_ACTION[p]);

describe('the ladder', () => {
  it('is nine rungs, in play order, with unique sequential ids', () => {
    expect(LEVELS).toHaveLength(9);
    expect(LEVELS.map((l) => l.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9']);
  });

  it('every rung is solved cleanly by the right action at each point, in order', () => {
    for (const level of LEVELS) {
      const trace = run(level, solve(level));
      expect(trace.outcome, `${level.id} should be winnable`).toBe('WIN');
      expect(trace.redundantTokens, `${level.id} clean solve has no extra tokens`).toBe(0);
    }
  });

  it('every rung poses a real choice (two+ actions, or the REPEAT tool)', () => {
    for (const level of LEVELS) {
      const hasChoice = level.allowedActions.length >= 2 || level.mastery.kind === 'bundle-to-goal';
      expect(hasChoice, `${level.id} should pose a real choice`).toBe(true);
    }
  });

  it('offers every required action on the tray', () => {
    for (const level of LEVELS) {
      for (const p of level.points) {
        expect(level.allowedActions, `${level.id} must offer ${REQUIRED_ACTION[p]}`).toContain(REQUIRED_ACTION[p]);
      }
    }
  });
});

describe('L1 / L2 — the two single-action mappings (exactly-what-you-say)', () => {
  it('L1 is a gap cleared by JUMP; a wrong pick stumbles', () => {
    expect(GAP_LEVEL.points).toEqual(['GAP']);
    expect(run(GAP_LEVEL, ['JUMP']).outcome).toBe('WIN');
    expect(run(GAP_LEVEL, ['CLIMB']).outcome).toBe('STUMBLE');
    expect(GAP_LEVEL.anchorId).toBe('exactly-what-you-say');
  });

  it('L2 is a branch cleared by DUCK, with JUMP as the tempting wrong pick', () => {
    expect(BRANCH_LEVEL.points).toEqual(['BRANCH']);
    expect(BRANCH_LEVEL.allowedActions).toEqual(expect.arrayContaining(['DUCK', 'JUMP']));
    expect(run(BRANCH_LEVEL, ['DUCK']).outcome).toBe('WIN');
    expect(run(BRANCH_LEVEL, ['JUMP']).outcome).toBe('STUMBLE');
    expect(BRANCH_LEVEL.anchorId).toBe('exactly-what-you-say');
  });
});

describe('L3 / L6 — order matters (steps-in-order)', () => {
  it('L3 needs JUMP then CLIMB; the wrong order stumbles', () => {
    expect(run(ORDER_LEVEL, ['JUMP', 'CLIMB']).outcome).toBe('WIN');
    expect(run(ORDER_LEVEL, ['CLIMB', 'JUMP']).outcome).toBe('STUMBLE');
  });

  it('L6 is the whole vocabulary in order: JUMP, DUCK, CLIMB', () => {
    expect(MIXED_LEVEL.points).toEqual(['GAP', 'BRANCH', 'STEP']);
    expect(run(MIXED_LEVEL, ['JUMP', 'DUCK', 'CLIMB']).outcome).toBe('WIN');
    expect(run(MIXED_LEVEL, ['DUCK', 'JUMP', 'CLIMB']).outcome).toBe('STUMBLE');
    expect(MIXED_LEVEL.anchorId).toBe('steps-in-order');
  });
});

describe('L4 / L7 — iteration, folded with REPEAT (bundle-and-repeat)', () => {
  it('L4 is a run of identical gaps, gated on bundling', () => {
    expect(new Set(REPEAT_LEVEL.points).size).toBe(1);
    expect(REPEAT_LEVEL.points.length).toBeGreaterThanOrEqual(3);
    expect(REPEAT_LEVEL.mastery.kind).toBe('bundle-to-goal');
  });

  it('L7 puts the foldable run at the tail: a gap, then a run of branches', () => {
    expect(RUN_THEN_LEVEL.points[0]).toBe('GAP');
    expect(RUN_THEN_LEVEL.points.slice(1).every((p) => p === 'BRANCH')).toBe(true);
    expect(run(RUN_THEN_LEVEL, ['JUMP', 'DUCK', 'DUCK', 'DUCK']).outcome).toBe('WIN');
    expect(RUN_THEN_LEVEL.mastery.kind).toBe('bundle-to-goal');
  });
});

describe('L5 / L8 / L9 — decomposition, carry, capstone (find-and-fix)', () => {
  it('L5 needs the key before the gate; forgetting it locks the gate', () => {
    expect(run(KEY_GATE_LEVEL, ['GRAB', 'OPEN']).outcome).toBe('WIN');
    expect(run(KEY_GATE_LEVEL, ['OPEN', 'OPEN']).outcome).toBe('LOCKED');
  });

  it('L8 carries the key across a gap to the gate; losing the key still locks it', () => {
    expect(CARRY_LEVEL.points).toEqual(['KEY', 'GAP', 'GATE']);
    expect(run(CARRY_LEVEL, ['GRAB', 'JUMP', 'OPEN']).outcome).toBe('WIN');
    expect(run(CARRY_LEVEL, ['JUMP', 'JUMP', 'OPEN']).outcome).toBe('LOCKED');
  });

  it('L9 capstone: key, a run of branches, then the gate — solved a step at a time', () => {
    expect(CAPSTONE_LEVEL.points[0]).toBe('KEY');
    expect(CAPSTONE_LEVEL.points[CAPSTONE_LEVEL.points.length - 1]).toBe('GATE');
    expect(run(CAPSTONE_LEVEL, ['GRAB', 'DUCK', 'DUCK', 'DUCK', 'OPEN']).outcome).toBe('WIN');
    expect(run(CAPSTONE_LEVEL, ['DUCK', 'DUCK', 'DUCK', 'DUCK', 'OPEN']).outcome).toBe('LOCKED');
    expect(CAPSTONE_LEVEL.anchorId).toBe('find-and-fix');
  });
});
