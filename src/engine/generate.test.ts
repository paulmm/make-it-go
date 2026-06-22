import { describe, it, expect } from 'vitest';
import { generateLevel, makeRng, endlessDifficulty, nextChallenge, varyLevel } from './generate';
import type { Emphasis, SkillState } from './generate';
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

describe('generateLevel — emphasis shapes the practice', () => {
  it('iterate emphasis always yields a foldable run', () => {
    for (let s = 1; s <= 12; s++) expect(generateLevel(5, makeRng(s), 'G', 'iterate').mastery.kind).toBe('bundle-to-goal');
  });

  it('decompose emphasis always includes a key and a gate', () => {
    for (let s = 1; s <= 12; s++) {
      const l = generateLevel(5, makeRng(s), 'G', 'decompose');
      expect(l.points).toContain('KEY');
      expect(l.points).toContain('GATE');
    }
  });

  it('order emphasis is distinct hazards in sequence — no gate, no fold', () => {
    for (let s = 1; s <= 12; s++) {
      const l = generateLevel(5, makeRng(s), 'G', 'order');
      expect(l.points.length).toBeGreaterThanOrEqual(2);
      expect(l.points).not.toContain('GATE');
      expect(l.mastery.kind).not.toBe('bundle-to-goal');
      expect(new Set(l.points).size).toBe(l.points.length); // distinct, so order is the lesson
    }
  });

  it('fundamentals emphasis stays short but is a real little sequence (never a single obstacle)', () => {
    for (let s = 1; s <= 12; s++) {
      const n = generateLevel(7, makeRng(s), 'G', 'fundamentals').points.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it('never generates a trivial single-obstacle level (post-ladder practice feels earned)', () => {
    const all: Emphasis[] = ['fundamentals', 'order', 'iterate', 'decompose', 'mixed'];
    for (const e of all) {
      for (const d of [4, 5, 7, 10]) {
        for (let s = 1; s <= 16; s++) {
          expect(generateLevel(d, makeRng(s), 'G', e).points.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('every emphasis still yields a solvable level with a real choice', () => {
    const all: Emphasis[] = ['fundamentals', 'order', 'iterate', 'decompose', 'mixed'];
    for (const e of all) {
      for (let s = 1; s <= 20; s++) {
        const l = generateLevel(5, makeRng(s), 'G', e);
        expect(run(l, l.points.map((p) => REQUIRED_ACTION[p])).outcome).toBe('WIN');
        expect(l.allowedActions.length >= 2 || l.mastery.kind === 'bundle-to-goal').toBe(true);
      }
    }
  });
});

describe('nextChallenge — the coach targets the least-developed capability', () => {
  const skill = (o: Partial<SkillState> = {}): SkillState => ({
    firstTry: true,
    selfDebug: true,
    transfer: true,
    promptFade: true,
    cleared: 4,
    ...o,
  });

  it('eases to fundamentals when she rarely wins first try', () => {
    expect(nextChallenge(skill({ firstTry: false })).emphasis).toBe('fundamentals');
  });

  it('gives a debuggable order level when she has not recovered from a mistake', () => {
    expect(nextChallenge(skill({ selfDebug: false })).emphasis).toBe('order');
  });

  it('pushes a novel mixed level when transfer is the gap', () => {
    expect(nextChallenge(skill({ transfer: false })).emphasis).toBe('mixed');
  });

  it('escalates difficulty above the baseline when every signal is strong', () => {
    expect(nextChallenge(skill({ cleared: 4 })).difficulty).toBeGreaterThan(endlessDifficulty(4));
  });

  it('defaults to fundamentals for a blank slate (no signals yet)', () => {
    const blank = skill({ firstTry: false, selfDebug: false, transfer: false, promptFade: false, cleared: 0 });
    expect(nextChallenge(blank).emphasis).toBe('fundamentals');
  });
});

describe('varyLevel — the action sequence cannot be memorized', () => {
  const lvl = (points: Level['points'], allowedActions: Level['allowedActions'], mastery: Level['mastery']): Level => ({
    id: 'L',
    points,
    allowedActions,
    anchorId: 'steps-in-order',
    mastery,
  });
  const reach = { kind: 'reach-goal-within', maxRedundant: 0 } as const;

  it('shuffles a free hazard sequence, keeps the same obstacles, stays solvable', () => {
    const order3 = lvl(['GAP', 'BRANCH', 'STEP'], ['JUMP', 'DUCK', 'CLIMB'], reach);
    const orders = new Set<string>();
    for (let s = 1; s <= 24; s++) {
      const v = varyLevel(order3, makeRng(s));
      expect([...v.points].sort()).toEqual(['BRANCH', 'GAP', 'STEP']);
      expect(run(v, v.points.map((p) => REQUIRED_ACTION[p])).outcome).toBe('WIN');
      orders.add(v.points.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps the key first and gate last but refreshes the middle, staying solvable', () => {
    const cap = lvl(['KEY', 'BRANCH', 'BRANCH', 'BRANCH', 'GATE'], ['GRAB', 'DUCK', 'OPEN'], reach);
    const middles = new Set<string>();
    for (let s = 1; s <= 24; s++) {
      const v = varyLevel(cap, makeRng(s));
      expect(v.points[0]).toBe('KEY');
      expect(v.points[v.points.length - 1]).toBe('GATE');
      expect(v.points).toHaveLength(5);
      expect(run(v, v.points.map((p) => REQUIRED_ACTION[p])).outcome).toBe('WIN');
      for (const p of v.points) expect(v.allowedActions).toContain(REQUIRED_ACTION[p]);
      middles.add(v.points.slice(1, -1).join(','));
    }
    expect(middles.size).toBeGreaterThan(1); // not always three branches
  });

  it('leaves an iteration level untouched (the fold needs its run)', () => {
    const fold = lvl(['GAP', 'BRANCH', 'BRANCH', 'BRANCH'], ['JUMP', 'DUCK'], { kind: 'bundle-to-goal' });
    expect(varyLevel(fold, makeRng(5))).toEqual(fold);
  });

  it('leaves a single-obstacle level untouched (no order to vary)', () => {
    const single = lvl(['BRANCH'], ['DUCK', 'JUMP'], reach);
    expect(varyLevel(single, makeRng(5)).points).toEqual(['BRANCH']);
  });
});
