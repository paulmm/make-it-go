import type { ReactNode } from 'react';
import type { Action } from '../engine/types';
import type { HeroPose } from './types';

/** Generic art (obstacles, scene, props). */
export function Sprite({ src, className }: { src: string; className?: string }): ReactNode {
  return (
    <img
      className={`sprite${className ? ' ' + className : ''}`}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

/**
 * The hero img with the right-facing flip handled. The hero faces right (the travel
 * direction); poses that already face right pass facesRight to skip the CSS flip.
 */
export function heroImg(src: string, facesRight: boolean): ReactNode {
  return (
    <img
      className={`sprite hero-art${facesRight ? ' faces-right' : ''}`}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

// A faint motion glyph behind the hero so each action reads at a glance.
const ACTION_GLYPH: Record<Action, ReactNode> = {
  JUMP: (
    <svg className="action-glyph" viewBox="0 0 100 60" aria-hidden="true">
      <path d="M12 50 Q 50 2 88 50" fill="none" stroke="#ffffff" strokeWidth="6" strokeDasharray="2 9" strokeLinecap="round" />
    </svg>
  ),
  CLIMB: (
    <svg className="action-glyph" viewBox="0 0 100 60" aria-hidden="true">
      <path d="M12 52 H40 V34 H66 V16 H90" fill="none" stroke="#ffffff" strokeWidth="6" strokeDasharray="2 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  DUCK: (
    <svg className="action-glyph" viewBox="0 0 100 60" aria-hidden="true">
      <path d="M12 14 Q 50 58 88 14" fill="none" stroke="#ffffff" strokeWidth="6" strokeDasharray="2 9" strokeLinecap="round" />
    </svg>
  ),
};

const ACTION_POSE: Record<Action, HeroPose> = { JUMP: 'jump', DUCK: 'duck', CLIMB: 'climb' };

/** Build the action-token icons for a theme from its heroPose renderer. */
export function buildActionArt(heroPose: (p: HeroPose) => ReactNode): Record<Action, () => ReactNode> {
  const icon = (action: Action): ReactNode => (
    <span className={`action-art ${action.toLowerCase()}`}>
      {ACTION_GLYPH[action]}
      {heroPose(ACTION_POSE[action])}
    </span>
  );
  return {
    JUMP: () => icon('JUMP'),
    DUCK: () => icon('DUCK'),
    CLIMB: () => icon('CLIMB'),
  };
}

const svgProps = {
  viewBox: '0 0 100 100',
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid meet',
  'aria-hidden': true,
} as const;

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(1)},${(cy + radius * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const CONFETTI = [
  { x: 16, y: 20, c: '#ff7aa8', r: 0 },
  { x: 84, y: 24, c: '#ffd23d', r: 20 },
  { x: 50, y: 8, c: '#6bd06b', r: -15 },
  { x: 28, y: 54, c: '#6b5cff', r: 12 },
  { x: 74, y: 58, c: '#ff924d', r: -22 },
  { x: 40, y: 30, c: '#4ec0ff', r: 35 },
  { x: 62, y: 16, c: '#ff7aa8', r: -8 },
  { x: 22, y: 38, c: '#ffd23d', r: 18 },
];

/** Sparkle + confetti burst, shown on a win. Theme-agnostic. */
export function Sparkles(): ReactNode {
  return (
    <svg {...svgProps}>
      <polygon points={star(50, 40, 19)} fill="#ffd83d" />
      <polygon points={star(28, 32, 10)} fill="#fff0a8" />
      <polygon points={star(76, 34, 10)} fill="#fff0a8" />
      {CONFETTI.map((c, i) => (
        <rect key={i} x={c.x - 3} y={c.y - 3} width="6" height="9" rx="1.5" fill={c.c} transform={`rotate(${c.r} ${c.x} ${c.y})`} />
      ))}
    </svg>
  );
}
