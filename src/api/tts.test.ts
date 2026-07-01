import { describe, it, expect, vi, afterEach } from 'vitest';
import handler from '../../api/tts';

// The handler takes raw Node-ish req/res objects; these fakes cover exactly what it reads.
function req(over: { method?: string; headers?: Record<string, string | undefined>; body?: unknown } = {}) {
  return {
    method: over.method ?? 'POST',
    headers: {
      host: 'makeitgo.app',
      origin: 'https://makeitgo.app',
      'x-forwarded-for': '1.2.3.4',
      ...over.headers,
    },
    body: over.body ?? { text: 'You did it!' },
  };
}

function res() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    setHeader() {},
    end(payload: string) {
      this.body = JSON.parse(payload);
    },
  };
}

/** An upstream stub so a passing request never leaves the test. */
function stubUpstreamOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ audio_base64: 'abc', alignment: { characters: ['H', 'i'], character_start_times_seconds: [0, 0.1], character_end_times_seconds: [0.1, 0.2] } }),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('/api/tts — guards against strangers spending the voice credits', () => {
  it('rejects a request with no Origin or Referer (not a browser call from the game)', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ headers: { origin: undefined, referer: undefined } }), r);
    expect(r.statusCode).toBe(403);
  });

  it('rejects a cross-site request (Origin from another host)', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ headers: { origin: 'https://evil.example' } }), r);
    expect(r.statusCode).toBe(403);
  });

  it('accepts a matching Referer when Origin is absent', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ headers: { origin: undefined, referer: 'https://makeitgo.app/' } }), r);
    expect(r.statusCode).toBe(200);
  });

  it('rejects text longer than a real partner line could ever be', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ body: { text: 'a'.repeat(301) } }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body).toEqual({ error: 'too-long' });
  });

  it('rate-limits one caller hammering the endpoint', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const headers = { 'x-forwarded-for': '9.9.9.9' };
    let last = res();
    for (let i = 0; i < 31; i++) {
      last = res();
      await handler(req({ headers }), last);
    }
    expect(last.statusCode).toBe(429);
    // A different caller is unaffected.
    const other = res();
    await handler(req({ headers: { 'x-forwarded-for': '8.8.8.8' } }), other);
    expect(other.statusCode).toBe(200);
  });

  it('still answers 503 (fall back to the browser voice) without a key, for a same-origin call', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(503);
  });

  it('still serves a well-formed same-origin request', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ body: { text: 'Hi there, little one' } }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as { audioBase64: string }).audioBase64).toBe('abc');
  });
});
