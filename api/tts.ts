// Production text-to-speech proxy (Vercel serverless function). Mirrors the dev-only Vite
// middleware: the ElevenLabs key is read from the server environment and never reaches the
// browser bundle. Calls the with-timestamps endpoint and returns { audioBase64, words }.
//
// Self-contained on purpose (no imports from ../src) and uses the raw Node response + a
// flexible body reader, so it runs on any serverless runtime. Set ELEVENLABS_API_KEY (and
// optionally ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID). With no key, the client falls back
// to the browser voice.

const cache = new Map<string, unknown>();

// The partner speaks one or two short sentences; nothing legitimate comes close to this, so a
// stranger can't buy a novel's worth of TTS with one request.
const MAX_TEXT_CHARS = 300;

/**
 * Same-origin gate: the game is served from the same host as this API, so a browser call from
 * the app always carries a matching Origin (or at least Referer); cross-site pages and naive
 * scripts don't. Headers are forgeable, so this is a damage-bounder alongside the length cap
 * and rate limit, not a lock. No hardcoded domain — preview deploys pass too.
 */
function sameOrigin(req: any): boolean {
  const host = req.headers?.host;
  if (!host) return false;
  for (const header of [req.headers?.origin, req.headers?.referer]) {
    if (typeof header === 'string' && header) {
      try {
        return new URL(header).host === host;
      } catch {
        return false;
      }
    }
  }
  return false;
}

// Best-effort per-IP rate limit. The map is per serverless instance, so it bounds abuse rather
// than strictly enforcing a global quota — good enough to stop a hammering script.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateHits = new Map<string, { count: number; start: number }>();

function rateLimited(req: any): boolean {
  const ip = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const hit = rateHits.get(ip);
  if (!hit || now - hit.start >= RATE_WINDOW_MS) {
    if (rateHits.size > 1000) {
      for (const [k, v] of rateHits) if (now - v.start >= RATE_WINDOW_MS) rateHits.delete(k);
    }
    rateHits.set(ip, { count: 1, start: now });
    return false;
  }
  hit.count += 1;
  return hit.count > RATE_MAX;
}

// ---- Daily budgets and classroom codes (mirrored in the other api/ function; keep in sync) ----
// Every live reply costs money, so anonymous visitors share one small daily budget and each
// classroom code (handed to a teacher by email — see /teachers/) gets its own, larger one and
// skips the per-IP limit that a school lab behind one connection would otherwise trip. When a
// budget is spent the handler answers 429 and the client falls back to the scripted partner and
// the browser voice, so play never stops. Counters live in Upstash Redis when the deployment
// has one (KV_REST_API_URL + KV_REST_API_TOKEN, as the Vercel Marketplace sets); otherwise in
// memory, per serverless instance, as a best-effort bound.

type Pool = { name: 'public' } | { name: 'classroom'; code: string };

/** The request's pool: a classroom when it carries one of CLASSROOM_CODES (comma/space separated). */
function classroomPool(req: any): Pool {
  const raw = req.headers?.['x-classroom-code'];
  if (typeof raw !== 'string') return { name: 'public' };
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) return { name: 'public' };
  const allowed = String(process.env.CLASSROOM_CODES ?? '')
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return allowed.includes(code) ? { name: 'classroom', code } : { name: 'public' };
}

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return process.env[name] !== undefined && Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** One counter per pool per UTC day. */
function budgetKey(kind: string, pool: Pool): string {
  const day = new Date().toISOString().slice(0, 10);
  const who = pool.name === 'classroom' ? `class:${pool.code}` : 'public';
  return `budget:${kind}:${who}:${day}`;
}

const COUNTER_TTL_S = 2 * 24 * 3600;
const memoryCounters = new Map<string, { value: number; expires: number }>();

function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** Upstash's REST pipeline: one round trip, one result per command. */
async function kvPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const kv = kvConfig()!;
  const r = await fetch(`${kv.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kv.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  const rows: any[] = await r.json();
  return rows.map((row) => row?.result);
}

/**
 * How much of a counter is used today. A store failure counts as nothing used — fail open, so a
 * Redis hiccup never silences the partner; the spend limits at Anthropic and ElevenLabs still
 * bound the damage.
 */
async function counterUsed(key: string): Promise<number> {
  if (kvConfig()) {
    try {
      const [value] = await kvPipeline([['GET', key]]);
      return Number(value ?? 0) || 0;
    } catch (e) {
      console.warn('budget store read failed', String(e));
      return 0;
    }
  }
  const hit = memoryCounters.get(key);
  return hit && hit.expires > Date.now() ? hit.value : 0;
}

async function counterAdd(key: string, amount: number): Promise<void> {
  const n = Math.round(amount);
  if (n <= 0) return;
  if (kvConfig()) {
    try {
      await kvPipeline([
        ['INCRBY', key, n],
        ['EXPIRE', key, COUNTER_TTL_S],
      ]);
    } catch (e) {
      console.warn('budget store write failed', String(e));
    }
    return;
  }
  const now = Date.now();
  const hit = memoryCounters.get(key);
  memoryCounters.set(key, {
    value: (hit && hit.expires > now ? hit.value : 0) + n,
    expires: now + COUNTER_TTL_S * 1000,
  });
}

/** Tests share one module instance; this clears the in-memory counters between cases. */
export function _resetCountersForTests(): void {
  memoryCounters.clear();
}

/** One JSON line per call for cost attribution in the Vercel logs. Never the IP, never the text. */
function logCall(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ t: new Date().toISOString(), ...entry }));
}
// ---- end budgets ------------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  const send = (code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  const started = Date.now();
  const pool = classroomPool(req);
  const country = req.headers?.['x-vercel-ip-country'];
  // Every exit goes through here so each call leaves one log line with its pool and cost.
  const finish = (code: number, body: unknown, extra: Record<string, unknown> = {}) => {
    logCall({
      at: 'tts',
      status: code,
      ms: Date.now() - started,
      pool: pool.name,
      ...(pool.name === 'classroom' ? { code: pool.code } : {}),
      ...(typeof country === 'string' ? { country } : {}),
      ...extra,
    });
    return send(code, body);
  };

  try {
    if (req.method !== 'POST') return send(405, { error: 'method-not-allowed' });
    if (!sameOrigin(req)) return finish(403, { error: 'forbidden' });
    // A classroom shares one connection, so its code lifts the per-IP limit; its budget bounds it.
    if (pool.name === 'public' && rateLimited(req)) return finish(429, { error: 'rate-limited' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return finish(503, { error: 'no-key' });

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'; // Lily
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

    const body = await readBody(req);
    const text = String(body?.text ?? '').trim();
    if (!text) return finish(400, { error: 'empty' });
    if (text.length > MAX_TEXT_CHARS) return finish(400, { error: 'too-long' });

    // A line this instance has already bought costs nothing to serve again, budget or not.
    const cacheKey = `${voiceId}|${modelId}|${text}`;
    const hit = cache.get(cacheKey);
    if (hit) return finish(200, hit, { chars: text.length, cached: true });

    // The pool's budget for today, in characters — what ElevenLabs bills by.
    const key = budgetKey('tts', pool);
    const limitChars =
      pool.name === 'classroom'
        ? envNumber('TTS_DAILY_CHARS_CLASSROOM', 100_000)
        : envNumber('TTS_DAILY_CHARS_PUBLIC', 30_000);
    if ((await counterUsed(key)) >= limitChars) {
      return finish(429, { error: 'budget-exhausted' }, { budget: 'exhausted', chars: text.length });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId }),
    });
    if (!r.ok) return finish(502, { error: 'tts-failed', status: r.status }, { upstream: r.status });
    const data: any = await r.json();
    await counterAdd(key, text.length);
    const payload = { audioBase64: data.audio_base64 as string, words: groupWordTimings(data.alignment) };
    cache.set(cacheKey, payload);
    return finish(200, payload, { chars: text.length });
  } catch (e) {
    return finish(502, { error: 'tts-error', detail: String(e) });
  }
}

/** Read a JSON body whether the runtime pre-parsed it (req.body) or left a stream. */
function readBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    return Promise.resolve(typeof req.body === 'string' ? safeParse(req.body) : req.body);
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c: any) => (raw += c));
    req.on('end', () => resolve(safeParse(raw)));
    req.on('error', () => resolve({}));
  });
}

function safeParse(s: string): any {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

/** Group ElevenLabs character alignment into whitespace-delimited words with timings. */
function groupWordTimings(alignment: any): { text: string; start: number; end: number }[] {
  const chars: string[] = alignment?.characters || [];
  const starts: number[] = alignment?.character_start_times_seconds || [];
  const ends: number[] = alignment?.character_end_times_seconds || [];
  const words: { text: string; start: number; end: number }[] = [];
  let cur: { text: string; start: number; end: number } | null = null;
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) {
      if (cur) {
        words.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = { text: chars[i], start: starts[i], end: ends[i] };
    else {
      cur.text += chars[i];
      cur.end = ends[i];
    }
  }
  if (cur) words.push(cur);
  return words;
}
