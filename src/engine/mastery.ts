import type { Level, Outcome, Token, Trace } from './types';

export interface MasteryResult {
  mastered: boolean;
  outcome: Outcome;
  /** Tokens beyond optimal on a winning plan; telemetry only, never an L1 gate. */
  redundantSteps: number;
  reason: string;
}

/**
 * Decide whether an attempt demonstrates mastery of the level. Pure.
 *
 * L1's rule is simply reaching the goal: sequence is the lesson, not efficiency.
 * `redundantSteps` is computed for telemetry and becomes the gate at L3, where
 * folding a brute-forced run into REPEAT is the point. Attempts are never a gate.
 */
export function evaluateMastery(level: Level, plan: Token[], trace: Trace): MasteryResult {
  const won = trace.outcome === 'WIN';
  const redundantSteps = won ? Math.max(0, plan.length - level.optimalSteps) : 0;

  let mastered: boolean;
  switch (level.mastery.kind) {
    case 'reach-goal':
      mastered = won;
      break;
    case 'reach-goal-within':
      mastered = won && redundantSteps <= level.mastery.maxRedundant;
      break;
  }

  return {
    mastered,
    outcome: trace.outcome,
    redundantSteps,
    reason: mastered ? 'mastered' : `not yet (${trace.outcome})`,
  };
}
