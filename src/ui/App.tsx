import { LEVEL_1 } from '../engine/levels';
import { DEFAULT_THEME } from '../themes';
import { Game } from './Game';

/**
 * Milestone 1 drops straight into Level 1 with one theme — no front door yet
 * (the visual theme picker arrives in milestone 2).
 */
export function App() {
  return <Game theme={DEFAULT_THEME} level={LEVEL_1} />;
}
