import type { Level, Outcome, Step, StepEvent, Token, Trace } from './types';

/** How far each token moves the hero. LEAP is always +2 — never context-sensitive. */
const DELTA: Record<Token, number> = {
  ADVANCE: 1,
  LEAP: 2,
};

/** Evaluate the tile the hero lands on. Only the landing tile matters. */
function landingEvent(level: Level, to: number): StepEvent {
  const lastIndex = level.tiles.length - 1;
  if (to < 0 || to > lastIndex) return 'FELL_OFF';
  switch (level.tiles[to]) {
    case 'GOAL':
      return 'WIN';
    case 'HAZARD':
      return 'SPLASH';
    default:
      return 'SAFE';
  }
}

/**
 * Execute a plan literally: each token runs in order, the hero does exactly what
 * it says, and execution stops the instant something terminal happens (a win, a
 * splash, or falling off the end). No autocorrect, ever — the gap between what she
 * meant and what she said is the lesson.
 */
export function run(level: Level, plan: Token[]): Trace {
  let position = level.startIndex;
  const steps: Step[] = [];
  let outcome: Outcome | null = null;

  for (let i = 0; i < plan.length; i++) {
    const token = plan[i];
    const fromIndex = position;
    const toIndex = fromIndex + DELTA[token];
    const passedOverIndex = token === 'LEAP' ? fromIndex + 1 : null;
    const event = landingEvent(level, toIndex);
    const terminal = event !== 'SAFE';

    steps.push({ index: i, token, fromIndex, toIndex, passedOverIndex, event, terminal });
    position = toIndex;

    if (terminal) {
      // event is WIN | SPLASH | FELL_OFF here — all valid whole-run outcomes.
      outcome = event as Outcome;
      break;
    }
  }

  return {
    outcome: outcome ?? 'INCOMPLETE',
    steps,
    finalIndex: position,
    executedTokens: steps.length,
  };
}
