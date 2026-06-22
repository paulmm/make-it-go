import { useState } from 'react';
import { LEVELS } from '../engine/levels';
import { endlessDifficulty, generateLevel, makeRng } from '../engine/generate';
import type { Level } from '../engine/types';
import { THEMES } from '../themes';
import type { ThemePack } from '../themes/types';
import { Dashboard } from './Dashboard';
import { Game } from './Game';
import { ThemePicker } from './ThemePicker';

/**
 * The theme picker is the only front door. One tap drops into Level 1 with that pack; mastering a
 * level unlocks the next. After the taught ladder, levels are generated on demand — endless,
 * never-memorized practice, so "next" is always a fresh challenge and never a dead end. A
 * long-press gate opens the grown-ups dashboard.
 */
export function App() {
  const [theme, setTheme] = useState<ThemePack | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
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
            setLevelIndex(0);
            setGenerated([]);
          }}
          onGrownUps={() => setShowDashboard(true)}
        />
        {dashboard}
      </>
    );
  }

  const sequence = [...LEVELS, ...generated];
  const level = sequence[levelIndex] ?? sequence[sequence.length - 1]; // never undefined
  const hasNext = true; // endless: there is always another challenge

  const goNext = () => {
    const next = levelIndex + 1;
    if (next >= sequence.length) {
      // Past the ladder: compose the next practice level and step onto it in the same update.
      setGenerated((g) => [...g, generateLevel(endlessDifficulty(g.length), makeRng(seedBase + g.length + 1), `G${g.length + 1}`)]);
    }
    setLevelIndex(next);
  };

  return (
    <>
      <Game
        key={`${theme.id}-${level.id}`}
        theme={theme}
        level={level}
        hasNext={hasNext}
        onNext={goNext}
        onHome={() => setTheme(null)}
      />
      {dashboard}
    </>
  );
}
