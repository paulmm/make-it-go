import { localStub } from './localStub';
import { parseReply } from './promptBuilder';
import type { PartnerContext, PartnerResponse, PartnerStep } from './types';

/**
 * The Claude-backed partner. It POSTs the turn's context to /api/partner (which calls the
 * Anthropic API with the key server-side, never in the browser) and returns the partner's line.
 * If the endpoint is missing, errors, or returns something unusable, it falls back to the
 * offline localStub so the app never goes quiet. Selected via VITE_PARTNER=claude.
 */
export const claudeBrain: PartnerStep = async (context: PartnerContext): Promise<PartnerResponse> => {
  // The level intro is a generic welcome with no plan to react to yet, so serve it from the
  // instant offline line — the first thing she hears has no lag. Claude handles the reactions,
  // where it adds the real value and where the run animation already hides its latency.
  if (context.lastOutcome === null) return localStub(context);
  try {
    const res = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    if (!res.ok) return localStub(context);
    const parsed = parseReply(await res.json());
    return parsed ?? localStub(context);
  } catch {
    return localStub(context);
  }
};
