// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemePicker } from './ThemePicker';
import { THEMES } from '../themes';

// The grown-ups gate is a press-and-hold so a child's tap never opens the dashboard. A grown-up
// has to be able to tell that, so a short press shows a hint, the pill reacts while held, and
// stray native gestures (a long-press menu, a wobbling finger) can't quietly cancel the hold.

function mount() {
  const onGrownUps = vi.fn();
  render(<ThemePicker themes={THEMES} onPick={() => {}} onGrownUps={onGrownUps} />);
  return { onGrownUps, gate: screen.getByRole('button', { name: /grown-ups/i }) };
}

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ThemePicker — the grown-ups gate', () => {
  it('opens after a held press', () => {
    const { onGrownUps, gate } = mount();
    fireEvent.pointerDown(gate, { pointerId: 1, pointerType: 'touch', button: 0 });
    expect(gate.className).toContain('holding');
    tick(900);
    expect(onGrownUps).toHaveBeenCalledTimes(1);
    expect(gate.className).not.toContain('holding');
  });

  it('a quick tap does not open it, and shows the press-and-hold hint instead', () => {
    const { onGrownUps, gate } = mount();
    fireEvent.pointerDown(gate, { pointerId: 1, pointerType: 'touch', button: 0 });
    tick(200);
    fireEvent.pointerUp(gate, { pointerId: 1, pointerType: 'touch' });
    tick(900);
    expect(onGrownUps).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/press and hold/i);
    // The hint is a nudge, not a fixture: it clears on its own.
    tick(3000);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('a cancelled pointer ends the hold without opening', () => {
    const { onGrownUps, gate } = mount();
    fireEvent.pointerDown(gate, { pointerId: 1, pointerType: 'touch', button: 0 });
    tick(300);
    fireEvent.pointerCancel(gate, { pointerId: 1, pointerType: 'touch' });
    tick(900);
    expect(onGrownUps).not.toHaveBeenCalled();
    expect(gate.className).not.toContain('holding');
  });

  it('suppresses the long-press context menu so it cannot interrupt the hold', () => {
    const { gate } = mount();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    gate.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('a held key opens it too, for keyboard users', () => {
    const { onGrownUps, gate } = mount();
    fireEvent.keyDown(gate, { key: 'Enter' });
    fireEvent.keyDown(gate, { key: 'Enter', repeat: true }); // auto-repeat must not restart the hold
    tick(900);
    expect(onGrownUps).toHaveBeenCalledTimes(1);
  });

  it('shows who made it and how to reach them', () => {
    mount();
    expect(screen.getByRole('link', { name: 'Proprius Labs' }).getAttribute('href')).toBe('https://www.propriuslabs.ai');
    expect(screen.getByRole('link', { name: 'contact@propriuslabs.ai' }).getAttribute('href')).toBe('mailto:contact@propriuslabs.ai');
  });
});
