import type { Token } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface TokenTrayProps {
  theme: ThemePack;
  tokens: Token[];
  /** A token the partner is offering right now (gets a gentle pulse), or null. */
  offerToken: Token | null;
  disabled: boolean;
  /** Show the first-tap pointing hand until she has added her first step. */
  hint: boolean;
  onAdd: (token: Token) => void;
}

const TOKEN_LABEL: Record<Token, string> = { ADVANCE: 'Add a hop', LEAP: 'Add a big jump' };

/** The picture-tokens she can add. Big targets, tap to add; each button is the bunny doing it. */
export function TokenTray({ theme, tokens, offerToken, disabled, hint, onAdd }: TokenTrayProps) {
  return (
    <div className="token-tray" aria-label="Steps you can add">
      {tokens.map((token, i) => (
        <button
          key={token}
          type="button"
          className={`token${offerToken === token ? ' offer' : ''}`}
          onClick={() => onAdd(token)}
          disabled={disabled}
          aria-label={TOKEN_LABEL[token]}
        >
          {theme.tokenArt[token]()}
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
