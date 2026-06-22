import { useRef } from 'react';
import type { ThemePack } from '../themes/types';

interface ThemePickerProps {
  themes: ThemePack[];
  onPick: (theme: ThemePack) => void;
  /** Opens the grown-ups dashboard — reached by a long-press, so a child's tap won't trigger it. */
  onGrownUps: () => void;
}

/**
 * The only front door: a fast, fully visual one-tap grid of theme tiles (no reading).
 * One tap drops straight into Level 1 with that pack.
 */
export function ThemePicker({ themes, onPick, onGrownUps }: ThemePickerProps) {
  const hold = useRef<number | null>(null);
  const startHold = () => {
    hold.current = window.setTimeout(onGrownUps, 650);
  };
  const cancelHold = () => {
    if (hold.current) {
      clearTimeout(hold.current);
      hold.current = null;
    }
  };

  return (
    <div className="picker">
      <header className="picker-head">
        <div className="logo-wrap">
          <span className="logo-spark spark-a" aria-hidden="true">✦</span>
          <span className="logo-spark spark-b" aria-hidden="true">✧</span>
          <span className="logo-spark spark-c" aria-hidden="true">✦</span>
          <h1 className="logo" aria-label="Make It Go">
            <span className="logo-word logo-make">Make</span>
            <span className="logo-word logo-it">it</span>
            <span className="logo-word logo-go">go</span>
          </h1>
          <svg className="logo-swoosh" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
            <path d="M6 13 Q 78 3 150 11 T 294 9" fill="none" stroke="#ff9a3c" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
        <p className="picker-title">Choose your character</p>
      </header>
      <div className="picker-grid">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className="picker-tile"
            onClick={() => onPick(theme)}
            aria-label={theme.name}
            style={{ background: `linear-gradient(180deg, ${theme.palette.sky} 0%, ${theme.palette.ground} 100%)` }}
          >
            <span className="picker-cry" aria-hidden="true">
              {theme.hoverCry}
            </span>
            <span className="picker-hero">{theme.heroPose('idle')}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="grownups-gate"
        aria-label="For grown-ups (press and hold)"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
      >
        for grown-ups
      </button>
    </div>
  );
}
