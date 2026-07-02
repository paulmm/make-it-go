import type { CSSProperties } from 'react';
import type { ThemePack } from '../themes/types';

/** Circular "do it again" arrow — drawn in the theme's ink color. */
function RetryGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M74 36 A30 30 0 1 0 80 56" />
      <path d="M74 18 L74 38 L54 38" />
    </svg>
  );
}

/** Forward double-chevron — "go on to the next one". */
function ForwardGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" fill="#ffffff">
      <path d="M20 24 L46 50 L20 76 Z" />
      <path d="M52 24 L78 50 L52 76 Z" />
    </svg>
  );
}

/**
 * The post-win choice, popped over the celebrating scene once the partner's line has been read:
 * a small "try again" and a big, gently pulsing "next". Iconography only (no reading), colored
 * from the active theme. There is always a next — past the ladder, levels are generated.
 */
export function WinChoices({
  theme,
  onRetry,
  onNext,
  reducedMotion,
}: {
  theme: ThemePack;
  onRetry: () => void;
  onNext: () => void;
  reducedMotion: boolean;
}) {
  // The accent feeds a CSS gradient so the button reads as a glossy storybook sticker.
  const accentStyle = { '--accent': theme.palette.accent } as CSSProperties;
  return (
    <div className={`win-choices${reducedMotion ? ' reduced' : ''}`} role="group" aria-label="What would you like to do next?">
      <button type="button" className="wc-btn wc-retry" onClick={onRetry} aria-label="Try this one again">
        <RetryGlyph color={theme.palette.text} />
      </button>
      <button type="button" className="wc-btn wc-next" style={accentStyle} onClick={onNext} aria-label="Go to the next level">
        <ForwardGlyph />
      </button>
    </div>
  );
}
