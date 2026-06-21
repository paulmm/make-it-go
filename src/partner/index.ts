import { localStub } from './localStub';
import { claudeBrain } from './claudeBrain';
import type { PartnerStep } from './types';

export * from './types';

/**
 * The active partner. One seam, selected by env var; the UI imports only `partner`.
 * Default is the deterministic offline localStub. Set VITE_PARTNER=claude to use the
 * server-side Anthropic partner (which itself falls back to localStub if unavailable),
 * so swapping it in changes nothing in the UI.
 */
const useClaude = import.meta.env?.VITE_PARTNER === 'claude';
export const partner: PartnerStep = useClaude ? claudeBrain : localStub;
