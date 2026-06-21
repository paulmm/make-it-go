// Generates the Level 4 (key + gate) sprites via the OpenAI Images API (gpt-image-1).
// Shared generic props (key, gate) land in the meadow asset folder, which the fox pack
// already imports from; grab/open hero poses are generated per theme. Key from .env.local.
//   node scripts/generate-l4.mjs            # all
//   node scripts/generate-l4.mjs key gate   # one or several (by name)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const MEADOW = new URL('../src/themes/assets/meadow/', import.meta.url);
const FOX = new URL('../src/themes/assets/fox/', import.meta.url);
mkdirSync(MEADOW, { recursive: true });
mkdirSync(FOX, { recursive: true });

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
const BUNNY =
  'the SAME character every time: a small round fluffy cream-white baby bunny, big upright ears with soft pink inner ears, large round dark sparkly friendly eyes with a white highlight, tiny pink nose, soft rosy cheeks, short stubby paws, chubby and adorable';
const FOXC =
  'the SAME character every time: a small cute red-orange fox cub with a fluffy white-tipped tail, big pointy ears with cream insides, white cheeks and chest, large round dark friendly eyes with a highlight, a tiny black nose, chubby and adorable';
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const assets = [
  // Shared generic props (live in meadow/, imported by both packs).
  {
    name: 'key',
    dir: MEADOW,
    prompt: `A single cute shiny golden key lying flat, a round looped bow at the top and chunky friendly teeth, a soft gleam and a tiny sparkle. ONLY the key — no characters, no animals. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'gate',
    dir: MEADOW,
    prompt: `A single small closed wooden garden gate for a toddler game, chunky rounded pickets with a gently arched top and a little round keyhole, warm honey-brown wood, friendly and inviting, fully closed. ONLY the gate — no fence stretching away, no characters, no animals. ${SPRITE}. ${STYLE}.`,
  },
  // Bunny grab / open.
  {
    name: 'bunny-grab',
    dir: MEADOW,
    prompt: `A cute baby bunny bending down and reaching forward with both front paws open to pick something up off the ground, focused happy face, side profile facing right. ${BUNNY}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'bunny-open',
    dir: MEADOW,
    prompt: `A cute baby bunny pushing forward with both front paws stretched out, leaning into a gentle push to open something in front of it, determined happy face, side profile facing right. ${BUNNY}. ${SPRITE}. ${STYLE}.`,
  },
  // Fox grab / open.
  {
    name: 'fox-grab',
    dir: FOX,
    prompt: `A cute baby fox cub bending down and reaching forward with both front paws open to pick something up off the ground, focused happy face, side profile facing right. ${FOXC}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'fox-open',
    dir: FOX,
    prompt: `A cute baby fox cub pushing forward with both front paws stretched out, leaning into a gentle push to open something in front of it, determined happy face, side profile facing right. ${FOXC}. ${SPRITE}. ${STYLE}.`,
  },
];

async function gen(a) {
  const body = {
    model: 'gpt-image-1',
    prompt: a.prompt,
    size: '1024x1024',
    n: 1,
    output_format: 'png',
    quality: 'high',
    background: 'transparent',
  };
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
  console.log(`OK  ${a.name}.png  (${Math.round(buf.length / 1024)} KB)`);
}

const only = process.argv.slice(2);
const todo = only.length ? assets.filter((a) => only.includes(a.name)) : assets;
console.log(`Generating ${todo.length} L4 asset(s)...`);
for (const a of todo) {
  try {
    await gen(a);
  } catch (e) {
    console.error('FAIL', e.message);
  }
}
console.log('done');
