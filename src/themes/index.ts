import { MEADOW } from './meadow';
import { FOX } from './fox';
import type { ThemePack } from './types';

export * from './types';
export { MEADOW, FOX };

/** All shipped themes — the picker grid. Adding a theme is adding a data pack here. */
export const THEMES: ThemePack[] = [MEADOW, FOX];

export const DEFAULT_THEME = MEADOW;
