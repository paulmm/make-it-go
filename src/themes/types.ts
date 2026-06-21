import type { ReactNode } from 'react';
import type { TileKind, Token } from '../engine/types';

export type HeroPose = 'idle' | 'hop' | 'leap' | 'splash' | 'cheer';

export interface ThemePalette {
  sky: string; // scene background, top
  ground: string; // scene background, bottom band
  tile: string; // plain safe tile
  tileEdge: string;
  hazard: string; // water
  goal: string; // goal accent
  accent: string; // buttons / highlights
  text: string;
}

/**
 * A theme is data over the shared engine: art for each tile kind, the hero sprite,
 * the two verb tokens, a celebration, and the nouns the partner speaks. Adding a
 * theme is adding one of these — never forking engine logic.
 */
export interface ThemePack {
  id: string;
  name: string;
  palette: ThemePalette;
  nouns: { hero: string; goal: string; hazard: string };
  /** The scene behind the tiles (sky, hills, ground) — gives depth. */
  backdrop: () => ReactNode;
  /** A pokeable sun, overlaid on the (sun-less) backdrop. */
  sun: () => ReactNode;
  /** An illustrated "tap here" pointing hand for the first-step hint. */
  hand: () => ReactNode;
  /** Art filling one tile of each kind. */
  tileArt: Record<TileKind, () => ReactNode>;
  /** The hero rendered in a given pose. */
  heroPose: (pose: HeroPose) => ReactNode;
  /** Shown on a win. */
  celebration: () => ReactNode;
  /** A standalone goal symbol (e.g. the carrot), for the plan's end cap. */
  goalIcon: () => ReactNode;
  /** Picture-token icons for the verbs — no words needed. */
  tokenArt: Record<Token, () => ReactNode>;
  voice?: { flavorWords?: string[] };
}
