import type { Action, PlanToken } from './types';

/** A plan slot: a token she placed, or `null` for an empty slot (a hole she left or hasn't filled). */
export type Slot = PlanToken | null;

/**
 * Flatten a plan of slots into the literal action sequence the interpreter runs. A
 * repeat(action, count) becomes `count` copies of action, in place; an empty slot becomes a
 * single `null` so the hole stays in position (the character finds no action there and fails at
 * that point). Pure — this is the whole of what a plan "means": exactly its expansion, nothing
 * hidden, no autocorrect.
 */
export function expandPlan(tokens: Slot[]): (Action | null)[] {
  const actions: (Action | null)[] = [];
  for (const token of tokens) {
    if (token === null) {
      actions.push(null);
    } else if (token.type === 'action') {
      actions.push(token.action);
    } else {
      for (let i = 0; i < token.count; i++) actions.push(token.action);
    }
  }
  return actions;
}

/** How many path positions a plan occupies: a repeat counts its run, an action or a hole counts one. */
export function planSpan(tokens: Slot[]): number {
  return tokens.reduce((n, t) => n + (t && t.type === 'repeat' ? t.count : 1), 0);
}

/** Whether another action can be placed: there is a hole to fill, or there is still room on the path. */
export function canPlace(tokens: Slot[], capacity: number): boolean {
  return tokens.some((t) => t === null) || planSpan(tokens) < capacity;
}

/**
 * Place an action: drop it into the first empty slot (a hole left by a removal), or append it to
 * the end when there is none and the path still has room. A full path with no holes is unchanged.
 * This is what makes a new pick fill the first open spot rather than always landing at the end.
 */
export function placeAction(tokens: Slot[], action: Action, capacity: number): Slot[] {
  const hole = tokens.indexOf(null);
  if (hole !== -1) {
    const next = tokens.slice();
    next[hole] = { type: 'action', action };
    return next;
  }
  if (planSpan(tokens) < capacity) return [...tokens, { type: 'action', action }];
  return tokens;
}

/**
 * Remove the token at `index`, leaving an empty slot in its place so the rest keep their spots —
 * a deliberate removal should never shuffle the other tokens around. Trailing holes are dropped,
 * since the path's own unfilled slots already show those open positions.
 */
export function removeToken(tokens: Slot[], index: number): Slot[] {
  const next = tokens.slice();
  if (index < 0 || index >= next.length) return next;
  next[index] = null;
  while (next.length && next[next.length - 1] === null) next.pop();
  return next;
}

/** Whether the plan uses a real bundle (a repeat of 2+). The iteration signal for mastery. */
export function usedBundle(tokens: Slot[]): boolean {
  return tokens.some((t) => t !== null && t.type === 'repeat' && t.count >= 2);
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
export function bundleTail(tokens: Slot[], fallbackAction: Action, cap: number): Slot[] {
  const max = Math.max(2, cap);
  const last = tokens[tokens.length - 1];

  if (last && last.type === 'repeat') {
    const count = last.count >= max ? 2 : last.count + 1;
    return [...tokens.slice(0, -1), { type: 'repeat', action: last.action, count }];
  }

  if (last && last.type === 'action') {
    // Walk back over the trailing run of the same single action (a hole or other action stops it).
    let start = tokens.length;
    while (start > 0) {
      const t = tokens[start - 1];
      if (t && t.type === 'action' && t.action === last.action) start -= 1;
      else break;
    }
    const runLength = tokens.length - start;
    const count = Math.min(max, Math.max(2, runLength));
    return [...tokens.slice(0, start), { type: 'repeat', action: last.action, count }];
  }

  return [{ type: 'repeat', action: fallbackAction, count: 2 }];
}
