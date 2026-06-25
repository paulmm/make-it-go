import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/truck/backdrop.jpg';
import truckIdle from './assets/truck/truck-idle.png';
import truckWalk from './assets/truck/truck-walk.png';
import truckJump from './assets/truck/truck-jump.png';
import truckDuck from './assets/truck/truck-duck.png';
import truckClimb from './assets/truck/truck-climb.png';
import truckGrab from './assets/truck/truck-grab.png';
import truckOpen from './assets/truck/truck-open.png';
import truckStumble from './assets/truck/truck-stumble.png';
import truckSplash from './assets/truck/truck-splash.png';
import truckCheer from './assets/truck/truck-cheer.png';
import flagImg from './assets/truck/flag.png';
// Generic obstacles + props + sun/hand are shared with the meadow pack.
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import branchImg from './assets/meadow/branch.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

const palette: ThemePalette = {
  sky: '#cfe3ee',
  ground: '#d3bd92',
  tile: '#b98a5a',
  tileEdge: '#7a5a3a',
  hazard: '#5cc0e8',
  goal: '#e8643c',
  accent: '#e0913c',
  text: '#3a3326',
};

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: truckIdle, facesRight: false },
  walk: { src: truckWalk, facesRight: true }, // walk art is drawn facing right already — don't flip
  jump: { src: truckJump, facesRight: false },
  climb: { src: truckClimb, facesRight: false },
  duck: { src: truckDuck, facesRight: false },
  grab: { src: truckGrab, facesRight: false },
  open: { src: truckOpen, facesRight: false },
  stumble: { src: truckStumble, facesRight: false },
  splash: { src: truckSplash, facesRight: false },
  cheer: { src: truckCheer, facesRight: false },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
}

export const TRUCK: ThemePack = {
  id: 'truck',
  name: 'Truck Site',
  palette,
  nouns: { hero: 'truck', goal: 'flag' },
  hoverCry: 'Beep beep!',
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={flagImg} />,
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
  voice: { flavorWords: ['beep', 'yay'] },
};
