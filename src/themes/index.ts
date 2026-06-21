import { MEADOW } from './meadow';
import type { ThemePack } from './types';

export * from './types';
export { MEADOW };

/** All shipped themes. Milestone 2 adds the picker; for now there is one. */
export const THEMES: ThemePack[] = [MEADOW];

/** The theme milestone 1 drops straight into. */
export const DEFAULT_THEME = MEADOW;
