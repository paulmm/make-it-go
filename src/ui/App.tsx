import { useState } from 'react';
import { LEVELS } from '../engine/levels';
import { generateLevel, makeRng, nextChallenge, varyLevel } from '../engine/generate';
import { computeSignals } from '../telemetry/signals';
import { telemetry } from '../telemetry/store';
import type { Level } from '../engine/types';
import { THEMES } from '../themes';
import type { ThemePack } from '../themes/types';
import { Dashboard } from './Dashboard';
import { Game } from './Game';
import { ThemePicker } from './ThemePicker';
import { loadProgress, saveProgress } from './progress';

/**
 * The theme picker is the only front door. One tap drops into Level 1 with that pack; mastering a
 * level unlocks the next. After the taught ladder, levels are generated on demand — endless,
 * never-memorized practice, so "next" is always a fresh challenge and never a dead end. A
 * long-press gate opens the grown-ups dashboard.
 */
export function App() {
  const [theme, setTheme] = useState<ThemePack | null>(null);
  // Resume at her furthest unlocked rung — a reload never sends her back to Level 1.
  const [levelIndex, setLevelIndex] = useState(() => loadProgress());
  const [generated, setGenerated] = useState<Level[]>([]);
  // One random base per session, so the generated run differs each time but stays reproducible
  // within the session (pure updater -> StrictMode-safe).
  const [seedBase] = useState(() => Math.floor(Math.random() * 1e9));
  const [showDashboard, setShowDashboard] = useState(false);

  const dashboard = showDashboard ? <Dashboard onClose={() => setShowDashboard(false)} /> : null;

  if (!theme) {
    return (
      <>
        <ThemePicker
          themes={THEMES}
          onPick={(t) => {
            setTheme(t);
            // The ladder is theme-agnostic — switching characters reskins the same progression,
            // so she keeps her rung (in-memory when storage is unavailable, else the stored
            // unlock). Generated levels are per-theme-session, so an endless index folds back
            // to the last taught rung.
            setLevelIndex((i) => Math.max(Math.min(i, LEVELS.length - 1), loadProgress()));
            setGenerated([]);
          }}
          onGrownUps={() => setShowDashboard(true)}
        />
        {dashboard}
      </>
    );
  }

  const sequence = [...LEVELS, ...generated];
  const baseLevel = sequence[levelIndex] ?? sequence[sequence.length - 1]; // never undefined
  // Vary the taught levels' obstacle order so the action sequence can't be memorized (generated
  // levels already vary). Deterministic per (session, level), so a retry is the same level.
  const level = levelIndex < LEVELS.length ? varyLevel(baseLevel, makeRng(seedBase + levelIndex * 101 + 7)) : baseLevel;
  const hasNext = true; // endless: there is always another challenge

  const goNext = () => {
    const next = levelIndex + 1;
    saveProgress(next); // mastery unlocked this rung — remember it across sessions
    if (next >= sequence.length) {
      // Past the ladder: the coach reads her capability and aims the next level at the skill she
      // has least developed, then we step onto it in the same update.
      setGenerated((g) => {
        const s = computeSignals(telemetry.attempts());
        const { difficulty, emphasis } = nextChallenge({
          firstTry: s.firstTry.strong,
          selfDebug: s.selfDebug.strong,
          transfer: s.transfer.strong,
          promptFade: s.promptFade.strong,
          cleared: g.length,
        });
        return [...g, generateLevel(difficulty, makeRng(seedBase + g.length + 1), `G${g.length + 1}`, emphasis)];
      });
    }
    setLevelIndex(next);
  };

  return (
    <>
      <Game
        key={`${theme.id}-${level.id}`}
        theme={theme}
        level={level}
        levelNumber={levelIndex + 1}
        hasNext={hasNext}
        onNext={goNext}
        onHome={() => setTheme(null)}
      />
      {dashboard}
    </>
  );
}
