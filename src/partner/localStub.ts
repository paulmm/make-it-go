import { ANCHORS } from '../engine/anchors';
import { REQUIRED_ACTION } from '../engine/types';
import type { Action, EventKind, Level, Trace } from '../engine/types';
import type { PartnerContext, PartnerResponse, Scaffold } from './types';

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

/**
 * The opening line for a level — it names the specific challenge (not a generic prompt), built
 * from the level's own points so it speaks correctly to every rung, including new ones, without
 * per-level code. Decomposition (a gate) and iteration (a foldable run) get their own framing;
 * everything else is "the right move" (one point) or "the right moves, in order" (several).
 */
function levelIntro(level: Level, hero: string): string {
  const pts = level.points;

  if (pts.includes('GATE')) {
    return pts.length > 2
      ? `Big one! Grab the key and carry it — get the ${hero} all the way to the gate, then open it. In order!`
      : `Two things to do! First grab the key, then open the gate for the ${hero}.`;
  }
  if (level.mastery.kind === 'bundle-to-goal') {
    return `So many in a row! Get the ${hero} past every single one — you can bundle them — then press go.`;
  }
  if (pts.length === 1) {
    return `Uh oh, a ${OBSTACLE_WORD[pts[0]]}! Pick the one move that gets the ${hero} past it, then press go.`;
  }
  const words = pts.map((p) => OBSTACLE_WORD[p]);
  const human =
    words.length === 2
      ? `a ${words[0]} and then a ${words[1]}`
      : `a ${words.slice(0, -1).join(', a ')}, and a ${words[words.length - 1]}`;
  return `Look — ${human}! Give the ${hero} the right moves, in the right order, then press go.`;
}

/** The action of the most-repeated event point — the one a REPEAT bundle should fold. */
function repeatedAction(level: Level): Action {
  const counts = new Map<EventKind, number>();
  for (const p of level.points) counts.set(p, (counts.get(p) ?? 0) + 1);
  let best = level.points[0];
  for (const p of level.points) if ((counts.get(p) ?? 0) > (counts.get(best) ?? 0)) best = p;
  return REQUIRED_ACTION[best];
}

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
      say: levelIntro(level, nouns.hero),
      scaffold: { kind: 'none' },
      introduceConcept: level.anchorId,
      celebrate: false,
    };
  }

  switch (lastOutcome) {
    case 'WIN': {
      // Iteration level: she crossed every point, but one-by-one isn't the lesson. Reaching
      // the goal by brute force earns the nudge to fold the run into one repeat chip.
      if (bundleLevel && !usedBundle) {
        const word = ACTION_WORD[repeatedAction(level)];
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
          say: `You did it! First the key, then the gate. Both parts, done — in order!`,
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
      // On an iteration level a run-out means the bundle is too small — grow it.
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
