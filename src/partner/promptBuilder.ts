import { ANCHORS } from '../engine/anchors';
import { REQUIRED_ACTION } from '../engine/types';
import type { Action, AnchorId } from '../engine/types';
import type { PartnerContext, PartnerResponse, Scaffold } from './types';

/**
 * Pure builders + validator for the server-side claudeBrain. Kept free of any network or
 * secrets so they are unit-testable and shared by the dev proxy and the serverless function.
 * The actual Anthropic call lives in the server endpoints; everything decision-shaping is here.
 */

const ACTIONS: Action[] = ['JUMP', 'DUCK', 'CLIMB', 'GRAB', 'OPEN'];
const ANCHOR_IDS: AnchorId[] = ['exactly-what-you-say', 'steps-in-order', 'bundle-and-repeat', 'find-and-fix'];

/** The partner's persona and unbreakable rules. The anchor words are fixed and quoted. */
export function buildSystemPrompt(context: PartnerContext): string {
  const anchor = ANCHORS[context.level.anchorId];
  return [
    `You are the partner brain inside "Make It Go", a wordless coding game for a child aged 3-7 who cannot read yet.`,
    `Your words are read ALOUD to her by a gentle voice; she only taps picture-tokens, never types or reads.`,
    `You are warm, patient and playful — a delighted, encouraging teacher.`,
    ``,
    `The game: a character auto-walks a path of event points. She lays an ordered plan of action`,
    `tokens, taps GO, and the character does EXACTLY what she said. A wrong action fails visibly`,
    `(a stumble, a splash). That gap between what she meant and what she said is the whole lesson —`,
    `never scold it; treat every hazard as friendly information.`,
    ``,
    `RULES (always):`,
    `- Speak ONE or two SHORT spoken sentences, in simple words a 4-year-old knows. No jargon, no spelling, no "tap the button" UI-speak.`,
    `- Never shame a mistake. A wrong plan is a happy chance to fix it. Praise effort and the fix.`,
    `- Give ONE good nudge toward the next step — never the whole answer. Use the scaffold to point at the wrong spot or offer the one tool she needs.`,
    `- Reinforce THIS level's anchor with its EXACT words, unchanged: "${anchor.text}"`,
    `- At most ONE short question, and only if it truly moves her forward. No interrogation.`,
    `- Set celebrate=true ONLY on a clean win: she reached the goal with no wrong and no wasted/extra tokens. Otherwise celebrate=false.`,
    `- Refer to the hero as "${context.nouns.hero}" and the goal as "${context.nouns.goal}".`,
    ``,
    `Reply ONLY by calling the "reply" tool.`,
  ].join('\n');
}

/** The turn's situation, as compact readable facts for the model. */
export function buildUserMessage(context: PartnerContext): string {
  const { level, currentPlan, lastOutcome, lastTrace, usedBundle, attemptsThisLevel, recentHistory } = context;
  const lines: string[] = [];
  lines.push(`Level ${level.id}. Path event points (in order): ${level.points.join(', ')}.`);
  lines.push(`Each point needs: ${level.points.map((p) => `${p}->${REQUIRED_ACTION[p]}`).join(', ')}.`);
  lines.push(`Tokens she can place: ${level.allowedActions.join(', ')}${level.mastery.kind === 'bundle-to-goal' ? ' plus a REPEAT tool' : ''}.`);
  lines.push(`Her current plan (in order): ${currentPlan.length ? currentPlan.join(', ') : '(empty)'}.`);
  if (usedBundle) lines.push(`She used a REPEAT bundle.`);

  if (lastOutcome === null) {
    lines.push(`This is the START of the level — she has not pressed GO yet. Welcome her and name the challenge.`);
  } else {
    lines.push(`She pressed GO. Outcome: ${lastOutcome}.`);
    const failed = lastTrace?.steps.find((s) => s.result !== 'PASS');
    if (failed) {
      lines.push(
        `It ended at point ${failed.pointIndex} (a ${failed.kind}): it needed ${failed.required}, she played ${failed.played ?? 'nothing'} -> ${failed.result}.`,
      );
    }
    if (lastOutcome === 'WIN' && (lastTrace?.redundantTokens ?? 0) > 0) {
      lines.push(`She reached the goal but left ${lastTrace?.redundantTokens} extra/unused token(s) — not a clean solve.`);
    }
    lines.push(`Tries on this level so far: ${attemptsThisLevel}. Earlier outcomes: ${recentHistory.join(', ') || 'none'}.`);
  }

  lines.push(``);
  lines.push(`Choose at most one scaffold hint:`);
  lines.push(`- none`);
  lines.push(`- highlight-step with stepIndex (0-based) to glow a wrong or extra chip`);
  lines.push(`- offer-action with one of ${level.allowedActions.join('/')} to pulse the action she needs`);
  if (level.mastery.kind === 'bundle-to-goal') lines.push(`- offer-repeat to pulse the REPEAT tool (fold a run into one chip)`);
  return lines.join('\n');
}

/** The forced-tool schema that shapes Claude's reply into a PartnerResponse. */
export function replyToolSchema() {
  return {
    name: 'reply',
    description: "The partner's spoken line and one optional gentle hint.",
    input_schema: {
      type: 'object',
      properties: {
        say: { type: 'string', description: 'One or two short spoken sentences for the child.' },
        celebrate: { type: 'boolean', description: 'true only on a clean win.' },
        introduceConcept: { type: 'string', enum: ANCHOR_IDS, description: "Usually this level's anchor id." },
        scaffold: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['none', 'highlight-step', 'offer-action', 'offer-repeat'] },
            stepIndex: { type: 'number' },
            action: { type: 'string', enum: ACTIONS },
          },
          required: ['kind'],
        },
      },
      required: ['say', 'celebrate', 'scaffold'],
    },
  };
}

/** Validate Claude's tool input into a PartnerResponse, or null if it is unusable. */
export function parseReply(input: unknown): PartnerResponse | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  if (typeof o.say !== 'string' || !o.say.trim()) return null;

  const scaffold = toScaffold(o.scaffold);
  if (!scaffold) return null;

  const response: PartnerResponse = {
    say: o.say.trim(),
    scaffold,
    celebrate: o.celebrate === true,
  };
  if (typeof o.introduceConcept === 'string' && (ANCHOR_IDS as string[]).includes(o.introduceConcept)) {
    response.introduceConcept = o.introduceConcept as AnchorId;
  }
  return response;
}

function toScaffold(value: unknown): Scaffold | null {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  const o = value as Record<string, unknown>;
  switch (o.kind) {
    case 'highlight-step':
      return typeof o.stepIndex === 'number' ? { kind: 'highlight-step', stepIndex: o.stepIndex } : { kind: 'none' };
    case 'offer-action':
      return typeof o.action === 'string' && (ACTIONS as string[]).includes(o.action)
        ? { kind: 'offer-action', action: o.action as Action }
        : { kind: 'none' };
    case 'offer-repeat':
      return { kind: 'offer-repeat' };
    case 'none':
      return { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}
