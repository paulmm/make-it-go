import { useCallback, useEffect, useRef, useState } from 'react';
import { run } from '../engine/interpreter';
import { evaluateMastery } from '../engine/mastery';
import { bundleTail, canPlace, expandPlan, placeAction, removeToken, usedBundle } from '../engine/plan';
import type { Slot } from '../engine/plan';
import type { Action, AnchorId, Level } from '../engine/types';
import { partner } from '../partner';
import type { PartnerResponse } from '../partner/types';
import { createRecorder } from '../telemetry/recorder';
import { telemetry } from '../telemetry/store';
import type { ThemePack } from '../themes/types';
import { Controls } from './Controls';
import { PartnerBubble } from './PartnerBubble';
import { PlanStrip } from './PlanStrip';
import { Track } from './Track';
import { TokenTray } from './TokenTray';
import { WinChoices } from './WinChoices';
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
function pointToToken(plan: Slot[]): number[] {
  const map: number[] = [];
  plan.forEach((token, i) => {
    const copies = token && token.type === 'repeat' ? token.count : 1;
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
  levelNumber,
  conceptsKnown,
  hasNext,
  onNext,
  onHome,
}: {
  theme: ThemePack;
  level: Level;
  levelNumber: number;
  /** Anchors she has mastered on earlier rungs — the partner calibrates to what she knows. */
  conceptsKnown: AnchorId[];
  hasNext: boolean;
  onNext: () => void;
  onHome: () => void;
}) {
  const [plan, setPlan] = useState<Slot[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [response, setResponse] = useState<PartnerResponse | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  // The post-win choices appear only after the celebration line has finished being read aloud.
  const [showWinChoices, setShowWinChoices] = useState(false);
  // Whether the last run cleanly mastered the level. Drives the celebration and the way forward
  // OBJECTIVELY — never the partner's celebrate flag, which the live LLM can get wrong (e.g. a
  // bundled iteration win it forgets to celebrate), which would otherwise leave her stuck.
  const [mastered, setMastered] = useState(false);

  const recorder = useRef(createRecorder());
  const partnerSeq = useRef(0); // only the latest partner reply is applied (dedupes races)
  const introStarted = useRef(false); // the level intro fires once, despite StrictMode
  const reducedMotion = useReducedMotion();
  const { speak, prime, unlock, muted, setMuted, supported, spokenText, activeWord } = useNarration();
  const runner = useRunner(reducedMotion);
  const geo = layout(level);
  const capacity = level.points.length; // one action per obstacle — no extras
  const expanded = expandPlan(plan); // what the interpreter actually runs
  const atCapacity = !canPlace(plan, capacity);
  // This level teaches iteration, so it offers the REPEAT tool that folds a run into a chip.
  const allowsRepeat = level.mastery.kind === 'bundle-to-goal';



  const requestIntro = useCallback(() => {
    const seq = ++partnerSeq.current;
    partner({
      themeId: theme.id,
      nouns: theme.nouns,
      flavor: theme.voice?.flavorWords,
      level,
      conceptsKnown,
      currentPlan: [],
      usedBundle: false,
      lastOutcome: null,
      lastTrace: null,
      attemptsThisLevel: recorder.current.attemptsFor(level.id),
      recentHistory: [],
    }).then((r) => {
      if (seq !== partnerSeq.current) return; // a newer reply superseded this one
      setResponse(r);
      speak(r.say, { track: true });
    });
  }, [theme, level, conceptsKnown, speak]);

  useEffect(() => {
    // Guard against React StrictMode running this effect twice (it would speak two intros).
    if (!introStarted.current) {
      introStarted.current = true;
      requestIntro();
    }
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
    setPlan((p) => placeAction(p, action, capacity));
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
    setPlan((p) => removeToken(p, index));
    backToBuilding();
  };

  const clearPlan = () => {
    unlock();
    if (phase === 'running') return;
    setPlan([]);
    backToBuilding();
    requestIntro();
  };

  // The post-win choices, each dismissing the overlay first.
  const retryLevel = () => {
    setShowWinChoices(false);
    clearPlan();
  };
  const goNext = () => {
    setShowWinChoices(false);
    onNext();
  };
  const goHome = () => {
    setShowWinChoices(false);
    onHome();
  };

  const go = () => {
    unlock();
    if (phase === 'running' || plan.length === 0) return;
    const trace = run(level, expanded);
    const bundled = usedBundle(plan);
    const mastery = evaluateMastery(level, expanded, trace, { usedBundle: bundled });
    const placed = expanded.filter((a): a is Action => a !== null); // the actions she placed (no holes)
    const recentHistory = recorder.current.outcomesFor(level.id);
    setPhase('running');
    setShowWinChoices(false);
    setMastered(false);
    const seq = ++partnerSeq.current;

    // Decide the partner's reaction now and warm its audio while the hero runs, so the voice
    // is ready the instant the animation ends — no pause between the action and the line.
    const reaction = partner({
      themeId: theme.id,
      nouns: theme.nouns,
      flavor: theme.voice?.flavorWords,
      level,
      conceptsKnown: mastery.mastered ? Array.from(new Set([...conceptsKnown, level.anchorId])) : conceptsKnown,
      currentPlan: placed,
      usedBundle: bundled,
      lastOutcome: trace.outcome,
      lastTrace: trace,
      attemptsThisLevel: recorder.current.attemptsFor(level.id) + 1,
      recentHistory,
    });
    reaction.then((r) => prime(r.say));

    // A clean solve (no extra tokens) cheers; a redundant win just stands at the goal.
    runner.play(trace, geo, mastery.mastered, theme.failPose, () => {
      const rec = recorder.current.record({
        levelId: level.id,
        plan: placed,
        outcome: trace.outcome,
        redundantTokens: mastery.redundantTokens,
      });
      reaction.then((r) => {
        // Persist the attempt for the grown-ups signals — including whether the partner nudged.
        telemetry.recordAttempt({
          levelId: level.id,
          anchorId: level.anchorId,
          outcome: trace.outcome,
          attemptNumber: rec.attemptNumber,
          hinted: r.scaffold.kind !== 'none',
          redundant: mastery.redundantTokens,
        });
        if (seq !== partnerSeq.current) return; // superseded (e.g. she pressed home/clear)
        setResponse(r);
        setPhase('result');
        setMastered(mastery.mastered);
        // She mastered it (objective) -> reveal the try-again / next choices once the line is read.
        // Tied to mastery, NOT the partner's celebrate flag, so a clean win always offers the way on.
        const reveal = mastery.mastered
          ? () => {
              if (seq === partnerSeq.current) setShowWinChoices(true);
            }
          : undefined;
        speak(r.say, { track: true, onDone: reveal });
      });
    });
  };

  const scaffold = phase === 'result' ? response?.scaffold : undefined;
  const offerAction = scaffold?.kind === 'offer-action' ? scaffold.action : null;
  const offerRepeat = scaffold?.kind === 'offer-repeat';
  const celebrate = phase === 'result' && mastered;

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
        levelNumber={levelNumber}
        geo={geo}
        heroX={runner.heroX}
        heroPose={runner.heroPose}
        heroMs={runner.heroMs}
        tick={runner.tick}
        celebrate={celebrate}
        reducedMotion={reducedMotion}
        winChoices={
          showWinChoices ? (
            <WinChoices
              theme={theme}
              hasNext={hasNext}
              onRetry={retryLevel}
              onNext={goNext}
              onHome={goHome}
              reducedMotion={reducedMotion}
            />
          ) : null
        }
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
      {/* Tray + controls: a column normally (display: contents), one row on short screens so the
          play button never falls off a landscape tablet. */}
      <div className="action-row">
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
          canGo={phase !== 'running' && plan.length > 0 && !celebrate}
          canClear={phase !== 'running' && plan.length > 0 && !celebrate}
          showReplay={false}
          showNext={false}
          muted={muted}
          speechSupported={supported}
          onGo={go}
          onClear={clearPlan}
          onReplay={clearPlan}
          onNext={onNext}
          onToggleMute={() => setMuted((m) => !m)}
        />
      </div>
    </div>
  );
}
