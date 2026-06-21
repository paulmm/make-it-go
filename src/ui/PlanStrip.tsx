import type { Token } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface PlanStripProps {
  theme: ThemePack;
  plan: Token[];
  /** Step the partner is pointing at (the wrong one), or null. */
  highlightIndex: number | null;
  disabled: boolean;
  onRemove: (index: number) => void;
}

const TOKEN_WORD: Record<Token, string> = { ADVANCE: 'hop', LEAP: 'big jump' };

function Footprint() {
  return (
    <svg viewBox="0 0 40 50" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="20" cy="34" rx="12" ry="10" fill="rgba(0,0,0,0.12)" />
      <circle cx="10" cy="18" r="4" fill="rgba(0,0,0,0.12)" />
      <circle cx="20" cy="14" r="4" fill="rgba(0,0,0,0.12)" />
      <circle cx="30" cy="18" r="4" fill="rgba(0,0,0,0.12)" />
    </svg>
  );
}

/**
 * The plan, read as the bunny's journey: bunny at the start, the steps in order,
 * the carrot at the end. The same left-to-right axis the hero travels. Tap a step
 * to remove it. Empty footprints invite the first step.
 */
export function PlanStrip({ theme, plan, highlightIndex, disabled, onRemove }: PlanStripProps) {
  return (
    <div className="plan" aria-label="Your plan">
      <div className="plan-cap" aria-hidden="true">
        {theme.heroPose('idle')}
      </div>

      <div className="plan-lane">
        {plan.length === 0 ? (
          <div className="plan-hint" aria-hidden="true">
            <Footprint />
            <Footprint />
            <Footprint />
          </div>
        ) : (
          plan.map((token, i) => (
            <button
              key={i}
              type="button"
              className={`chip${highlightIndex === i ? ' highlight' : ''}`}
              onClick={() => onRemove(i)}
              disabled={disabled}
              aria-label={`Step ${i + 1}, ${TOKEN_WORD[token]}. Tap to remove.`}
            >
              {theme.tokenArt[token]()}
            </button>
          ))
        )}
      </div>

      <div className="plan-cap" aria-hidden="true">
        {theme.goalIcon()}
      </div>
    </div>
  );
}
