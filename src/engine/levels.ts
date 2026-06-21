import type { Level } from './types';

/**
 * Level 1 — Sequence.
 *
 *   index:  0      1     2        3     4
 *   tile:   START  PATH  HAZARD   PATH  GOAL
 *
 * Optimal: ADVANCE (0->1), LEAP (1->3, over the water), ADVANCE (3->4).
 * The tempting wrong first try is ADVANCE, ADVANCE -> splash at tile 2.
 */
export const LEVEL_1: Level = {
  id: 'L1',
  tiles: ['START', 'PATH', 'HAZARD', 'PATH', 'GOAL'],
  startIndex: 0,
  goalIndex: 4,
  optimalSteps: 3,
  anchorId: 'steps-in-order',
  allowedTokens: ['ADVANCE', 'LEAP'],
  mastery: { kind: 'reach-goal' },
};

export const LEVELS: Level[] = [LEVEL_1];
