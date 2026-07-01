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

export default async function handler(req: any, res: any) {
  const send = (code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method !== 'POST') return send(405, { error: 'method-not-allowed' });
    if (!sameOrigin(req)) return send(403, { error: 'forbidden' });
    if (rateLimited(req)) return send(429, { error: 'rate-limited' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return send(503, { error: 'no-key' });

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'; // Lily
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

    const body = await readBody(req);
    const text = String(body?.text ?? '').trim();
    if (!text) return send(400, { error: 'empty' });
    if (text.length > MAX_TEXT_CHARS) return send(400, { error: 'too-long' });

    const cacheKey = `${voiceId}|${modelId}|${text}`;
    const hit = cache.get(cacheKey);
    if (hit) return send(200, hit);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId }),
    });
    if (!r.ok) return send(502, { error: 'tts-failed', status: r.status });
    const data: any = await r.json();
    const payload = { audioBase64: data.audio_base64 as string, words: groupWordTimings(data.alignment) };
    cache.set(cacheKey, payload);
    return send(200, payload);
  } catch (e) {
    return send(502, { error: 'tts-error', detail: String(e) });
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
