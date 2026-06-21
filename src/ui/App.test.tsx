import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from './App';

// A smoke test: render the whole initial scene (App -> Game -> Track, PlanStrip,
// TokenTray, Controls, PartnerBubble, and every theme SVG) and confirm it builds
// without throwing. Interaction/animation are verified by running the app.
describe('App renders', () => {
  it('mounts the Level 1 scene without throwing', () => {
    const html = renderToString(<App />);
    expect(html).toContain('class="game"');
    expect(html).toContain('Steps you can add'); // token tray
    expect(html).toContain('Your plan'); // plan strip
    expect(html).toContain('aria-label="Go"'); // GO control
  });
});
