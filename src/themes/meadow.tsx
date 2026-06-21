import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/meadow/backdrop.jpg';
import bunnyIdle from './assets/meadow/bunny-idle.png';
import bunnyHop from './assets/meadow/bunny-hop.png';
import bunnyLeap from './assets/meadow/bunny-leap.png';
import bunnySplash from './assets/meadow/bunny-splash.png';
import bunnyStumble from './assets/meadow/bunny-stumble.png';
import bunnyCheer from './assets/meadow/bunny-cheer.png';
import bunnyClimb from './assets/meadow/bunny-climb.png';
import bunnyDuck from './assets/meadow/bunny-duck.png';
import bunnyGrab from './assets/meadow/bunny-grab.png';
import bunnyOpen from './assets/meadow/bunny-open.png';
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import carrotImg from './assets/meadow/carrot.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import branchImg from './assets/meadow/branch.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

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

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: bunnyIdle, facesRight: false },
  walk: { src: bunnyHop, facesRight: false },
  jump: { src: bunnyLeap, facesRight: false },
  climb: { src: bunnyClimb, facesRight: true },
  duck: { src: bunnyDuck, facesRight: true },
  grab: { src: bunnyGrab, facesRight: true },
  open: { src: bunnyOpen, facesRight: true },
  stumble: { src: bunnyStumble, facesRight: false },
  splash: { src: bunnySplash, facesRight: false },
  cheer: { src: bunnyCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
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
  actionArt: buildActionArt(heroPose),
  obstacleArt: {
    GAP: () => <Sprite src={waterImg} className="obstacle gap" />,
    BRANCH: () => <Sprite src={branchImg} className="obstacle branch" />,
    STEP: () => <Sprite src={stoneImg} className="obstacle step" />,
    KEY: () => <Sprite src={keyImg} className="obstacle key" />,
    GATE: () => <Sprite src={gateImg} className="obstacle gate" />,
  },
  failPose: { GAP: 'splash', BRANCH: 'stumble', STEP: 'stumble', KEY: 'stumble', GATE: 'stumble' },
  voice: { flavorWords: ['hop', 'yay'] },
};
