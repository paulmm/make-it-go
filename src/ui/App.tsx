import { useState } from 'react';
import { LEVELS } from '../engine/levels';
import { DEFAULT_THEME } from '../themes';
import { Game } from './Game';

/**
 * Milestone progression: drop straight into Level 1; mastering a level unlocks the next.
 * The visual theme picker (the only front door) arrives in milestone 2.
 */
export function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const hasNext = levelIndex < LEVELS.length - 1;

  return (
    <Game
      key={level.id}
      theme={DEFAULT_THEME}
      level={level}
      hasNext={hasNext}
      onNext={() => setLevelIndex((i) => Math.min(i + 1, LEVELS.length - 1))}
    />
  );
}
