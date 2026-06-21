import { MEADOW } from './meadow';
import { FOX } from './fox';
import { DINO } from './dino';
import { PRINCESS } from './princess';
import type { ThemePack } from './types';

export * from './types';
export { MEADOW, FOX, DINO, PRINCESS };

/** All shipped themes — the picker grid. Adding a theme is adding a data pack here. */
export const THEMES: ThemePack[] = [MEADOW, FOX, DINO, PRINCESS];

export const DEFAULT_THEME = MEADOW;
