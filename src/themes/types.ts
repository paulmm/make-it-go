import type { ReactNode } from 'react';
import type { Action, EventKind } from '../engine/types';

/** The hero's poses. `walk` is the auto-walk gait; `splash`/`stumble` are fail looks. */
export type HeroPose =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'duck'
  | 'climb'
  | 'grab'
  | 'open'
  | 'stumble'
  | 'splash'
  | 'cheer';

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
 * per token, an obstacle per event-point kind, and which fail pose fits each obstacle.
 * Adding a theme is adding one of these — never forking engine logic.
 */
export interface ThemePack {
  id: string;
  name: string;
  palette: ThemePalette;
  nouns: { hero: string; goal: string };
  /** A short, playful line the character calls out when hovered on the picker. */
  hoverCry: string;
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
  /** The fail pose that fits each obstacle (water gap -> splash, step/branch -> stumble). */
  failPose: Record<EventKind, HeroPose>;
  voice?: { flavorWords?: string[] };
}
