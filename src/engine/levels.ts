import type { Level } from './types';

/**
 * Level 1 — the right action.
 *
 * A single event point (a gap) with two actions on the tray, so picking the correct one
 * is a genuine decision. No ordering yet — that is Level 2's idea.
 *
 *   path:  >>>>>  [ GAP ]  >>>>>  goal
 *
 * Clean solve: [JUMP]. Wrong choice: [CLIMB] -> stumble at the gap.
 */
export const LEVEL_1: Level = {
  id: 'L1',
  points: ['GAP'],
  allowedActions: ['JUMP', 'CLIMB'],
  anchorId: 'exactly-what-you-say',
  // A clean solve is exactly the right action, nothing extra: every token matters.
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/**
 * Level 2 — order matters.
 *
 * Two different obstacles in a row, a gap then a step, so the actions must be the right
 * ones IN ORDER.
 *
 *   path:  >>>  [ GAP ]  >>>  [ STEP ]  >>>  goal
 *
 * Clean solve: [JUMP, CLIMB]. CLIMB,JUMP stumbles at the gap; JUMP,JUMP stumbles at the
 * step. This is the debugging lesson — find the wrong step and fix it.
 */
export const LEVEL_2: Level = {
  id: 'L2',
  points: ['GAP', 'STEP'],
  allowedActions: ['JUMP', 'CLIMB'],
  anchorId: 'steps-in-order',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

export const LEVELS: Level[] = [LEVEL_1, LEVEL_2];
