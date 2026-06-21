import { expandPlan } from '../engine/plan';
import type { Action, PlanToken } from '../engine/types';
import type { ThemePack } from '../themes/types';

interface PlanStripProps {
  theme: ThemePack;
  plan: PlanToken[];
  /** How many actions the level needs — one slot per obstacle. */
  slotCount: number;
  /** Token the partner is pointing at (the wrong one), or null. */
  highlightIndex: number | null;
  /** Token currently executing during a run (glows in sync), or null. */
  activeIndex: number | null;
  disabled: boolean;
  onRemove: (index: number) => void;
}

const ACTION_WORD: Record<Action, string> = {
  JUMP: 'jump',
  DUCK: 'duck',
  CLIMB: 'climb',
  GRAB: 'grab',
  OPEN: 'open',
};

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

/** A bundle chip shows the action once with a row of count dots — "do this, this many times." */
function RepeatBadge({ count }: { count: number }) {
  return (
    <span className="repeat-badge" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="pip" />
      ))}
    </span>
  );
}

function chipLabel(token: PlanToken, index: number): string {
  if (token.type === 'repeat') {
    return `Step ${index + 1}, ${ACTION_WORD[token.action]} ${token.count} times. Tap to remove.`;
  }
  return `Step ${index + 1}, ${ACTION_WORD[token.action]}. Tap to remove.`;
}

/**
 * The plan, read as the hero's journey: hero at the start, one slot per obstacle, the goal
 * at the end. A single action fills one slot; a REPEAT bundle is one chip that covers many,
 * so the empty paw-slots that remain count from the *expanded* plan — they show how many
 * steps are still unaccounted for. Tap a filled chip to remove it.
 */
export function PlanStrip({ theme, plan, slotCount, highlightIndex, activeIndex, disabled, onRemove }: PlanStripProps) {
  const covered = expandPlan(plan).length;
  const emptySlots = Math.max(0, slotCount - covered);

  return (
    <div className="plan" aria-label="Your plan">
      <div className="plan-cap" aria-hidden="true">
        {theme.heroPose('idle')}
      </div>

      <div className="plan-lane">
        {plan.map((token, i) => (
          <button
            key={i}
            type="button"
            className={`chip${token.type === 'repeat' ? ' repeat' : ''}${highlightIndex === i ? ' highlight' : ''}${activeIndex === i ? ' active' : ''}`}
            onClick={() => onRemove(i)}
            disabled={disabled}
            aria-label={chipLabel(token, i)}
          >
            {theme.actionArt[token.action]()}
            {token.type === 'repeat' && <RepeatBadge count={token.count} />}
            <span className="chip-remove" aria-hidden="true">
              ×
            </span>
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="slot empty" aria-hidden="true">
            <Footprint />
          </div>
        ))}
      </div>

      <div className="plan-cap" aria-hidden="true">
        {theme.goalIcon()}
      </div>
    </div>
  );
}
