import { run } from './interpreter';
import { REQUIRED_ACTION } from './types';
import type { AnchorId, EventKind, Level, MasteryRule } from './types';

// Endless, never-memorized practice for after the taught ladder (L10+). Levels are *generated*,
// not authored, but every one is composed to be valid and then checked against the interpreter
// before it is ever shown — literal execution stays sacred. The point is transfer: can she solve
// a level no one walked her through? Variety removes the answer from memory and leaves the idea.

const HAZARDS: EventKind[] = ['GAP', 'BRANCH', 'STEP'];
const HAZARD_ACTIONS = HAZARDS.map((h) => REQUIRED_ACTION[h]);

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
  mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
});

/**
 * Compose one valid practice level for a difficulty. Higher difficulty unlocks richer shapes
 * (a key/gate to decompose, a run to fold, longer mixed sequences); randomness within a shape
 * gives the variety. Pure — pass `makeRng(seed)` for a reproducible level.
 */
export function generateLevel(difficulty: number, rng: () => number, id: string): Level {
  const d = Math.max(1, Math.floor(difficulty));
  const points: EventKind[] = [];
  let mastery: MasteryRule = { kind: 'reach-goal-within', maxRedundant: 0 };

  const roll = rng();
  const wantsGate = d >= 4 && roll < 0.5; // decomposition + carry the key across hazards
  const wantsRun = !wantsGate && d >= 3 && roll < 0.6; // a foldable run (iteration)

  if (wantsGate) {
    points.push('KEY');
    const midCount = 1 + Math.floor(rng() * Math.min(1 + Math.floor((d - 2) / 2), 3)); // 1..~3 hazards
    for (let i = 0; i < midCount; i++) points.push(pick(HAZARDS, rng));
    points.push('GATE');
    // A gate must stay at the tail and is solved a step at a time — never a mid-plan fold.
  } else if (wantsRun) {
    if (rng() < 0.5) points.push(pick(HAZARDS, rng)); // an optional lead step before the run
    const runHazard = pick(HAZARDS, rng);
    const runLen = 3 + Math.floor(rng() * 3); // 3..5 — humane, foldable
    for (let i = 0; i < runLen; i++) points.push(runHazard);
    mastery = { kind: 'bundle-to-goal' };
  } else {
    const len = Math.max(1, Math.min(1 + Math.floor(rng() * d), 5)); // grows with difficulty, capped
    for (let i = 0; i < len; i++) points.push(pick(HAZARDS, rng));
  }

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
