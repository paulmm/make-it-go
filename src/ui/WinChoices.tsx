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

/** House — shown on the last level, where "next" means back to the character picker. */
function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/**
 * The post-win choice, popped over the celebrating scene once the partner's line has been read:
 * a small "try again" and a big, gently pulsing "next". Iconography only (no reading), colored
 * from the active theme. On the final level the big button goes home to pick another character.
 */
export function WinChoices({
  theme,
  hasNext,
  onRetry,
  onNext,
  onHome,
  reducedMotion,
}: {
  theme: ThemePack;
  hasNext: boolean;
  onRetry: () => void;
  onNext: () => void;
  onHome: () => void;
  reducedMotion: boolean;
}) {
  // The accent feeds a CSS gradient so the button reads as a glossy storybook sticker.
  const accentStyle = { '--accent': theme.palette.accent } as CSSProperties;
  return (
    <div className={`win-choices${reducedMotion ? ' reduced' : ''}`} role="group" aria-label="What would you like to do next?">
      <button type="button" className="wc-btn wc-retry" onClick={onRetry} aria-label="Try this one again">
        <RetryGlyph color={theme.palette.text} />
      </button>
      {hasNext ? (
        <button type="button" className="wc-btn wc-next" style={accentStyle} onClick={onNext} aria-label="Go to the next level">
          <ForwardGlyph />
        </button>
      ) : (
        <button type="button" className="wc-btn wc-next" style={accentStyle} onClick={onHome} aria-label="Choose another character">
          <HomeGlyph />
        </button>
      )}
    </div>
  );
}
