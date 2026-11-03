import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ThemePack } from '../themes/types';

interface ThemePickerProps {
  themes: ThemePack[];
  onPick: (theme: ThemePack) => void;
  /** Opens the grown-ups dashboard — reached by a press-and-hold, so a child's tap won't trigger it. */
  onGrownUps: () => void;
}

/** How long the grown-ups pill must be held. Long enough that a child's tap never opens it. */
const HOLD_MS = 700;
/** How long the "press and hold" nudge stays up after a short press. */
const HINT_MS = 1800;

function LockIcon() {
  return (
    <svg className="gate-lock" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The grown-ups gate: a visible pill that opens the dashboard only after a held press. The ring
 * around the lock fills while it is held, a short press shows a "press and hold" nudge instead,
 * and the press is hardened so native long-press gestures (a context menu, the iOS callout) and
 * a wobbling finger can't quietly cancel it. A held Enter or Space works the same for keyboards.
 */
function GrownUpsGate({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    },
    [],
  );

  const begin = () => {
    if (holdTimer.current) return; // already holding (key auto-repeat, a second finger)
    if (hintTimer.current) {
      window.clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
    setHint(false);
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      onOpen();
    }, HOLD_MS);
  };

  const end = () => {
    if (holdTimer.current) {
      // Let go early: no dashboard, just a nudge about how the gate works.
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      setHint(true);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => {
        hintTimer.current = null;
        setHint(false);
      }, HINT_MS);
    }
    setHolding(false);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Capture the pointer so a finger that wobbles off the pill keeps the hold alive.
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* not supported here (jsdom) — the hold still works, it just needs a steady finger */
    }
    begin();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); // the key's own click must never open the gate
    if (!e.repeat) begin();
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    end();
  };

  return (
    <div className="grownups">
      <span className="grownups-hint" role="status" aria-live="polite">
        {hint ? 'Press and hold' : ''}
      </span>
      <button
        type="button"
        className={`grownups-gate${holding ? ' holding' : ''}`}
        aria-label="For grown-ups (press and hold)"
        aria-haspopup="dialog"
        onPointerDown={onPointerDown}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        onBlur={end}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="gate-badge" aria-hidden="true">
          <svg className="gate-ring" viewBox="0 0 36 36">
            <circle className="gate-ring-track" cx="18" cy="18" r="15.5" />
            <circle className="gate-ring-fill" cx="18" cy="18" r="15.5" />
          </svg>
          <LockIcon />
        </span>
        <span className="gate-label">Grown-ups</span>
      </button>
    </div>
  );
}

/**
 * The only front door: a fast, fully visual one-tap grid of theme tiles (no reading).
 * One tap drops straight into Level 1 with that pack. A bottom strip carries the credits and
 * the grown-ups gate.
 */
export function ThemePicker({ themes, onPick, onGrownUps }: ThemePickerProps) {
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
      <footer className="picker-foot">
        <p className="picker-credits">
          Made by{' '}
          <a href="https://www.propriuslabs.ai" target="_blank" rel="noreferrer">
            Proprius Labs
          </a>
          <span aria-hidden="true"> · </span>
          <a href="mailto:contact@propriuslabs.ai">contact@propriuslabs.ai</a>
        </p>
        <GrownUpsGate onOpen={onGrownUps} />
      </footer>
    </div>
  );
}
