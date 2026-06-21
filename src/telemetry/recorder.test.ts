import { describe, it, expect } from 'vitest';
import { createRecorder } from './recorder';

describe('createRecorder', () => {
  it('numbers attempts per level starting at 1', () => {
    const rec = createRecorder();
    const a = rec.record({ levelId: 'L1', plan: ['ADVANCE'], outcome: 'INCOMPLETE', redundantSteps: 0 });
    const b = rec.record({ levelId: 'L1', plan: ['ADVANCE', 'ADVANCE'], outcome: 'SPLASH', redundantSteps: 0 });
    expect(a.attemptNumber).toBe(1);
    expect(b.attemptNumber).toBe(2);
  });

  it('counts attempts and lists outcomes per level, in order', () => {
    const rec = createRecorder();
    rec.record({ levelId: 'L1', plan: ['ADVANCE', 'ADVANCE'], outcome: 'SPLASH', redundantSteps: 0 });
    rec.record({ levelId: 'L1', plan: ['ADVANCE', 'LEAP', 'ADVANCE'], outcome: 'WIN', redundantSteps: 0 });
    expect(rec.attemptsFor('L1')).toBe(2);
    expect(rec.outcomesFor('L1')).toEqual(['SPLASH', 'WIN']);
  });

  it('keeps levels separate', () => {
    const rec = createRecorder();
    rec.record({ levelId: 'L1', plan: [], outcome: 'INCOMPLETE', redundantSteps: 0 });
    rec.record({ levelId: 'L2', plan: [], outcome: 'INCOMPLETE', redundantSteps: 0 });
    expect(rec.attemptsFor('L1')).toBe(1);
    expect(rec.attemptsFor('L2')).toBe(1);
  });

  it('records no timestamp or duration (growth, not time-on-app)', () => {
    const rec = createRecorder();
    const a = rec.record({ levelId: 'L1', plan: [], outcome: 'INCOMPLETE', redundantSteps: 0 });
    expect(Object.keys(a).sort()).toEqual([
      'attemptNumber',
      'levelId',
      'outcome',
      'plan',
      'redundantSteps',
    ]);
  });
});
