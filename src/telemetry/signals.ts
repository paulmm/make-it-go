import type { AnchorId, Outcome } from '../engine/types';

/**
 * One recorded attempt, enriched for the four capability signals. Deliberately carries NO
 * timestamp or duration — time-on-app is never measured. `hinted` is whether the partner showed
 * a scaffold (a nudge) in response; `attemptNumber` is 1-based within a level visit.
 */
export interface LevelAttempt {
  levelId: string;
  anchorId: AnchorId;
  outcome: Outcome;
  attemptNumber: number;
  hinted: boolean;
  redundant: number;
}

/** A single capability signal: a 0..1 strength for a meter, a human label, and a pass flag. */
export interface Signal {
  strength: number;
  value: string;
  strong: boolean;
}

export interface CapabilitySignals {
  levelsSolved: number;
  /** Solves a concept with no hints — she wasn't walked through it. */
  transfer: Signal;
  /** Partner interventions trending down — she needs less help over time. */
  promptFade: Signal;
  /** Clean wins on the first attempt — unaided first-try correctness. */
  firstTry: Signal;
  /** Recovers a wrong plan into a win by revising — self-initiated debugging. */
  selfDebug: Signal;
  /** All four strong: time to recommend ScratchJr. */
  ready: boolean;
}

const TOTAL_CONCEPTS = 4; // the four knowledge anchors

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

interface LevelSummary {
  levelId: string;
  anchorId: AnchorId;
  won: boolean;
  firstTryClean: boolean;
  hints: number;
  noHints: boolean;
  recovered: boolean;
}

/** Collapse the attempt log into one summary per level (first encounter order preserved). */
function summarize(attempts: LevelAttempt[]): Map<string, LevelSummary> {
  const byLevel = new Map<string, LevelAttempt[]>();
  for (const a of attempts) {
    const list = byLevel.get(a.levelId);
    if (list) list.push(a);
    else byLevel.set(a.levelId, [a]);
  }
  const out = new Map<string, LevelSummary>();
  for (const [levelId, list] of byLevel) {
    const firstWinIdx = list.findIndex((a) => a.outcome === 'WIN');
    const won = firstWinIdx >= 0;
    const first = list[0];
    out.set(levelId, {
      levelId,
      anchorId: first.anchorId,
      won,
      firstTryClean: first.outcome === 'WIN' && first.redundant === 0,
      hints: list.filter((a) => a.hinted).length,
      noHints: list.every((a) => !a.hinted),
      recovered: won && list.slice(0, firstWinIdx).some((a) => a.outcome !== 'WIN'),
    });
  }
  return out;
}

/** Compute the four capability signals from the whole attempt log. Pure. */
export function computeSignals(attempts: LevelAttempt[]): CapabilitySignals {
  const summary = summarize(attempts);
  const levels = [...summary.values()];
  const solved = levels.filter((l) => l.won);
  const levelsSolved = solved.length;

  // Transfer: distinct concepts solved without any hint.
  const transferConcepts = new Set(solved.filter((l) => l.noHints).map((l) => l.anchorId)).size;
  const transfer: Signal = {
    strength: clamp01(transferConcepts / TOTAL_CONCEPTS),
    value: `${transferConcepts} of ${TOTAL_CONCEPTS} ideas`,
    strong: transferConcepts >= 2,
  };

  // First-try: clean wins on the very first attempt.
  const firstTryCount = levels.filter((l) => l.firstTryClean).length;
  const firstTry: Signal = {
    strength: clamp01(firstTryCount / TOTAL_CONCEPTS),
    value: `${firstTryCount} level${firstTryCount === 1 ? '' : 's'}`,
    strong: firstTryCount >= 2,
  };

  // Self-debug: recovered from a fail to a win on the same level.
  const selfDebugCount = levels.filter((l) => l.recovered).length;
  const selfDebug: Signal = {
    strength: clamp01(selfDebugCount / TOTAL_CONCEPTS),
    value: `${selfDebugCount} time${selfDebugCount === 1 ? '' : 's'}`,
    strong: selfDebugCount >= 1,
  };

  // Prompt-fade: hints trend down across solved levels, in the order she met them. `summarize`
  // preserves first-encounter order, which IS play order; levelId strings don't sort by it
  // (generated 'G1'/'G10' would land before 'L1'), so never sort here.
  const promptFade = fadeSignal(solved.map((l) => l.hints));

  const ready = transfer.strong && firstTry.strong && selfDebug.strong && promptFade.strong;
  return { levelsSolved, transfer, promptFade, firstTry, selfDebug, ready };
}

/** Hints over the solved levels: strong when the later half needs no more help than the earlier. */
function fadeSignal(hintsPerSolvedLevel: number[]): Signal {
  if (hintsPerSolvedLevel.length < 2) {
    return { strength: 0, value: 'not yet', strong: false };
  }
  const mid = Math.floor(hintsPerSolvedLevel.length / 2) || 1;
  const early = avg(hintsPerSolvedLevel.slice(0, mid));
  const late = avg(hintsPerSolvedLevel.slice(mid));
  const total = hintsPerSolvedLevel.reduce((a, b) => a + b, 0);
  const fading = late <= early; // help is not increasing
  // Fewer hints overall reads as stronger; zero hints is full strength.
  const strength = clamp01(1 - total / (hintsPerSolvedLevel.length * 2));
  const value = total === 0 ? 'needs no hints' : fading ? 'fewer hints lately' : 'still helping a lot';
  return { strength, value, strong: fading };
}
