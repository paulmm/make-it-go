import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/fox/backdrop.jpg';
import foxIdle from './assets/fox/fox-idle.png';
import foxWalk from './assets/fox/fox-walk.png';
import foxJump from './assets/fox/fox-jump.png';
import foxDuck from './assets/fox/fox-duck.png';
import foxClimb from './assets/fox/fox-climb.png';
import foxStumble from './assets/fox/fox-stumble.png';
import foxSplash from './assets/fox/fox-splash.png';
import foxCheer from './assets/fox/fox-cheer.png';
import foxGrab from './assets/fox/fox-grab.png';
import foxOpen from './assets/fox/fox-open.png';
import acornImg from './assets/fox/acorn.png';
// Generic nature obstacles + props + sun/hand are shared with the meadow pack.
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import branchImg from './assets/meadow/branch.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

const palette: ThemePalette = {
  sky: '#f6e2c4',
  ground: '#c3d585',
  tile: '#b98a5a',
  tileEdge: '#7a5a3a',
  hazard: '#5cc0e8',
  goal: '#caa23a',
  accent: '#e07a3c',
  text: '#3a2f24',
};

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: foxIdle, facesRight: false },
  walk: { src: foxWalk, facesRight: false },
  jump: { src: foxJump, facesRight: false },
  climb: { src: foxClimb, facesRight: true },
  duck: { src: foxDuck, facesRight: true },
  grab: { src: foxGrab, facesRight: true },
  open: { src: foxOpen, facesRight: true },
  stumble: { src: foxStumble, facesRight: false },
  splash: { src: foxSplash, facesRight: false },
  cheer: { src: foxCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
}

export const FOX: ThemePack = {
  id: 'fox',
  name: 'Forest Fox',
  palette,
  nouns: { hero: 'fox', goal: 'acorn' },
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={acornImg} />,
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
  voice: { flavorWords: ['yip', 'yay'] },
};
