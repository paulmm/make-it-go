import { useEffect, useReducer } from 'react';
import { telemetry } from '../telemetry/store';
import { computeSignals } from '../telemetry/signals';
import type { Signal } from '../telemetry/signals';

/** Re-render whenever the persistent telemetry changes. */
function useTelemetrySnapshot() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => telemetry.subscribe(force), []);
  return { attempts: telemetry.attempts(), explainedItBack: telemetry.explainedItBack() };
}

const LABELS = {
  transfer: { title: 'Figures it out herself', hint: 'Solves a new idea with no hints.' },
  firstTry: { title: 'Gets it first try', hint: 'Clean wins on the very first go.' },
  selfDebug: { title: 'Fixes her own mistakes', hint: 'Reworks a wrong plan into a win.' },
  promptFade: { title: 'Needs less help', hint: 'Fewer nudges as she goes on.' },
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

/** The grown-ups view: the four capability signals + the ScratchJr handoff. Never time-on-app. */
export function Dashboard({ onClose }: { onClose: () => void }) {
  const { attempts, explainedItBack } = useTelemetrySnapshot();
  const s = computeSignals(attempts);

  return (
    <div className="dash-overlay" role="dialog" aria-modal="true" aria-label="Grown-ups dashboard">
      <div className="dash">
        <header className="dash-head">
          <h2>How she's doing</h2>
          <button type="button" className="dash-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="dash-sub">
          {s.levelsSolved} idea{s.levelsSolved === 1 ? '' : 's'} solved so far. This measures what she
          <em> can do</em> — never time on app.
        </p>

        {s.ready && (
          <div className="dash-ready">
            <strong>She's ready for ScratchJr! 🎉</strong>
            <p>She plans, debugs, and builds on what she knows. Outgrowing this is the win — time to graduate.</p>
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
          <span>She explained an idea back to me in her own words</span>
        </label>

        <button
          type="button"
          className="dash-reset"
          onClick={() => {
            if (confirm('Clear all of her progress data on this device?')) telemetry.reset();
          }}
        >
          Reset data
        </button>
      </div>
    </div>
  );
}
