import { useEffect, useReducer, useState } from 'react';
import { clearClassroomCode, loadClassroomCode, saveClassroomCode, subscribeClassroom } from '../classroom';
import { telemetry } from '../telemetry/store';
import { computeSignals } from '../telemetry/signals';
import type { Signal } from '../telemetry/signals';
import { resetProgress } from './progress';

/** Re-render whenever the persistent telemetry changes. */
function useTelemetrySnapshot() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => telemetry.subscribe(force), []);
  return { attempts: telemetry.attempts(), explainedItBack: telemetry.explainedItBack() };
}

const LABELS = {
  transfer: { title: 'Figures it out on their own', hint: 'Solves a new idea with no hints.' },
  firstTry: { title: 'Gets it first try', hint: 'Clean wins on the very first go.' },
  selfDebug: { title: 'Fixes their own mistakes', hint: 'Reworks a wrong plan into a win.' },
  promptFade: { title: 'Needs less help', hint: 'Fewer nudges as they go on.' },
} as const;

function Meter({ title, hint, signal }: { title: string; hint: string; signal: Signal }) {
  return (
    <div className={`signal${signal.strong ? ' strong' : ''}`}>
      <div className="signal-head">
        <span className="signal-title">{title}</span>
        <span className="signal-value">
          {signal.value}
          {signal.strong ? ' ✓' : ''}
        </span>
      </div>
      <div className="signal-bar">
        <span style={{ width: `${Math.round(signal.strength * 100)}%` }} />
      </div>
      <p className="signal-hint">{hint}</p>
    </div>
  );
}

/**
 * Classroom codes live here because this is the one screen a grown-up reads. A code (from the
 * teacher's shared link, or typed here) turns on the live partner and the warm voice for this
 * device; without one every level still plays. The shape check is local — the server decides
 * whether a code is real, and an unknown one quietly plays as a public visitor.
 */
function ClassroomSection() {
  const [code, setCode] = useState<string | null>(loadClassroomCode);
  const [draft, setDraft] = useState('');
  const [rejected, setRejected] = useState(false);
  useEffect(() => subscribeClassroom(() => setCode(loadClassroomCode())), []);

  if (code) {
    return (
      <section className="dash-class" aria-labelledby="dash-class-title">
        <h3 id="dash-class-title">Classroom code</h3>
        <p>
          <code>{code}</code> is on for this device: the live partner and the storyteller voice, within the class's
          daily budget.
        </p>
        <button type="button" className="dash-class-remove" onClick={() => clearClassroomCode()}>
          Remove code
        </button>
      </section>
    );
  }

  return (
    <section className="dash-class" aria-labelledby="dash-class-title">
      <h3 id="dash-class-title">Teachers</h3>
      <p>
        Every level plays for free. A free classroom code adds the live AI partner and the storyteller voice for your
        class — <a href="/teachers/">here is how to get one</a>.
      </p>
      <form
        className="dash-class-form"
        onSubmit={(e) => {
          e.preventDefault();
          const saved = saveClassroomCode(draft);
          setRejected(!saved);
          if (saved) setDraft('');
        }}
      >
        <label>
          <span>Classroom code</span>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setRejected(false);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="ABCD-1234"
          />
        </label>
        <button type="submit">Use code</button>
      </form>
      {rejected && (
        <p className="dash-class-error" role="alert">
          That doesn't look like a code — letters, digits and dashes only.
        </p>
      )}
    </section>
  );
}

/** The grown-ups view: the four capability signals + the ScratchJr handoff. Never time-on-app. */
export function Dashboard({ onClose }: { onClose: () => void }) {
  const { attempts, explainedItBack } = useTelemetrySnapshot();
  const s = computeSignals(attempts);

  return (
    <div className="dash-overlay" role="dialog" aria-modal="true" aria-label="Grown-ups dashboard">
      <div className="dash">
        <header className="dash-head">
          <h2>How they're doing</h2>
          <button type="button" className="dash-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="dash-sub">
          {`${s.levelsSolved} level${s.levelsSolved === 1 ? '' : 's'} solved so far.`} This measures what they
          <em> can do</em> — never time on app.
        </p>

        {s.ready && (
          <div className="dash-ready">
            <strong>They're ready for ScratchJr! 🎉</strong>
            <p>They plan, debug, and build on what they know. Outgrowing this is the win — time to graduate.</p>
            <a href="https://www.scratchjr.org/" target="_blank" rel="noreferrer">
              Get ScratchJr →
            </a>
          </div>
        )}

        <div className="dash-signals">
          <Meter {...LABELS.transfer} signal={s.transfer} />
          <Meter {...LABELS.firstTry} signal={s.firstTry} />
          <Meter {...LABELS.selfDebug} signal={s.selfDebug} />
          <Meter {...LABELS.promptFade} signal={s.promptFade} />
        </div>

        <label className="dash-explained">
          <input
            type="checkbox"
            checked={explainedItBack}
            onChange={(e) => telemetry.setExplainedItBack(e.target.checked)}
          />
          <span>They explained an idea back to me in their own words</span>
        </label>

        <ClassroomSection />

        <button
          type="button"
          className="dash-reset"
          onClick={() => {
            if (confirm('Clear all of their progress data on this device?')) {
              telemetry.reset();
              resetProgress(); // the ladder unlock is progress data too
            }
          }}
        >
          Reset data
        </button>

        <p className="dash-credits">
          Made by{' '}
          <a href="https://www.propriuslabs.ai" target="_blank" rel="noreferrer">
            Proprius Labs
          </a>
          {' · '}
          <a href="mailto:contact@propriuslabs.ai">contact@propriuslabs.ai</a>
        </p>
      </div>
    </div>
  );
}
