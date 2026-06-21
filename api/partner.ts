// Production Claude partner proxy (Vercel serverless). Mirrors the dev middleware in
// vite.config.ts: ANTHROPIC_API_KEY is read server-side and never bundled. It forces a
// structured "reply" tool so the response maps cleanly to a PartnerResponse. The client
// (claudeBrain) falls back to the offline localStub if this is unavailable, and the whole
// thing is active only when the client is built with VITE_PARTNER=claude.
import { buildSystemPrompt, buildUserMessage, parseReply, replyToolSchema } from '../src/partner/promptBuilder';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'no-key' });
    return;
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

  const context = typeof req.body === 'string' ? safeParse(req.body) : req.body ?? {};
  if (!context?.level) {
    res.status(400).json({ error: 'bad-context' });
    return;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system: buildSystemPrompt(context),
        messages: [{ role: 'user', content: buildUserMessage(context) }],
        tools: [replyToolSchema()],
        tool_choice: { type: 'tool', name: 'reply' },
      }),
    });
    if (!r.ok) {
      res.status(502).json({ error: 'partner-failed', status: r.status });
      return;
    }
    const data: any = await r.json();
    const toolUse = (data.content || []).find((c: any) => c.type === 'tool_use');
    const parsed = parseReply(toolUse?.input);
    if (!parsed) {
      res.status(502).json({ error: 'bad-reply' });
      return;
    }
    res.status(200).json(parsed);
  } catch (e) {
    res.status(502).json({ error: 'partner-error', detail: String(e) });
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
