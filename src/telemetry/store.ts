import type { LevelAttempt } from './signals';

/**
 * The persistent capability log for the grown-ups dashboard. Accumulates attempts across levels
 * and sessions in localStorage (on-device, no account, no server). Stores NO timestamps — only
 * what she can do. Separate from the per-level recorder the partner uses for in-level escalation.
 */
const ATTEMPTS_KEY = 'makeitgo.telemetry.attempts.v1';
const EXPLAINED_KEY = 'makeitgo.telemetry.explainedItBack.v1';

const hasStorage = typeof localStorage !== 'undefined';

function loadAttempts(): LevelAttempt[] {
  if (!hasStorage) return [];
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LevelAttempt[]) : [];
  } catch {
    return [];
  }
}

let attempts: LevelAttempt[] = loadAttempts();
let explainedItBack = hasStorage && localStorage.getItem(EXPLAINED_KEY) === '1';
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const telemetry = {
  recordAttempt(attempt: LevelAttempt) {
    attempts = [...attempts, attempt];
    if (hasStorage) {
      try {
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
      } catch {
        /* storage full / unavailable — keep the in-memory log */
      }
    }
    emit();
  },
  attempts(): LevelAttempt[] {
    return attempts;
  },
  explainedItBack(): boolean {
    return explainedItBack;
  },
  setExplainedItBack(value: boolean) {
    explainedItBack = value;
    if (hasStorage) {
      try {
        localStorage.setItem(EXPLAINED_KEY, value ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
    emit();
  },
  reset() {
    attempts = [];
    explainedItBack = false;
    if (hasStorage) {
      try {
        localStorage.removeItem(ATTEMPTS_KEY);
        localStorage.removeItem(EXPLAINED_KEY);
      } catch {
        /* ignore */
      }
    }
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
