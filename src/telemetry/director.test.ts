import { describe, it, expect } from 'vitest';
import { computeSignals } from './signals';
import type { LevelAttempt } from './signals';
import { nextChallenge, generateLevel, makeRng } from '../engine/generate';
import { run } from '../engine/interpreter';
import { REQUIRED_ACTION } from '../engine/types';
import type { AnchorId } from '../engine/types';

// The exact chain the app runs in endless mode: recorded attempts -> capability signals -> the
// director's next challenge. This verifies the adaptive loop end to end (the App only maps the
// `.strong` flags onto the SkillState, replicated here).
function skillFromAttempts(attempts: LevelAttempt[], cleared = 0) {
  const s = computeSignals(attempts);
  return {
    firstTry: s.firstTry.strong,
    selfDebug: s.selfDebug.strong,
    transfer: s.transfer.strong,
    promptFade: s.promptFade.strong,
    cleared,
  };
}
const win = (levelId: string, anchorId: AnchorId, attemptNumber: number, hinted: boolean): LevelAttempt => ({
  levelId,
  anchorId,
  outcome: 'WIN',
  attemptNumber,
  hinted,
  redundant: 0,
});
const miss = (levelId: string, anchorId: AnchorId, attemptNumber: number): LevelAttempt => ({
  levelId,
  anchorId,
  outcome: 'STUMBLE',
  attemptNumber,
  hinted: true,
  redundant: 0,
});

describe('adaptive director — the live telemetry -> signals -> next-challenge chain', () => {
  it('targets debugging when she wins cleanly but has never recovered from a mistake', () => {
    const attempts = [win('L1', 'exactly-what-you-say', 1, false), win('L3', 'steps-in-order', 1, false)];
    const skill = skillFromAttempts(attempts);
    expect(skill).toMatchObject({ firstTry: true, transfer: true, selfDebug: false });

    const { emphasis, difficulty } = nextChallenge(skill);
    expect(emphasis).toBe('order'); // a fixable wrong-order mistake to practice debugging on

    const lvl = generateLevel(difficulty, makeRng(1), 'G', emphasis);
    expect(run(lvl, lvl.points.map((p) => REQUIRED_ACTION[p])).outcome).toBe('WIN'); // and it's solvable
  });

  it('eases to fundamentals when she rarely wins first try, even though she recovers', () => {
    const attempts = [miss('L1', 'exactly-what-you-say', 1), win('L1', 'exactly-what-you-say', 2, false)];
    const skill = skillFromAttempts(attempts);
    expect(skill).toMatchObject({ firstTry: false, selfDebug: true });
    expect(nextChallenge(skill).emphasis).toBe('fundamentals');
  });
});
