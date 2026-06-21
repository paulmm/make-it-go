// Temporary driver: plays Level 1 (event-point model) and screenshots the key states.
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
await page.screenshot({ path: `${OUT}/1-initial.png` });

// Win: pick Jump for the gap.
await page.click('button[aria-label="Jump"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/2-built.png` });
await page.click('button[aria-label="Go"]');
await page.waitForTimeout(900); // mid-run: walking / jumping
await page.screenshot({ path: `${OUT}/2c-running.png` });
await waitForSay('You did it');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/3-win.png` });
console.log('WIN:', JSON.stringify(await page.textContent('.partner-say')));

// Redundant: Jump then an extra Climb -> reaches the goal but is not a clean win.
await page.click('button[aria-label="Clear all steps"]');
await page.click('button[aria-label="Jump"]');
await page.click('button[aria-label="Climb"]');
await page.click('button[aria-label="Go"]');
await waitForSay('extra');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/3b-redundant.png` });
console.log('REDUNDANT:', JSON.stringify(await page.textContent('.partner-say')));

// Stumble: pick Climb (wrong action for a gap).
await page.click('button[aria-label="Clear all steps"]');
await page.click('button[aria-label="Climb"]');
await page.click('button[aria-label="Go"]');
await waitForSay('stumbled');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/4-stumble.png` });
console.log('STUMBLE:', JSON.stringify(await page.textContent('.partner-say')));

console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('DONE');
