import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/dino/backdrop.jpg';
import dinoIdle from './assets/dino/dino-idle.png';
import dinoWalk from './assets/dino/dino-walk.png';
import dinoJump from './assets/dino/dino-jump.png';
import dinoDuck from './assets/dino/dino-duck.png';
import dinoClimb from './assets/dino/dino-climb.png';
import dinoGrab from './assets/dino/dino-grab.png';
import dinoOpen from './assets/dino/dino-open.png';
import dinoStumble from './assets/dino/dino-stumble.png';
import dinoSplash from './assets/dino/dino-splash.png';
import dinoCheer from './assets/dino/dino-cheer.png';
import leafImg from './assets/dino/leaf.png';
// Generic obstacles + props + sun/hand are shared with the meadow pack.
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import branchImg from './assets/meadow/branch.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

const palette: ThemePalette = {
  sky: '#cfe9d8',
  ground: '#9ece84',
  tile: '#b98a5a',
  tileEdge: '#7a5a3a',
  hazard: '#5cc0e8',
  goal: '#5aa83a',
  accent: '#e0913c',
  text: '#2f3a2a',
};

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: dinoIdle, facesRight: false },
  walk: { src: dinoWalk, facesRight: false },
  jump: { src: dinoJump, facesRight: true },
  climb: { src: dinoClimb, facesRight: true },
  duck: { src: dinoDuck, facesRight: false },
  grab: { src: dinoGrab, facesRight: true },
  open: { src: dinoOpen, facesRight: true },
  stumble: { src: dinoStumble, facesRight: false },
  splash: { src: dinoSplash, facesRight: false },
  cheer: { src: dinoCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
}

export const DINO: ThemePack = {
  id: 'dino',
  name: 'Dino Jungle',
  palette,
  nouns: { hero: 'dino', goal: 'leaf' },
  hoverCry: 'Rawr, me!',
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={leafImg} />,
  celebration: Sparkles,
  heroPose,
  actionArt: buildActionArt(heroPose),
  obstacleArt: {
    GAP: () => <Sprite src={waterImg} className="obstacle gap" />,
    BRANCH: () => <Sprite src={branchImg} className="obstacle branch" />,
    STEP: () => <Sprite src={stoneImg} className="obstacle step" />,
    KEY: () => <Sprite src={keyImg} className="obstacle key" />,
    GATE: () => <Sprite src={gateImg} className="obstacle gate" />,
  },
  failPose: { GAP: 'splash', BRANCH: 'stumble', STEP: 'stumble', KEY: 'stumble', GATE: 'stumble' },
  voice: { flavorWords: ['stomp', 'yay'] },
};
