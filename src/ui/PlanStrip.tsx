import type { Action } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface PlanStripProps {
  theme: ThemePack;
  plan: Action[];
  /** How many actions the level needs — one slot per obstacle. */
  slotCount: number;
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
      <ellipse cx="20" cy="34" rx="12" ry="10" fill="rgba(0,0,0,0.28)" />
      <circle cx="10" cy="18" r="4" fill="rgba(0,0,0,0.28)" />
      <circle cx="20" cy="14" r="4" fill="rgba(0,0,0,0.28)" />
      <circle cx="30" cy="18" r="4" fill="rgba(0,0,0,0.28)" />
    </svg>
  );
}

/**
 * The plan, read as the bunny's journey: bunny at the start, one slot per obstacle, the
 * carrot at the end. Empty slots are dashed paw outlines that show how many actions to
 * place; tap a filled step to remove it.
 */
export function PlanStrip({ theme, plan, slotCount, highlightIndex, activeIndex, disabled, onRemove }: PlanStripProps) {
  const total = Math.max(slotCount, plan.length);

  return (
    <div className="plan" aria-label="Your plan">
      <div className="plan-cap" aria-hidden="true">
        {theme.heroPose('idle')}
      </div>

      <div className="plan-lane">
        {Array.from({ length: total }).map((_, i) =>
          i < plan.length ? (
            <button
              key={i}
              type="button"
              className={`chip${highlightIndex === i ? ' highlight' : ''}${activeIndex === i ? ' active' : ''}`}
              onClick={() => onRemove(i)}
              disabled={disabled}
              aria-label={`Step ${i + 1}, ${ACTION_WORD[plan[i]]}. Tap to remove.`}
            >
              {theme.actionArt[plan[i]]()}
            </button>
          ) : (
            <div key={i} className="slot empty" aria-hidden="true">
              <Footprint />
            </div>
          ),
        )}
      </div>

      <div className="plan-cap" aria-hidden="true">
        {theme.goalIcon()}
      </div>
    </div>
  );
}
