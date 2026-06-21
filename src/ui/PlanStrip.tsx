import type { Action } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface PlanStripProps {
  theme: ThemePack;
  plan: Action[];
  /** Step the partner is pointing at (the wrong one), or null. */
  highlightIndex: number | null;
  /** Step currently executing during a run (glows in sync), or null. */
  activeIndex: number | null;
  disabled: boolean;
  onRemove: (index: number) => void;
}

const ACTION_WORD: Record<Action, string> = { JUMP: 'jump', DUCK: 'duck', CLIMB: 'climb' };

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
 * The plan, read as the bunny's journey: bunny at the start, the actions in order, the
 * carrot at the end. Tap a step to remove it. Empty footprints invite the first step.
 */
export function PlanStrip({ theme, plan, highlightIndex, activeIndex, disabled, onRemove }: PlanStripProps) {
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
          plan.map((action, i) => (
            <button
              key={i}
              type="button"
              className={`chip${highlightIndex === i ? ' highlight' : ''}${activeIndex === i ? ' active' : ''}`}
              onClick={() => onRemove(i)}
              disabled={disabled}
              aria-label={`Step ${i + 1}, ${ACTION_WORD[action]}. Tap to remove.`}
            >
              {theme.actionArt[action]()}
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
