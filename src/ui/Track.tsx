import { useRef, useState } from 'react';
import type { Level, Step, Token } from '../engine/types';
import type { HeroPose, ThemePack } from '../themes/types';

interface TrackProps {
  theme: ThemePack;
  level: Level;
  heroIndex: number;
  activeStep: Step | null;
  celebrate: boolean;
  reducedMotion: boolean;
  /** A queued "show what this step does" demo, keyed so it replays on every tap. */
  preview: { token: Token; id: number } | null;
}

/** The scene: a backdrop, a left-to-right row of tiles, and the hero moving across it. */
export function Track({ theme, level, heroIndex, activeStep, celebrate, reducedMotion, preview }: TrackProps) {
  const n = level.tiles.length;
  const cell = 100 / n; // each tile is an equal share of the width
  const heroLeft = Math.min(heroIndex, n - 0.6) * cell;

  // Pose follows the state; motion class drives the hop/leap/idle/cheer animation.
  const pose: HeroPose = celebrate
    ? 'cheer'
    : activeStep?.event === 'SPLASH'
      ? 'splash'
      : activeStep
        ? activeStep.token === 'LEAP'
          ? 'leap'
          : 'hop'
        : 'idle';
  const motion = celebrate ? 'cheer' : activeStep ? (activeStep.token === 'LEAP' ? 'leap' : 'adv') : 'idle';
  const heroKey = celebrate ? 'cheer' : activeStep ? `s${activeStep.index}` : 'idle';
  const idle = !activeStep && !celebrate && !preview;

  // Transient scene-interaction effects (re-keyed counters replay one-shot animations).
  const [petKey, setPetKey] = useState(0);
  const [petting, setPetting] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const petTimer = useRef<number | null>(null);

  const pet = () => {
    setPetKey((k) => k + 1);
    setPetting(true);
    if (petTimer.current) window.clearTimeout(petTimer.current);
    petTimer.current = window.setTimeout(() => setPetting(false), 520);
  };

  return (
    <div className={`track${reducedMotion ? ' reduced' : ''}${celebrate ? ' won' : ''}`}>
      <div className="scene-backdrop">{theme.backdrop()}</div>

      <button
        type="button"
        className={`sun${pokeKey > 0 ? ' poke' : ''}`}
        key={`sun-${pokeKey}`}
        onClick={() => setPokeKey((k) => k + 1)}
        aria-label="Poke the sun"
      >
        {theme.sun()}
      </button>

      <div className="tiles">
        {level.tiles.map((kind, i) =>
          kind === 'HAZARD' ? (
            <div className="tile" key={i}>
              <button
                type="button"
                className="tile-interactive"
                onClick={() => setRippleKey((k) => k + 1)}
                aria-label="Splash the water"
              >
                {theme.tileArt[kind]()}
                {rippleKey > 0 && <span className="ripple" key={rippleKey} />}
              </button>
            </div>
          ) : (
            <div className="tile" key={i}>
              {theme.tileArt[kind]()}
            </div>
          ),
        )}
      </div>

      {celebrate && !reducedMotion && (
        <div className="win-burst" style={{ left: `${level.goalIndex * cell}%`, width: `${cell}%` }} aria-hidden="true" />
      )}

      <div className="hero-shadow" style={{ left: `${heroLeft}%`, width: `${cell}%`, opacity: preview ? 0 : 1 }}>
        <span className="shadow-ellipse" />
      </div>

      {/* The real hero hides during a preview so the translucent ghost reads as "the bunny showing you." */}
      <div
        className={`hero${idle ? ' clickable' : ''}${petting ? ' petting' : ''}`}
        style={{ left: `${heroLeft}%`, width: `${cell}%`, opacity: preview ? 0 : 1 }}
        onClick={idle ? pet : undefined}
        role={idle ? 'button' : undefined}
        aria-label={idle ? 'Pet the bunny' : undefined}
      >
        <div className={`hero-inner ${motion}`} key={heroKey}>
          {theme.heroPose(pose)}
        </div>
      </div>

      {petKey > 0 && (
        <div className="hearts" key={`hearts-${petKey}`} style={{ left: `${heroLeft}%`, width: `${cell}%` }} aria-hidden="true">
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
        </div>
      )}

      {/* A puff of dust at the feet when a hop/leap lands on a stone. */}
      {activeStep && activeStep.event !== 'SPLASH' && !reducedMotion && (
        <div className="dust" key={`dust-${activeStep.index}`} style={{ left: `${heroLeft}%`, width: `${cell}%` }} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}

      {preview && (
        <div className="ghost" key={preview.id} style={{ left: `${level.startIndex * cell}%`, width: `${cell}%` }}>
          <div className={`ghost-inner ${preview.token === 'LEAP' ? 'jump' : 'hop'}`}>
            {theme.heroPose(preview.token === 'LEAP' ? 'leap' : 'hop')}
          </div>
        </div>
      )}

      {celebrate && (
        <div
          className="overlay celebrate"
          style={{ left: `${level.goalIndex * cell}%`, width: `${cell}%` }}
        >
          {theme.celebration()}
        </div>
      )}
    </div>
  );
}
