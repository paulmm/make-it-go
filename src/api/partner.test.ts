import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import handler, { _resetCountersForTests } from '../../api/partner';
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

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {}); // one JSON log line per call — not test output
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  _resetCountersForTests();
});

/** A well-formed Claude reply that also reports token usage, so the call has a cost. */
function stubUpstreamBilled(input_tokens: number, output_tokens: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [{ type: 'tool_use', input: { say: 'Splash! That gap wants a different move.', celebrate: false, scaffold: { kind: 'none' } } }],
        usage: { input_tokens, output_tokens },
      }),
    })),
  );
}

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

describe('/api/partner — daily budgets and classroom codes', () => {
  it('bills each call to the public pool and stops at the daily budget, so the client falls back to the stub', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('PARTNER_DAILY_USD_PUBLIC', '0.005'); // half a cent for the day
    stubUpstreamBilled(1000, 100); // 1000 in @ $2/MTok + 100 out @ $10/MTok = $0.003
    const first = res();
    await handler(req(), first);
    expect(first.statusCode).toBe(200);
    const second = res();
    await handler(req(), second);
    expect(second.statusCode).toBe(200); // $0.003 used < $0.005
    const third = res();
    await handler(req(), third);
    expect(third.statusCode).toBe(429); // $0.006 used >= $0.005
    expect(third.body).toEqual({ error: 'budget-exhausted' });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(2); // the refused call never reached Anthropic
  });

  it('a classroom code has its own budget and skips the per-IP limit a school lab would trip', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('CLASSROOM_CODES', 'istek-7k2m, other-1');
    vi.stubEnv('PARTNER_DAILY_USD_PUBLIC', '0'); // the public pool is spent
    stubUpstreamBilled(1000, 100);
    const headers = { 'x-forwarded-for': '7.7.7.7', 'x-classroom-code': 'Istek-7K2M' };
    let last = res();
    for (let i = 0; i < 30; i++) {
      last = res();
      await handler(req({ headers }), last);
    }
    expect(last.statusCode).toBe(200); // 30 calls from one IP, none rate-limited
    const anonymous = res();
    await handler(req({ headers: { 'x-forwarded-for': '7.7.7.7' } }), anonymous);
    expect(anonymous.statusCode).toBe(429); // same lab, no code: the spent public pool
  });

  it('a classroom code stops at its own daily budget too', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('CLASSROOM_CODES', 'ISTEK-7K2M');
    vi.stubEnv('PARTNER_DAILY_USD_CLASSROOM', '0.003');
    stubUpstreamBilled(1000, 100);
    const headers = { 'x-classroom-code': 'ISTEK-7K2M' };
    const first = res();
    await handler(req({ headers }), first);
    expect(first.statusCode).toBe(200);
    const second = res();
    await handler(req({ headers }), second);
    expect(second.statusCode).toBe(429);
  });

  it('an unknown or malformed code plays as an anonymous visitor', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('CLASSROOM_CODES', 'ISTEK-7K2M');
    vi.stubEnv('PARTNER_DAILY_USD_PUBLIC', '0');
    stubUpstreamBilled(1000, 100);
    for (const code of ['GUESS-1', 'istek 7k2m', '']) {
      const r = res();
      await handler(req({ headers: { 'x-classroom-code': code } }), r);
      expect(r.statusCode, code).toBe(429);
      expect(r.body).toEqual({ error: 'budget-exhausted' });
    }
  });

  it('keeps the counters in Upstash when Vercel provides one', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('KV_REST_API_URL', 'https://kv.example');
    vi.stubEnv('KV_REST_API_TOKEN', 'secret');
    const calls: { url: string; body: unknown; auth: string | undefined }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: any) => {
        if (url.startsWith('https://kv.example')) {
          const body = JSON.parse(init.body);
          calls.push({ url, body, auth: init.headers.Authorization });
          return { ok: true, json: async () => body.map(() => ({ result: null })) };
        }
        return {
          ok: true,
          json: async () => ({
            content: [{ type: 'tool_use', input: { say: 'A gap!', celebrate: false, scaffold: { kind: 'none' } } }],
            usage: { input_tokens: 1000, output_tokens: 100 },
          }),
        };
      }),
    );
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
    const day = new Date().toISOString().slice(0, 10);
    expect(calls.map((c) => c.url)).toEqual(['https://kv.example/pipeline', 'https://kv.example/pipeline']);
    expect(calls[0].auth).toBe('Bearer secret');
    expect(calls[0].body).toEqual([['GET', `budget:partner:public:${day}`]]);
    expect(calls[1].body).toEqual([
      ['INCRBY', `budget:partner:public:${day}`, 3000], // microdollars: 1000*2 + 100*10
      ['EXPIRE', `budget:partner:public:${day}`, 172800],
    ]);
  });

  it('fails open when the counter store is down — the partner keeps talking', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('KV_REST_API_URL', 'https://kv.example');
    vi.stubEnv('KV_REST_API_TOKEN', 'secret');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.startsWith('https://kv.example')) throw new Error('ECONNRESET');
        return {
          ok: true,
          json: async () => ({ content: [{ type: 'tool_use', input: { say: 'A gap!', celebrate: false, scaffold: { kind: 'none' } } }] }),
        };
      }),
    );
    const r = res();
    await handler(req(), r);
    expect(r.statusCode).toBe(200);
  });

  it('logs one line per call with the pool and the cost, never the IP', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    vi.stubEnv('CLASSROOM_CODES', 'ISTEK-7K2M');
    stubUpstreamBilled(1000, 100);
    const log = console.log as unknown as ReturnType<typeof vi.fn>;
    await handler(req({ headers: { 'x-classroom-code': 'ISTEK-7K2M', 'x-vercel-ip-country': 'TR' } }), res());
    const lines = log.mock.calls.map((c) => JSON.parse(c[0]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ at: 'partner', status: 200, pool: 'classroom', code: 'ISTEK-7K2M', country: 'TR', level: 'L1', in: 1000, out: 100, usd: 0.003 });
    expect(JSON.stringify(lines[0])).not.toContain('1.2.3.4');
  });
});
