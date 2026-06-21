import type { ThemePack } from '../themes/types';

interface ThemePickerProps {
  themes: ThemePack[];
  onPick: (theme: ThemePack) => void;
}

/**
 * The only front door: a fast, fully visual one-tap grid of theme tiles (no reading).
 * One tap drops straight into Level 1 with that pack.
 */
export function ThemePicker({ themes, onPick }: ThemePickerProps) {
  return (
    <div className="picker">
      <header className="picker-head">
        <h1 className="logo" aria-label="Make It Go">
          <span className="logo-word logo-make">Make</span>
          <span className="logo-word logo-it">it</span>
          <span className="logo-word logo-go">go</span>
        </h1>
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
            <span className="picker-hero">{theme.heroPose('idle')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
