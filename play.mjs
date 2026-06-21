// Temporary driver: plays L1, advances to L2, and shows order-matters there.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = 'http://localhost:5180/';
const OUT = '/tmp/mig-shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 880, height: 1100 }, deviceScaleFactor: 1 });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const waitForSay = (needle) =>
  page.waitForFunction(
    (s) => document.querySelector('.partner-say')?.textContent?.includes(s) ?? false,
    needle,
    { timeout: 9000 },
  );

// Guards the hero-sprite sizing: the sprite img must fill its .hero container, not
// shrink to a sliver. Catches the class-collision regression (sprite `hero` modifier
// matching the `.hero` container rule) that rendered the hero at 16% of its box.
const assertHeroSized = async (where) => {
  const ratio = await page.evaluate(() => {
    const c = document.querySelector('.hero');
    const img = document.querySelector('.hero-inner .sprite');
    if (!c || !img) return 0;
    return img.getBoundingClientRect().width / c.getBoundingClientRect().width;
  });
  if (ratio < 0.8) throw new Error(`Hero sprite too small at ${where}: ${ratio.toFixed(2)} of container`);
  console.log(`HERO SIZE OK (${where}): ${ratio.toFixed(2)}`);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.picker-tile');
await page.screenshot({ path: `${OUT}/0-picker.png` });
await page.click('button[aria-label="Bunny Meadow"]');
await page.waitForSelector('.token');
await assertHeroSized('meadow L1');
await page.screenshot({ path: `${OUT}/L1-1-initial.png` });

// L1: clean win with Jump.
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Go"]');
await waitForSay('You did it');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/L1-2-win.png` });
console.log('L1 WIN:', JSON.stringify(await page.textContent('.partner-say')));

// Advance to L2.
await page.click('button[aria-label="Next level"]');
await page.waitForTimeout(450);
await page.screenshot({ path: `${OUT}/L2-1-initial.png` });
console.log('L2 INTRO:', JSON.stringify(await page.textContent('.partner-say')));

// L2 step stumble: Jump, Jump -> wrong action at the STEP -> dry trip (not wet).
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Go"]');
await waitForSay('stumbl');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/L2-2-stepstumble.png` });
console.log('L2 STEP STUMBLE:', JSON.stringify(await page.textContent('.partner-say')));

// L2 gap stumble: Climb at the gap -> wet splash.
await page.click('button[aria-label="Clear all steps"]');
await page.click('button[aria-label="Climb"]');
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Go"]');
await waitForSay('stumbl');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/L2-2b-gapstumble.png` });
console.log('L2 GAP STUMBLE:', JSON.stringify(await page.textContent('.partner-say')));

// L2 correct order: Jump, Climb -> win.
await page.click('button[aria-label="Clear all steps"]');
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Climb"]');
await page.click('button[aria-label="Go"]');
await waitForSay('You did it');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/L2-3-win.png` });
console.log('L2 WIN:', JSON.stringify(await page.textContent('.partner-say')));

// Fox theme: reload, pick Forest Fox, see its Level 1.
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.picker-tile');
await page.click('button[aria-label="Forest Fox"]');
await page.waitForSelector('.token');
await assertHeroSized('fox L1');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/FOX-1-initial.png` });
console.log('FOX INTRO:', JSON.stringify(await page.textContent('.partner-say')));

console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('DONE');
