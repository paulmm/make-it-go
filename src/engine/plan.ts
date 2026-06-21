import type { Action, PlanToken } from './types';

/**
 * Flatten a plan of tokens into the literal action sequence the interpreter runs. A
 * repeat(action, count) becomes `count` copies of action, in place. Pure — this is the
 * whole of what REPEAT "means": exactly its expansion, nothing hidden.
 */
export function expandPlan(tokens: PlanToken[]): Action[] {
  const actions: Action[] = [];
  for (const token of tokens) {
    if (token.type === 'action') {
      actions.push(token.action);
    } else {
      for (let i = 0; i < token.count; i++) actions.push(token.action);
    }
  }
  return actions;
}

/** Whether the plan uses a real bundle (a repeat of 2+). The iteration signal for mastery. */
export function usedBundle(tokens: PlanToken[]): boolean {
  return tokens.some((t) => t.type === 'repeat' && t.count >= 2);
}

/**
 * The "bundle it" move: fold the tail of the plan into one repeat chip, or grow the bundle
 * that is already there. This is what tapping REPEAT does.
 *
 * - Trailing repeat of the same action -> grow it by one, cycling back to 2 once it hits the
 *   cap (so a child can dial the count up and back down with one button).
 * - Trailing run of identical single actions -> collapse them into one repeat (at least 2).
 * - Nothing to fold -> seed a fresh repeat of 2 for the fallback action.
 *
 * `cap` is the number of points on the level, so a bundle can never overshoot the path.
 */
export function bundleTail(tokens: PlanToken[], fallbackAction: Action, cap: number): PlanToken[] {
  const max = Math.max(2, cap);
  const last = tokens[tokens.length - 1];

  if (last && last.type === 'repeat') {
    const count = last.count >= max ? 2 : last.count + 1;
    return [...tokens.slice(0, -1), { type: 'repeat', action: last.action, count }];
  }

  if (last && last.type === 'action') {
    // Walk back over the trailing run of the same single action.
    let start = tokens.length;
    while (start > 0) {
      const t = tokens[start - 1];
      if (t.type === 'action' && t.action === last.action) start -= 1;
      else break;
    }
    const runLength = tokens.length - start;
    const count = Math.min(max, Math.max(2, runLength));
    return [...tokens.slice(0, start), { type: 'repeat', action: last.action, count }];
  }

  return [{ type: 'repeat', action: fallbackAction, count: 2 }];
}
