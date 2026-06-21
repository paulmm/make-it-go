// Generates two more themes (Truck worksite, Space) via gpt-image-1. Same structure as
// generate-themes.mjs: each reuses the shared obstacles; this makes a backdrop, 10 hero
// poses (drawn facing RIGHT to match the engine's travel direction), and the goal.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const TRUCK = new URL('../src/themes/assets/truck/', import.meta.url);
const SPACE = new URL('../src/themes/assets/space/', import.meta.url);
mkdirSync(TRUCK, { recursive: true });
mkdirSync(SPACE, { recursive: true });

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPath = new URL('../.env.local', import.meta.url);
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf8').match(/^\s*OPENAI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return null;
}
const KEY = loadKey();
if (!KEY) { console.error('No OPENAI_API_KEY'); process.exit(1); }

const STYLE =
  "soft modern children's picture-book illustration, gentle cel shading with smooth gradients, warm soft rim lighting, rounded chunky friendly shapes, thick soft clean outlines, cozy pastel storybook palette, subtle paper grain, highly polished, cute and wholesome";
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const TRUCK_CHAR =
  'the SAME character every time: a small, cute, friendly cartoon dump truck — a chunky orange truck with a rounded cab, two big round friendly eyes (with white highlights) on the windshield, a little smiling bumper mouth, fat black wheels, an empty tipping bed at the back; adorable and wholesome';
const SPACE_CHAR =
  'the SAME character every time: a small, cute cartoon child astronaut in a puffy white spacesuit with a round clear bubble helmet, big friendly dark eyes and rosy cheeks visible through the visor, a little teal accent and round buttons on the suit, chubby and adorable';

const poses = (key, char, holds) => [
  { name: `${key}-idle`, prompt: `at rest happily, three-quarter view facing RIGHT, calm and friendly` },
  { name: `${key}-walk`, prompt: `moving forward to the RIGHT, mid-motion, cheerful and bouncy` },
  { name: `${key}-jump`, prompt: `bounding up into the air to the RIGHT, mid-air and excited` },
  { name: `${key}-duck`, prompt: `crouched/hunkered down low to duck under something, kept close to the ground, facing RIGHT` },
  { name: `${key}-climb`, prompt: `clambering up and over a small ledge to the RIGHT, pulling up over the top, determined happy face` },
  { name: `${key}-grab`, prompt: `leaning forward to the RIGHT reaching to pick something up off the ground, focused happy face` },
  { name: `${key}-open`, prompt: `leaning forward to the RIGHT giving a gentle push to open something ahead, determined happy face` },
  { name: `${key}-stumble`, prompt: `tipping/tripping off-balance to the RIGHT with a few little swirly stars above, surprised but unhurt. Completely dry, NO water` },
  { name: `${key}-splash`, prompt: `sitting in a little splash of water, wet and surprised but still adorable, droplets around it, facing RIGHT, NOT scared` },
  { name: `${key}-cheer`, prompt: `cheering with joy facing slightly right, ${holds}, eyes happy in a big smile` },
].map((p) => ({ ...p, char }));

const assets = [
  {
    name: 'backdrop', dir: TRUCK, size: '1536x1024', transparent: false,
    prompt: `A wide, empty cute construction worksite background for a toddler game: soft warm sky with a few fluffy clouds, distant rounded hills, gentle mounds of sandy dirt and a couple of small traffic cones along the edges, a flat open dirt-and-grass foreground. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  ...poses('truck', TRUCK_CHAR, 'tooting happily with a tiny checkered flag waving above').map((p) => ({ ...p, dir: TRUCK })),
  { name: 'flag', dir: TRUCK, prompt: `A single cute black-and-white checkered finish flag on a little wooden pole, friendly and inviting, a tiny sparkle. ${SPRITE}. ${STYLE}.` },
  {
    name: 'backdrop', dir: SPACE, size: '1536x1024', transparent: false,
    prompt: `A wide, empty cute outer-space planet-surface background for a toddler game: deep soft blue-purple starry sky with gentle little stars, a couple of small friendly planets and a moon in the distance, a rolling pale lavender planet ground with soft round craters in the foreground. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  ...poses('astro', SPACE_CHAR, 'both hands raised holding a shiny gold star above its head').map((p) => ({ ...p, dir: SPACE })),
  { name: 'star', dir: SPACE, prompt: `A single cute shiny gold five-pointed star with a happy soft glow and little sparkles, friendly and inviting. ${SPRITE}. ${STYLE}.` },
];

async function gen(a) {
  const isPose = !!a.char;
  const prompt = isPose ? `A cute ${a.prompt}. ${a.char}. ${SPRITE}. ${STYLE}.` : a.prompt;
  const body = { model: 'gpt-image-1', prompt, size: a.size || '1024x1024', n: 1, output_format: 'png', quality: 'high' };
  if (a.transparent !== false) body.background = 'transparent';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${a.name}: HTTP ${res.status} ${await res.text()}`);
  const b64 = (await res.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error(`${a.name}: no image`);
  writeFileSync(new URL(`${a.name}.png`, a.dir), Buffer.from(b64, 'base64'));
  console.log(`OK ${a.dir === TRUCK ? 'truck' : 'space'}/${a.name}.png`);
}

const only = process.argv.slice(2);
const todo = only.length ? assets.filter((a) => only.includes(a.name)) : assets;
console.log(`Generating ${todo.length} asset(s)...`);
for (const a of todo) { try { await gen(a); } catch (e) { console.error('FAIL', e.message); } }
console.log('done');
