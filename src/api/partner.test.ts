import { describe, it, expect, vi, afterEach } from 'vitest';
import handler from '../../api/partner';
import { buildSystemPrompt, buildUserMessage, replyToolSchema } from '../partner/promptBuilder';
import { CARRY_LEVEL, RUN_THEN_LEVEL } from '../engine/levels';
import { run } from '../engine/interpreter';
import type { Action } from '../engine/types';
import type { PartnerContext } from '../partner/types';

/** A minimal, legitimate partner context — the level intro turn. */
function context() {
  return {
    themeId: 'meadow',
    nouns: { hero: 'bunny', goal: 'carrot' },
    level: {
      id: 'L1',
      points: ['GAP'],
      allowedActions: ['JUMP', 'CLIMB'],
      anchorId: 'exactly-what-you-say',
      mastery: { kind: 'reach-goal-within', maxRedundant: 0 },
    },
    conceptsKnown: [],
    currentPlan: [],
    usedBundle: false,
    lastOutcome: null,
    lastTrace: null,
    attemptsThisLevel: 0,
    recentHistory: [],
  };
}

function req(over: { method?: string; headers?: Record<string, string | undefined>; body?: unknown } = {}) {
  return {
    method: over.method ?? 'POST',
    headers: {
      host: 'makeitgo.app',
      origin: 'https://makeitgo.app',
      'x-forwarded-for': '1.2.3.4',
      ...over.headers,
    },
    body: 'body' in over ? over.body : context(),
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

/** A well-formed Claude reply so a passing request never leaves the test. */
function stubUpstreamOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          { type: 'tool_use', input: { say: 'A gap! What move gets the bunny past it?', celebrate: false, scaffold: { kind: 'none' } } },
        ],
      }),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('/api/partner — guards against strangers spending the Claude credits', () => {
  it('rejects a request with no Origin or Referer', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ headers: { origin: undefined, referer: undefined } }), r);
    expect(r.statusCode).toBe(403);
  });

  it('rejects a cross-site request', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ headers: { origin: 'https://evil.example' } }), r);
    expect(r.statusCode).toBe(403);
  });

  it('rejects a bloated context that would inflate the prompt', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ body: { ...context(), padding: 'x'.repeat(20_000) } }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body).toEqual({ error: 'too-big' });
  });

  it('rate-limits one caller hammering the endpoint', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const headers = { 'x-forwarded-for': '9.9.9.9' };
    let last = res();
    for (let i = 0; i < 21; i++) {
      last = res();
      await handler(req({ headers }), last);
    }
    expect(last.statusCode).toBe(429);
    const other = res();
    await handler(req({ headers: { 'x-forwarded-for': '8.8.8.8' } }), other);
    expect(other.statusCode).toBe(200);
  });

  it('still answers 503 (fall back to the offline stub) without a key, for a same-origin call', async () => {
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(503);
  });

  it('still rejects a context with no level', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req({ body: { hello: 'world' } }), r);
    expect(r.statusCode).toBe(400);
    expect(r.body).toEqual({ error: 'bad-context' });
  });

  it('still serves a well-formed same-origin request', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as { say: string }).say).toContain('gap');
  });

  it('tells Claude which ideas she has already mastered', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    await handler(req({ body: { ...context(), conceptsKnown: ['exactly-what-you-say'] } }), res());
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].content).toContain('exactly-what-you-say');
  });

  it('stays in sync with src/partner/promptBuilder — the two are hand-mirrored', async () => {
    // api/partner.ts is deliberately self-contained (no ../src imports on the serverless
    // runtime), so its prompt logic is a copy. This pins the copy to the original: if a prompt
    // tweak lands in one file and not the other, this fails.
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');

    const plan: Action[] = ['JUMP', 'OPEN', 'OPEN'];
    const trace = run(CARRY_LEVEL, plan);
    const contexts: PartnerContext[] = [
      {
        // The intro turn, with flavor words (covers the system prompt's flavor branch).
        themeId: 'truck',
        nouns: { hero: 'truck', goal: 'flag' },
        flavor: ['beep', 'yay'],
        level: RUN_THEN_LEVEL,
        conceptsKnown: ['exactly-what-you-say'],
        currentPlan: [],
        usedBundle: false,
        lastOutcome: null,
        lastTrace: null,
        attemptsThisLevel: 0,
        recentHistory: [],
      },
      {
        // A reaction turn with a missed key and a stumble (covers the trace branches).
        themeId: 'meadow',
        nouns: { hero: 'bunny', goal: 'carrot' },
        level: CARRY_LEVEL,
        conceptsKnown: [],
        currentPlan: plan,
        usedBundle: false,
        lastOutcome: trace.outcome,
        lastTrace: trace,
        attemptsThisLevel: 2,
        recentHistory: ['STUMBLE'],
      },
    ];

    for (const context of contexts) {
      stubUpstreamOk();
      await handler(req({ body: context }), res());
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.system).toBe(buildSystemPrompt(context));
      expect(body.messages[0].content).toBe(buildUserMessage(context));
      expect(body.tools[0]).toEqual(replyToolSchema());
      vi.unstubAllGlobals();
    }
  });

  it('defaults to the current Sonnet with thinking off (short spoken replies, low latency)', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    stubUpstreamOk();
    await handler(req(), res());
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('claude-sonnet-5');
    // Sonnet 5 runs adaptive thinking when the field is omitted — for one or two spoken
    // sentences behind a forced tool call, that is pure latency and tokens.
    expect(body.thinking).toEqual({ type: 'disabled' });
  });
});
