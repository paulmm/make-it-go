// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Game } from './Game';
import { MEADOW } from '../themes';
import { GAP_LEVEL } from '../engine/levels';
import { telemetry } from '../telemetry/store';

// The whole play loop, driven through the real components: place a token, tap GO, let the
// runner's timers play the beats, and land in the recorded result. There is no /api in the
// test, so the partner falls back to the offline stub and the voice to its silent no-op —
// exactly the app's own no-network path.

function mount() {
  const onNext = vi.fn();
  render(
    <Game theme={MEADOW} level={GAP_LEVEL} levelNumber={1} conceptsKnown={[]} onNext={onNext} onHome={() => {}} />,
  );
  return onNext;
}

const settle = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

describe('Game — plan, go, run, record, way forward', () => {
  beforeEach(() => {
    telemetry.reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup(); // no vitest globals, so testing-library can't auto-clean between tests
    vi.useRealTimers();
  });

  it('a clean solve runs the beats, records the win, and reveals the win choices', async () => {
    const onNext = mount();
    await settle(0); // the intro line arrives

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await settle(10_000); // hero walks, jumps, cheers; the spoken line finishes

    const attempts = telemetry.attempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ levelId: 'L1', outcome: 'WIN', attemptNumber: 1, redundant: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Go to the next level' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('a wrong plan fails visibly, is recorded, and leaves the revise loop open — never a dead end', async () => {
    mount();
    await settle(0);

    fireEvent.click(screen.getByRole('button', { name: 'Climb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await settle(10_000);

    // No way forward is offered on a fail…
    expect(screen.queryByRole('button', { name: 'Go to the next level' })).toBeNull();
    expect(telemetry.attempts()[0]).toMatchObject({ levelId: 'L1', outcome: 'STUMBLE', attemptNumber: 1 });
    // …but the plan is still hers to fix: the chip is removable and GO is live again.
    expect(screen.getByRole('button', { name: /Step 1, climb/ })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Go' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
