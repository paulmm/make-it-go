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

  for (let i = 0; i < level.points.length; i++) {
    const kind = level.points[i];
    const required = REQUIRED_ACTION[kind];
    const played = i < plan.length ? plan[i] : null;
    const result: Step['result'] =
      played === null ? 'MISSING' : played === required ? 'PASS' : 'WRONG';

    steps.push({ pointIndex: i, kind, required, played, result });

    if (result === 'PASS') {
      clearedPoints += 1;
    } else {
      outcome = result === 'MISSING' ? 'INCOMPLETE' : 'STUMBLE';
      break; // the character stops at the point it failed
    }
  }

  const redundantTokens = outcome === 'WIN' ? Math.max(0, plan.length - level.points.length) : 0;

  return { outcome, steps, clearedPoints, redundantTokens };
}
