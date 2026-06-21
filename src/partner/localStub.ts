import { ANCHORS } from '../engine/anchors';
import type { Action, AnchorId, EventKind, Trace } from '../engine/types';
import type { PartnerContext, PartnerResponse, Scaffold } from './types';

/**
 * The opening line for each level — it names the specific challenge (not a generic prompt) so
 * she knows what she's about to take on. Keyed by the level's anchor, so each level's one new
 * idea is set up in childlike words.
 */
const INTRO: Record<AnchorId, (hero: string) => string> = {
  'exactly-what-you-say': (hero) => `Uh oh, a gap! Pick the one move that gets the ${hero} across, then press go.`,
  'steps-in-order': (hero) => `A gap AND a step! Give the ${hero} both moves, in the right order, then press go.`,
  'bundle-and-repeat': (hero) => `So many gaps in a row! Get the ${hero} across every single one, then press go.`,
  'find-and-fix': (hero) => `Two things to do! First grab the key, then open the gate for the ${hero}.`,
};

const OBSTACLE_WORD: Record<EventKind, string> = {
  GAP: 'gap',
  BRANCH: 'branch',
  STEP: 'step',
  KEY: 'key',
  GATE: 'gate',
};
const ACTION_WORD: Record<Action, string> = {
  JUMP: 'jump',
  DUCK: 'duck',
  CLIMB: 'climb',
  GRAB: 'grab',
  OPEN: 'open',
};

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
  const { nouns, level, lastOutcome, lastTrace, recentHistory, usedBundle } = context;
  const anchor = ANCHORS[level.anchorId];
  const bundleLevel = level.mastery.kind === 'bundle-to-goal';
  const keyGateLevel = level.points.includes('GATE'); // decomposition: two subgoals

  if (lastOutcome === null) {
    return {
      say: INTRO[level.anchorId](nouns.hero),
      scaffold: { kind: 'none' },
      introduceConcept: level.anchorId,
      celebrate: false,
    };
  }

  switch (lastOutcome) {
    case 'WIN': {
      // Iteration level: she crossed every gap, but one-by-one isn't the lesson. Reaching
      // the goal by brute force earns the nudge to fold the run into one repeat chip.
      if (bundleLevel && !usedBundle) {
        const word = ACTION_WORD[level.allowedActions[0]];
        return {
          say: `You did it! That was a lot of ${word}s. You can bundle them — tap repeat to do them all at once!`,
          scaffold: { kind: 'offer-repeat' },
          introduceConcept: 'bundle-and-repeat',
          celebrate: false,
        };
      }
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
      if (keyGateLevel) {
        return {
          say: `You did it! First the key, then the gate. Two parts, both done — in order!`,
          scaffold: { kind: 'none' },
          introduceConcept: 'find-and-fix',
          celebrate: true,
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
      // On the iteration level a run-out means the bundle is too small — grow it.
      if (bundleLevel && step) {
        return {
          say: `So close! She needs to ${ACTION_WORD[step.required]} at every ${obstacle}. Make the repeat bigger!`,
          scaffold: { kind: 'offer-repeat' },
          celebrate: false,
        };
      }
      return {
        say: `She reached the ${obstacle} with nothing to do! Add an action for it.`,
        scaffold: { kind: 'none' },
        celebrate: false,
      };
    }

    case 'LOCKED': {
      // The find-and-fix moment: the gate won't open because the key step is missing.
      return {
        say: `The gate is locked! She walked right past the key. Get the key first, then open the gate.`,
        scaffold: { kind: 'offer-action', action: 'GRAB' },
        introduceConcept: 'find-and-fix',
        celebrate: false,
      };
    }
  }
}
