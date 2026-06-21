# Milestone 1 — Engine + Level 1 (design)

- Date: 2026-06-21
- Status: Approved in conversation — building.
- Scope: `brief.md` build-order milestone 1.

## Scope (this milestone only)

Engine (pure interpreter + mastery rule), Level 1, one theme (meadow/bunny), localStub
partner, touch picture-tokens, literal execution with a splash on a wrong plan, and win.

Out of scope (later milestones): theme picker (M2), L2–L5 (M3), claudeBrain (M4),
telemetry dashboard (M5).

## Locked decisions

1. **World geometry: 1-D linear track.** Position is an integer tile index; the hero faces
   forward. Rationale: the plan strip (left-to-right tokens) and the world (left-to-right
   tiles) share one axis, the strongest no-reading scaffold for "steps happen in order"; it
   isolates exactly one idea per level; it is the ideal substrate for L3 iteration. Extends to
   2-D later as a data change if ever needed.
2. **Mastery: unlimited attempts.** Required so the self-initiated-debugging telemetry signal
   can appear; progression is never gated on attempts or time. L1 gate = reach the goal (WIN).
   `redundantSteps` and first-try-ness are recorded as telemetry only; the redundancy bar
   becomes the **L3** gate (where folding a brute-forced run into REPEAT is the lesson). The
   mastery rule is per-level.
3. **L1 layout:** 5 tiles `[START, PATH, HAZARD(water), PATH, GOAL]`; bunny → carrot, water =
   splash. Optimal = `ADVANCE, LEAP, ADVANCE` (3 tokens). The tempting wrong first try is
   `ADVANCE, ADVANCE` → splash at tile 2. ADVANCE works for the first move, so the need for
   LEAP emerges from a consequence she caused.

## Interpreter (pure, theme-agnostic)

Types: `Token = 'ADVANCE' | 'LEAP'`; `TileKind = 'START' | 'PATH' | 'HAZARD' | 'GOAL'`;
`Outcome = 'WIN' | 'SPLASH' | 'FELL_OFF' | 'INCOMPLETE'`;
`Level { id, tiles: TileKind[], startIndex, goalIndex, optimalSteps, anchorId, allowedTokens, mastery }`.

`run(level, plan) -> Trace { outcome, steps: Step[], finalIndex, executedTokens }`.

Move semantics (literal — no autocorrect): `ADVANCE` = +1; `LEAP` = +2 **always**; only the
**landing** tile is evaluated (passing over a hazard mid-leap is safe). Per step, the landing
event is: off the end (`to > lastIndex`) → `FELL_OFF`; else by `tiles[to]`: `GOAL` → `WIN`,
`HAZARD` → `SPLASH`, otherwise `SAFE`. Any non-`SAFE` event is terminal and stops execution. If
the plan exhausts while `SAFE` and not on the goal → `INCOMPLETE`. Each step records
`{ index, token, fromIndex, toIndex, passedOverIndex | null, event, terminal }`. The full trace
is returned so the UI animates it; the engine has no DOM dependency and is unit-tested.

## Mastery (pure)

`evaluateMastery(level, plan, trace) -> { mastered, outcome, redundantSteps, reason }`.
`redundantSteps = outcome === 'WIN' ? max(0, plan.length - level.optimalSteps) : 0`.
L1 rule (`level.mastery.kind === 'reach-goal'`): `mastered = outcome === 'WIN'`. Attempt count
is telemetry, never a gate.

## Knowledge anchors

Fixed, unchanging text. L1 plants `steps-in-order` ("Steps happen in order."); the root anchor
`exactly-what-you-say` ("It does exactly what you say.") is reinforced on play and on the splash.

## Partner (localStub behind the partnerStep seam)

`partnerStep(context) -> { say, scaffold?, introduceConcept?, celebrate? }` (async).
Deterministic branch on `lastOutcome`: level start → warm intro + plant anchor; `SPLASH` →
"she did exactly what you said; find the wrong step and fix it" + highlight the terminal step
(never shames); `INCOMPLETE` → "add a step"; `FELL_OFF` → "too far"; `WIN` → celebrate +
reinforce anchor. One nudge, never the answer.

## Theme pack (data over engine)

`ThemePack { id, name, hero, goal, hazard, palette, verbs{advance,leap}, celebration, voice? }`.
M1 ships one: meadow (bunny / carrot / water) with original inline-SVG art. Adding a theme is
adding data, never forking engine logic.

## Telemetry (minimal)

Recorder stores per-attempt `{ levelId, plan, outcome, redundantSteps, attemptNumber }` in
memory. No timestamps or durations; time-on-app is never logged. Feeds `attemptsThisLevel` and
the partner context. No dashboard in M1.

## UI

Drop straight into L1 (no front door). Big token tray (tap to add), left-to-right plan strip
(tap to remove), big GO, clear, mute. Targets ≥ 64px, visible focus, reduced-motion respected,
fully playable with audio off. Animate the trace step-by-step (advance slide, leap arc, splash,
celebration). Speech via Web Speech `speechSynthesis`, fired on a tap (autoplay-safe), short
utterances.

## Tests (mandated by CLAUDE.md)

Vitest. Interpreter: WIN; SPLASH (advance into water); FELL_OFF (overshoot / leap past goal);
INCOMPLETE (short plan); leap-over-hazard safe; both-verbs path; stop-at-terminal (no execution
after splash/win); empty plan. Level: BFS confirms `optimalSteps = 3` and no shorter win.
Mastery: WIN → mastered; non-WIN → not mastered; `redundantSteps` math including trailing
padding (still WIN, still mastered, redundancy counted).

## File structure

`src/engine` (types, interpreter, mastery, levels, anchors + tests), `src/themes` (types,
meadow), `src/partner` (types, localStub), `src/telemetry` (recorder), `src/ui` (Game +
components, useSpeech, useRunner).
