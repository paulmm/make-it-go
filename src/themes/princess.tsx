import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/princess/backdrop.jpg';
import princessIdle from './assets/princess/princess-idle.png';
import princessWalk from './assets/princess/princess-walk.png';
import princessJump from './assets/princess/princess-jump.png';
import princessDuck from './assets/princess/princess-duck.png';
import princessClimb from './assets/princess/princess-climb.png';
import princessGrab from './assets/princess/princess-grab.png';
import princessOpen from './assets/princess/princess-open.png';
import princessStumble from './assets/princess/princess-stumble.png';
import princessSplash from './assets/princess/princess-splash.png';
import princessCheer from './assets/princess/princess-cheer.png';
import jewelImg from './assets/princess/jewel.png';
// Generic obstacles + props + sun/hand are shared with the meadow pack.
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import branchImg from './assets/meadow/branch.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

const palette: ThemePalette = {
  sky: '#ffe0ef',
  ground: '#c7e29a',
  tile: '#e6b9d6',
  tileEdge: '#c98fb6',
  hazard: '#5cc0e8',
  goal: '#e056a8',
  accent: '#b06bd0',
  text: '#43304a',
};

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: princessIdle, facesRight: false },
  walk: { src: princessWalk, facesRight: true },
  jump: { src: princessJump, facesRight: true },
  climb: { src: princessClimb, facesRight: true },
  duck: { src: princessDuck, facesRight: true },
  grab: { src: princessGrab, facesRight: true },
  open: { src: princessOpen, facesRight: true },
  stumble: { src: princessStumble, facesRight: false },
  splash: { src: princessSplash, facesRight: false },
  cheer: { src: princessCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
}

export const PRINCESS: ThemePack = {
  id: 'princess',
  name: 'Royal Castle',
  palette,
  nouns: { hero: 'princess', goal: 'jewel' },
  hoverCry: 'Choose me!',
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={jewelImg} />,
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
  voice: { flavorWords: ['sparkle', 'yay'] },
};
