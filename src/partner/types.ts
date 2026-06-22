import type { Action, AnchorId, Level, Outcome, Trace } from '../engine/types';

/** A hint the partner attaches to its line — the "right tool at the right moment." */
export type Scaffold =
  | { kind: 'none' }
  | { kind: 'highlight-step'; stepIndex: number } // point at the wrong action
  | { kind: 'offer-action'; action: Action } // offer the action she needs
  | { kind: 'offer-repeat' }; // pulse the REPEAT tool — bundle the run

export interface PartnerNouns {
  hero: string;
  goal: string;
}

/** Everything the partner needs to decide what to say. */
export interface PartnerContext {
  themeId: string;
  nouns: PartnerNouns;
  /** The active theme's playful flavor words (e.g. "hop", "beep"), for warmth. */
  flavor?: string[];
  level: Level;
  conceptsKnown: AnchorId[];
  /** The plan as the interpreter saw it (repeats already expanded). */
  currentPlan: Action[];
  /** Did the last plan use a real bundle (a REPEAT of 2+)? Drives the L3 offer. */
  usedBundle: boolean;
  /** null before the first run of this level. */
  lastOutcome: Outcome | null;
  /** The last run's trace, so the partner can point at the failed point. */
  lastTrace: Trace | null;
  attemptsThisLevel: number;
  /** Outcomes of earlier attempts on this level, oldest first. */
  recentHistory: Outcome[];
}

export interface PartnerResponse {
  say: string;
  scaffold: Scaffold;
  introduceConcept?: AnchorId;
  celebrate: boolean;
}

/** The one seam: localStub for dev/offline, claudeBrain for production. */
export type PartnerStep = (context: PartnerContext) => Promise<PartnerResponse>;
