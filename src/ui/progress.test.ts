import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadProgress, saveProgress, resetProgress } from './progress';
import { LEVELS } from '../engine/levels';

/** A Map-backed localStorage stand-in — the tests run in node, which has none. */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('progress store — the furthest unlocked ladder rung', () => {
  beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('starts at the first rung with nothing stored', () => {
    expect(loadProgress()).toBe(0);
  });

  it('round-trips an unlocked rung', () => {
    saveProgress(3);
    expect(loadProgress()).toBe(3);
  });

  it('only ever moves forward — a replay of an early rung cannot lose progress', () => {
    saveProgress(5);
    saveProgress(2);
    expect(loadProgress()).toBe(5);
  });

  it('clamps a finished ladder to the last taught rung (endless levels are per-session)', () => {
    saveProgress(LEVELS.length + 3);
    expect(loadProgress()).toBe(LEVELS.length - 1);
  });

  it('treats garbage in storage as no progress', () => {
    localStorage.setItem('makeitgo.progress.v1', 'not-a-number');
    expect(loadProgress()).toBe(0);
    localStorage.setItem('makeitgo.progress.v1', '-4');
    expect(loadProgress()).toBe(0);
  });

  it('reset clears it back to the first rung', () => {
    saveProgress(4);
    resetProgress();
    expect(loadProgress()).toBe(0);
  });

  it('is a no-op without storage (private mode) instead of throwing', () => {
    vi.unstubAllGlobals();
    expect(loadProgress()).toBe(0);
    expect(() => saveProgress(2)).not.toThrow();
    expect(() => resetProgress()).not.toThrow();
  });
});
