import { describe, it, expect } from 'vitest';
import { generateLevel, makeRng, endlessDifficulty } from './generate';
import { run } from './interpreter';
import { REQUIRED_ACTION } from './types';
import type { Level } from './types';

const solve = (lvl: Level) => lvl.points.map((p) => REQUIRED_ACTION[p]);

describe('generateLevel — every generated level is valid practice, never a broken one', () => {
  it('is always cleanly solvable by the right action at each point (literal execution holds)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (let d = 1; d <= 8; d++) {
        const lvl = generateLevel(d, makeRng(seed), `G${seed}-${d}`);
        const trace = run(lvl, solve(lvl));
        expect(trace.outcome, `d${d} seed${seed} must be winnable`).toBe('WIN');
        expect(trace.redundantTokens, `d${d} seed${seed} clean solve has no extras`).toBe(0);
      }
    }
  });

  it('always offers every required action on the tray', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (let d = 1; d <= 8; d++) {
        const lvl = generateLevel(d, makeRng(seed), 'G');
        for (const p of lvl.points) expect(lvl.allowedActions).toContain(REQUIRED_ACTION[p]);
      }
    }
  });

  it('always poses a real choice — two+ actions, or a REPEAT fold to discover', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (let d = 1; d <= 8; d++) {
        const lvl = generateLevel(d, makeRng(seed), 'G');
        const realChoice = lvl.allowedActions.length >= 2 || lvl.mastery.kind === 'bundle-to-goal';
        expect(realChoice).toBe(true);
      }
    }
  });

  it('only asks for a fold when the run is at the tail — never a bundle stranded before a gate', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (let d = 1; d <= 8; d++) {
        const lvl = generateLevel(d, makeRng(seed), 'G');
        if (lvl.mastery.kind === 'bundle-to-goal') {
          expect(lvl.points[lvl.points.length - 1]).not.toBe('GATE');
        }
      }
    }
  });

  it('is deterministic: the same seed and difficulty reproduce the same level (replayable)', () => {
    expect(generateLevel(5, makeRng(42), 'G')).toEqual(generateLevel(5, makeRng(42), 'G'));
  });

  it('produces real variety so there is nothing to memorize', () => {
    const shapes = new Set<string>();
    for (let s = 1; s <= 24; s++) shapes.add(JSON.stringify(generateLevel(4, makeRng(s), 'G').points));
    expect(shapes.size).toBeGreaterThan(6);
  });

  it('grows with difficulty: harder levels have more points on average', () => {
    const avg = (d: number) => {
      let sum = 0;
      for (let s = 1; s <= 24; s++) sum += generateLevel(d, makeRng(s), 'G').points.length;
      return sum / 24;
    };
    expect(avg(6)).toBeGreaterThan(avg(1));
  });
});

describe('endlessDifficulty — practice escalates with mastery, not time', () => {
  it('starts past the taught ladder and rises as she clears more', () => {
    expect(endlessDifficulty(0)).toBeGreaterThanOrEqual(4);
    expect(endlessDifficulty(8)).toBeGreaterThan(endlessDifficulty(0));
  });
});
