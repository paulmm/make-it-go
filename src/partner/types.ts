import type { AnchorId, Level, Outcome, Token, Trace } from '../engine/types';

/** A hint the partner attaches to its spoken line — the "right tool at the right moment." */
export type Scaffold =
  | { kind: 'none' }
  | { kind: 'highlight-step'; stepIndex: number } // point at the wrong step
  | { kind: 'offer-token'; token: Token }; // offer the tool she needs (e.g. LEAP)

/** The theme nouns the partner weaves into its lines, passed as data (never hardcoded). */
export interface PartnerNouns {
  hero: string;
  goal: string;
  hazard: string;
}

/** Everything the partner needs to decide what to say. */
export interface PartnerContext {
  themeId: string;
  nouns: PartnerNouns;
  level: Level;
  conceptsKnown: AnchorId[];
  currentPlan: Token[];
  /** null before the first run of this level. */
  lastOutcome: Outcome | null;
  /** The last run's trace, so the partner can point at the wrong step. */
  lastTrace: Trace | null;
  attemptsThisLevel: number;
  /** Outcomes of earlier attempts on this level, oldest first. */
  recentHistory: Outcome[];
}

export interface PartnerResponse {
  /** Short spoken sentence(s). */
  say: string;
  scaffold: Scaffold;
  /** An anchor to (re)introduce with its fixed words. */
  introduceConcept?: AnchorId;
  celebrate: boolean;
}

/** The one seam: localStub for dev/offline, claudeBrain for production. UI never changes. */
export type PartnerStep = (context: PartnerContext) => Promise<PartnerResponse>;
