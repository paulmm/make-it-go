import { localStub } from './localStub';
import { claudeBrain } from './claudeBrain';
import type { PartnerStep } from './types';

export * from './types';

/**
 * The active partner. One seam; the UI imports only `partner`. The server-side Claude partner
 * is the default — it automatically falls back to the deterministic offline localStub whenever
 * /api/partner has no ANTHROPIC_API_KEY or the call fails, so the app always talks and nothing
 * in the UI changes. Force the pure offline stub (e.g. for the no-network demo) with
 * VITE_PARTNER=local.
 */
const forceLocal = import.meta.env?.VITE_PARTNER === 'local';
export const partner: PartnerStep = forceLocal ? localStub : claudeBrain;
