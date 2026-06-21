// Generates the "Forest Fox" theme sprite set via the OpenAI Images API (gpt-image-1).
// Reuses meadow's generic obstacles + sun/hand; generates a forest backdrop, 8 fox
// poses, and the acorn goal. Key read from .env.local (OPENAI_API_KEY=...).
//   node scripts/generate-fox.mjs            # all
//   node scripts/generate-fox.mjs fox-jump   # one or several
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = new URL('../src/themes/assets/fox/', import.meta.url);
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

const STYLE =
  "soft modern children's picture-book illustration, gentle cel shading with smooth gradients, warm soft rim lighting, rounded chunky friendly shapes, thick soft clean outlines, cozy pastel storybook palette, subtle paper grain, highly polished, cute and wholesome";
const CHAR =
  'the SAME character every time: a small cute red-orange fox cub with a fluffy white-tipped tail, big pointy ears with cream insides, white cheeks and chest, large round dark friendly eyes with a highlight, a tiny black nose, chubby and adorable';
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const assets = [
  {
    name: 'backdrop',
    size: '1536x1024',
    transparent: false,
    prompt: `A wide, empty autumn forest scene background for a toddler game: soft warm sky, a few fluffy clouds, rolling hills lined with cozy autumn trees in orange, red and gold, a grassy forest-floor foreground with a few little mushrooms and fallen leaves. NO sun, NO characters, NO stepping stones, NO water, lots of calm open space at the bottom. ${STYLE}.`,
  },
  { name: 'fox-idle', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub standing happily, three-quarter view facing right, calm and friendly. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-walk', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub trotting forward to the right, mid-stride, cheerful and bouncy. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-jump', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub leaping forward to the right, body stretched out mid-air, tail streaming behind, excited happy face. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-duck', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub crouched down low to duck under something, body flattened close to the ground, ears laid back, peeking forward, side profile. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-climb', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub climbing up and over a small ledge, front paws gripping the top and pulling itself up, determined happy face, side profile. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-stumble', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub tripping and tumbling off-balance, with a few little swirly stars spinning above its head, surprised but unhurt. Completely dry, NO water. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-splash', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub sitting in a little splash of water, wet and surprised but still adorable, water droplets around it, sheepish expression, NOT scared. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'fox-cheer', size: '1024x1024', transparent: true, prompt: `A cute baby fox cub cheering with joy, both front paws raised holding a shiny golden acorn above its head, eyes happy and closed in a big smile. ${CHAR}. ${SPRITE}. ${STYLE}.` },
  { name: 'acorn', size: '1024x1024', transparent: true, prompt: `A single cute plump golden-brown acorn with a little textured cap, friendly and inviting, a tiny sparkle. ${SPRITE}. ${STYLE}.` },
];

async function gen(a) {
  const body = { model: 'gpt-image-1', prompt: a.prompt, size: a.size, n: 1, output_format: 'png', quality: 'high' };
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
console.log(`Generating ${todo.length} fox asset(s)...`);
for (const a of todo) {
  try {
    await gen(a);
  } catch (e) {
    console.error('FAIL', e.message);
  }
}
console.log('done');
