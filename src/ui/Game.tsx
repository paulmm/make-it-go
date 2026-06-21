import { useCallback, useEffect, useRef, useState } from 'react';
import { run } from '../engine/interpreter';
import { evaluateMastery } from '../engine/mastery';
import type { Action, Level } from '../engine/types';
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
import { useSpeech } from './useSpeech';

const MAX_PLAN = 8;
const WORD_CUE: Record<Action, string> = { JUMP: 'Jump!', DUCK: 'Duck!', CLIMB: 'Climb!' };

type Phase = 'building' | 'running' | 'result';

/** Place the start, the event points, and the goal along the path (fractions of width). */
function layout(level: Level): RunnerGeometry {
  const n = level.points.length;
  const first = 0.32;
  const last = 0.68;
  const pointX = n <= 1 ? [0.5] : level.points.map((_, i) => first + ((last - first) * i) / (n - 1));
  return { startX: 0.09, goalX: 0.92, pointX };
}

/** The whole play surface for one level. State machine: building -> running -> result. */
export function Game({ theme, level }: { theme: ThemePack; level: Level }) {
  const [plan, setPlan] = useState<Action[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [response, setResponse] = useState<PartnerResponse | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const recorder = useRef(createRecorder());
  const reducedMotion = useReducedMotion();
  const { speak, unlock, muted, setMuted, supported } = useSpeech();
  const runner = useRunner(reducedMotion);
  const geo = layout(level);

  const requestIntro = useCallback(() => {
    partner({
      themeId: theme.id,
      nouns: theme.nouns,
      level,
      conceptsKnown: [],
      currentPlan: [],
      lastOutcome: null,
      lastTrace: null,
      attemptsThisLevel: recorder.current.attemptsFor(level.id),
      recentHistory: [],
    }).then((r) => {
      setResponse(r);
      speak(r.say);
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
    setPlan((p) => (p.length >= MAX_PLAN ? p : [...p, action]));
    setOnboarded(true);
    speak(WORD_CUE[action]);
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
    const trace = run(level, plan);
    const mastery = evaluateMastery(level, plan, trace);
    const recentHistory = recorder.current.outcomesFor(level.id);
    setPhase('running');
    // A clean solve (no extra tokens) cheers; a redundant win just stands at the goal.
    runner.play(trace, geo, mastery.mastered, () => {
      recorder.current.record({
        levelId: level.id,
        plan,
        outcome: trace.outcome,
        redundantTokens: mastery.redundantTokens,
      });
      partner({
        themeId: theme.id,
        nouns: theme.nouns,
        level,
        conceptsKnown: mastery.mastered ? [level.anchorId] : [],
        currentPlan: plan,
        lastOutcome: trace.outcome,
        lastTrace: trace,
        attemptsThisLevel: recorder.current.attemptsFor(level.id),
        recentHistory,
      }).then((r) => {
        setResponse(r);
        setPhase('result');
        speak(r.say);
      });
    });
  };

  const scaffold = phase === 'result' ? response?.scaffold : undefined;
  const highlightIndex = scaffold?.kind === 'highlight-step' ? scaffold.stepIndex : null;
  const offerAction = scaffold?.kind === 'offer-action' ? scaffold.action : null;
  const celebrate = phase === 'result' && !!response?.celebrate;
  const executingIndex = phase === 'running' ? runner.activePoint : null;

  return (
    <div
      className="game"
      style={{
        background: `linear-gradient(180deg, ${theme.palette.sky} 0%, ${theme.palette.ground} 100%)`,
        color: theme.palette.text,
      }}
    >
      <PartnerBubble text={response?.say ?? null} celebrate={celebrate} />
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
        highlightIndex={highlightIndex}
        activeIndex={executingIndex}
        disabled={phase === 'running'}
        onRemove={removeAt}
      />
      <TokenTray
        theme={theme}
        actions={level.allowedActions}
        offerAction={offerAction}
        disabled={phase === 'running'}
        hint={!onboarded}
        onAdd={addToken}
      />
      <Controls
        canGo={phase !== 'running' && plan.length > 0}
        canClear={phase !== 'running' && plan.length > 0}
        showReplay={celebrate}
        muted={muted}
        speechSupported={supported}
        onGo={go}
        onClear={clearPlan}
        onReplay={clearPlan}
        onToggleMute={() => setMuted((m) => !m)}
      />
    </div>
  );
}
