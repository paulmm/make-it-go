interface ControlsProps {
  canGo: boolean;
  canClear: boolean;
  showReplay: boolean;
  showNext: boolean;
  muted: boolean;
  speechSupported: boolean;
  onGo: () => void;
  onClear: () => void;
  onReplay: () => void;
  onNext: () => void;
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

function NextIcon() {
  return (
    <svg viewBox="0 0 100 100" width="52" height="52" aria-hidden="true" fill="#ffffff">
      <path d="M18 26 L44 50 L18 74 Z" />
      <path d="M50 26 L76 50 L50 74 Z" />
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

/** GO (play), clear, the win action (next level / replay), and the mute toggle. Icons only. */
export function Controls({
  canGo,
  canClear,
  showReplay,
  showNext,
  muted,
  speechSupported,
  onGo,
  onClear,
  onReplay,
  onNext,
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

      {showNext ? (
        <button type="button" className="btn go" onClick={onNext} aria-label="Next level">
          <NextIcon />
        </button>
      ) : showReplay ? (
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
