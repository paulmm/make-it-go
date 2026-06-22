import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { Game } from './Game';
import { MEADOW } from '../themes';
import { LEVEL_1 } from '../engine/levels';

describe('renders', () => {
  it('shows the theme picker first (the only front door)', () => {
    const html = renderToString(<App />);
    expect(html).toContain('picker');
    expect(html).toContain('Choose your character');
    expect(html).toContain('Bunny Meadow');
    expect(html).toContain('Forest Fox');
  });

  it('mounts a level scene without throwing', () => {
    const html = renderToString(
      <Game theme={MEADOW} level={LEVEL_1} levelNumber={1} hasNext={false} onNext={() => {}} onHome={() => {}} />,
    );
    expect(html).toContain('class="game"');
    expect(html).toContain('Steps you can add');
    expect(html).toContain('aria-label="Go"');
  });
});
