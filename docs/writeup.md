# Make It Go — building capability, not completing tasks

*An AI learning partner for a child who can't read yet.*

> **The challenge.** Design a feature that helps people *actively learn and develop skills* while
> working with AI — develop real domain expertise, turn AI‑assisted work into learning, build
> deeper understanding through the interaction, and **grow capabilities, not just complete tasks.**

Make It Go answers that challenge at its hardest setting: the learner is three to seven years old
and **cannot read, type, or be handed an explanation.** If an AI partner can build genuine
capability *there* — with no text channel, no instructions, no way to "just tell her" — the same
design generalizes to anyone who can't yet ask the right question. The pre‑literate learner is the
limit case, not a niche.

---

## The wager

Looking for games that build the *foundation* under coding — sequence, cause and effect, "it does
exactly what you say" — I found flash and very little that genuinely builds capability before
reading. So the app is really an instrument for one question:

> **Can an AI partner make a pre‑literate child _more capable_ — by building on what she already
> knows, instead of marching her down a fixed path?**

The app is the instrument; **the finding is the point.**

---

## How it makes learning the point

Four design decisions do the work. None of them is "add an AI"; each is about *where* the AI sits.

**1. Literal execution is the teacher — not autocorrect.**
She builds an ordered plan of picture‑tokens and taps **go**. The character does *exactly* what she
said: a wrong action fails visibly — a stumble, a splash, a gate that won't open. The gap between
what she *meant* and what she *said* is the entire debugging lesson, and it is never smoothed over.
The interpreter is pure and has no "what she probably meant" path. Most edtech removes failure to
protect engagement; here, failure **is** the information, and the partner treats it that way.

**2. One new idea per level, gated by mastery — never by time.**
The taught ladder introduces exactly one anchor at a time — *sequence → debugging → iteration →
decomposition* — and a level unlocks only when the prior idea is demonstrated. There are no
streaks, timers, or leaderboards. Progress is *capability gained*, and the anchors are spoken in the
**same childlike words every time** ("It does exactly what you say"), so what she carries forward is
a durable mental model and shared vocabulary — anchors over activities — that maps straight onto
ScratchJr for the handoff.

**3. The AI coaches; it never does the task.**
A warm, patient partner (Claude) lives *inside the play*. It reads the actual outcome and is
honest about it — it never claims she succeeded when she stumbled. It offers exactly one good nudge
at the moment of need and **withholds the answer**: the first time she's stuck it wonders aloud what
that spot needs; only after repeated tries does it name the move. Discovering the right action is
the lesson, so the AI's job is to *scaffold the discovery*, not to supply it. It's embedded in play,
not a Socratic chat box — and deliberately microphone‑free, because an always‑on mic on a small
child is the wrong safety and privacy posture.

**4. After the ladder, endless practice that targets what she hasn't mastered.**
Once she clears the taught levels she enters generated practice: levels are *composed, not
authored*, validated against the interpreter so they're always solvable, with the obstacle order
shuffled so the action **sequence can't be memorized**. A director reads her capability signals and
aims each new level at her least‑developed skill — foundation, then debugging, then transfer, then
independence, then stretch. This is the AI as a *coach choosing the next drill*, and it is the
clearest expression of "grow capabilities, not complete tasks": the win is solving a level **no one
walked her through.**

---

## Mapping to the four criteria

| The criterion | How Make It Go delivers it |
|---|---|
| **Develop real domain expertise** | She isn't memorizing levels — she's exercising the *concepts* of programming (sequence, order, iteration, decomposition, cause‑and‑effect) in forms she's never seen. Order‑shuffling and generated practice force the idea, not the rote answer. |
| **Turn AI‑assisted work into learning** | Every wrong plan becomes a debugging rep. The hazard is information; the partner turns the mistake into the lesson instead of fixing it for her. Difficulty is paced by mastery, keeping her at the edge of her ability — deliberate practice. |
| **Build deeper understanding through AI interaction** | The partner reinforces the same anchor in fixed words, asks at most one question, and fades its prompts as she improves. Understanding is built by *interacting with a coach*, not by being lectured. |
| **Grow capabilities, not complete tasks** | Instrumented directly: four capability signals — **transfer** (solves a novel level unaided), **prompt‑fade** (fewer nudges over time), **unaided first‑try correctness**, and **self‑initiated debugging** (re‑runs and fixes a wrong plan without being told). When they top out, the app recommends the *next tool*. |

---

## Designed to graduate, not to retain

The opposite of an engagement loop: success is that she **outgrows this and moves on.** The
grown‑ups view never shows time‑on‑app — only what she *can do* — and when the capability signals
top out it surfaces a "ready for ScratchJr" handoff. A tool built to be left behind has very
different incentives from one built to keep her, and those incentives are visible in every choice:
no streaks, no rewards treadmill, a deliberate off‑ramp.

---

## Why this combination is new

The novelty is a *precise combination*, not a blanket absence. No existing tool unites all four of:
a **live LLM teaching partner**, genuinely **pre‑literate** coding, **literal‑execution debugging**,
and **mastery‑gated, engagement‑free** progression. The near‑misses are instructive:

- **Kodable (CatBot)** — the right idea at the wrong age (assumes reading).
- **Buddy.ai** — the right paradigm (a warm AI tutor for young children) for the wrong subject (language, not computational thinking).
- **Synthesis** — the right adaptivity for the wrong subject and an older child.

Make It Go sits exactly where those overlap but none land.

---

## Status

Deployed at **[makeitgo.org](https://www.makeitgo.org)** (installable as a full‑screen Android app):
six original theme packs, a nine‑rung ladder into endless adaptive practice, a server‑side Claude
partner (Sonnet), an ElevenLabs voice with word‑level highlighting cached on‑device, a grown‑ups
dashboard with the four capability signals, and a pure, fully unit‑tested interpreter. The
engineering posture mirrors the thesis: the engine is theme‑agnostic and never forked, the partner
sits behind one swappable seam, and the only thing gating progress is *demonstrated capability*.
