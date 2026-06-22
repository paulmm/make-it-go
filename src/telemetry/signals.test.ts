import { describe, it, expect } from 'vitest';
import { computeSignals } from './signals';
import type { LevelAttempt } from './signals';
import type { AnchorId, Outcome } from '../engine/types';

const ANCHOR: Record<string, AnchorId> = {
  L1: 'exactly-what-you-say',
  L2: 'steps-in-order',
  L3: 'bundle-and-repeat',
  L4: 'find-and-fix',
};

const att = (
  levelId: string,
  outcome: Outcome,
  attemptNumber: number,
  hinted: boolean,
  redundant = 0,
): LevelAttempt => ({ levelId, anchorId: ANCHOR[levelId], outcome, attemptNumber, hinted, redundant });

describe('computeSignals', () => {
  it('is all-weak and not-ready with no attempts', () => {
    const s = computeSignals([]);
    expect(s.levelsSolved).toBe(0);
    expect(s.ready).toBe(false);
    expect(s.transfer.strong).toBe(false);
    expect(s.firstTry.strong).toBe(false);
    expect(s.selfDebug.strong).toBe(false);
  });

  it('counts an unaided clean first-try win as transfer + first-try', () => {
    const s = computeSignals([att('L1', 'WIN', 1, false)]);
    expect(s.levelsSolved).toBe(1);
    expect(s.transfer.value).toContain('1 of 4');
    expect(s.firstTry.value).toContain('1 level');
    // one is not enough to be "strong" yet
    expect(s.firstTry.strong).toBe(false);
  });

  it('does not credit transfer when she needed a hint', () => {
    const s = computeSignals([att('L1', 'STUMBLE', 1, true), att('L1', 'WIN', 2, true)]);
    expect(s.transfer.value).toContain('0 of 4'); // solved, but hinted -> not transfer
  });

  it('detects self-initiated debugging (fail then a revised win)', () => {
    const s = computeSignals([att('L2', 'STUMBLE', 1, false), att('L2', 'WIN', 2, false)]);
    expect(s.selfDebug.value).toContain('1 time');
    expect(s.selfDebug.strong).toBe(true);
    expect(s.firstTry.value).toContain('0 level'); // first attempt was a stumble
  });

  it('reads prompt-fade as strong when later levels need no more help', () => {
    // L1 needed 2 hints, L4 needed none -> help is fading.
    const fading = computeSignals([
      att('L1', 'STUMBLE', 1, true),
      att('L1', 'WIN', 2, true),
      att('L4', 'WIN', 1, false),
    ]);
    expect(fading.promptFade.strong).toBe(true);
    // The reverse trend is not fading.
    const rising = computeSignals([att('L1', 'WIN', 1, false), att('L4', 'WIN', 1, true)]);
    expect(rising.promptFade.strong).toBe(false);
  });

  it('flags readiness only when all four signals are strong', () => {
    // Four clean unaided first-try wins, plus a self-debug recovery on a replay.
    const graduate = computeSignals([
      att('L1', 'WIN', 1, false),
      att('L2', 'WIN', 1, false),
      att('L3', 'WIN', 1, false),
      att('L4', 'STUMBLE', 1, false),
      att('L4', 'WIN', 2, false),
    ]);
    expect(graduate.transfer.strong).toBe(true); // 4 concepts, no hints
    expect(graduate.firstTry.strong).toBe(true); // L1-L3 first-try
    expect(graduate.selfDebug.strong).toBe(true); // L4 recovered
    expect(graduate.promptFade.strong).toBe(true); // no hints anywhere
    expect(graduate.ready).toBe(true);
  });
});
