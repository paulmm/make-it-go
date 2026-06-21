import type { Action } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface TokenTrayProps {
  theme: ThemePack;
  actions: Action[];
  /** An action the partner is offering right now (gentle pulse), or null. */
  offerAction: Action | null;
  disabled: boolean;
  /** Show the first-tap pointing hand until she adds her first step. */
  hint: boolean;
  onAdd: (action: Action) => void;
}

const ACTION_LABEL: Record<Action, string> = { JUMP: 'Jump', DUCK: 'Duck', CLIMB: 'Climb' };

/** The action picture-tokens she can add. Big targets, tap to add; each is the bunny doing it. */
export function TokenTray({ theme, actions, offerAction, disabled, hint, onAdd }: TokenTrayProps) {
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
    </div>
  );
}
