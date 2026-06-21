import { useCallback, useEffect, useRef, useState } from 'react';
import { run } from '../engine/interpreter';
import { evaluateMastery } from '../engine/mastery';
import type { Level, Token } from '../engine/types';
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
import { useSpeech } from './useSpeech';

const MAX_PLAN = 8;
const PREVIEW_MS = 760;
const WORD_CUE: Record<Token, string> = { ADVANCE: 'Hop!', LEAP: 'Big jump!' };

type Phase = 'building' | 'running' | 'result';

interface GameProps {
  theme: ThemePack;
  level: Level;
}

/** The whole play surface for one level. State machine: building -> running -> result. */
export function Game({ theme, level }: GameProps) {
  const [plan, setPlan] = useState<Token[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [response, setResponse] = useState<PartnerResponse | null>(null);
  const [preview, setPreview] = useState<{ token: Token; id: number } | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const recorder = useRef(createRecorder());
  const previewId = useRef(0);
  const previewTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { speak, unlock, muted, setMuted, supported } = useSpeech();
  const runner = useRunner(level.startIndex, reducedMotion ? 420 : 640);

  // Plant the anchor at the start of the level (and again on replay).
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
  }, [requestIntro]);

  useEffect(
    () => () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    },
    [],
  );

  const backToBuilding = () => {
    setPhase('building');
    runner.reset(level.startIndex);
  };

  // Show what a step does on the bunny itself, without committing it (the splash
  // stays a surprise until GO).
  const showPreview = (token: Token) => {
    if (reducedMotion) return;
    previewId.current += 1;
    setPreview({ token, id: previewId.current });
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setPreview(null), PREVIEW_MS);
  };

  const addToken = (token: Token) => {
    unlock();
    if (phase === 'running') return;
    setPlan((p) => (p.length >= MAX_PLAN ? p : [...p, token]));
    setOnboarded(true);
    speak(WORD_CUE[token]);
    showPreview(token);
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
    setPreview(null);
    backToBuilding();
    requestIntro();
  };

  const go = () => {
    unlock();
    if (phase === 'running' || plan.length === 0) return;
    setPreview(null);
    const trace = run(level, plan);
    const recentHistory = recorder.current.outcomesFor(level.id); // before this attempt
    setPhase('running');
    runner.play(trace, () => {
      const mastery = evaluateMastery(level, plan, trace);
      recorder.current.record({
        levelId: level.id,
        plan,
        outcome: trace.outcome,
        redundantSteps: mastery.redundantSteps,
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
  const offerToken = scaffold?.kind === 'offer-token' ? scaffold.token : null;
  const celebrate = phase === 'result' && !!response?.celebrate;

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
        heroIndex={runner.heroIndex}
        activeStep={runner.activeStep}
        celebrate={celebrate}
        reducedMotion={reducedMotion}
        preview={preview}
      />
      <PlanStrip
        theme={theme}
        plan={plan}
        highlightIndex={highlightIndex}
        disabled={phase === 'running'}
        onRemove={removeAt}
      />
      <TokenTray
        theme={theme}
        tokens={level.allowedTokens}
        offerToken={offerToken}
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
