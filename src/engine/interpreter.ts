import type { Action, Level, Outcome, Step, Trace } from './types';
import { REQUIRED_ACTION } from './types';

/**
 * Execute a plan literally. The character auto-walks and, at each event point in order,
 * consumes the next queued action. Match -> pass; wrong action -> stumble and stop; no
 * token left -> she runs out and stops. Clearing every point reaches the goal and wins.
 * No autocorrect, ever — the gap between what she meant and what she said is the lesson.
 */
export function run(level: Level, plan: Action[]): Trace {
  const steps: Step[] = [];
  let outcome: Outcome = 'WIN';
  let clearedPoints = 0;
  let hasKey = false; // carry state: does she hold a key right now?

  for (let i = 0; i < level.points.length; i++) {
    const kind = level.points[i];
    const required = REQUIRED_ACTION[kind];
    const played = i < plan.length ? plan[i] : null;
    const result = resolve(kind, required, played, hasKey);

    if (result === 'PASS' && kind === 'KEY') hasKey = true;

    steps.push({ pointIndex: i, kind, required, played, result });

    // PASS and MISSED both advance her past the point; everything else stops the run.
    if (result === 'PASS' || result === 'MISSED') {
      clearedPoints += 1;
    } else {
      outcome = result === 'MISSING' ? 'INCOMPLETE' : result === 'LOCKED' ? 'LOCKED' : 'STUMBLE';
      break; // the character stops at the point it failed
    }
  }

  const redundantTokens = outcome === 'WIN' ? Math.max(0, plan.length - level.points.length) : 0;

  return { outcome, steps, clearedPoints, redundantTokens };
}

/** Decide one point's result. A KEY is a non-fatal pickup; a GATE needs OPEN and the key. */
function resolve(
  kind: Step['kind'],
  required: Action,
  played: Action | null,
  hasKey: boolean,
): Step['result'] {
  if (kind === 'KEY') {
    // Grabbing it carries the key; any other action (or none) just walks past — no trip.
    return played === 'GRAB' ? 'PASS' : 'MISSED';
  }
  if (kind === 'GATE') {
    if (played === null) return 'MISSING';
    if (played !== required) return 'WRONG';
    return hasKey ? 'PASS' : 'LOCKED'; // right action, but the gate needs the key
  }
  // Hazards: the right action clears it, a wrong one trips, none runs out.
  return played === null ? 'MISSING' : played === required ? 'PASS' : 'WRONG';
}
