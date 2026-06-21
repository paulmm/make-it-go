// Temporary driver: plays Level 1 headlessly and screenshots the key states.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = 'http://localhost:5180/';
const OUT = '/tmp/mig-shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 920, height: 1180 }, deviceScaleFactor: 2 });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const waitForSay = (needle) =>
  page.waitForFunction(
    (s) => document.querySelector('.partner-say')?.textContent?.includes(s) ?? false,
    needle,
    { timeout: 8000 },
  );

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.token');
await page.screenshot({ path: `${OUT}/1-initial.png` });

// Exercise scene interactions (catch runtime errors; capture a mid-effect frame).
for (const sel of ['.sun', '.hero.clickable', '.tile-interactive']) {
  await page.click(sel, { timeout: 2000 }).catch((e) => console.log('click skip', sel, e.message.split('\n')[0]));
}
await page.waitForTimeout(180);
await page.screenshot({ path: `${OUT}/1b-interact.png` });

// Winning plan: hop, big jump, hop
await page.click('button[aria-label="Add a hop"]');
await page.click('button[aria-label="Add a big jump"]');
await page.click('button[aria-label="Add a hop"]');
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/2-built.png` });

await page.click('button[aria-label="Go"]');
await waitForSay('You did it');
await page.waitForTimeout(550);
await page.screenshot({ path: `${OUT}/3-win.png` });
console.log('WIN:', JSON.stringify(await page.textContent('.partner-say')));

// Wrong plan: hop, hop -> splash
await page.click('button[aria-label="Clear all steps"]');
await page.click('button[aria-label="Add a hop"]');
await page.click('button[aria-label="Add a hop"]');
await page.click('button[aria-label="Go"]');
await waitForSay('Splash');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/4-splash.png` });
console.log('SPLASH:', JSON.stringify(await page.textContent('.partner-say')));

console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('DONE');
