// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Game } from './Game';
import { MEADOW } from '../themes';
import { GAP_LEVEL, REPEAT_LEVEL } from '../engine/levels';
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

/** A fetch that records every request and fails like a dead network — the app's offline path. */
function stubFetchSpy() {
  const spy = vi.fn(() => Promise.reject(new TypeError('no network in tests')));
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Every line the voice was asked to speak (the /api/tts request bodies). */
function spokenTexts(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls
    .filter(([url]) => url === '/api/tts')
    .map(([, init]) => JSON.parse((init as RequestInit).body as string).text as string);
}

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

describe('Game — word cues', () => {
  beforeEach(() => {
    telemetry.reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks a question when she places a step — "Jump?", not "Jump!"', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    await settle(0);

    expect(spokenTexts(spy)).toContain('Jump?');
  });
});

describe('Game — scene toys', () => {
  beforeEach(() => {
    telemetry.reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('poking an obstacle reacts and speaks its name', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    const gap = screen.getByRole('button', { name: 'A gap' });
    fireEvent.click(gap);
    await settle(0);

    expect(screen.getByRole('button', { name: 'A gap' }).className).toContain('poke-gap');
    expect(spokenTexts(spy)).toContain('A gap!');
  });

  it('obstacles are inert while the hero runs the plan', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'A gap' })); // mid-run: disabled
    await settle(0);

    expect(spokenTexts(spy)).not.toContain('A gap!');
  });

  it('numbers repeated obstacles for screen readers — four gaps are not four identical buttons', async () => {
    stubFetchSpy();
    render(
      <Game theme={MEADOW} level={REPEAT_LEVEL} levelNumber={4} conceptsKnown={[]} onNext={() => {}} onHome={() => {}} />,
    );
    await settle(0);

    expect(screen.getByRole('button', { name: 'A gap, 1 of 4' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'A gap, 4 of 4' })).toBeTruthy();
  });

  it('the goal does a happy wiggle when tapped', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    const before = spokenTexts(spy).length;
    const goal = screen.getByRole('button', { name: 'The carrot' });
    fireEvent.click(goal);
    await settle(0);

    expect(screen.getByRole('button', { name: 'The carrot' }).className).toContain('wiggle');
    expect(spokenTexts(spy)).toHaveLength(before); // a decorative wiggle, not a spoken line
  });

  it('a third quick pet earns a spin and the theme cry', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    const hero = () => screen.getByRole('button', { name: 'Pet the bunny' });
    fireEvent.click(hero());
    await settle(200);
    fireEvent.click(hero());
    await settle(200);
    fireEvent.click(hero());
    await settle(0);

    expect(document.querySelector('.hero-inner.spinning')).toBeTruthy();
    expect(spokenTexts(spy)).toContain(MEADOW.hoverCry);
  });

  it('slow pets stay plain pets — no spin, no cry', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    const hero = () => screen.getByRole('button', { name: 'Pet the bunny' });
    fireEvent.click(hero());
    await settle(2000); // past the 1.5s streak window
    fireEvent.click(hero());
    await settle(2000);
    fireEvent.click(hero());
    await settle(0);

    expect(spokenTexts(spy)).not.toContain(MEADOW.hoverCry);
  });

  it('keeps the flags fresh after a spin — an excited 4th tap never sticks', async () => {
    stubFetchSpy();
    mount();
    await settle(0);

    const hero = () => screen.getByRole('button', { name: 'Pet the bunny' });
    fireEvent.click(hero());
    await settle(200);
    fireEvent.click(hero());
    await settle(200);
    fireEvent.click(hero()); // spin starts
    fireEvent.click(hero()); // excited 4th tap mid-spin
    await settle(2000); // every timer runs out

    expect(document.querySelector('.hero-inner.spinning')).toBeNull();
    expect(document.querySelector('.hero-inner.petting')).toBeNull();

    fireEvent.click(hero()); // a plain pet still squishes
    expect(document.querySelector('.hero-inner.petting')).toBeTruthy();
  });

  it('tapping the celebrating hero replays the burst and pops hearts', async () => {
    stubFetchSpy();
    mount();
    await settle(0);

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await settle(10_000); // win; choices up; hero celebrating

    // The goal is already won — it must not stay tappable (it's invisible but was still enabled).
    expect((screen.getByRole('button', { name: 'The carrot' }) as HTMLButtonElement).disabled).toBe(true);

    expect(document.querySelector('.hearts')).toBeNull();
    const before = document.querySelector('.win-burst');
    fireEvent.click(screen.getByRole('button', { name: 'Cheer again' }));
    expect(document.querySelector('.hearts')).toBeTruthy();
    // The name promises the burst replays — a remounted node, not the same one lingering.
    expect(document.querySelector('.win-burst')).toBeTruthy();
    expect(document.querySelector('.win-burst')).not.toBe(before);
  });

  it('a toy poked mid-fetch shares one in-flight TTS request — no duplicate paid calls', async () => {
    const spy = stubFetchSpy();
    mount();
    await settle(0);

    const gap = () => screen.getByRole('button', { name: 'A gap' });
    fireEvent.click(gap());
    fireEvent.click(gap()); // rapid second poke before the first fetch has settled
    await settle(0);

    expect(spokenTexts(spy).filter((t) => t === 'A gap!')).toHaveLength(1);
  });

  it('a toy poked over the win line still lets the win choices appear', async () => {
    // jsdom has no speechSynthesis; stub a fake one so the win line stays "speaking" (pending
    // its safety timer) instead of finishing synchronously, so the poke can supersede it mid-line.
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        rate = 1;
        pitch = 1;
        onboundary: unknown;
        onend: unknown;
        constructor(t: string) {
          this.text = t;
        }
      },
    );
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn() });
    stubFetchSpy();
    mount();
    await settle(0);

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    await settle(3000); // the run finishes ~2.9s in; the win line is mid-"speech", safety timer pending

    fireEvent.click(screen.getByRole('button', { name: 'A gap' })); // supersedes the win line
    await settle(20_000);

    expect(screen.getByRole('button', { name: 'Go to the next level' })).toBeTruthy();
  });
});
