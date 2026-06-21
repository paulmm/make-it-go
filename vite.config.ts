/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { groupWordTimings } from './src/narration/alignment';

interface TtsOptions {
  apiKey?: string;
  voiceId: string;
  modelId: string;
}

/**
 * Dev-only proxy for ElevenLabs text-to-speech. The API key is read from .env.local on the
 * server and never reaches the browser bundle (the app's "key off the client" rule). It calls
 * the with-timestamps endpoint and returns { audioBase64, words } so the partner bubble can
 * grow each word as the voice speaks it. Responses are cached by text so repeated lines (the
 * intro, "You did it!") don't re-bill. For production, mirror this handler in a serverless
 * function at the same /api/tts path.
 */
function elevenLabsTts(opts: TtsOptions): Plugin {
  const cache = new Map<string, string>();

  return {
    name: 'eleven-labs-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next();

        const json = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };

        if (!opts.apiKey) return json(503, { error: 'no-key' });

        let raw = '';
        req.on('data', (chunk: unknown) => (raw += chunk));
        req.on('end', async () => {
          let text = '';
          try {
            text = String(JSON.parse(raw || '{}').text ?? '').trim();
          } catch {
            return json(400, { error: 'bad-json' });
          }
          if (!text) return json(400, { error: 'empty' });

          const cacheKey = `${opts.voiceId}|${opts.modelId}|${text}`;
          const cached = cache.get(cacheKey);
          if (cached) return json(200, JSON.parse(cached));

          try {
            const url = `https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}/with-timestamps?output_format=mp3_44100_128`;
            const r = await fetch(url, {
              method: 'POST',
              headers: { 'xi-api-key': opts.apiKey!, 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, model_id: opts.modelId }),
            });
            if (!r.ok) return json(502, { error: 'tts-failed', status: r.status, detail: await r.text() });
            const data: any = await r.json();
            const payload = { audioBase64: data.audio_base64 as string, words: groupWordTimings(data.alignment) };
            cache.set(cacheKey, JSON.stringify(payload));
            return json(200, payload);
          } catch (e) {
            return json(502, { error: 'tts-error', detail: String(e) });
          }
        });
      });
    },
  };
}

// Engine tests are pure (no DOM), so the default test environment is 'node'.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      elevenLabsTts({
        apiKey: env.ELEVENLABS_API_KEY,
        // Lily — a soft, warm British storyteller voice; override via ELEVENLABS_VOICE_ID.
        voiceId: env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku',
        modelId: env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5',
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
