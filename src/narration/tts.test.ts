import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestSpokenLine } from './tts';

describe('requestSpokenLine — never leaves the voice waiting on the network', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the spoken line when /api/tts answers', async () => {
    const line = { audioBase64: 'abc', words: [{ text: 'Hi', start: 0, end: 0.2 }] };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => line })));
    expect(await requestSpokenLine('Hi')).toEqual(line);
  });

  it('returns null (the Web Speech fallback) on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await requestSpokenLine('Hi')).toBeNull();
  });

  it('aborts a request that hangs and returns null so the fallback voice speaks', async () => {
    // A fetch that never settles on its own — it only rejects when the caller's signal aborts,
    // like real fetch on a dead connection. A hung TTS request must not silence the partner
    // (or hold back the win choices, which wait for the line to finish).
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );
    const pending = requestSpokenLine('Hello there');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toBeNull();
  });
});
