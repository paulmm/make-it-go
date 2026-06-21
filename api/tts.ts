// Production text-to-speech proxy (Vercel serverless function). Mirrors the dev-only Vite
// middleware in vite.config.ts: the ElevenLabs key is read from the server environment and
// never reaches the browser bundle. Calls the with-timestamps endpoint and returns
// { audioBase64, words } so the partner bubble can grow each word as the voice speaks it.
//
// Set ELEVENLABS_API_KEY (and optionally ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID) in the
// deployment's environment variables. With no key, the client falls back to the browser voice.
import { groupWordTimings } from '../src/narration/alignment';

// Warm-instance cache: repeated lines (the intro, "You did it!") don't re-bill.
const cache = new Map<string, unknown>();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'no-key' });
    return;
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'XrExE9yKIg1WjnnlVkGX';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body ?? {};
  const text = String(body.text ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'empty' });
    return;
  }

  const cacheKey = `${voiceId}|${modelId}|${text}`;
  const hit = cache.get(cacheKey);
  if (hit) {
    res.status(200).json(hit);
    return;
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId }),
    });
    if (!r.ok) {
      res.status(502).json({ error: 'tts-failed', status: r.status });
      return;
    }
    const data: any = await r.json();
    const payload = { audioBase64: data.audio_base64 as string, words: groupWordTimings(data.alignment) };
    cache.set(cacheKey, payload);
    res.status(200).json(payload);
  } catch (e) {
    res.status(502).json({ error: 'tts-error', detail: String(e) });
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
