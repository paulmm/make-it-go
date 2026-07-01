import { LEVELS } from '../engine/levels';

// The furthest ladder rung she has unlocked, persisted per device so a page reload or a theme
// switch never sends her back to Level 1. The ladder is theme-agnostic, so one number covers
// every pack. Progress only ever moves forward (mastery unlocks are never taken back), and a
// finished ladder resumes at the last taught rung — the endless practice levels beyond it are
// generated fresh each session, so there is nothing meaningful to resume inside them.
// Best-effort like the telemetry store: without storage (private mode) play still works,
// progress just lives for the session only.

const KEY = 'makeitgo.progress.v1';

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/** The 0-based index of the furthest unlocked rung, clamped to the taught ladder. */
export function loadProgress(): number {
  try {
    const raw = storage()?.getItem(KEY);
    if (raw == null) return 0;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, LEVELS.length - 1);
  } catch {
    return 0;
  }
}

/** Record a newly unlocked rung. Keeps the furthest ever reached — never moves backward. */
export function saveProgress(index: number): void {
  try {
    const store = storage();
    if (!store) return;
    if (index > Math.floor(Number(store.getItem(KEY)) || 0)) store.setItem(KEY, String(index));
  } catch {
    /* storage full / unavailable — keep playing with session-only progress */
  }
}

/** Clear back to the first rung (the grown-ups dashboard reset). */
export function resetProgress(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
