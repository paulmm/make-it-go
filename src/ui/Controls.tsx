interface ControlsProps {
  canGo: boolean;
  canClear: boolean;
  showReplay: boolean;
  muted: boolean;
  speechSupported: boolean;
  onGo: () => void;
  onClear: () => void;
  onReplay: () => void;
  onToggleMute: () => void;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
      <path d="M34 24 L78 50 L34 76 Z" fill="#ffffff" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 100 100" width="52" height="52" aria-hidden="true" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round">
      <path d="M74 36 A30 30 0 1 0 80 56" />
      <path d="M74 18 L74 38 L54 38" strokeLinejoin="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true" stroke="#5a5a6e" strokeWidth="11" strokeLinecap="round">
      <path d="M30 30 L70 70 M70 30 L30 70" />
    </svg>
  );
}

/** GO (play), clear, replay-on-win, and the mute toggle. Icons only — no reading. */
export function Controls({
  canGo,
  canClear,
  showReplay,
  muted,
  speechSupported,
  onGo,
  onClear,
  onReplay,
  onToggleMute,
}: ControlsProps) {
  return (
    <div className="controls">
      <button
        type="button"
        className="btn secondary"
        onClick={onClear}
        disabled={!canClear}
        aria-label="Clear all steps"
      >
        <ClearIcon />
      </button>

      {showReplay ? (
        <button type="button" className="btn go" onClick={onReplay} aria-label="Play again">
          <ReplayIcon />
        </button>
      ) : (
        <button type="button" className="btn go" onClick={onGo} disabled={!canGo} aria-label="Go">
          <PlayIcon />
        </button>
      )}

      <button
        type="button"
        className="btn secondary"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'Turn voice on' : 'Turn voice off'}
        style={{ visibility: speechSupported ? 'visible' : 'hidden' }}
      >
        <span aria-hidden="true" className="mute-icon">
          {muted ? '🔇' : '🔊'}
        </span>
      </button>
    </div>
  );
}
