import type { Action, Level, Outcome, Trace } from './types';

export interface MasteryResult {
  mastered: boolean;
  outcome: Outcome;
  /** Tokens beyond the number of points on a winning plan; telemetry only. */
  redundantTokens: number;
  reason: string;
}

/** Extra signals a level's rule may read that the flat action list cannot carry. */
export interface MasteryContext {
  /** Did the plan use a real bundle (a REPEAT of 2+)? Gates the L3 iteration rule. */
  usedBundle?: boolean;
}

/**
 * Decide whether an attempt demonstrates mastery of the level. Pure.
 *
 * L1/L2's rule is simply clearing every point (reaching the goal): the right action, in
 * order, is the lesson — not efficiency. `redundantTokens` is recorded for telemetry and
 * becomes the gate at L3, where folding a brute-forced run into REPEAT is the point.
 * Attempts are never a gate.
 */
export function evaluateMastery(
  level: Level,
  plan: (Action | null)[],
  trace: Trace,
  context: MasteryContext = {},
): MasteryResult {
  const won = trace.outcome === 'WIN';
  const placed = plan.filter((a) => a !== null).length; // empty slots aren't tokens
  const redundantTokens = won ? Math.max(0, placed - level.points.length) : 0;

  let mastered: boolean;
  switch (level.mastery.kind) {
    case 'reach-goal':
      mastered = won;
      break;
    case 'reach-goal-within':
      mastered = won && redundantTokens <= level.mastery.maxRedundant;
      break;
    case 'bundle-to-goal':
      // The fold is the lesson: reach the goal cleanly AND actually bundle.
      mastered = won && redundantTokens === 0 && context.usedBundle === true;
      break;
  }

  return {
    mastered,
    outcome: trace.outcome,
    redundantTokens,
    reason: mastered ? 'mastered' : `not yet (${trace.outcome})`,
  };
}
