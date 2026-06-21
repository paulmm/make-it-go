// One-off fixups: regenerate fox-idle with clean eyes, and a cute app favicon.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const FOX = new URL('../src/themes/assets/fox/', import.meta.url);
const PUBLIC = new URL('../public/', import.meta.url);
mkdirSync(PUBLIC, { recursive: true });

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
  console.error('No OPENAI_API_KEY found');
  process.exit(1);
}

const STYLE =
  "soft modern children's picture-book illustration, gentle cel shading with smooth gradients, warm soft rim lighting, rounded chunky friendly shapes, thick soft clean outlines, cozy pastel storybook palette, highly polished, cute and wholesome";
const FOXC =
  'a small cute red-orange fox cub with a fluffy white-tipped tail, big pointy ears with cream insides, white cheeks and chest, BOTH eyes exactly the same clear dark brown with a single white highlight (no tint, no discoloration, no blue), a tiny black nose, chubby and adorable';
const SPRITE =
  'full body, single object, centered, isolated on a fully transparent background, no ground, no cast shadow, no text, no frame';

const assets = [
  {
    name: 'fox-idle',
    dir: FOX,
    transparent: true,
    prompt: `A cute baby fox cub standing happily, three-quarter view facing LEFT, calm and friendly. ${FOXC}. ${SPRITE}. ${STYLE}.`,
  },
  {
    name: 'icon',
    dir: PUBLIC,
    transparent: false,
    prompt: `A cute rounded-square app icon for a children's game: a friendly round cream-white baby bunny face with big upright ears (soft pink inner ears), big sparkly dark eyes with white highlights, tiny pink nose and rosy cheeks, peeking happily, centered on a soft pastel gradient from sky-blue at the top to meadow-green at the bottom, thick soft clean outlines, bold simple shapes that read clearly at tiny sizes, no text. ${STYLE}.`,
  },
];

async function gen(a) {
  const body = { model: 'gpt-image-1', prompt: a.prompt, size: '1024x1024', n: 1, output_format: 'png', quality: 'high' };
  if (a.transparent) body.background = 'transparent';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${a.name}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${a.name}: no image`);
  writeFileSync(new URL(`${a.name}.png`, a.dir), Buffer.from(b64, 'base64'));
  console.log(`OK ${a.name}.png`);
}

for (const a of assets) {
  try {
    await gen(a);
  } catch (e) {
    console.error('FAIL', e.message);
  }
}
console.log('done');
