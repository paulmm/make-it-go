import type { ReactNode } from 'react';
import type { Action } from '../engine/types';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import backdropImg from './assets/meadow/backdrop.jpg';
import bunnyIdle from './assets/meadow/bunny-idle.png';
import bunnyHop from './assets/meadow/bunny-hop.png';
import bunnyLeap from './assets/meadow/bunny-leap.png';
import bunnySplash from './assets/meadow/bunny-splash.png';
import bunnyStumble from './assets/meadow/bunny-stumble.png';
import bunnyCheer from './assets/meadow/bunny-cheer.png';
import bunnyClimb from './assets/meadow/bunny-climb.png';
import bunnyDuck from './assets/meadow/bunny-duck.png';
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import carrotImg from './assets/meadow/carrot.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import branchImg from './assets/meadow/branch.png';

const palette: ThemePalette = {
  sky: '#bfe7f5',
  ground: '#a6d977',
  tile: '#dcbb8c',
  tileEdge: '#b9986a',
  hazard: '#5cc0e8',
  goal: '#ff7a3c',
  accent: '#6b5cff',
  text: '#3a3340',
};

/** Generic art (obstacles, scene, props). */
function Sprite({ src, className }: { src: string; className?: string }): ReactNode {
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

// The hero faces right (the travel direction). Some generated poses already face
// right; the rest face left and are flipped in CSS. `facesRight` skips the flip.
const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: bunnyIdle, facesRight: false },
  walk: { src: bunnyHop, facesRight: false },
  jump: { src: bunnyLeap, facesRight: false },
  climb: { src: bunnyClimb, facesRight: true },
  duck: { src: bunnyDuck, facesRight: true },
  stumble: { src: bunnyStumble, facesRight: false },
  splash: { src: bunnySplash, facesRight: false },
  cheer: { src: bunnyCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return (
    <img
      className={`sprite bunny${facesRight ? ' faces-right' : ''}`}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

const ACTION_POSE: Record<Action, HeroPose> = { JUMP: 'jump', DUCK: 'duck', CLIMB: 'climb' };

function actionIcon(action: Action): ReactNode {
  return <span className={`action-art ${action.toLowerCase()}`}>{heroPose(ACTION_POSE[action])}</span>;
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

function Sparkles(): ReactNode {
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

export const MEADOW: ThemePack = {
  id: 'meadow',
  name: 'Bunny Meadow',
  palette,
  nouns: { hero: 'bunny', goal: 'carrot' },
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={carrotImg} />,
  celebration: Sparkles,
  heroPose,
  actionArt: {
    JUMP: () => actionIcon('JUMP'),
    DUCK: () => actionIcon('DUCK'),
    CLIMB: () => actionIcon('CLIMB'),
  },
  obstacleArt: {
    GAP: () => <Sprite src={waterImg} className="obstacle gap" />,
    BRANCH: () => <Sprite src={branchImg} className="obstacle branch" />,
    STEP: () => <Sprite src={stoneImg} className="obstacle step" />,
  },
  // Falling in the water gap is a splash; tripping at a step/branch is a dry stumble.
  failPose: { GAP: 'splash', BRANCH: 'stumble', STEP: 'stumble' },
  voice: { flavorWords: ['hop', 'yay'] },
};
