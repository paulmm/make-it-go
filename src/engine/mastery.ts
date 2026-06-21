import type { Action, Level, Outcome, Trace } from './types';

export interface MasteryResult {
  mastered: boolean;
  outcome: Outcome;
  /** Tokens beyond the number of points on a winning plan; telemetry only. */
  redundantTokens: number;
  reason: string;
}

/**
 * Decide whether an attempt demonstrates mastery of the level. Pure.
 *
 * L1/L2's rule is simply clearing every point (reaching the goal): the right action, in
 * order, is the lesson — not efficiency. `redundantTokens` is recorded for telemetry and
 * becomes the gate at L3, where folding a brute-forced run into REPEAT is the point.
 * Attempts are never a gate.
 */
export function evaluateMastery(level: Level, plan: Action[], trace: Trace): MasteryResult {
  const won = trace.outcome === 'WIN';
  const redundantTokens = won ? Math.max(0, plan.length - level.points.length) : 0;

  let mastered: boolean;
  switch (level.mastery.kind) {
    case 'reach-goal':
      mastered = won;
      break;
    case 'reach-goal-within':
      mastered = won && redundantTokens <= level.mastery.maxRedundant;
      break;
  }

  return {
    mastered,
    outcome: trace.outcome,
    redundantTokens,
    reason: mastered ? 'mastered' : `not yet (${trace.outcome})`,
  };
}
