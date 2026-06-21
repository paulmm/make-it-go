import { ANCHORS } from '../engine/anchors';
import type { Action, EventKind, Trace } from '../engine/types';
import type { PartnerContext, PartnerResponse, Scaffold } from './types';

const OBSTACLE_WORD: Record<EventKind, string> = { GAP: 'gap', BRANCH: 'branch', STEP: 'step' };
const ACTION_WORD: Record<Action, string> = { JUMP: 'jump', DUCK: 'duck', CLIMB: 'climb' };

/** The point where the run ended (the wrong or missing one), if any. */
function failedStep(trace: Trace | null) {
  return trace?.steps.find((s) => s.result !== 'PASS') ?? null;
}

/**
 * Deterministic, offline partner. It reacts to the last outcome, never shames a
 * mistake, treats the stumble as information, and offers one good nudge (never the
 * answer). claudeBrain (milestone 4) sits behind the same PartnerStep seam.
 */
export async function localStub(context: PartnerContext): Promise<PartnerResponse> {
  const { nouns, level, lastOutcome, lastTrace, recentHistory } = context;
  const anchor = ANCHORS[level.anchorId];

  if (lastOutcome === null) {
    return {
      say: `Help the ${nouns.hero} get to the ${nouns.goal}! Pick what she should do, then press go.`,
      scaffold: { kind: 'none' },
      introduceConcept: level.anchorId,
      celebrate: false,
    };
  }

  switch (lastOutcome) {
    case 'WIN': {
      // She reached the goal, but extra/unused tokens are not a clean solve.
      const redundant = (lastTrace?.redundantTokens ?? 0) > 0;
      if (redundant) {
        return {
          say: `You got there! But the ${nouns.hero} didn't need all those steps. Take off the extra ones and try again.`,
          scaffold: { kind: 'highlight-step', stepIndex: level.points.length },
          introduceConcept: 'exactly-what-you-say',
          celebrate: false,
        };
      }
      return {
        say: `You did it! The ${nouns.hero} reached the ${nouns.goal}. ${anchor.text} Exactly like you said.`,
        scaffold: { kind: 'none' },
        introduceConcept: level.anchorId,
        celebrate: true,
      };
    }

    case 'STUMBLE': {
      const step = failedStep(lastTrace);
      const obstacle = step ? OBSTACLE_WORD[step.kind] : 'spot';
      const stumbledBefore = recentHistory.includes('STUMBLE');
      const scaffold: Scaffold =
        stumbledBefore && step
          ? { kind: 'offer-action', action: step.required }
          : step
            ? { kind: 'highlight-step', stepIndex: step.pointIndex }
            : { kind: 'none' };
      const say =
        stumbledBefore && step
          ? `Still stumbling! At the ${obstacle}, she needs to ${ACTION_WORD[step.required]}. Try that one.`
          : `Oops, she stumbled! The ${nouns.hero} did exactly what you said. What does the ${obstacle} need? Pick that one.`;
      return { say, scaffold, introduceConcept: 'exactly-what-you-say', celebrate: false };
    }

    case 'INCOMPLETE': {
      const step = failedStep(lastTrace);
      const obstacle = step ? OBSTACLE_WORD[step.kind] : 'goal';
      return {
        say: `She reached the ${obstacle} with nothing to do! Add an action for it.`,
        scaffold: { kind: 'none' },
        celebrate: false,
      };
    }
  }
}
