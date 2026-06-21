# Build brief: Make It Go — a themed, mastery-gated coding game for a pre-literate child

"Make It Go" names the core loop: the child builds a plan, taps go, and the character does exactly
what she said.

Paste this into Claude Code as the opening brief. Drive the decisions yourself and make Claude
show tradeoffs as it goes. The full transcript is part of the take-home deliverable, so keep it.

---

## What you are building

A deployed web app that teaches a child who **cannot read yet** the core intuitions of
programming through play: sequence, literal execution (debugging), and iteration. The child picks
a theme she connects with, then solves a ladder of short challenges that get harder one idea at a
time. An AI partner (Claude) talks her through it by voice and decides when she is ready for the
next idea.

This is a take-home for Anthropic Education Labs, Option B (learning through collaboration with
Claude). The thing being judged is growth, not engagement: success means the child became more
capable, not that she spent more time in the app.

The core thesis, which the build must keep true: a learner who cannot read the interface is the
hardest possible test of "AI as a capability partner." If it works for her, the pattern
generalizes to an adult who does not yet know a field well enough to ask Claude the right
question. She is not the audience to optimize for. She is the proof.

## Non-negotiable principles (the spine)

1. **No reading, no typing, no microphone.** Input is large picture-tokens she taps and drags.
   Voice is output only (the partner speaks). Kid speech recognition is unreliable and a dead mic
   in the first ten seconds kills the demo, so we do not depend on it.
2. **Literal execution is sacred.** She composes an ordered plan of action tokens, then presses
   go. The character auto-advances on its own and, at each event point in order, performs the next
   action in her plan. It does *exactly* her ordered actions, in order, no autocorrect, no "what she
   probably meant." A wrong action, or the right actions in the wrong order, fails visibly at that
   event point (stumble, splash). That gap between what she meant and what she said is the debugging
   lesson, felt before it has a name. See Core mechanic below.
3. **Growth over engagement.** No streaks, no timers, no leaderboards, no time-on-app pressure.
   Those are the engagement traps this role is skeptical of. Progression is mastery-gated: each
   level introduces exactly one new idea and unlocks only after she demonstrates the previous one.
4. **Claude is the partner brain, behind one seam.** A single function decides what to say,
   what to scaffold, and when to introduce the next idea, given her attempt history. It has a
   local deterministic stub so the app runs offline for dev and demo, and a real server-side
   Claude API implementation for production. The UI never changes when you swap them.
5. **The partner lives inside the play, not in a Q&A box.** It mostly reacts, narrates, and offers
   the right tool at the right moment. It asks at most one short question, and only when the
   question itself moves her forward. No interrogation, no relentless Socratic questioning. (Khan
   Academy's Khanmigo was pedagogically sound and still saw early uptake its own founder called a
   "non-event"; under-8s find constant questioning frustrating. For pre-readers the teaching has to
   be woven into embodied play, not delivered as dialogue.)
6. **Touch-first, runs on tablet and laptop.** One responsive build, touch primary, pointer as a
   free fallback. Big targets, visible focus, reduced-motion respected, fully playable with audio
   off.

## Core mechanic (the interpreter contract)

The character walks itself. There is no walk or advance token, because on a path with a walk token
walking is busywork and the only real decision is where the special action goes. Removing it makes
every token she places a genuine decision and makes the literal-execution lesson sharper.

- A level is an ordered list of **event points**, each with a required action type: gap needs jump,
  branch needs duck, step needs climb, and later key needs grab, gate needs open.
- Her plan is an ordered list of action tokens. On go, the character advances and consumes the next
  token at each event point in turn. Match passes that point; mismatch fails there, visibly, and
  stops. Clearing every point and reaching the goal wins.
- A clean solve is exactly one correct token per event point, in order. Too few tokens and she runs
  out at an unhandled point; extra tokens are visible redundancy that the mastery rule can read.
- This is **plan-first, then run.** No real-time or twitch input while the character moves. It is
  deliberately not a runner game: tapping an action as the character arrives would erase the plan
  and with it the literal-execution lesson, the whole point.
- **No turn or rotate tokens.** Perspective-taking (left and right flip when the character faces
  her) is the single hardest thing for ages 3-5 in the robot-coding research, and it would
  reintroduce exactly the confusion this mechanic is designed to remove.

## Theme system (the connection layer)

A theme is a **data-driven asset pack over one shared mechanic engine**. Adding a theme is adding
data, never forking engine logic. Each pack defines: the hero, the auto-walk animation, the
event-point types and their matching action visuals (gap/jump, branch/duck, step/climb, and later
key/grab, gate/open), the goal, the environment and palette, the celebration, and optional voice
flavor words.

Ship 5 to 6 original archetypes, for example: royal/castle, fashion and style, cute animals,
trucks and diggers, space, dinosaurs. **Use original generic archetypes only. No branded or
trademarked characters (no Barbie, no Disney princesses, no licensed IP).** Generate or draw your
own art. This is a public deployed prototype an Anthropic reviewer will open.

The theme picker is the only thing before play: a fast, fully visual, one-tap grid of big theme
tiles, no reading required. One tap drops straight into Level 1 mid-scene. Do not build any other
homescreen or front door.

## The capability ladder (mastery-gated levels)

Theme-agnostic levels, reskinned by the chosen pack. Each adds one idea, gated on the prior.

- **L1 Sequence.** Short path, one or two event points of different types (a gap then a step).
  Actions: jump, duck, climb. Lesson: the right action goes at the right point, and the character
  does exactly what you said.
- **L2 Debugging.** Same tokens, an event-point order almost everyone gets wrong on the first try
  (right actions, wrong order), so the revise loop is the whole lesson. The partner treats the
  stumble as information, never as failure.
- **L3 Iteration.** Several identical event points in a row, so repeating the same token gets
  tedious and a REPEAT (loop) token is offered at the exact moment it would help, then folds the
  run into one chip.
- **L4 Decomposition.** Two dependent event points: grab the key, then open the gate. Wrong order
  fails.
- **L5 Cause and effect (stretch, optional).** The gate stays locked unless the key was grabbed
  earlier (requires carrying state). Keep it gentle; mark optional if it tests too old for a
  five-year-old.

Define an explicit, simple **mastery rule** per level (for example: the correct action at every
event point, in order, with no redundant tokens, within N attempts). Mastery, not time, unlocks the
next level.

## Knowledge anchors (what actually has to persist)

The point at this age is not procedural skill, it is planting a few durable mental models she can
later attach formal learning to, and making the pursuit itself feel good so she forms an identity
around it. Pick a small fixed set of anchors and have the partner reinforce each one with the
*same simple words and the same image every time*, so it becomes a portable thing she carries out
of the app. Suggested anchors, each tied to the concept it seeds and the tool it hands off to:

- **"It does exactly what you say."** Seeds literal execution and the debugging mindset. The root
  anchor; everything else hangs off it.
- **"Steps happen in order."** Seeds sequence. Maps to script order in ScratchJr.
- **"You can bundle steps and do them again."** Seeds iteration. Maps to the ScratchJr repeat block.
- **"When it's wrong, find the wrong step and fix it."** Seeds debugging and decomposition.

Each level should plant or reinforce exactly one anchor, in the same order as the ladder. Keep the
phrasing childlike and unchanging; consistency is what makes it stick.

A note for the write-up so it survives scrutiny: frame this as building durable schemas and
vocabulary that later formal learning attaches to (transfer), not as a neurological "critical
window." The schema-and-transfer claim is defensible; a hard critical-period claim about coding is
not.

## Graduation, not retention (the gateway)

This tool is an on-ramp, not a destination. Its win condition is that she outgrows it. Design for
handoff:

- The anchors above are deliberately chosen to map onto the next tools, so the transfer is real:
  this tool, then **ScratchJr** (~5-7), then **Scratch** or a **KIBO**-style robot later.
- When her mastery signals top out (she is solving new level types first-try with few prompts),
  the app surfaces a short, parent-facing **readiness handoff**: "She's formed these ideas
  (anchors), in plain language, and she's ready for ScratchJr." Optionally an exportable one-page
  summary of what she built.
- This is the capability-over-engagement thesis made literal: most kids' apps are engineered to
  retain. Success here is measured partly by how cleanly the child *leaves* for a more powerful
  tool. Say that plainly in the rationale; it is the sharpest possible answer to a team skeptical
  of time-on-site.

## The partner brain (spec the interface, then implement twice)

A single async function:

```
partnerStep(context) -> { say, scaffold, introduceConcept, celebrate }
context = { theme, level, conceptsKnown, currentPlan, lastOutcome, attemptsThisLevel, recentHistory }
```

- **localStub**: deterministic branching, offline, used for dev and the no-network demo.
- **claudeBrain**: a server-side call to the Anthropic API (keep the key off the client). Its
  system prompt makes it a warm, patient partner for a young child: short simple spoken sentences;
  it lives inside the play (it reacts, narrates, and offers the right tool at the right moment)
  rather than running a Q&A; it asks at most one short question and only when it moves her forward;
  it never shames a mistake and treats the hazard as information; and it reinforces the current
  knowledge anchor with the same fixed words every time. Its readiness decision (whether to
  introduce the next idea or unlock the next level) is driven by the capability signals below, not
  by elapsed time or raw attempt count.
- Select the implementation by env var. The interface and UI are identical for both.
- Spoken output via the Web Speech API (`speechSynthesis`), short utterances, with a mute toggle.
  Speak on a tap so autoplay rules do not block it.

## Capability telemetry (the success measure)

Instrument four concrete signals per level, and have the partner's readiness decision read from
them (not from time or raw attempt count):

1. **Transfer.** Does she solve a *novel* level type she was not walked through?
2. **Prompt-fade.** Average partner interventions per solved level, trending down over time.
3. **Unaided first-try correctness** on a held-out concept she has not been prompted on.
4. **Self-initiated debugging.** Does she re-run and edit a wrong plan without being told to?

Local persistence is fine for n=1 testing. Keep a parent-tappable "explained it back to me" flag,
and surface a simple grown-ups dashboard. These four are the growth signals the write-up cites,
and they are what feed the readiness handoff in the gateway section above. Explicitly do not log or
optimize time-on-app.

## Tech and structure

- React + TypeScript + Vite, deployable to Vercel, Netlify, or Railway.
- Separate engine from data: `/engine` (mechanic, pure interpreter, mastery rules), `/themes`
  (data packs and assets), `/partner` (localStub and claudeBrain behind one interface),
  `/telemetry`, `/ui`.
- The interpreter is theme-agnostic and pure, so it is unit-testable. Write tests for the
  interpreter and the mastery gates.
- Accessibility floor: targets >= 64px, visible keyboard focus, reduced-motion, sufficient
  contrast, fully playable with audio off.

## Build order (each milestone runs)

1. Engine plus L1 with one theme, localStub partner, touch action-tokens, auto-advance with the
   ordered action queue consumed at each event point, fail-at-point and win, splash/stumble.
2. Theme system: extract that scene into a data pack, add three more packs and the visual picker.
3. Mastery gating plus L2, L3 (loop at moment of need), L4.
4. Partner seam: localStub first, then wire claudeBrain server-side. Keep the transcript.
5. Telemetry plus grown-ups dashboard. Then motion, sound, polish.

## Guardrails

- No mic, no reading, no typing, no account, no ads, no streaks or timers.
- No walk token, no real-time input, no runner mechanic. Plan-first, then run.
- No turn or rotate tokens.
- Never fork engine logic per theme.
- Never add autocorrect to the interpreter; never gate progression on time or raw attempt count.
- Failure is never a dead end. Every wrong plan is a revise, with the partner offering one good
  nudge, not handing over the answer.

## For the write-up (Option B rationale)

Lead with: one new idea per level, mastery-gated; literal execution as the debugging teacher;
theme choice for intrinsic connection; Claude as the adaptive partner deciding what to scaffold
next; and the pre-literate learner as the limit case that generalizes to capability building for
anyone who cannot yet ask the right question.

Then add the three points the research sharpened:

- **Anchors over activities.** The goal is durable mental models and shared vocabulary she carries
  forward, grounded in transfer, not a neurological critical-window claim.
- **Designed to graduate, not to retain.** Success includes the clean handoff to ScratchJr and
  beyond. The opposite of an engagement loop.
- **Embedded in play, mic-free by choice.** Not a Socratic chat box (the Khanmigo lesson), and no
  always-on microphone on a small child (reliability plus a real safety and privacy posture, given
  documented AI-toy incidents).

State the novelty as a precise combination, not a blanket absence: no existing tool unites a live
LLM teaching partner, genuinely pre-literate coding, literal-execution debugging, and
mastery-gated engagement-free progression. Pre-empt the near-misses by name (Kodable CatBot is the
right idea at the wrong age, Buddy.ai is the right paradigm for the wrong subject, Synthesis is the
right adaptivity for the wrong subject).
