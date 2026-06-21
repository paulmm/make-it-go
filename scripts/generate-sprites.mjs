// Generates the meadow sprite set via the OpenAI Images API (gpt-image-1).
// Key is read from .env.local (OPENAI_API_KEY=...) or the environment — never hard-coded.
// Usage:
//   node scripts/generate-sprites.mjs              # generate all
//   node scripts/generate-sprites.mjs bunny-hop    # regenerate just one (or several)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = new URL('../src/themes/assets/meadow/', import.meta.url);
mkdirSync(OUT, { recursive: true });

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

// One shared style + character description keeps every asset visually consistent.
const STYLE =
  "soft modern children's picture-book illustration, gentle cel shading with smooth gradients, warm soft rim lighting, rounded chunky friendly shapes, thick soft clean outlines, cozy pastel storybook palette, subtle paper grain, highly polished, cute and wholesome";
const CHAR =
  'the SAME character every time: a small round fluffy cream-white baby bunny, big upright ears with soft pink inner ears, large round dark sparkly friendly eyes with a white highlight, tiny pink nose, soft rosy cheeks, short stubby paws, chubby and adorable';
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const assets = [
  {
    name: 'backdrop',
    size: '1536x1024',
    transparent: false,
    prompt: `A wide, empty meadow scene background for a toddler game: soft blue sky with a gentle gradient, a few fluffy rounded clouds, rolling green hills, a flat grassy meadow foreground, a few tiny wildflowers. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  {
    name: 'bunny-idle',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny standing happily, three-quarter view facing right, calm and friendly, looking forward. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-hop',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny doing a small joyful hop forward to the right, gently airborne, ears bouncing up, little paws tucked, leaning into the hop. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-leap',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny doing a big energetic leap to the right, body stretched out mid-air, ears and paws flung back with motion, excited happy expression. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-splash',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny sitting in a little splash of water, wet and surprised but still adorable, water droplets around it, sheepish expression, NOT scared. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-cheer',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny cheering with joy, both paws raised, holding one bright orange carrot above its head, eyes happy and closed in a big smile. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'stone',
    size: '1024x1024',
    transparent: true,
    prompt: `A single smooth flat-topped stepping stone for a toddler game, warm sandy-tan rock with a soft rounded top a bunny could stand on, a couple of small grass tufts at its base, friendly and chunky. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'water',
    size: '1024x1024',
    transparent: true,
    prompt: `A small friendly pond of clear blue water seen slightly from above, gentle ripples and a few sparkles, one little green lily pad, soft rounded shape. isolated on a fully transparent background, no ground, no text, no frame. ${STYLE}.`,
  },
  {
    name: 'carrot',
    size: '1024x1024',
    transparent: true,
    prompt: `A single plump cute orange carrot with a fresh green leafy top, friendly and inviting, a tiny sparkle. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'sun',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute smiling sun with a soft round face, gentle rosy cheeks, a friendly closed-eye smile, simple rounded rays, warm golden-yellow glow. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'hand',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute cartoon hand pointing straight up with one index finger, soft rounded fingers, gentle peachy skin, simple and friendly, a little "tap here" gesture. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-climb',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny climbing up and over a small ledge, front paws gripping the top and pulling itself up, determined happy face, side profile. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-duck',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny crouched down low to duck under something, body flattened close to the ground, ears laid back, peeking forward, side profile. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'branch',
    size: '1024x1024',
    transparent: true,
    prompt: `A single low tree branch with a few soft round green leaves, arching horizontally. ONLY the branch and leaves — absolutely NO people, NO child, NO animals, NO characters. isolated on a fully transparent background, no ground, no text, no frame. ${STYLE}.`,
  },
  {
    name: 'bunny-stumble',
    size: '1024x1024',
    transparent: true,
    prompt: `A cute baby bunny tripping and tumbling off-balance, with a few little swirly stars spinning above its head, surprised but unhurt and still adorable. Completely dry — NO water, NOT wet. ${CHAR}. ${SPRITE}. ${STYLE}.`,
  },
];

async function gen(a) {
  const body = {
    model: 'gpt-image-1',
    prompt: a.prompt,
    size: a.size,
    n: 1,
    output_format: 'png',
    quality: 'high',
  };
  if (a.transparent) body.background = 'transparent';
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
  writeFileSync(new URL(`${a.name}.png`, OUT), buf);
  console.log(`OK  ${a.name}.png  (${Math.round(buf.length / 1024)} KB)`);
}

const only = process.argv.slice(2);
const todo = only.length ? assets.filter((a) => only.includes(a.name)) : assets;
console.log(`Generating ${todo.length} asset(s)...`);
for (const a of todo) {
  try {
    await gen(a);
  } catch (e) {
    console.error('FAIL', e.message);
  }
}
console.log('done');
