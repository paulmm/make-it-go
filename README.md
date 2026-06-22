<div align="center">

# 🐇 Make It Go

### A no‑reading, no‑typing coding game for ages 3–7

Tap picture‑tokens to build a plan, press **go**, and the character does *exactly* what you said.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![tests](https://img.shields.io/badge/tests-128%20passing-3FB950)
![input](https://img.shields.io/badge/input-taps%20only-FF6B9D)

### ▶ [**Play it live → makeitgo.org**](https://www.makeitgo.org/)

![Make It Go — a bunny meadow level: a partner speech bubble, a path with a water gap, a carrot goal, and a tray of picture-tokens](docs/media/hero.png)

</div>

---

## What is this?

**Make It Go** teaches a child who *can't read yet* the core intuitions of programming — through play. She picks a theme, then solves a ladder of short challenges that get harder **one idea at a time**: sequence, literal execution (debugging), iteration, decomposition. A warm AI partner talks her through it by voice and decides when she's ready for the next idea.

Success is measured by **capability gained, never time on app**. The win condition is that she *outgrows it* and graduates to ScratchJr and beyond. The name says the loop: she builds a plan, taps **go**, and the character does exactly what she said.

## Why I'm building this

I have two kids — **Zoe** (2½) and **Autumn** (5). When I went looking for games to build the *foundation* under coding — sequence, cause and effect, "it does exactly what you say" — I found a surprisingly big gap: lots of flash, very little that genuinely builds capability at this age, before reading. So I started building the thing I actually wanted for Zoe and Autumn.

Underneath the play there's a real question I want to answer:

> **Can an AI partner make a pre‑literate child _more capable_ — by building on what she already knows, instead of marching her down a fixed path?**

That's the experiment. The app is the instrument; **the finding is the point.**

📄 **[Read the full write‑up →](docs/writeup.md)** — how Make It Go turns AI‑assisted play into active, capability‑building learning.

## What makes it different

- 🚫 **No reading, no typing, no microphone.** Input is large picture‑tokens she taps. Voice is output only.
- 🎯 **Literal execution is the lesson.** Her ordered plan runs exactly as written — a wrong action fails *visibly* (a stumble, a splash). The gap between what she meant and what she said *is* the debugging lesson. No autocorrect, ever.
- 🌱 **Growth over engagement.** No streaks, no timers, no leaderboards. Progress is mastery‑gated — each level unlocks only after the last idea is demonstrated.
- 🗣️ **A partner inside the play.** It reacts, narrates, and offers the right tool at the right moment — never an interrogation, never shame for a mistake.
- 📱 **Touch‑first**, runs on tablet and laptop, fully playable with audio off.

## How it plays

The character **walks itself** — walking is free, never something she programs. A level is a path of **event points**, each needing one action (a gap → jump, a branch → duck, a step → climb; later a key → grab, a gate → open).

She lays out an ordered row of action tokens, then taps **go**. The character advances and, at each event point in turn, performs the next action in her plan:

> **match → pass · mismatch → fail right there, visibly · reach the goal → win**

It's **plan‑first, then run** — no twitch input, no runner mechanic. Just "say what to do, then watch it happen."

## The capability ladder

Each level plants or reinforces **exactly one** idea, in order, and is reskinnable by any theme.

| Level | Idea | Knowledge anchor |
|------:|------|------------------|
| **L1** | Sequence — the right move at the right spot (a gap → jump) | *"It does exactly what you say."* |
| **L2** | A second move — a branch to duck under | *(same anchor, new mapping)* |
| **L3** | Order — a gap **then** a step, right moves in order | *"Steps happen in order."* |
| **L4** | Iteration — a run of gaps, folded into one **repeat** chip | *"You can bundle steps and do them again."* |
| **L5** | Decomposition — grab the key, then open the gate (forget it → **locked**) | *"When it's wrong, find the wrong step and fix it."* |
| **L6–L9** | Combine them — the whole dance, a fold inside a run, carry a key past a hazard, a capstone | *(all four, reinforced)* |

Then she enters **endless, never‑memorized practice**: levels are *generated*, not authored (and validated against the interpreter so they're always solvable), with the order shuffled so the action *sequence* can't be memorized — and the partner aims each one at the skill she's **least developed**. That's the transfer test made real: can she solve a level no one walked her through?

Anchors are spoken in the **same childlike words every time** — that's what makes them stick — and map straight onto ScratchJr (script order, the repeat block) for the handoff.

## A look around

| The only front door | Iteration: fold many into one | Cause & effect |
|---|---|---|
| ![Choose your character — six original characters in a grid: bunny, fox, dino, princess, truck, astronaut](docs/media/picker.png) | ![Four jumps folded into a single repeat chip](docs/media/repeat.png) | ![The bunny at a locked gate, having walked past the key](docs/media/locked.png) |

As the partner speaks, **each word grows in time with the voice** — an early‑reading cue that ties the sound to the written word:

![A partner line with the word being spoken enlarged and highlighted in pink](docs/media/karaoke.png)

## Tech

React 18 · TypeScript · Vite · Vitest. The interpreter is **pure and theme‑agnostic** — fully unit‑tested (128 tests), with no engine logic ever forked per theme.

```
src/
  engine/      pure interpreter, mastery rules, levels, level generator, anchors  (tested)
  themes/      data-only packs over one engine (6: meadow, fox, dino, royal, trucks, space)
  partner/     the "partner brain" behind one seam — local stub + server-side Claude (Sonnet)
  narration/   ElevenLabs voice + karaoke word-timing, cached on-device (Web Speech fallback)
  telemetry/   capability signals — never time-on-app
  ui/          picker, track, plan strip, token tray, runner, grown-ups dashboard
```

A **theme is just data** — a hero, its poses, the obstacle/action art, a palette. Adding one is adding a pack, never touching the engine.

## Getting started

```bash
git clone https://github.com/paulmm/makeitgo.git
cd makeitgo
npm install
npm run dev          # open the printed localhost URL
npm test             # the engine + partner test suite
```

**Keys (optional).** Out of the box the partner is a deterministic local stub with the browser's built‑in voice. For the full experience — the Claude partner and the warm ElevenLabs voice with word‑level highlighting — add keys to `.env.local`. They're read server‑side and never shipped to the browser:

```bash
# .env.local  (gitignored)
ANTHROPIC_API_KEY=your_key_here     # the Claude partner (defaults to Sonnet)
ELEVENLABS_API_KEY=your_key_here    # the warm voice + karaoke highlighting
# optional: ANTHROPIC_MODEL, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID
```

## Non‑negotiables

No mic · no reading · no typing · no accounts · no ads · no streaks or timers · no walk token · no real‑time input · no turn/rotate tokens · the interpreter is never autocorrected · progression is never gated on time or attempt count. **Failure is never a dead end** — every wrong plan is a revise, with one good nudge from the partner, never the answer.

## Status

Deployed and playable at **[makeitgo.org](https://www.makeitgo.org)** (Vercel: `makeitgo-zoe.vercel.app`) — also installable as a full‑screen Android app. Shipped since the first cut:

- ✅ Six original theme packs (meadow, fox, dino, royal, trucks, space)
- ✅ Server‑side Claude partner (Sonnet) — warm, honest, readiness‑aware
- ✅ Grown‑ups dashboard + a "ready for ScratchJr" handoff
- ✅ ElevenLabs voice with karaoke highlighting, cached on‑device (instant replay, no repeat cost)
- ✅ A nine‑rung ladder → **endless adaptive practice** that aims each generated level at her weakest skill

**On the horizon:** Claude as the difficulty *director* (vs. the local one); per‑theme partner flavor; a parent‑facing readiness write‑up; a Play Store listing.

## License

Not licensed yet. MIT is a good fit for a tool meant to be outgrown and shared — add a `LICENSE` file before making the repo public.

---

<div align="center">
<sub>Built to be outgrown. 🐇 → 🦊 → ScratchJr → the world.</sub>
</div>
