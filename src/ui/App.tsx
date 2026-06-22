import { useState } from 'react';
import { LEVELS } from '../engine/levels';
import { THEMES } from '../themes';
import type { ThemePack } from '../themes/types';
import { Dashboard } from './Dashboard';
import { Game } from './Game';
import { ThemePicker } from './ThemePicker';

/**
 * The theme picker is the only front door. One tap drops into Level 1 with that pack;
 * mastering a level unlocks the next. A long-press gate opens the grown-ups dashboard.
 */
export function App() {
  const [theme, setTheme] = useState<ThemePack | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
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
          }}
          onGrownUps={() => setShowDashboard(true)}
        />
        {dashboard}
      </>
    );
  }

  const level = LEVELS[levelIndex];
  const hasNext = levelIndex < LEVELS.length - 1;
  return (
    <>
      <Game
        key={`${theme.id}-${level.id}`}
        theme={theme}
        level={level}
        hasNext={hasNext}
        onNext={() => setLevelIndex((i) => Math.min(i + 1, LEVELS.length - 1))}
        onHome={() => setTheme(null)}
      />
      {dashboard}
    </>
  );
}
