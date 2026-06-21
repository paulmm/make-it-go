// Generates new theme sprite sets (Dino, Princess) via the OpenAI Images API (gpt-image-1).
// Each theme reuses the shared obstacles + sun/hand; this makes a backdrop, 10 hero poses,
// and the goal. Original art only — no branded or licensed characters. Key from .env.local.
//   node scripts/generate-themes.mjs                 # all
//   node scripts/generate-themes.mjs dino-jump crown # one or several by name
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const DINO = new URL('../src/themes/assets/dino/', import.meta.url);
const ROYAL = new URL('../src/themes/assets/princess/', import.meta.url);
mkdirSync(DINO, { recursive: true });
mkdirSync(ROYAL, { recursive: true });

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
if (!KEY) {
  console.error('No OPENAI_API_KEY found in environment or .env.local');
  process.exit(1);
}

const STYLE =
  "soft modern children's picture-book illustration, gentle cel shading with smooth gradients, warm soft rim lighting, rounded chunky friendly shapes, thick soft clean outlines, cozy pastel storybook palette, subtle paper grain, highly polished, cute and wholesome";
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const DINO_CHAR =
  'the SAME character every time: a small, round, chubby baby dinosaur, soft mint-green skin with a paler cream belly, a gently long neck, big round friendly dark eyes with a white highlight, tiny rounded ridges along its back, short stubby legs, a small friendly smile, chubby and adorable';
const ROYAL_CHAR =
  'the SAME character every time: a cute original cartoon toddler princess, round friendly face with rosy cheeks and big sparkly dark eyes, warm light-brown hair in a simple low bun, a small simple gold tiara, a puffy pastel-pink gown, an ORIGINAL wholesome design — NOT based on any existing, branded, or copyrighted character, no logos, no recognizable likeness';

const poses = (key, char, holds) => [
  { name: `${key}-idle`, prompt: `standing happily, three-quarter view facing right, calm and friendly, looking forward` },
  { name: `${key}-walk`, prompt: `walking forward to the right, mid-stride, cheerful and bouncy` },
  { name: `${key}-jump`, prompt: `leaping forward to the right, body stretched out mid-air, excited happy face` },
  { name: `${key}-duck`, prompt: `crouching down low to duck under something, body lowered close to the ground, peeking forward, side profile facing right` },
  { name: `${key}-climb`, prompt: `clambering up and over a small ledge, gripping the top and pulling itself up, determined happy face, side profile facing right` },
  { name: `${key}-grab`, prompt: `bending down and reaching forward to pick something up off the ground, focused happy face, side profile facing right` },
  { name: `${key}-open`, prompt: `pushing forward, leaning into a gentle push to open something in front of it, determined happy face, side profile facing right` },
  { name: `${key}-stumble`, prompt: `tripping and tumbling off-balance, a few little swirly stars spinning above its head, surprised but unhurt and still adorable. Completely dry, NO water` },
  { name: `${key}-splash`, prompt: `sitting in a little splash of water, wet and surprised but still adorable, water droplets around it, sheepish expression, NOT scared` },
  { name: `${key}-cheer`, prompt: `cheering with joy, ${holds}, eyes happy and closed in a big smile` },
].map((p) => ({ ...p, char }));

const assets = [
  // Dino
  {
    name: 'backdrop',
    dir: DINO,
    size: '1536x1024',
    transparent: false,
    prompt: `A wide, empty prehistoric jungle scene background for a toddler game: soft hazy green-blue sky, a few fluffy clouds, distant rounded hills and a gentle far-off volcano, lush ferns and big friendly leaves along the edges, a flat grassy foreground. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  ...poses('dino', DINO_CHAR, 'holding a big fresh green leaf up high').map((p) => ({ ...p, dir: DINO })),
  { name: 'leaf', dir: DINO, prompt: `A single cute little sprig of fresh green leaves, friendly and inviting, a tiny sparkle. ${SPRITE}. ${STYLE}.` },
  // Princess (original)
  {
    name: 'backdrop',
    dir: ROYAL,
    size: '1536x1024',
    transparent: false,
    prompt: `A wide, empty fairytale castle scene background for a toddler game: soft pink and lavender sky with a few fluffy clouds, a pretty turreted storybook castle on a distant green hill, a rolling flowery meadow foreground. An ORIGINAL generic castle — no logos, no banners. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  ...poses('princess', ROYAL_CHAR, 'both hands raised holding a sparkling pink gem above her head').map((p) => ({ ...p, dir: ROYAL })),
  { name: 'jewel', dir: ROYAL, prompt: `A single cute sparkling pink heart-shaped gem, friendly and inviting, a soft glow and little sparkles. ${SPRITE}. ${STYLE}.` },
];

async function gen(a) {
  const isPose = !!a.char;
  const prompt = isPose ? `A cute ${a.prompt}. ${a.char}. ${SPRITE}. ${STYLE}.` : a.prompt;
  const body = { model: 'gpt-image-1', prompt, size: a.size || '1024x1024', n: 1, output_format: 'png', quality: 'high' };
  if (a.transparent !== false) body.background = 'transparent';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${a.name}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${a.name}: no image in response`);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(new URL(`${a.name}.png`, a.dir), buf);
  const where = a.dir === DINO ? 'dino' : 'princess';
  console.log(`OK  ${where}/${a.name}.png  (${Math.round(buf.length / 1024)} KB)`);
}

const only = process.argv.slice(2);
const todo = only.length ? assets.filter((a) => only.includes(a.name)) : assets;
console.log(`Generating ${todo.length} theme asset(s)...`);
for (const a of todo) {
  try {
    await gen(a);
  } catch (e) {
    console.error('FAIL', e.message);
  }
}
console.log('done');
