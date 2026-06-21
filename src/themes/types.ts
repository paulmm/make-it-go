import type { ReactNode } from 'react';
import type { Action, EventKind } from '../engine/types';

/** The hero's poses. `walk` is the auto-walk gait between event points. */
export type HeroPose = 'idle' | 'walk' | 'jump' | 'duck' | 'climb' | 'stumble' | 'cheer';

export interface ThemePalette {
  sky: string;
  ground: string;
  tile: string;
  tileEdge: string;
  hazard: string;
  goal: string;
  accent: string;
  text: string;
}

/**
 * A theme is data over the shared engine: the scene, the hero's poses, an action icon
 * per token, and an obstacle visual per event-point kind. Adding a theme is adding one
 * of these — never forking engine logic.
 */
export interface ThemePack {
  id: string;
  name: string;
  palette: ThemePalette;
  nouns: { hero: string; goal: string };
  /** The scene behind the path (sky, hills, ground). */
  backdrop: () => ReactNode;
  /** A pokeable sun. */
  sun: () => ReactNode;
  /** The "tap here" pointing hand for the first-step hint. */
  hand: () => ReactNode;
  /** The goal symbol (e.g. the carrot), for the plan's end cap. */
  goalIcon: () => ReactNode;
  /** Shown on a win. */
  celebration: () => ReactNode;
  /** The hero rendered in a given pose. */
  heroPose: (pose: HeroPose) => ReactNode;
  /** The token icon for each action — the hero doing it. */
  actionArt: Record<Action, () => ReactNode>;
  /** The obstacle visual at each event-point kind. */
  obstacleArt: Record<EventKind, () => ReactNode>;
  voice?: { flavorWords?: string[] };
}
