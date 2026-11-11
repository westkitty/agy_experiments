import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const sceneNum = args[0] || '01';
const targetTime = parseFloat(args[1] || '25.0');
const outFileName = args[2] || `test_scene_${sceneNum}.png`;

const SCREENSHOT_DIR = '/tmp/impossible_cinema_tests';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testScene() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1280,720',
      '--disable-gpu-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
      console.error('[BROWSER ERROR]', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
    console.error('[PAGE ERROR]', err.message);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Select scene
  await page.select('#scene-selector', sceneNum);
  await new Promise(r => setTimeout(r, 1200));

  // Set scene time
  await page.evaluate((t) => {
    const app = window.__CINEMA_APP__ || window.app;
    if (app) {
      app.sceneElapsedTime = t;
    }
  }, targetTime);

  // Wait a few frames for render
  await new Promise(r => setTimeout(r, 600));

  const outPath = path.join(SCREENSHOT_DIR, outFileName);
  await page.screenshot({ path: outPath });
  console.log(`Rendered Scene ${sceneNum} at t=${targetTime}s to ${outPath}`);

  await browser.close();

  if (errors.length > 0) {
    console.error(`Verification FAILED with ${errors.length} errors:`, errors);
    process.exit(1);
  } else {
    console.log('Verification PASSED: 0 console or page errors.');
    process.exit(0);
  }
}

testScene().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
