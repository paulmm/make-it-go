import { useCallback, useEffect, useRef, useState } from 'react';
import type { Step, Trace } from '../engine/types';

export interface Runner {
  heroIndex: number;
  activeStep: Step | null;
  /** Animate a trace step-by-step, then call onDone. */
  play: (trace: Trace, onDone: () => void) => void;
  /** Stop any run and place the hero at a tile. */
  reset: (index: number) => void;
}

/**
 * Drives the visible, literal execution: the hero moves one step at a time, in
 * order, so a wrong plan is seen happening. The interpreter already decided the
 * outcome; this only paces it for the eye.
 */
export function useRunner(startIndex: number, stepMs: number): Runner {
  const [heroIndex, setHeroIndex] = useState(startIndex);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(
    (index: number) => {
      clearTimers();
      setActiveStep(null);
      setHeroIndex(index);
    },
    [clearTimers],
  );

  const play = useCallback(
    (trace: Trace, onDone: () => void) => {
      clearTimers();
      setActiveStep(null);
      setHeroIndex(trace.steps[0]?.fromIndex ?? startIndex);
      trace.steps.forEach((step, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setActiveStep(step);
            setHeroIndex(step.toIndex);
          }, i * stepMs + 60),
        );
      });
      timers.current.push(window.setTimeout(onDone, trace.steps.length * stepMs + 60));
    },
    [clearTimers, startIndex, stepMs],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return { heroIndex, activeStep, play, reset };
}
