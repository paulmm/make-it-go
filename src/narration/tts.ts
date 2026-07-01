import type { SpokenLine } from './alignment';

// A request that hangs (dead Wi-Fi, stalled serverless) would otherwise silence the partner and
// hold back anything waiting on the line's onDone (e.g. the post-win choices) — so a slow reply
// loses to the Web Speech fallback.
const TTS_TIMEOUT_MS = 8000;

/**
 * Fetch the spoken line (audio + word timings) for a text from /api/tts. Returns null on any
 * failure — non-OK, network error, or a request that hangs past the timeout — which callers
 * treat as "use the Web Speech fallback", so the app always talks.
 */
export async function requestSpokenLine(text: string): Promise<SpokenLine | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: abort.signal,
    });
    return res.ok ? ((await res.json()) as SpokenLine) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
