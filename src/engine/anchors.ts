import type { AnchorId } from './types';

export interface Anchor {
  id: AnchorId;
  /** The exact, unchanging words. Same words every time — that is what makes it stick. */
  text: string;
}

/** The fixed knowledge anchors, in ladder order. Phrasing never changes. */
export const ANCHORS: Record<AnchorId, Anchor> = {
  'exactly-what-you-say': {
    id: 'exactly-what-you-say',
    text: 'It does exactly what you say.',
  },
  'steps-in-order': {
    id: 'steps-in-order',
    text: 'Steps happen in order.',
  },
  'bundle-and-repeat': {
    id: 'bundle-and-repeat',
    text: 'You can bundle steps and do them again.',
  },
  'find-and-fix': {
    id: 'find-and-fix',
    text: "When it's wrong, find the wrong step and fix it.",
  },
};
