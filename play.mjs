// Temporary driver: plays L1, advances to L2, and shows order-matters there.
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
    { timeout: 9000 },
  );

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.token');
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

console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('DONE');
