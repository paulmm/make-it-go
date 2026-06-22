import type { CSSProperties } from 'react';
import type { ThemePack } from '../themes/types';

/**
 * A small themed medallion showing the level she's on — gentle wayfinding (and a touch of
 * numeracy), never a score or a streak. Colored from the active theme so it sits in the world.
 */
export function LevelBadge({ number, theme }: { number: number; theme: ThemePack }) {
  return (
    <div
      className="level-badge"
      style={{ '--accent': theme.palette.accent } as CSSProperties}
      role="img"
      aria-label={`Level ${number}`}
    >
      <span>{number}</span>
    </div>
  );
}
