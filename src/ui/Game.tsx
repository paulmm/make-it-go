import { useCallback, useEffect, useRef, useState } from 'react';
import { run } from '../engine/interpreter';
import { evaluateMastery } from '../engine/mastery';
import { bundleTail, expandPlan, usedBundle } from '../engine/plan';
import type { Action, Level, PlanToken } from '../engine/types';
import { partner } from '../partner';
import type { PartnerResponse } from '../partner/types';
import { createRecorder } from '../telemetry/recorder';
import type { ThemePack } from '../themes/types';
import { Controls } from './Controls';
import { PartnerBubble } from './PartnerBubble';
import { PlanStrip } from './PlanStrip';
import { Track } from './Track';
import { TokenTray } from './TokenTray';
import { useReducedMotion } from './useReducedMotion';
import { useRunner } from './useRunner';
import type { RunnerGeometry } from './useRunner';
import { useNarration } from '../narration/useNarration';

const WORD_CUE: Record<Action, string> = {
  JUMP: 'Jump!',
  DUCK: 'Duck!',
  CLIMB: 'Climb!',
  GRAB: 'Grab the key!',
  OPEN: 'Open the gate!',
};
const REPEAT_CUE = 'Again and again!';

type Phase = 'building' | 'running' | 'result';

/** Each expanded action's source token index, so the right chip glows as the run plays. */
function pointToToken(plan: PlanToken[]): number[] {
  const map: number[] = [];
  plan.forEach((token, i) => {
    const copies = token.type === 'repeat' ? token.count : 1;
    for (let k = 0; k < copies; k++) map.push(i);
  });
  return map;
}

/** Place the start, the event points, and the goal along the path (fractions of width). */
function layout(level: Level): RunnerGeometry {
  const n = level.points.length;
  const first = 0.32;
  const last = 0.68;
  const pointX = n <= 1 ? [0.5] : level.points.map((_, i) => first + ((last - first) * i) / (n - 1));
  return { startX: 0.09, goalX: 0.92, pointX };
}

/** The whole play surface for one level. State machine: building -> running -> result. */
export function Game({
  theme,
  level,
  hasNext,
  onNext,
  onHome,
}: {
  theme: ThemePack;
  level: Level;
  hasNext: boolean;
  onNext: () => void;
  onHome: () => void;
}) {
  const [plan, setPlan] = useState<PlanToken[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [response, setResponse] = useState<PartnerResponse | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const recorder = useRef(createRecorder());
  const reducedMotion = useReducedMotion();
  const { speak, prime, unlock, muted, setMuted, supported, spokenText, activeWord } = useNarration();
  const runner = useRunner(reducedMotion);
  const geo = layout(level);
  const capacity = level.points.length; // one action per obstacle — no extras
  const expanded = expandPlan(plan); // what the interpreter actually runs
  const atCapacity = expanded.length >= capacity;
  // This level teaches iteration, so it offers the REPEAT tool that folds a run into a chip.
  const allowsRepeat = level.mastery.kind === 'bundle-to-goal';



  const requestIntro = useCallback(() => {
    partner({
      themeId: theme.id,
      nouns: theme.nouns,
      level,
      conceptsKnown: [],
      currentPlan: [],
      usedBundle: false,
      lastOutcome: null,
      lastTrace: null,
      attemptsThisLevel: recorder.current.attemptsFor(level.id),
      recentHistory: [],
    }).then((r) => {
      setResponse(r);
      speak(r.say, { track: true });
    });
  }, [theme, level, speak]);

  useEffect(() => {
    requestIntro();
    runner.reset(geo.startX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestIntro]);

  const backToBuilding = () => {
    setPhase('building');
    runner.reset(geo.startX);
  };

  const addToken = (action: Action) => {
    unlock();
    if (phase === 'running') return;
    setPlan((p) => (expandPlan(p).length >= capacity ? p : [...p, { type: 'action', action }]));
    setOnboarded(true);
    speak(WORD_CUE[action]);
    backToBuilding();
  };

  // The REPEAT tool: fold the tail of the plan into one bundle chip, or grow the bundle.
  const addRepeat = () => {
    unlock();
    if (phase === 'running') return;
    setPlan((p) => bundleTail(p, level.allowedActions[0], capacity));
    setOnboarded(true);
    speak(REPEAT_CUE);
    backToBuilding();
  };

  const removeAt = (index: number) => {
    unlock();
    if (phase === 'running') return;
    setPlan((p) => p.filter((_, i) => i !== index));
    backToBuilding();
  };

  const clearPlan = () => {
    unlock();
    if (phase === 'running') return;
    setPlan([]);
    backToBuilding();
    requestIntro();
  };

  const go = () => {
    unlock();
    if (phase === 'running' || plan.length === 0) return;
    const trace = run(level, expanded);
    const bundled = usedBundle(plan);
    const mastery = evaluateMastery(level, expanded, trace, { usedBundle: bundled });
    const recentHistory = recorder.current.outcomesFor(level.id);
    setPhase('running');

    // Decide the partner's reaction now and warm its audio while the hero runs, so the voice
    // is ready the instant the animation ends — no pause between the action and the line.
    const reaction = partner({
      themeId: theme.id,
      nouns: theme.nouns,
      level,
      conceptsKnown: mastery.mastered ? [level.anchorId] : [],
      currentPlan: expanded,
      usedBundle: bundled,
      lastOutcome: trace.outcome,
      lastTrace: trace,
      attemptsThisLevel: recorder.current.attemptsFor(level.id) + 1,
      recentHistory,
    });
    reaction.then((r) => prime(r.say));

    // A clean solve (no extra tokens) cheers; a redundant win just stands at the goal.
    runner.play(trace, geo, mastery.mastered, theme.failPose, () => {
      recorder.current.record({
        levelId: level.id,
        plan: expanded,
        outcome: trace.outcome,
        redundantTokens: mastery.redundantTokens,
      });
      reaction.then((r) => {
        setResponse(r);
        setPhase('result');
        speak(r.say, { track: true });
      });
    });
  };

  const scaffold = phase === 'result' ? response?.scaffold : undefined;
  const offerAction = scaffold?.kind === 'offer-action' ? scaffold.action : null;
  const offerRepeat = scaffold?.kind === 'offer-repeat';
  const celebrate = phase === 'result' && !!response?.celebrate;

  // The partner and runner speak in point indices; chips are tokens. Map across so a bundle
  // chip glows for every point it covers.
  const tokenMap = pointToToken(plan);
  const highlightStep = scaffold?.kind === 'highlight-step' ? scaffold.stepIndex : null;
  const highlightIndex = highlightStep == null ? null : tokenMap[highlightStep] ?? highlightStep;
  const executingPoint = phase === 'running' ? runner.activePoint : null;
  const executingIndex = executingPoint == null ? null : tokenMap[executingPoint] ?? null;

  return (
    <div
      className="game"
      style={{
        background: `linear-gradient(180deg, ${theme.palette.sky} 0%, ${theme.palette.ground} 100%)`,
        color: theme.palette.text,
      }}
    >
      <button type="button" className="home-btn" onClick={onHome} aria-label="Choose another character">
        <svg viewBox="0 0 24 24" aria-hidden="true" width="100%" height="100%">
          <path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 10.5V20h13v-9.5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 20v-5h4v5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <PartnerBubble
        text={response?.say ?? null}
        celebrate={celebrate}
        spokenText={spokenText}
        activeWord={activeWord}
      />
      <Track
        theme={theme}
        level={level}
        geo={geo}
        heroX={runner.heroX}
        heroPose={runner.heroPose}
        heroMs={runner.heroMs}
        tick={runner.tick}
        celebrate={celebrate}
        reducedMotion={reducedMotion}
      />
      <PlanStrip
        theme={theme}
        plan={plan}
        slotCount={capacity}
        highlightIndex={highlightIndex}
        activeIndex={executingIndex}
        disabled={phase === 'running'}
        onRemove={removeAt}
      />
      <TokenTray
        theme={theme}
        actions={level.allowedActions}
        offerAction={offerAction}
        disabled={phase === 'running' || atCapacity}
        allowsRepeat={allowsRepeat}
        offerRepeat={offerRepeat}
        repeatDisabled={phase === 'running'}
        hint={!onboarded}
        onAdd={addToken}
        onAddRepeat={addRepeat}
      />
      <Controls
        canGo={phase !== 'running' && plan.length > 0}
        canClear={phase !== 'running' && plan.length > 0}
        showReplay={celebrate && !hasNext}
        showNext={celebrate && hasNext}
        muted={muted}
        speechSupported={supported}
        onGo={go}
        onClear={clearPlan}
        onReplay={clearPlan}
        onNext={onNext}
        onToggleMute={() => setMuted((m) => !m)}
      />
    </div>
  );
}
