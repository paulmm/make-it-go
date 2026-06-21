import { ANCHORS } from '../engine/anchors';
import type { Trace } from '../engine/types';
import type { PartnerContext, PartnerResponse, Scaffold } from './types';

/** The index of the token that ended the run (the one to point at), if any. */
function terminalStepIndex(trace: Trace | null): number | null {
  const term = trace?.steps.find((s) => s.terminal);
  return term ? term.index : null;
}

/**
 * Deterministic, offline partner for Level 1. It lives inside the play: it reacts
 * to the last outcome, never shames a mistake, treats the splash as information,
 * and offers one good nudge (never the answer). The claudeBrain implementation
 * (milestone 4) sits behind the same PartnerStep seam.
 */
export async function localStub(context: PartnerContext): Promise<PartnerResponse> {
  const { nouns, level, lastOutcome, lastTrace, recentHistory } = context;
  const anchor = ANCHORS[level.anchorId];

  // Level start, before the first run: plant the anchor and set her going.
  if (lastOutcome === null) {
    return {
      say: `Let's help the ${nouns.hero} hop to the ${nouns.goal}! Tap a step, then press go.`,
      scaffold: { kind: 'none' },
      introduceConcept: level.anchorId,
      celebrate: false,
    };
  }

  switch (lastOutcome) {
    case 'WIN':
      return {
        say: `You did it! The ${nouns.hero} reached the ${nouns.goal}. ${anchor.text} Exactly like you said.`,
        scaffold: { kind: 'none' },
        introduceConcept: level.anchorId,
        celebrate: true,
      };

    case 'SPLASH': {
      const splashedBefore = recentHistory.includes('SPLASH');
      const stepIndex = terminalStepIndex(lastTrace);
      // First splash: point at the wrong step. Splashed before: offer the tool.
      const scaffold: Scaffold = splashedBefore
        ? { kind: 'offer-token', token: 'LEAP' }
        : stepIndex !== null
          ? { kind: 'highlight-step', stepIndex }
          : { kind: 'none' };
      const say = splashedBefore
        ? `Still splashing! To get over the ${nouns.hazard} she needs a big jump. Try the leap.`
        : `Splash! The ${nouns.hero} did exactly what you said and stepped in the ${nouns.hazard}. Which step was wrong? Fix that one.`;
      return { say, scaffold, introduceConcept: 'exactly-what-you-say', celebrate: false };
    }

    case 'FELL_OFF': {
      const stepIndex = terminalStepIndex(lastTrace);
      return {
        say: `Whoa, too far! The ${nouns.hero} jumped past the ${nouns.goal}. Take a smaller step.`,
        scaffold:
          stepIndex !== null ? { kind: 'highlight-step', stepIndex } : { kind: 'none' },
        introduceConcept: 'exactly-what-you-say',
        celebrate: false,
      };
    }

    case 'INCOMPLETE':
      return {
        say: `So close! The ${nouns.hero} stopped before the ${nouns.goal}. Add another step.`,
        scaffold: { kind: 'none' },
        celebrate: false,
      };
  }
}
