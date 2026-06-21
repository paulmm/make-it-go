# Re-architecture plan — event-point / auto-walk mechanic

- Date: 2026-06-21
- Status: Approved in conversation; engine rewrite is the next step. No code changed yet.
- Supersedes the advance/leap tile model built in milestone 1.

## Why

In the advance/leap model most tokens are busywork (the plan is "walk, jump, walk");
the only real decision is where the leap goes, the wrong answer is a counting error,
and L2 (Debugging) is awkward to build as a clean "wrong order" lesson. The event-point
model makes every token a genuine decision, makes "right actions, wrong order" the
natural L2 failure, fits 3–5 (matching an action to an obstacle, no perspective-taking),
and maps more cleanly to real code and to the anchors. We are at milestone 1, so the
rewrite is cheap and lands M2/M3 on a better foundation.

## Keep the bunny

Meadow is theme #1 under the new mechanic. Most sprites are reused; we add ~3 poses.
- **Reuse:** `idle`, `cheer` (win), `splash` (→ water-gap stumble), `sun`, `hand`,
  `carrot` (goal), backdrop. `hop` → the auto-walk gait; `leap` → the JUMP action;
  `stone` → the "step" obstacle (climb); `water` → the "gap" obstacle (jump).
- **Generate:** `duck` pose, `climb` pose, generic `stumble` pose, one low-`branch`
  obstacle. Later (L4): `grab`/`open` poses + key/gate props.

## New engine contract (`/engine`, rewritten test-first)

```
Action    = 'JUMP' | 'DUCK' | 'CLIMB'      // L1; later GRAB, OPEN
EventKind = 'GAP'  | 'BRANCH' | 'STEP'      // later KEY, GATE
required: GAP->JUMP, BRANCH->DUCK, STEP->CLIMB (theme-agnostic, 1:1)

Level   = { id, points: EventKind[], allowedActions: Action[], anchorId, mastery, optimalTokens }
Outcome = 'WIN' | 'STUMBLE' | 'INCOMPLETE'
run(level, plan: Action[]) -> Trace   // pure, unit-tested
```

Interpreter: the character auto-walks; for each point i in order, consume `plan[i]` —
match → pass; wrong action → STUMBLE at i and stop; no token left → ran out at i
(stumble). All points cleared → WIN. Trailing tokens = redundancy (telemetry). Simpler
than the tile interpreter (no geometry, no fell-off). No autocorrect, ever.

## Level 1 (concrete)

- A **single event point** (a gap), with **at least two action types on the tray**
  (jump, climb) so the choice is real. The one new idea is *picking the right action* —
  no ordering yet.
- Clean solve: `[JUMP]`. Wrong choice: `[CLIMB]` → stumble at the gap.
- Anchor: `exactly-what-you-say` (the root: it does the action you chose).
- The two-obstacle, right-tokens-wrong-order stumble moves to **L2** (that is L2's new
  idea — order matters), keeping one-new-idea-per-level.

## UI / Track

Auto-walk along a continuous path with obstacles at the event points. Token tray
becomes jump / duck / climb (bunny-doing-the-action icons, same style). Carried over
untouched: plan-as-sequence, chip-sync glow, eased pacing, tap-preview, pet/poke/ripple,
on-stump positioning approach, a11y, voice.

## Themes & multi-theme

The 3 event-point types and 3 actions are universal; each theme supplies its hero's
jump/duck/climb art and obstacle visuals — engine never forks. e.g. trucks/diggers:
gap→bounce, low bridge→lower ("duck"), ramp→climb. New theme = one data pack + a sprite
set through the existing generator. The visual picker (the only front door) ships with
the second theme in M2.

## Reuse vs redo

- **Reused untouched:** partner seam + localStub (reworded outcomes), telemetry,
  a11y/CSS, anchors, voice, tech structure, theme-as-data architecture, sprite pipeline,
  most meadow sprites.
- **Redone:** `/engine` (types/interpreter/mastery — gets simpler), L1 data, token-tray
  icons, Track (auto-walk + event points), ~3 new bunny poses + 1 obstacle.

## Order of operations

1. Rewrite `/engine` test-first (Action/EventKind/run + mastery).
2. Re-skin meadow + generate the 3 new poses/branch.
3. Rebuild Track for auto-walk + event points; re-apply the polish.
4. Verify (tests + drive + screenshots). Commit.
5. Then M2 (picker + 2nd theme), M3 (L2–L4).

## Resolved decisions

1. **L1 = a single event point** (gap) with ≥2 action types on the tray — the
   right-action choice, no ordering. The two-point wrong-order stumble is L2.
2. **L1 mastery = reach-the-goal** (all points cleared), redundancy as telemetry,
   unlimited attempts. (The "no redundant tokens" bar becomes L3's efficiency gate.)

## Checkpoint

Stop after the `/engine` rewrite and review the interpreter + passing tests before
building Track and art on top.
