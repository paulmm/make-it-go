import type { Outcome, Token } from '../engine/types';

/**
 * One attempt at a level. Deliberately carries NO timestamp or duration —
 * time-on-app is never logged or optimized. Capability is the only measure.
 */
export interface AttemptRecord {
  levelId: string;
  plan: Token[];
  outcome: Outcome;
  /** Tokens beyond optimal on a win (telemetry for prompt-fade / later gates). */
  redundantSteps: number;
  /** 1-based attempt number for this level. */
  attemptNumber: number;
}
