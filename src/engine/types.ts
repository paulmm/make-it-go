// Core engine types — theme-agnostic and pure. The character auto-walks; the child
// supplies one action token per event point. Themes reskin event points and actions;
// they never change how a plan executes.

/** Action tokens available at Level 1. Later levels add GRAB, OPEN. */
export type Action = 'JUMP' | 'DUCK' | 'CLIMB';

/**
 * A token the child places in her plan. Either a single action, or a REPEAT that bundles
 * one action to run `count` times — iteration made concrete (one chip, many steps). The
 * interpreter never sees these: `expandPlan` flattens them to a literal Action[] first, so
 * a repeat is exactly its expansion. No magic, no autocorrect.
 */
export type PlanToken =
  | { type: 'action'; action: Action }
  | { type: 'repeat'; action: Action; count: number };

/** Kinds of event point on the path. Later levels add KEY, GATE. */
export type EventKind = 'GAP' | 'BRANCH' | 'STEP';

/** The one correct action for each event-point kind. Theme-agnostic, 1:1. */
export const REQUIRED_ACTION: Record<EventKind, Action> = {
  GAP: 'JUMP',
  BRANCH: 'DUCK',
  STEP: 'CLIMB',
};

/** The fixed knowledge anchors. Each level plants or reinforces exactly one. */
export type AnchorId =
  | 'exactly-what-you-say'
  | 'steps-in-order'
  | 'bundle-and-repeat'
  | 'find-and-fix';

/**
 * Per-level mastery rule. L1/L2 use 'reach-goal' (clear every point). The union
 * documents the seam: L3 adds an efficiency rule where folding a brute-forced run
 * into REPEAT is the lesson.
 */
export type MasteryRule =
  | { kind: 'reach-goal' }
  | { kind: 'reach-goal-within'; maxRedundant: number }
  // L3 iteration: reach the goal AND actually bundle (a repeat of 2+). Brute-forcing every
  // step one-by-one reaches the goal but does not demonstrate the new idea, so it does not
  // master — the partner then offers the fold.
  | { kind: 'bundle-to-goal' };

/** A theme-agnostic level: an ordered list of event points plus rules. */
export interface Level {
  id: string;
  /** Event points along the path, in the order the character meets them. */
  points: EventKind[];
  /** Action tokens offered on the tray (>= 2 so the choice is real). */
  allowedActions: Action[];
  /** The knowledge anchor this level plants. */
  anchorId: AnchorId;
  mastery: MasteryRule;
}

/** What happened when the character reached one event point. */
export type StepResult = 'PASS' | 'WRONG' | 'MISSING';

/** One event point as it was met during the run — recorded literally for the UI. */
export interface Step {
  pointIndex: number;
  kind: EventKind;
  /** The action this point needed. */
  required: Action;
  /** The action she had queued for it; null if she ran out of tokens. */
  played: Action | null;
  result: StepResult;
}

/**
 * The outcome of running a whole plan.
 * WIN: every point cleared. STUMBLE: a wrong action at a point. INCOMPLETE: ran out of
 * tokens at a point. STUMBLE and INCOMPLETE are both fails, kept distinct so the partner
 * can speak to each differently.
 */
export type Outcome = 'WIN' | 'STUMBLE' | 'INCOMPLETE';

/** The full result of executing a plan — everything the UI needs to animate. */
export interface Trace {
  outcome: Outcome;
  steps: Step[];
  /** How many points she cleared before the run ended. */
  clearedPoints: number;
  /** Tokens beyond the number of points (trailing/unused) — telemetry only. */
  redundantTokens: number;
}
