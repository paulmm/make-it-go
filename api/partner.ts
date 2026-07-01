// Production Claude partner proxy (Vercel serverless). ANTHROPIC_API_KEY is read server-side
// and never bundled. Forces a structured "reply" tool so the response maps to a PartnerResponse.
//
// Self-contained on purpose: the Vercel ESM runtime would not resolve an import from ../src, so
// the prompt logic below mirrors src/partner/promptBuilder.ts — KEEP THE TWO IN SYNC when tuning
// the persona. Raw Node response + flexible body reader so it runs on any runtime.

const REQUIRED_ACTION: Record<string, string> = {
  GAP: 'JUMP',
  BRANCH: 'DUCK',
  STEP: 'CLIMB',
  KEY: 'GRAB',
  GATE: 'OPEN',
};
const ANCHOR_TEXT: Record<string, string> = {
  'exactly-what-you-say': 'It does exactly what you say.',
  'steps-in-order': 'Steps happen in order.',
  'bundle-and-repeat': 'You can bundle steps and do them again.',
  'find-and-fix': "When it's wrong, find the wrong step and fix it.",
};
const ACTIONS = ['JUMP', 'DUCK', 'CLIMB', 'GRAB', 'OPEN'];
const ANCHOR_IDS = ['exactly-what-you-say', 'steps-in-order', 'bundle-and-repeat', 'find-and-fix'];

// A real turn's context (level + trace + short history) is a few KB; anything bigger is someone
// stuffing the prompt to inflate the Claude bill.
const MAX_CONTEXT_CHARS = 16_000;

/**
 * Same-origin gate: the game is served from the same host as this API, so a browser call from
 * the app always carries a matching Origin (or at least Referer); cross-site pages and naive
 * scripts don't. Headers are forgeable, so this is a damage-bounder alongside the size cap and
 * rate limit, not a lock. No hardcoded domain — preview deploys pass too.
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
const RATE_MAX = 20;
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return send(503, { error: 'no-key' });
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

    const context = await readBody(req);
    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) return send(400, { error: 'too-big' });
    if (!context?.level) return send(400, { error: 'bad-context' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        // Sonnet 5 runs adaptive thinking when this is omitted — for one or two spoken
        // sentences behind a forced tool call, that is pure latency and tokens.
        thinking: { type: 'disabled' },
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

function buildSystemPrompt(context: any): string {
  const anchorText = ANCHOR_TEXT[context.level.anchorId] || '';
  const lines = [
    `You are the partner brain inside "Make It Go", a wordless coding game for a child aged 3-7 who cannot read yet.`,
    `Your words are read ALOUD to her by a gentle voice; she only taps picture-tokens, never types or reads.`,
    `You are warm, patient and playful — a delighted, encouraging teacher.`,
    ``,
    `The game: a character auto-walks a path of event points. She lays an ordered plan of action`,
    `tokens, taps GO, and the character does EXACTLY what she said. A wrong action fails visibly`,
    `(a stumble, a splash). That gap between what she meant and what she said is the whole lesson —`,
    `never scold it; treat every hazard as friendly information.`,
    ``,
    `RULES (always):`,
    `- Be HONEST about what just happened. Read the outcome and the action she ACTUALLY played. If she stumbled or splashed, say so warmly — NEVER claim she succeeded, jumped, or "made it" when she did not. Getting this right is sacred.`,
    `- Speak ONE or two SHORT spoken sentences, in simple words a 4-year-old knows. No jargon, no spelling, no "tap the button" UI-speak.`,
    `- Never shame a mistake. A wrong plan is a happy chance to fix it. Praise effort and the fix.`,
    `- Discovering the right move IS the lesson. Before she has pressed GO on a level, name the challenge in a fun way but do NOT say which action to use, and use scaffold {kind:'none'}. Never hand her the answer up front.`,
    `- After a mistake, help her debug without giving the answer: the first time, wonder aloud what that spot needs (don't name the action) — you may highlight the wrong chip; only if she is still stuck after more tries, offer the exact action with offer-action.`,
    `- Iteration level: ONLY offer-repeat after a win where she did NOT bundle (she crossed them one-by-one). The moment she has bundled (used a REPEAT) and won, that IS the mastery — celebrate=true, scaffold none, and never offer-repeat again.`,
    `- Reinforce THIS level's anchor with its EXACT words, unchanged: "${anchorText}"`,
    `- At most ONE short question, and only if it truly moves her forward. No interrogation.`,
    `- Set celebrate=true ONLY on a clean win: she reached the goal with no wrong and no wasted/extra tokens. Otherwise celebrate=false.`,
    `- Refer to the hero as "${context.nouns.hero}" and the goal as "${context.nouns.goal}".`,
  ];
  if (context.flavor?.length) {
    lines.push(
      `- This pack has a playful sound — ${context.flavor.join(' / ')}. You MAY slip ONE in occasionally for warmth (a happy "${context.flavor[0]}!" on a win), never forced and never more than one per line.`,
    );
  }
  lines.push(``, `Reply ONLY by calling the "reply" tool.`);
  return lines.join('\n');
}

function buildUserMessage(context: any): string {
  const { level, conceptsKnown, currentPlan, lastOutcome, lastTrace, usedBundle, attemptsThisLevel, recentHistory } = context;
  const lines: string[] = [];
  lines.push(`Level ${level.id}. Path event points (in order): ${level.points.join(', ')}.`);
  lines.push(`Each point needs: ${level.points.map((p: string) => `${p}->${REQUIRED_ACTION[p]}`).join(', ')}.`);
  lines.push(
    `Tokens she can place: ${level.allowedActions.join(', ')}${level.mastery.kind === 'bundle-to-goal' ? ' plus a REPEAT tool' : ''}.`,
  );
  lines.push(
    `Ideas she has already mastered: ${conceptsKnown?.length ? conceptsKnown.join(', ') : 'none yet — this is her first'}.`,
  );
  lines.push(`Her current plan (in order): ${currentPlan.length ? currentPlan.join(', ') : '(empty)'}.`);
  if (usedBundle) lines.push(`She used a REPEAT bundle.`);

  if (lastOutcome === null || lastOutcome === undefined) {
    lines.push(
      `This is the START of the level — she has not pressed GO yet. Welcome her warmly and name the challenge in a fun way, but do NOT tell her which action to use, and use scaffold {kind:'none'}. Let HER choose.`,
    );
  } else {
    lines.push(`She pressed GO. Outcome: ${lastOutcome}.`);
    // A MISSED key is non-fatal (she walked past it) — the run ends at a later point, and that
    // later point is the one to report. The missed pickup is still stated so the line stays honest.
    if (lastTrace?.steps?.some((s: any) => s.result === 'MISSED')) {
      lines.push(`She walked past the KEY without grabbing it.`);
    }
    const failed = lastTrace?.steps?.find((s: any) => s.result !== 'PASS' && s.result !== 'MISSED');
    if (failed) {
      lines.push(
        `It ended at point ${failed.pointIndex} (a ${failed.kind}): it needed ${failed.required}, she played ${failed.played ?? 'nothing'} -> ${failed.result}.`,
      );
    }
    if (lastOutcome === 'WIN' && (lastTrace?.redundantTokens ?? 0) > 0) {
      lines.push(`She reached the goal but left ${lastTrace?.redundantTokens} extra/unused token(s) — not a clean solve.`);
    }
    lines.push(`Tries on this level so far: ${attemptsThisLevel}. Earlier outcomes: ${recentHistory.join(', ') || 'none'}.`);
  }

  lines.push(``);
  lines.push(`Choose at most one scaffold hint:`);
  lines.push(`- none`);
  lines.push(`- highlight-step with stepIndex (0-based) to glow a wrong or extra chip`);
  lines.push(`- offer-action with one of ${level.allowedActions.join('/')} to pulse the action she needs`);
  if (level.mastery.kind === 'bundle-to-goal') lines.push(`- offer-repeat to pulse the REPEAT tool (fold a run into one chip)`);
  return lines.join('\n');
}

function replyToolSchema() {
  return {
    name: 'reply',
    description: "The partner's spoken line and one optional gentle hint.",
    input_schema: {
      type: 'object',
      properties: {
        say: { type: 'string', description: 'One or two short spoken sentences for the child.' },
        celebrate: { type: 'boolean', description: 'true only on a clean win.' },
        introduceConcept: { type: 'string', enum: ANCHOR_IDS, description: "Usually this level's anchor id." },
        scaffold: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['none', 'highlight-step', 'offer-action', 'offer-repeat'] },
            stepIndex: { type: 'number' },
            action: { type: 'string', enum: ACTIONS },
          },
          required: ['kind'],
        },
      },
      required: ['say', 'celebrate', 'scaffold'],
    },
  };
}

function parseReply(input: any): any | null {
  if (!input || typeof input !== 'object') return null;
  if (typeof input.say !== 'string' || !input.say.trim()) return null;
  const scaffold = toScaffold(input.scaffold);
  const out: any = { say: input.say.trim(), scaffold, celebrate: input.celebrate === true };
  if (typeof input.introduceConcept === 'string' && ANCHOR_IDS.includes(input.introduceConcept)) {
    out.introduceConcept = input.introduceConcept;
  }
  return out;
}

function toScaffold(value: any): any {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  switch (value.kind) {
    case 'highlight-step':
      return typeof value.stepIndex === 'number' ? { kind: 'highlight-step', stepIndex: value.stepIndex } : { kind: 'none' };
    case 'offer-action':
      return typeof value.action === 'string' && ACTIONS.includes(value.action)
        ? { kind: 'offer-action', action: value.action }
        : { kind: 'none' };
    case 'offer-repeat':
      return { kind: 'offer-repeat' };
    default:
      return { kind: 'none' };
  }
}

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
