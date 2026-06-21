# CLAUDE.md — Make It Go

Project rules for "Make It Go," a themed, mastery-gated coding game for a pre-literate child
(ages ~3-7).
These rules hold on every turn. Full context and rationale: `docs/brief.md`.

## What this is
A deployed web app that teaches a child who cannot read yet the core intuitions of programming
through play: sequence, literal execution (debugging), and iteration. She picks a theme, then
solves a ladder of short challenges that get harder one idea at a time. An AI partner (Claude)
talks her through it by voice and decides when she is ready for the next idea.

Success is measured by capability gained, never by time on app. This tool is an on-ramp: its win
condition is that she outgrows it and graduates to ScratchJr and beyond. The name names the core
loop: she builds a plan and taps "go," and the character does exactly what she said.

## Non-negotiable principles
1. No reading, no typing, no microphone. Input is large picture-tokens she taps and drags. Voice
   is output only.
2. Literal execution is sacred. On play, the character does exactly what the plan says, in order.
   No autocorrect, no "what she probably meant." A wrong plan must be visible and diagnosable (walk
   into the hazard, splash). The intent-vs-instruction gap is the debugging lesson. Never add
   autocorrection.
3. Growth over engagement. No streaks, timers, leaderboards, or time-on-app pressure. Progression
   is mastery-gated: each level introduces exactly one new idea and unlocks only after the prior is
   demonstrated.
4. Claude is the partner brain, behind one seam (see Partner brain). Local stub for offline dev,
   server-side Claude API for production. The UI never changes when you swap them.
5. The partner lives inside the play, not in a Q&A box. It reacts, narrates, and offers the right
   tool at the right moment. At most one short question, only when the question moves her forward.
   No interrogation.
6. Touch-first, runs on tablet and laptop. One responsive build, touch primary, pointer fallback.
   Targets >= 64px, visible focus, reduced-motion respected, fully playable with audio off.

## Knowledge anchors (reinforce with the same words and image every time)
- "It does exactly what you say." (literal execution, the root anchor)
- "Steps happen in order." (sequence; maps to ScratchJr script order)
- "You can bundle steps and do them again." (iteration; maps to the ScratchJr repeat block)
- "When it's wrong, find the wrong step and fix it." (debugging, decomposition)
Each level plants or reinforces exactly one anchor, in ladder order. Phrasing is childlike and
unchanging.

## Capability ladder (theme-agnostic, reskinned by the chosen pack)
- L1 Sequence: short path, one hazard, tokens advance and leap.
- L2 Debugging: a layout most kids get wrong first try, so the revise loop is the lesson.
- L3 Iteration: path long enough that a REPEAT token is offered at the moment of need, folding the
  run into one chip.
- L4 Decomposition: two subgoals (get the key, then reach the gate).
- L5 Cause and effect (stretch, optional): gate locked unless the key came first.
Each level has an explicit mastery rule (e.g. solved with no more than one redundant step within N
attempts). Mastery, not time, unlocks the next level.

## Theme system
A theme is a data-driven asset pack over one shared mechanic engine. Adding a theme is adding data,
never forking engine logic. A pack defines: hero, goal, hazard, environment and palette, the
visuals for advance and leap, celebration, optional voice flavor. Ship 5-6 original archetypes
(royal/castle, fashion and style, cute animals, trucks and diggers, space, dinosaurs). Original
generic archetypes only: no branded or trademarked characters (no Barbie, no Disney princesses, no
licensed IP); generate or draw your own art. The theme picker is the only thing before play: a
fast, fully visual, one-tap grid that drops straight into Level 1 mid-scene. No other front door.

## Partner brain (one interface, two implementations)
`partnerStep(context) -> { say, scaffold, introduceConcept, celebrate }`
`context = { theme, level, conceptsKnown, currentPlan, lastOutcome, attemptsThisLevel, recentHistory }`
- localStub: deterministic branching, offline, for dev and the no-network demo.
- claudeBrain: server-side Anthropic API call (key off the client). Warm, patient, short spoken
  sentences; embedded in play; never shames a mistake; treats the hazard as information; reinforces
  the current anchor with fixed words. Its readiness decision is driven by the capability signals
  below, not by elapsed time or raw attempt count.
- Select by env var. Interface and UI identical for both.
- Spoken output via Web Speech API (`speechSynthesis`), short utterances, mute toggle, speak on a
  tap so autoplay rules do not block it.

## Capability telemetry (and what readiness reads from)
Instrument four signals per level; the partner's readiness decision reads from these:
1. Transfer: solves a novel level type she was not walked through.
2. Prompt-fade: average partner interventions per solved level, trending down.
3. Unaided first-try correctness on a held-out concept.
4. Self-initiated debugging: re-runs and edits a wrong plan without being told to.
Keep a parent-tappable "explained it back to me" flag and a simple grown-ups dashboard. Do not log
or optimize time-on-app. When signals top out, surface a parent-facing readiness handoff
recommending the next tool (ScratchJr first).

## Tech and structure
- React + TypeScript + Vite. Deployable to Vercel, Netlify, or Railway.
- Separate engine from data: `/engine` (mechanic, pure interpreter, mastery rules), `/themes`
  (data packs and assets), `/partner` (localStub and claudeBrain behind one interface),
  `/telemetry`, `/ui`.
- The interpreter is theme-agnostic and pure (unit-testable). Write tests for the interpreter and
  the mastery gates.

## Guardrails
- No mic, no reading, no typing, no account, no ads, no streaks or timers.
- Never fork engine logic per theme.
- Never add autocorrect to the interpreter. Never gate progression on time or raw attempt count.
- Failure is never a dead end. Every wrong plan is a revise, with the partner offering one good
  nudge, not handing over the answer.
