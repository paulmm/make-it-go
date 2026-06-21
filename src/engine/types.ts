// Core engine types — theme-agnostic and pure. Themes reskin a Level's geometry;
// they never change how it executes.

/** The picture-tokens available in Level 1. */
export type Token = 'ADVANCE' | 'LEAP';

/** What occupies a tile on the 1-D track. */
export type TileKind = 'START' | 'PATH' | 'HAZARD' | 'GOAL';

/** The fixed knowledge anchors. Each level plants or reinforces exactly one. */
export type AnchorId =
  | 'exactly-what-you-say'
  | 'steps-in-order'
  | 'bundle-and-repeat'
  | 'find-and-fix';

/**
 * Per-level mastery rule. Milestone 1 implements only 'reach-goal' (L1's gate is
 * simply reaching the goal). The union documents the seam: L3 will add an
 * efficiency-based rule where folding a brute-forced run into REPEAT is the lesson.
 */
export type MasteryRule =
  | { kind: 'reach-goal' }
  | { kind: 'reach-goal-within'; maxRedundant: number };

/** A theme-agnostic level: pure geometry plus rules. */
export interface Level {
  id: string;
  /** The track, left to right. Index 0 is the leftmost tile. */
  tiles: TileKind[];
  /** Where the hero starts (usually 0). */
  startIndex: number;
  /** Index of the GOAL tile. */
  goalIndex: number;
  /** Minimum tokens needed to win. Telemetry now; a gate at later levels. */
  optimalSteps: number;
  /** The knowledge anchor this level plants. */
  anchorId: AnchorId;
  /** Tokens offered to the child on this level. */
  allowedTokens: Token[];
  mastery: MasteryRule;
}

/** What happened when one token executed and the hero landed. */
export type StepEvent = 'SAFE' | 'WIN' | 'SPLASH' | 'FELL_OFF';

/** One executed token, recorded literally so the UI can replay it. */
export interface Step {
  /** Position of this token within the plan (0-based). */
  index: number;
  token: Token;
  fromIndex: number;
  toIndex: number;
  /** For LEAP, the tile flown over; null for ADVANCE. */
  passedOverIndex: number | null;
  event: StepEvent;
  /** True if this step ended the run. */
  terminal: boolean;
}

/** The outcome of running a whole plan. */
export type Outcome = 'WIN' | 'SPLASH' | 'FELL_OFF' | 'INCOMPLETE';

/** The full result of executing a plan — everything the UI needs to animate. */
export interface Trace {
  outcome: Outcome;
  steps: Step[];
  /** The hero's final tile index. */
  finalIndex: number;
  /** How many tokens actually executed before stopping. */
  executedTokens: number;
}
