import { MEADOW } from './meadow';
import { FOX } from './fox';
import { DINO } from './dino';
import { PRINCESS } from './princess';
import { TRUCK } from './truck';
import { SPACE } from './space';
import type { ThemePack } from './types';

export * from './types';
export { MEADOW, FOX, DINO, PRINCESS, TRUCK, SPACE };

/** All shipped themes — the picker grid. Adding a theme is adding a data pack here. */
export const THEMES: ThemePack[] = [MEADOW, FOX, DINO, PRINCESS, TRUCK, SPACE];

export const DEFAULT_THEME = MEADOW;
