import type { Level } from './types';

/**
 * The capability ladder. Each rung introduces or deepens exactly one idea, and mastering it
 * unlocks the next. The early rungs are deliberately easy wins — one obvious move at a time — so
 * she feels success fast and likes the game; the later rungs combine the ideas she has met into
 * richer challenges (a longer dance, a fold inside a run, carrying a key past a hazard).
 *
 * Levels are pure data over one shared interpreter; adding a rung is adding data, never engine
 * logic. `id` follows play order; the partner keys its words off the anchor and the shape of the
 * points, so it speaks to every rung without per-level code.
 */

/** L1 — the right action. One gap; pick JUMP over CLIMB. (exactly-what-you-say) */
export const GAP_LEVEL: Level = {
  id: 'L1',
  points: ['GAP'],
  allowedActions: ['JUMP', 'CLIMB'],
  anchorId: 'exactly-what-you-say',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/** L2 — a second mapping. One branch to duck under; pick DUCK over JUMP. (exactly-what-you-say) */
export const BRANCH_LEVEL: Level = {
  id: 'L2',
  points: ['BRANCH'],
  allowedActions: ['DUCK', 'JUMP'],
  anchorId: 'exactly-what-you-say',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/** L3 — order matters. A gap then a step: JUMP then CLIMB, in that order. (steps-in-order) */
export const ORDER_LEVEL: Level = {
  id: 'L3',
  points: ['GAP', 'STEP'],
  allowedActions: ['JUMP', 'CLIMB'],
  anchorId: 'steps-in-order',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/** L4 — iteration. Four gaps in a row; the one action, folded into a REPEAT. (bundle-and-repeat) */
export const REPEAT_LEVEL: Level = {
  id: 'L4',
  points: ['GAP', 'GAP', 'GAP', 'GAP'],
  allowedActions: ['JUMP'],
  anchorId: 'bundle-and-repeat',
  mastery: { kind: 'bundle-to-goal' },
};

/** L5 — decomposition. Grab the key, then open the gate; wrong order stays locked. (find-and-fix) */
export const KEY_GATE_LEVEL: Level = {
  id: 'L5',
  points: ['KEY', 'GATE'],
  allowedActions: ['GRAB', 'OPEN'],
  anchorId: 'find-and-fix',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/** L6 — the whole dance. A gap, a branch, a step: JUMP, DUCK, CLIMB, all three in order. */
export const MIXED_LEVEL: Level = {
  id: 'L6',
  points: ['GAP', 'BRANCH', 'STEP'],
  allowedActions: ['JUMP', 'DUCK', 'CLIMB'],
  anchorId: 'steps-in-order',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/**
 * L7 — fold a run inside a longer plan. A gap, then three branches: JUMP, then REPEAT(DUCK). The
 * repeated run is at the tail, so tapping REPEAT folds it cleanly. (bundle-and-repeat, deepened)
 */
export const RUN_THEN_LEVEL: Level = {
  id: 'L7',
  points: ['GAP', 'BRANCH', 'BRANCH', 'BRANCH'],
  allowedActions: ['JUMP', 'DUCK'],
  anchorId: 'bundle-and-repeat',
  mastery: { kind: 'bundle-to-goal' },
};

/**
 * L8 — carry it. Grab the key, clear a gap, THEN open the gate: the key rides across the hazard,
 * so cause and effect now spans a distance. Forget the key and the gate locks. (find-and-fix)
 */
export const CARRY_LEVEL: Level = {
  id: 'L8',
  points: ['KEY', 'GAP', 'GATE'],
  allowedActions: ['GRAB', 'JUMP', 'OPEN'],
  anchorId: 'find-and-fix',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/**
 * L9 — the capstone. Grab the key, duck under three branches, then open the gate: decomposition
 * and carry and a run, all in one ordered plan. Solved a step at a time, in order. (find-and-fix)
 */
export const CAPSTONE_LEVEL: Level = {
  id: 'L9',
  points: ['KEY', 'BRANCH', 'BRANCH', 'BRANCH', 'GATE'],
  allowedActions: ['GRAB', 'DUCK', 'OPEN'],
  anchorId: 'find-and-fix',
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
};

/** The ladder, in play order. Mastery of each unlocks the next. */
export const LEVELS: Level[] = [
  GAP_LEVEL,
  BRANCH_LEVEL,
  ORDER_LEVEL,
  REPEAT_LEVEL,
  KEY_GATE_LEVEL,
  MIXED_LEVEL,
  RUN_THEN_LEVEL,
  CARRY_LEVEL,
  CAPSTONE_LEVEL,
];

// Back-compat aliases for the original four rungs (kept so existing fixtures stay stable).
export const LEVEL_1 = GAP_LEVEL;
export const LEVEL_2 = ORDER_LEVEL;
export const LEVEL_3 = REPEAT_LEVEL;
export const LEVEL_4 = KEY_GATE_LEVEL;
