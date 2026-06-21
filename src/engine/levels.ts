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

/**
 * Level 3 — bundle and repeat (iteration).
 *
 * A run of identical obstacles — four gaps — so the same action over and over is the
 * natural solve. The tray offers only that one action (no choosing to confound the new
 * idea) plus the REPEAT tool. Placing JUMP four times reaches the goal but is the tedium
 * that motivates the fold; tapping REPEAT bundles the run into a single chip.
 *
 *   path:  >> [GAP] [GAP] [GAP] [GAP] >> goal
 *
 * Clean solve: REPEAT(JUMP, 4). Mastery requires actually bundling — brute force reaches
 * the goal but does not demonstrate iteration, so the partner offers the fold.
 */
export const LEVEL_3: Level = {
  id: 'L3',
  points: ['GAP', 'GAP', 'GAP', 'GAP'],
  allowedActions: ['JUMP'],
  anchorId: 'bundle-and-repeat',
  mastery: { kind: 'bundle-to-goal' },
};

/**
 * Level 4 — decomposition (key, then gate).
 *
 * The goal breaks into two subgoals: first get the key, then open the gate. The key is a
 * pickup, not a hazard — walk past it with the wrong action and she simply doesn't have it,
 * and the gate won't open (it's locked). That visible cause and effect is the lesson: when
 * the gate won't open, find the missing step — the key — and fix it.
 *
 *   path:  >> [KEY] >> [GATE] >> goal
 *
 * Clean solve: [GRAB, OPEN]. Forgetting the key: [OPEN, OPEN] -> she reaches a locked gate.
 */
export const LEVEL_4: Level = {
  id: 'L4',
  points: ['KEY', 'GATE'],
  allowedActions: ['GRAB', 'OPEN'],
  anchorId: 'find-and-fix',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

export const LEVELS: Level[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];
