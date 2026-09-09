import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];

page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 45000 });
if (!response || !response.ok()) throw new Error(`HTTP load failed: ${response?.status()}`);

await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });
await page.waitForTimeout(1800);

const title = await page.title();
if (!title.includes('郷野の家')) throw new Error(`Unexpected title: ${title}`);

const canvasBox = await page.locator('canvas').boundingBox();
if (!canvasBox || canvasBox.width < 800 || canvasBox.height < 500) {
  throw new Error(`Canvas is not full-screen: ${JSON.stringify(canvasBox)}`);
}

const startVisible = await page.locator('#startScreen').isVisible();
if (!startVisible) throw new Error('Start screen is not visible.');

await page.screenshot({ path: 'smoke.png', fullPage: true });

if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
console.log('Browser smoke test passed.');
