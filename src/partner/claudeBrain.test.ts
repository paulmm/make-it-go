import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { claudeBrain } from './claudeBrain';
import { localStub } from './localStub';
import type { PartnerContext } from './types';
import { LEVEL_1 } from '../engine/levels';
import { run } from '../engine/interpreter';
import type { Action } from '../engine/types';

function ctx(): PartnerContext {
  const plan: Action[] = ['CLIMB'];
  const trace = run(LEVEL_1, plan);
  return {
    themeId: 'meadow',
    nouns: { hero: 'bunny', goal: 'carrot' },
    level: LEVEL_1,
    conceptsKnown: [],
    currentPlan: plan,
    usedBundle: false,
    lastOutcome: trace.outcome,
    lastTrace: trace,
    attemptsThisLevel: 1,
    recentHistory: [],
  };
}

describe('claudeBrain — never leaves the game waiting on the network', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the parsed reply when /api/partner answers in time', async () => {
    const reply = { say: 'What does the gap need?', celebrate: false, scaffold: { kind: 'none' } };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => reply })));
    const r = await claudeBrain(ctx());
    expect(r.say).toBe('What does the gap need?');
  });

  it('aborts a request that hangs and falls back to the offline stub', async () => {
    // A fetch that never settles on its own — it only rejects when the caller's signal aborts,
    // like real fetch on a dead connection. Without a timeout the child would be stuck forever.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );
    const context = ctx();
    const pending = claudeBrain(context);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toEqual(await localStub(context));
  });
});
