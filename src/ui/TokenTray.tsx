import type { Action } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface TokenTrayProps {
  theme: ThemePack;
  actions: Action[];
  /** An action the partner is offering right now (gentle pulse), or null. */
  offerAction: Action | null;
  /** Singles disabled (running, or the path is already full). */
  disabled: boolean;
  /** This level offers the REPEAT tool (iteration). */
  allowsRepeat: boolean;
  /** The action the REPEAT tool folds (the most-repeated point's) — its icon shows this. */
  repeatAction: Action;
  /** The partner is offering the fold right now (pulse the REPEAT tool). */
  offerRepeat: boolean;
  /** REPEAT tool disabled (running). It never overflows the path, so capacity doesn't gate it. */
  repeatDisabled: boolean;
  /** Show the first-tap pointing hand until she adds her first step. */
  hint: boolean;
  onAdd: (action: Action) => void;
  onAddRepeat: () => void;
}

const ACTION_LABEL: Record<Action, string> = {
  JUMP: 'Jump',
  DUCK: 'Duck',
  CLIMB: 'Climb',
  GRAB: 'Grab',
  OPEN: 'Open',
};

/** Two chasing arrows — the "do it again" mark layered over the action the bundle repeats. */
function LoopArrow() {
  return (
    <svg className="repeat-loop" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M12 24a12 12 0 0 1 20-8.8M36 24a12 12 0 0 1-20 8.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M32 8v8h-8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 40v-8h8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The action picture-tokens she can add. Big targets, tap to add; each is the hero doing it.
 *  On the iteration level a REPEAT tool sits alongside them to fold a run into one chip. */
export function TokenTray({
  theme,
  actions,
  offerAction,
  disabled,
  allowsRepeat,
  repeatAction,
  offerRepeat,
  repeatDisabled,
  hint,
  onAdd,
  onAddRepeat,
}: TokenTrayProps) {
  return (
    <div className="token-tray" aria-label="Steps you can add">
      {actions.map((action, i) => (
        <button
          key={action}
          type="button"
          className={`token${offerAction === action ? ' offer' : ''}`}
          onClick={() => onAdd(action)}
          disabled={disabled}
          aria-label={ACTION_LABEL[action]}
        >
          {theme.actionArt[action]()}
          {hint && i === 0 && (
            <span className="tap-hint" aria-hidden="true">
              {theme.hand()}
            </span>
          )}
        </button>
      ))}

      {allowsRepeat && (
        <button
          type="button"
          className={`token repeat-tool${offerRepeat ? ' offer' : ''}`}
          onClick={onAddRepeat}
          disabled={repeatDisabled}
          aria-label="Repeat"
        >
          {theme.actionArt[repeatAction]()}
          <LoopArrow />
        </button>
      )}
    </div>
  );
}
