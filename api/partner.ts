// Production Claude partner proxy (Vercel serverless). ANTHROPIC_API_KEY is read server-side
// and never bundled. Forces a structured "reply" tool so the response maps to a PartnerResponse.
// Raw Node response + flexible body reader so it runs on any serverless runtime. The client
// (claudeBrain) falls back to the offline localStub if this is unavailable.
import { buildSystemPrompt, buildUserMessage, parseReply, replyToolSchema } from '../src/partner/promptBuilder';

export default async function handler(req: any, res: any) {
  const send = (code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  try {
    if (req.method !== 'POST') return send(405, { error: 'method-not-allowed' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return send(503, { error: 'no-key' });
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

    const context = await readBody(req);
    if (!context?.level) return send(400, { error: 'bad-context' });

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
    if (!r.ok) return send(502, { error: 'partner-failed', status: r.status });
    const data: any = await r.json();
    const toolUse = (data.content || []).find((c: any) => c.type === 'tool_use');
    const parsed = parseReply(toolUse?.input);
    if (!parsed) return send(502, { error: 'bad-reply' });
    return send(200, parsed);
  } catch (e) {
    return send(502, { error: 'partner-error', detail: String(e) });
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
