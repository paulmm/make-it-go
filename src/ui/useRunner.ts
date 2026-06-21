import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, EventKind, Trace } from '../engine/types';
import type { HeroPose } from '../themes/types';

/** Where things sit along the path, as fractions of the scene width (0..1). */
export interface RunnerGeometry {
  startX: number;
  goalX: number;
  pointX: number[];
}

interface RunnerState {
  heroX: number;
  heroPose: HeroPose;
  /** Transition duration (ms) for the hero's horizontal move. */
  heroMs: number;
  /** Point index currently being acted on (drives the plan-chip glow), else null. */
  activePoint: number | null;
  /** Increments every beat so the pose animation can replay via React key. */
  tick: number;
}

export interface Runner extends RunnerState {
  play: (
    trace: Trace,
    geo: RunnerGeometry,
    clean: boolean,
    failPose: Record<EventKind, HeroPose>,
    onDone: () => void,
  ) => void;
  reset: (startX: number) => void;
}

const POSE_FOR_ACTION: Record<Action, HeroPose> = { JUMP: 'jump', DUCK: 'duck', CLIMB: 'climb' };

/**
 * Drives the visible, literal execution under the auto-walk model: the hero walks
 * to each event point in order and performs the queued action — passing or stumbling.
 * The interpreter already decided the outcome; this only paces it for the eye.
 */
export function useRunner(reducedMotion: boolean): Runner {
  const [state, setState] = useState<RunnerState>({
    heroX: 0.08,
    heroPose: 'idle',
    heroMs: 0,
    activePoint: null,
    tick: 0,
  });
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(
    (startX: number) => {
      clear();
      setState({ heroX: startX, heroPose: 'idle', heroMs: 0, activePoint: null, tick: 0 });
    },
    [clear],
  );

  const play = useCallback(
    (
      trace: Trace,
      geo: RunnerGeometry,
      clean: boolean,
      failPose: Record<EventKind, HeroPose>,
      onDone: () => void,
    ) => {
      clear();
      const walkMs = reducedMotion ? 360 : 700;
      const actMs = reducedMotion ? 320 : 560;
      const cheerMs = reducedMotion ? 320 : 950;

      interface Beat {
        x: number;
        pose: HeroPose;
        ms: number;
        point: number | null;
        moves: boolean;
      }
      const beats: Beat[] = [];

      for (const step of trace.steps) {
        const px = geo.pointX[step.pointIndex];
        beats.push({ x: px, pose: 'walk', ms: walkMs, point: null, moves: true });

        if (step.result === 'PASS') {
          if (step.played === 'JUMP') {
            beats.push({ x: Math.min(px + 0.1, geo.goalX), pose: 'jump', ms: actMs, point: step.pointIndex, moves: true });
          } else {
            beats.push({ x: px, pose: POSE_FOR_ACTION[step.played as Action], ms: actMs, point: step.pointIndex, moves: false });
          }
        } else if (step.result === 'WRONG') {
          beats.push({ x: px, pose: POSE_FOR_ACTION[step.played as Action], ms: Math.round(actMs * 0.55), point: step.pointIndex, moves: false });
          beats.push({ x: px, pose: failPose[step.kind], ms: actMs, point: step.pointIndex, moves: false });
          break;
        } else {
          beats.push({ x: px, pose: failPose[step.kind], ms: actMs, point: step.pointIndex, moves: false });
          break;
        }
      }

      if (trace.outcome === 'WIN') {
        beats.push({ x: geo.goalX, pose: 'walk', ms: walkMs, point: null, moves: true });
        // Only a clean solve cheers; a redundant win just stands at the goal.
        beats.push({ x: geo.goalX, pose: clean ? 'cheer' : 'idle', ms: clean ? cheerMs : 480, point: null, moves: false });
      }

      let at = 0;
      beats.forEach((beat, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setState({
              heroX: beat.x,
              heroPose: beat.pose,
              heroMs: beat.moves ? beat.ms : 0,
              activePoint: beat.point,
              tick: i + 1,
            });
          }, at),
        );
        at += beat.ms;
      });
      timers.current.push(window.setTimeout(onDone, at));
    },
    [clear, reducedMotion],
  );

  useEffect(() => clear, [clear]);

  return { ...state, play, reset };
}
