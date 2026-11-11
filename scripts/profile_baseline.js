import puppeteer from 'puppeteer-core';

async function profileScenes() {
  console.log('=== ESTABLISHING BEFORE PERFORMANCE BASELINE ===');

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
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Test scenes: 01, 03, 05, 08, 09
  const testScenes = ['01', '03', '05', '08', '09'];
  const metrics = {};

  for (const sceneVal of testScenes) {
    await page.select('#scene-selector', sceneVal);
    // Wait for transition to complete
    await new Promise(r => setTimeout(r, 1200));

    // Profile 60 frames inside the browser
    const result = await page.evaluate(async () => {
      const app = window.__CINEMA_APP__;
      if (!app || !app.renderer) return null;

      const frameTimes = [];
      let lastTime = performance.now();

      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const now = performance.now();
        frameTimes.push(now - lastTime);
        lastTime = now;
      }

      frameTimes.sort((a, b) => a - b);
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const p95FrameTime = frameTimes[Math.floor(frameTimes.length * 0.95)];
      const fps = 1000 / avgFrameTime;

      const info = app.renderer.info;
      return {
        fps: Math.round(fps * 10) / 10,
        avgFrameTime: Math.round(avgFrameTime * 100) / 100,
        p95FrameTime: Math.round(p95FrameTime * 100) / 100,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures
      };
    });

    metrics[sceneVal] = result;
    console.log(`Scene ${sceneVal}:`, JSON.stringify(result));
  }

  // Test memory leakage across 15 scene switches
  console.log('\nTesting GPU Resource Stability across 15 switches...');
  const switchGeoHistory = [];
  for (let s = 1; s <= 15; s++) {
    const val = String((s % 10) + 1).padStart(2, '0');
    await page.select('#scene-selector', val);
    await new Promise(r => setTimeout(r, 900));
    const geoCount = await page.evaluate(() => window.__CINEMA_APP__?.renderer.info.memory.geometries || 0);
    switchGeoHistory.push(geoCount);
  }
  console.log('Geometry count across switches:', switchGeoHistory);

  await browser.close();
  console.log('\n=== BASELINE METRICS CAPTURED ===');
}

profileScenes().catch(console.error);
