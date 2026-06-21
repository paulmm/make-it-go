import type { Action, Outcome } from '../engine/types';

/**
 * One attempt at a level. Deliberately carries NO timestamp or duration —
 * time-on-app is never logged or optimized. Capability is the only measure.
 */
export interface AttemptRecord {
  levelId: string;
  plan: Action[];
  outcome: Outcome;
  /** Tokens beyond the number of points on a win (telemetry for later gates). */
  redundantTokens: number;
  /** 1-based attempt number for this level. */
  attemptNumber: number;
}
