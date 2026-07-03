import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { EventKind, Level } from '../engine/types';
import type { HeroPose, ThemePack } from '../themes/types';
import type { RunnerGeometry } from './useRunner';
import { LevelBadge } from './LevelBadge';

/** Child-facing obstacle names — poking one is vocabulary practice for reading the path. */
const OBSTACLE_WORD: Record<EventKind, string> = {
  GAP: 'gap',
  BRANCH: 'branch',
  STEP: 'step',
  KEY: 'key',
  GATE: 'gate',
};

interface TrackProps {
  theme: ThemePack;
  level: Level;
  levelNumber: number;
  geo: RunnerGeometry;
  heroX: number;
  heroPose: HeroPose;
  heroMs: number;
  tick: number;
  celebrate: boolean;
  reducedMotion: boolean;
  /** False while the hero is executing a plan — every toy goes inert so she watches the run. */
  interactive: boolean;
  /** Speak a toy's line (e.g. "A gap!") — Track never talks to the narration system directly. */
  onPokeWord: (line: string) => void;
  /** Speak the theme's cry ("Beep beep!") — the pet-streak reward. */
  onCry: () => void;
  /** Optional overlay rendered on top of the scene (the post-win choices). */
  winChoices?: ReactNode;
}

/** The scene: a backdrop, the obstacles at their event points, and the hero auto-walking. */
export function Track({ theme, level, levelNumber, geo, heroX, heroPose, heroMs, tick, celebrate, reducedMotion, interactive, onPokeWord, onCry, winChoices }: TrackProps) {
  const [petKey, setPetKey] = useState(0);
  const [petting, setPetting] = useState(false);
  const [pokeKey, setPokeKey] = useState(0);
  const [poked, setPoked] = useState<{ index: number; seq: number } | null>(null);
  const [goalKey, setGoalKey] = useState(0);
  const petTimer = useRef<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  // Three pets, each within 1.5s of the last, earn a spin + the theme's cry. A hidden delight,
  // not a tracked streak — nothing is counted anywhere but here.
  const petStreak = useRef({ count: 0, last: 0 });

  const pokeObstacle = (index: number, kind: EventKind) => {
    setPoked((p) => ({ index, seq: (p?.seq ?? 0) + 1 }));
    onPokeWord(`A ${OBSTACLE_WORD[kind]}!`);
  };

  const idle = heroPose === 'idle' && !celebrate;
  const pet = () => {
    const now = Date.now();
    petStreak.current.count = now - petStreak.current.last <= 1500 ? petStreak.current.count + 1 : 1;
    petStreak.current.last = now;
    setPetKey((k) => k + 1);
    if (petTimer.current) window.clearTimeout(petTimer.current);
    if (petStreak.current.count >= 3) {
      petStreak.current.count = 0;
      setSpinning(true);
      onCry();
      petTimer.current = window.setTimeout(() => setSpinning(false), 800);
    } else {
      setPetting(true);
      petTimer.current = window.setTimeout(() => setPetting(false), 520);
    }
  };

  const at = (x: number) => ({ left: `${x * 100}%` });
  const move = { left: `${heroX * 100}%`, transition: `left ${heroMs}ms linear, opacity 0.18s ease` };

  // Repeated kinds get numbered labels so a screen reader can tell four gaps apart.
  const kindCounts = new Map<EventKind, number>();
  for (const p of level.points) kindCounts.set(p, (kindCounts.get(p) ?? 0) + 1);

  return (
    <div className={`track${reducedMotion ? ' reduced' : ''}${celebrate ? ' won' : ''}`}>
      <div className="scene-backdrop">{theme.backdrop()}</div>
      <LevelBadge number={levelNumber} theme={theme} />
      <div className="path" aria-hidden="true" />

      <button
        type="button"
        className={`sun${pokeKey > 0 ? ' poke' : ''}`}
        key={`sun-${pokeKey}`}
        onClick={() => setPokeKey((k) => k + 1)}
        aria-label="Poke the sun"
      >
        {theme.sun()}
      </button>

      {level.points.map((kind, i) => (
        <button
          type="button"
          // seq in the key remounts the poked slot so the animation replays on every tap
          key={poked?.index === i ? `ob-${i}-${poked.seq}` : `ob-${i}`}
          className={`obstacle-slot${poked?.index === i ? ` poke-${kind.toLowerCase()}` : ''}`}
          style={at(geo.pointX[i])}
          onClick={() => pokeObstacle(i, kind)}
          disabled={!interactive}
          aria-label={
            (kindCounts.get(kind) ?? 1) > 1
              ? `A ${OBSTACLE_WORD[kind]}, ${level.points.slice(0, i + 1).filter((p) => p === kind).length} of ${kindCounts.get(kind)}`
              : `A ${OBSTACLE_WORD[kind]}`
          }
        >
          {theme.obstacleArt[kind]()}
        </button>
      ))}

      <button
        type="button"
        key={`goal-${goalKey}`}
        className={`goal-slot${goalKey > 0 ? ' wiggle' : ''}`}
        style={at(geo.goalX)}
        onClick={() => setGoalKey((k) => k + 1)}
        disabled={!interactive}
        aria-label={`The ${theme.nouns.goal}`}
      >
        {theme.goalIcon()}
      </button>

      {celebrate && !reducedMotion && <div className="win-burst" style={at(geo.goalX)} aria-hidden="true" />}

      <div className="hero-shadow" style={move}>
        <span className="shadow-ellipse" />
      </div>

      <div
        className={`hero${idle ? ' clickable' : ''}`}
        style={move}
        onClick={idle ? pet : undefined}
        role={idle ? 'button' : undefined}
        aria-label={idle ? `Pet the ${theme.nouns.hero}` : undefined}
      >
        <div className={`hero-inner ${heroPose}${petting ? ' petting' : ''}${spinning ? ' spinning' : ''}`} key={`${heroPose}-${tick}`}>
          {theme.heroPose(heroPose)}
        </div>
      </div>

      {petKey > 0 && (
        <div className="hearts" key={`hearts-${petKey}`} style={{ left: `${heroX * 100}%` }} aria-hidden="true">
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
        </div>
      )}

      {celebrate && (
        <div className="overlay celebrate" style={at(geo.goalX)}>
          {theme.celebration()}
        </div>
      )}

      {winChoices}
    </div>
  );
}
