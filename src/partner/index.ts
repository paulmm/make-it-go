import { localStub } from './localStub';
import type { PartnerStep } from './types';

export * from './types';

/**
 * The active partner. One seam, selected by env var; the UI imports only `partner`.
 * claudeBrain (server-side Anthropic call) arrives in milestone 4 — swapping it in
 * changes nothing in the UI.
 */
export const partner: PartnerStep = localStub;
