import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/tmp/impossible_cinema_tests';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAcceptanceTests() {
  console.log('=== STARTING IMPOSSIBLE CINEMA VERIFICATION SUITE ===');

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
    } else {
      console.log('[BROWSER LOG]', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
    console.error('[PAGE ERROR]', err.message);
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Check DOM elements
  const canvasExists = await page.$('#webgl-canvas') !== null;
  const selectorExists = await page.$('#scene-selector') !== null;
  const veilExists = await page.$('#transition-veil') !== null;
  console.log(`DOM Check: Canvas=${canvasExists}, Selector=${selectorExists}, Veil=${veilExists}`);

  // Check selector options
  const options = await page.$$eval('#scene-selector option', opts => opts.map(o => ({ value: o.value, text: o.text })));
  console.log(`Selector Options Count: ${options.length}`);
  options.forEach((opt, idx) => {
    console.log(`  [Option ${idx}]: ${opt.value} -> "${opt.text}"`);
  });

  // Verify each of the 10 scenes
  const sceneValues = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

  for (const sceneVal of sceneValues) {
    console.log(`\nTesting Scene ${sceneVal}...`);
    // Select scene
    await page.select('#scene-selector', sceneVal);

    // Wait for transition veil to fade in and out (total 1.5s)
    await new Promise(r => setTimeout(r, 1500));

    // Capture early frame
    const earlyPath = path.join(SCREENSHOT_DIR, `scene_${sceneVal}_early.png`);
    await page.screenshot({ path: earlyPath });
    console.log(`  Saved: ${earlyPath}`);

    // Fast-forward / wait for climax frame (~30s into the scene)
    await page.evaluate(() => {
      // Access app and simulate elapsed time to 32s for climax
      const app = window.__CINEMA_APP__;
      if (app) {
        app.sceneElapsedTime = 32.0;
      }
    });

    await new Promise(r => setTimeout(r, 500));
    const climaxPath = path.join(SCREENSHOT_DIR, `scene_${sceneVal}_climax.png`);
    await page.screenshot({ path: climaxPath });
    console.log(`  Saved: ${climaxPath}`);
  }

  // Test Autoplay All selection
  console.log('\nTesting Autoplay All Mode...');
  await page.select('#scene-selector', 'autoplay');
  await new Promise(r => setTimeout(r, 1000));
  const autoplayPath = path.join(SCREENSHOT_DIR, `autoplay_mode.png`);
  await page.screenshot({ path: autoplayPath });
  console.log(`  Saved: ${autoplayPath}`);

  // Test window resizing
  console.log('\nTesting Responsive Resize...');
  await page.setViewport({ width: 800, height: 1000 }); // Mobile portrait
  await new Promise(r => setTimeout(r, 500));
  const mobilePath = path.join(SCREENSHOT_DIR, `responsive_mobile.png`);
  await page.screenshot({ path: mobilePath });
  console.log(`  Saved: ${mobilePath}`);

  await browser.close();

  console.log('\n=== ACCEPTANCE TEST SUMMARY ===');
  console.log(`Total Errors Logged: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors encountered:');
    errors.forEach(e => console.error('  ', e));
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED WITH 0 ERRORS!');
  }
}

runAcceptanceTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
