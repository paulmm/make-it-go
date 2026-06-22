// Production text-to-speech proxy (Vercel serverless function). Mirrors the dev-only Vite
// middleware: the ElevenLabs key is read from the server environment and never reaches the
// browser bundle. Calls the with-timestamps endpoint and returns { audioBase64, words }.
//
// Self-contained on purpose (no imports from ../src) and uses the raw Node response + a
// flexible body reader, so it runs on any serverless runtime. Set ELEVENLABS_API_KEY (and
// optionally ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID). With no key, the client falls back
// to the browser voice.

const cache = new Map<string, unknown>();

export default async function handler(req: any, res: any) {
  const send = (code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method !== 'POST') return send(405, { error: 'method-not-allowed' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return send(503, { error: 'no-key' });

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'; // Lily
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

    const body = await readBody(req);
    const text = String(body?.text ?? '').trim();
    if (!text) return send(400, { error: 'empty' });

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
