import { run } from './interpreter';
import { REQUIRED_ACTION } from './types';
import type { AnchorId, EventKind, Level, MasteryRule } from './types';

// Endless, never-memorized practice for after the taught ladder (L10+). Levels are *generated*,
// not authored, but every one is composed to be valid and then checked against the interpreter
// before it is ever shown — literal execution stays sacred. The point is transfer: can she solve
// a level no one walked her through? Variety removes the answer from memory and leaves the idea.
//
// The director (`nextChallenge`) reads her capability and aims each level at the skill she has
// least developed — so this is practice of exactly what she needs next, not random reps.

const HAZARDS: EventKind[] = ['GAP', 'BRANCH', 'STEP'];
const HAZARD_ACTIONS = HAZARDS.map((h) => REQUIRED_ACTION[h]);

/** What a generated level should exercise. The director picks one to target a weak capability. */
export type Emphasis = 'fundamentals' | 'order' | 'iterate' | 'decompose' | 'mixed';

/** Mulberry32 — a tiny deterministic PRNG so a generated level is replayable and unit-testable. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/** A shuffled prefix of the hazard kinds — distinct obstacles, so order is the real challenge. */
function distinctHazards(n: number, rng: () => number): EventKind[] {
  const pool = HAZARDS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(Math.max(1, n), pool.length));
}

const REACH: MasteryRule = { kind: 'reach-goal-within', maxRedundant: 0 };

/** A foldable run at the tail (iteration): an optional lead step, then 3-5 of one hazard. */
function runShape(rng: () => number): { points: EventKind[]; mastery: MasteryRule } {
  const points: EventKind[] = [];
  if (rng() < 0.5) points.push(pick(HAZARDS, rng));
  const hazard = pick(HAZARDS, rng);
  const runLen = 3 + Math.floor(rng() * 3); // 3..5
  for (let i = 0; i < runLen; i++) points.push(hazard);
  return { points, mastery: { kind: 'bundle-to-goal' } };
}

/** Key, a hazard or two to carry it across, then the gate (decomposition + carry). */
function gateShape(d: number, rng: () => number): { points: EventKind[]; mastery: MasteryRule } {
  const points: EventKind[] = ['KEY'];
  const midCount = 1 + Math.floor(rng() * Math.min(1 + Math.floor((d - 2) / 2), 3)); // 1..~3
  for (let i = 0; i < midCount; i++) points.push(pick(HAZARDS, rng));
  points.push('GATE');
  return { points, mastery: REACH };
}

/** The novel combination: difficulty picks among the shapes, randomness fills it in. */
function mixedShape(d: number, rng: () => number): { points: EventKind[]; mastery: MasteryRule } {
  const roll = rng();
  if (d >= 4 && roll < 0.5) return gateShape(d, rng);
  if (d >= 3 && roll < 0.6) return runShape(rng);
  const len = Math.max(1, Math.min(1 + Math.floor(rng() * d), 5));
  return { points: Array.from({ length: len }, () => pick(HAZARDS, rng)), mastery: REACH };
}

function composePoints(d: number, emphasis: Emphasis, rng: () => number): { points: EventKind[]; mastery: MasteryRule } {
  switch (emphasis) {
    case 'fundamentals': {
      const len = 1 + Math.floor(rng() * 2); // 1..2 — short, approachable, a clean first-try win
      return { points: Array.from({ length: len }, () => pick(HAZARDS, rng)), mastery: REACH };
    }
    case 'order':
      return { points: distinctHazards(2 + (rng() < 0.5 ? 0 : 1), rng), mastery: REACH }; // 2..3 distinct
    case 'iterate':
      return runShape(rng);
    case 'decompose':
      return gateShape(d, rng);
    case 'mixed':
      return mixedShape(d, rng);
  }
}

function anchorFor(points: EventKind[], mastery: MasteryRule): AnchorId {
  if (points.includes('GATE')) return 'find-and-fix';
  if (mastery.kind === 'bundle-to-goal') return 'bundle-and-repeat';
  if (points.length >= 2) return 'steps-in-order';
  return 'exactly-what-you-say';
}

const FALLBACK = (id: string): Level => ({
  id,
  points: ['GAP'],
  allowedActions: ['JUMP', 'CLIMB'],
  anchorId: 'exactly-what-you-say',
  mastery: REACH,
});

/**
 * Compose one valid practice level for a difficulty and emphasis. Randomness within a shape gives
 * the variety. Pure — pass `makeRng(seed)` for a reproducible level. Default emphasis is the novel
 * 'mixed' combination, so existing callers get varied, valid levels.
 */
export function generateLevel(difficulty: number, rng: () => number, id: string, emphasis: Emphasis = 'mixed'): Level {
  const d = Math.max(1, Math.floor(difficulty));
  const { points, mastery } = composePoints(d, emphasis, rng);

  // Tray: every required action, plus a distractor so the choice is real — except a pure run,
  // where bundling (not choosing) is the lesson, so only the run's action is offered.
  const required = Array.from(new Set(points.map((p) => REQUIRED_ACTION[p])));
  let allowedActions = required;
  if (mastery.kind !== 'bundle-to-goal' && required.length < 2) {
    const distractor = HAZARD_ACTIONS.find((a) => !required.includes(a))!;
    allowedActions = [...required, distractor];
  }

  const level: Level = { id, points, allowedActions, anchorId: anchorFor(points, mastery), mastery };

  // Never show an unsolvable level: validate the clean solve, fall back to a trivial gap if off.
  const trace = run(level, points.map((p) => REQUIRED_ACTION[p]));
  return trace.outcome === 'WIN' && trace.redundantTokens === 0 ? level : FALLBACK(id);
}

/**
 * The difficulty for the n-th generated level (0-based), reached only after the whole taught
 * ladder. Practice starts meaty (she has met every idea) and climbs as she clears more — paced
 * by mastery, never by time on app.
 */
export function endlessDifficulty(solvedBeyondLadder: number): number {
  return 4 + Math.floor(solvedBeyondLadder / 2);
}

/** A snapshot of what she can do — the four capability signals (strong or not) plus her progress. */
export interface SkillState {
  firstTry: boolean;
  selfDebug: boolean;
  transfer: boolean;
  promptFade: boolean;
  /** how many generated levels she has cleared so far */
  cleared: number;
}

/**
 * The coach: choose the next challenge's difficulty and emphasis to target the least-developed
 * capability — foundation first, then debugging, then transfer, then independence, then stretch.
 * Pure; the app maps its telemetry signals onto a SkillState. This is what makes the endless
 * stream *practice of exactly what she needs next* rather than random reps.
 */
export function nextChallenge(skill: SkillState): { difficulty: number; emphasis: Emphasis } {
  const base = endlessDifficulty(skill.cleared);
  if (!skill.firstTry) return { difficulty: Math.max(2, base - 1), emphasis: 'fundamentals' }; // build clean wins
  if (!skill.selfDebug) return { difficulty: base, emphasis: 'order' }; // a fixable mistake to debug
  if (!skill.transfer) return { difficulty: base, emphasis: 'mixed' }; // a novel combination
  if (!skill.promptFade) return { difficulty: base, emphasis: 'fundamentals' }; // do it unaided
  return { difficulty: base + 1, emphasis: 'mixed' }; // all strong — push further
}
