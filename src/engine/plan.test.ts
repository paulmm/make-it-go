import { describe, it, expect } from 'vitest';
import { bundleTail, canPlace, expandPlan, placeAction, planSpan, removeToken, usedBundle } from './plan';
import type { PlanToken } from './types';

const act = (action: 'JUMP' | 'CLIMB' | 'DUCK'): PlanToken => ({ type: 'action', action });
const rep = (action: 'JUMP' | 'CLIMB' | 'DUCK', count: number): PlanToken => ({
  type: 'repeat',
  action,
  count,
});

describe('expandPlan — tokens flatten to the literal action sequence', () => {
  it('passes single actions through in order', () => {
    expect(expandPlan([act('JUMP'), act('CLIMB')])).toEqual(['JUMP', 'CLIMB']);
  });

  it('expands a repeat into count copies, in place', () => {
    expect(expandPlan([rep('JUMP', 3)])).toEqual(['JUMP', 'JUMP', 'JUMP']);
  });

  it('mixes singles and repeats positionally', () => {
    expect(expandPlan([act('CLIMB'), rep('JUMP', 2)])).toEqual(['CLIMB', 'JUMP', 'JUMP']);
  });

  it('expands an empty plan to nothing', () => {
    expect(expandPlan([])).toEqual([]);
  });
});

describe('usedBundle — did she really bundle (a repeat of 2+)?', () => {
  it('is false for only single actions', () => {
    expect(usedBundle([act('JUMP'), act('JUMP')])).toBe(false);
  });

  it('is true once a repeat of 2+ is present', () => {
    expect(usedBundle([rep('JUMP', 2)])).toBe(true);
  });

  it('does not count a repeat of 1 as a bundle', () => {
    expect(usedBundle([rep('JUMP', 1)])).toBe(false);
  });
});

describe('bundleTail — the "fold the run into one chip" move', () => {
  it('seeds a bundle of 2 when the plan is empty', () => {
    expect(bundleTail([], 'JUMP', 4)).toEqual([rep('JUMP', 2)]);
  });

  it('folds a trailing run of identical singles into one repeat', () => {
    expect(bundleTail([act('JUMP'), act('JUMP'), act('JUMP')], 'JUMP', 4)).toEqual([rep('JUMP', 3)]);
  });

  it('turns a lone trailing single into a repeat of 2 (the smallest real bundle)', () => {
    expect(bundleTail([act('JUMP')], 'JUMP', 4)).toEqual([rep('JUMP', 2)]);
  });

  it('grows an existing trailing repeat by one', () => {
    expect(bundleTail([rep('JUMP', 3)], 'JUMP', 4)).toEqual([rep('JUMP', 4)]);
  });

  it('cycles back to 2 when the trailing repeat is already at the max', () => {
    expect(bundleTail([rep('JUMP', 4)], 'JUMP', 4)).toEqual([rep('JUMP', 2)]);
  });

  it('only folds the trailing identical run, leaving earlier tokens alone', () => {
    expect(bundleTail([act('CLIMB'), act('JUMP'), act('JUMP')], 'JUMP', 4)).toEqual([
      act('CLIMB'),
      rep('JUMP', 2),
    ]);
  });

  it('never folds beyond the cap', () => {
    expect(bundleTail([act('JUMP'), act('JUMP'), act('JUMP'), act('JUMP'), act('JUMP')], 'JUMP', 4)).toEqual([
      rep('JUMP', 4),
    ]);
  });
});

describe('expandPlan — an empty slot passes through as a null, positionally', () => {
  it('keeps a hole as null in place', () => {
    expect(expandPlan([act('JUMP'), null, act('CLIMB')])).toEqual(['JUMP', null, 'CLIMB']);
  });
});

describe('placeAction — a new pick fills the first open slot, else appends', () => {
  it('appends when the plan has room and no holes', () => {
    expect(placeAction([act('JUMP')], 'CLIMB', 2)).toEqual([act('JUMP'), act('CLIMB')]);
  });

  it('fills a hole instead of appending', () => {
    expect(placeAction([null, act('CLIMB')], 'JUMP', 2)).toEqual([act('JUMP'), act('CLIMB')]);
  });

  it('fills the earliest hole when several exist', () => {
    expect(placeAction([null, null, act('CLIMB')], 'JUMP', 3)).toEqual([act('JUMP'), null, act('CLIMB')]);
  });

  it('does nothing when the path is full and has no holes', () => {
    expect(placeAction([act('JUMP'), act('CLIMB')], 'DUCK', 2)).toEqual([act('JUMP'), act('CLIMB')]);
  });
});

describe('removeToken — a removal leaves a hole, it does not shuffle the rest', () => {
  it('leaves an empty slot where a middle token was, the rest keep their spots', () => {
    expect(removeToken([act('JUMP'), act('CLIMB')], 0)).toEqual([null, act('CLIMB')]);
  });

  it('drops a trailing removal entirely — the path already shows that open slot', () => {
    expect(removeToken([act('JUMP'), act('CLIMB')], 1)).toEqual([act('JUMP')]);
  });

  it('strips trailing holes left behind by a removal', () => {
    expect(removeToken([act('JUMP'), null, act('CLIMB')], 2)).toEqual([act('JUMP')]);
  });
});

describe('planSpan / canPlace — how much of the path a plan occupies', () => {
  it('counts an action or a hole as one and a repeat as its run', () => {
    expect(planSpan([act('JUMP'), null, rep('JUMP', 3)])).toBe(5);
  });

  it('can still place while a hole remains, even at full span', () => {
    expect(canPlace([act('JUMP'), null], 2)).toBe(true);
  });

  it('cannot place once the path is full with no holes', () => {
    expect(canPlace([act('JUMP'), act('CLIMB')], 2)).toBe(false);
  });
});
