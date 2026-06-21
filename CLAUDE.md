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

## Core mechanic (the interpreter contract)
- The character walks itself. There is no walk/advance token. Walking is free and automatic; it is
  not something she programs.
- A level is an ordered list of **event points**, each with a required action type (e.g. gap->jump,
  branch->duck, step->climb; later key->grab, gate->open).
- Her plan is an ordered list of action tokens. On go, the character advances and consumes the next
  token at each event point in turn. Match -> pass that point. Mismatch -> fail there, visibly, and
  stop. Reach the goal after clearing every point -> win.
- A clean solve has exactly one correct token per event point, in order. Fewer tokens than points
  means she runs out and fails at an unhandled point; extra tokens are visible redundancy.
- This is plan-first, then run. No real-time or twitch input while the character moves. It is not a
  runner game; tapping an action as the character arrives would delete the plan and the literal-
  execution lesson.
- No turn or rotate tokens. Perspective-taking (the character facing toward her flips left/right) is
  the hardest thing at this age and reintroduces exactly the confusion this mechanic removes.

## Non-negotiable principles
1. No reading, no typing, no microphone. Input is large picture-tokens she taps and drags. Voice
   is output only.
2. Literal execution is sacred. She composes an ordered plan of action tokens, then taps go. The
   character auto-advances and, at each event point in order, performs the next action in her plan.
   It does exactly her ordered actions, in order. No autocorrect, no reordering to "what she
   probably meant." A wrong action, or the right actions in the wrong order, fails visibly at that
   event point (stumble, splash). The intent-vs-instruction gap is the debugging lesson. Never add
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
- L1 Sequence: short path, one or two event points of different types (e.g. a gap then a step), so
  the right action goes at the right point. Actions: jump, duck, climb.
- L2 Debugging: an event-point order most kids get wrong first try (right tokens, wrong order), so
  the revise loop is the lesson.
- L3 Iteration: several identical event points in a row, so a REPEAT token is offered at the moment
  of need, folding the run into one chip.
- L4 Decomposition: two dependent event points (grab the key, then open the gate); wrong order
  fails.
- L5 Cause and effect (stretch, optional): gate stays locked unless the key was grabbed earlier
  (requires carrying state; mark optional).
Each level has an explicit mastery rule (e.g. correct action per event point, in order, with no
redundant tokens, within N attempts). Mastery, not time, unlocks the next level.

## Theme system
A theme is a data-driven asset pack over one shared mechanic engine. Adding a theme is adding data,
never forking engine logic. A pack defines: hero, the auto-walk animation, the event-point types
and their matching action visuals (gap/jump, branch/duck, step/climb, etc.), goal, environment and
palette, celebration, optional voice flavor. Ship 5-6 original archetypes
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
- No walk token, no real-time input, no runner mechanic. Plan-first, then run.
- No turn or rotate tokens.
- Never fork engine logic per theme.
- Never add autocorrect to the interpreter. Never gate progression on time or raw attempt count.
- Failure is never a dead end. Every wrong plan is a revise, with the partner offering one good
  nudge, not handing over the answer.
