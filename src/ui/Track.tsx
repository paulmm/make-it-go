import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Level } from '../engine/types';
import type { HeroPose, ThemePack } from '../themes/types';
import type { RunnerGeometry } from './useRunner';
import { LevelBadge } from './LevelBadge';

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
  /** Optional overlay rendered on top of the scene (the post-win choices). */
  winChoices?: ReactNode;
}

/** The scene: a backdrop, the obstacles at their event points, and the hero auto-walking. */
export function Track({ theme, level, levelNumber, geo, heroX, heroPose, heroMs, tick, celebrate, reducedMotion, winChoices }: TrackProps) {
  const [petKey, setPetKey] = useState(0);
  const [petting, setPetting] = useState(false);
  const [pokeKey, setPokeKey] = useState(0);
  const petTimer = useRef<number | null>(null);

  const idle = heroPose === 'idle' && !celebrate;
  const pet = () => {
    setPetKey((k) => k + 1);
    setPetting(true);
    if (petTimer.current) window.clearTimeout(petTimer.current);
    petTimer.current = window.setTimeout(() => setPetting(false), 520);
  };

  const at = (x: number) => ({ left: `${x * 100}%` });
  const move = { left: `${heroX * 100}%`, transition: `left ${heroMs}ms linear, opacity 0.18s ease` };

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
        <div className="obstacle-slot" key={i} style={at(geo.pointX[i])}>
          {theme.obstacleArt[kind]()}
        </div>
      ))}

      <div className="goal-slot" style={at(geo.goalX)} aria-hidden="true">
        {theme.goalIcon()}
      </div>

      {celebrate && !reducedMotion && <div className="win-burst" style={at(geo.goalX)} aria-hidden="true" />}

      <div className="hero-shadow" style={move}>
        <span className="shadow-ellipse" />
      </div>

      <div
        className={`hero${idle ? ' clickable' : ''}`}
        style={move}
        onClick={idle ? pet : undefined}
        role={idle ? 'button' : undefined}
        aria-label={idle ? 'Pet the bunny' : undefined}
      >
        <div className={`hero-inner ${heroPose}${petting ? ' petting' : ''}`} key={`${heroPose}-${tick}`}>
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
