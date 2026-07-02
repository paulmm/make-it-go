interface ControlsProps {
  canGo: boolean;
  canClear: boolean;
  muted: boolean;
  speechSupported: boolean;
  onGo: () => void;
  onClear: () => void;
  onToggleMute: () => void;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
      <path d="M34 24 L78 50 L34 76 Z" fill="#ffffff" />
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

/** GO (play), clear, and the mute toggle. Icons only — the win choices live on the scene. */
export function Controls({ canGo, canClear, muted, speechSupported, onGo, onClear, onToggleMute }: ControlsProps) {
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

      <button type="button" className="btn go" onClick={onGo} disabled={!canGo} aria-label="Go">
        <PlayIcon />
      </button>

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
