import type { ReactNode } from 'react';
import type { HeroPose, ThemePack, ThemePalette } from './types';
import { Sprite, buildActionArt, heroImg, Sparkles } from './shared';
import backdropImg from './assets/space/backdrop.jpg';
import astroIdle from './assets/space/astro-idle.png';
import astroWalk from './assets/space/astro-walk.png';
import astroJump from './assets/space/astro-jump.png';
import astroDuck from './assets/space/astro-duck.png';
import astroClimb from './assets/space/astro-climb.png';
import astroGrab from './assets/space/astro-grab.png';
import astroOpen from './assets/space/astro-open.png';
import astroStumble from './assets/space/astro-stumble.png';
import astroSplash from './assets/space/astro-splash.png';
import astroCheer from './assets/space/astro-cheer.png';
import starImg from './assets/space/star.png';
// Generic obstacles + props + sun/hand are shared with the meadow pack.
import stoneImg from './assets/meadow/stone.png';
import waterImg from './assets/meadow/water.png';
import branchImg from './assets/meadow/branch.png';
import sunImg from './assets/meadow/sun.png';
import handImg from './assets/meadow/hand.png';
import keyImg from './assets/meadow/key.png';
import gateImg from './assets/meadow/gate.png';

const palette: ThemePalette = {
  sky: '#4b4684',
  ground: '#c9bce0',
  tile: '#6a5fa0',
  tileEdge: '#46407a',
  hazard: '#5cc0e8',
  goal: '#ffd23d',
  accent: '#8a7ad6',
  text: '#382f57',
};

const POSE: Record<HeroPose, { src: string; facesRight: boolean }> = {
  idle: { src: astroIdle, facesRight: true },
  walk: { src: astroWalk, facesRight: true },
  jump: { src: astroJump, facesRight: true },
  climb: { src: astroClimb, facesRight: true },
  duck: { src: astroDuck, facesRight: true },
  grab: { src: astroGrab, facesRight: true },
  open: { src: astroOpen, facesRight: true },
  stumble: { src: astroStumble, facesRight: true },
  splash: { src: astroSplash, facesRight: true },
  cheer: { src: astroCheer, facesRight: true },
};

function heroPose(pose: HeroPose): ReactNode {
  const { src, facesRight } = POSE[pose];
  return heroImg(src, facesRight);
}

export const SPACE: ThemePack = {
  id: 'space',
  name: 'Space Trip',
  palette,
  nouns: { hero: 'astronaut', goal: 'star' },
  hoverCry: 'Blast off!',
  backdrop: () => <Sprite src={backdropImg} className="backdrop-img" />,
  sun: () => <Sprite src={sunImg} />,
  hand: () => <Sprite src={handImg} />,
  goalIcon: () => <Sprite src={starImg} />,
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
  voice: { flavorWords: ['zoom', 'yay'] },
};
