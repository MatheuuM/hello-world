const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit, devices } = require('playwright');
const origin = 'http://127.0.0.1:8077';
const output = path.join(__dirname, 'screenshots');
require('node:fs').mkdirSync(output, { recursive: true });
const viewports = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['iphone', devices['iPhone 15']],
  ['compacto', { ...devices['iPhone 15'], viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 }],
  ['paisagem', { ...devices['iPhone 15'], viewport: { width: 844, height: 390 } }],
];

async function settled(page, target) {
  await page.waitForFunction(t => {
    const runtime = window.__MOVVA_QA__;
    return runtime?.settled && Math.abs(runtime.progress - t) < .0005;
  }, target);
}

async function test(browser, engine, [label, viewport]) {
  const context = await browser.newContext(viewport);
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) errors.push(response.url() + ' ' + response.status());
    });
    const response = await page.goto(origin, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await settled(page, 0);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.scene').count(), 7);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://www.movvawellness.com.br/');
    assert.equal(await page.locator('meta[name=robots]').count(), 0);
    const screenshot = n => page.screenshot({ path: path.join(output, n + '.jpg'), quality: 86, scale: 'css' });
    if (engine === 'chromium' && (label === 'desktop' || label === 'iphone')) {
      await screenshot('movva-abertura-' + label);
    }

    await page.locator('.hero-cta').click();
    await settled(page, .18);
    assert.equal(new URL(page.url()).hash, '#connected');
    await page.locator('.chapter-dots a[href="#training"]').click();
    await settled(page, .33);
    assert.equal(new URL(page.url()).hash, '#training');
    await page.goBack();
    await settled(page, .18);
    await page.goForward();
    await settled(page, .33);
    await page.goto(origin + '/#nutrition', { waitUntil: 'load' });
    await settled(page, .48);
    assert.equal(await page.locator('#nutrition').getAttribute('aria-hidden'), 'false');
    for (const progress of [.66, .83, .97, .66, .48, .33, 0]) {
      await page.evaluate(value => window.__MOVVA_QA__.setProgress(value), progress);
      await settled(page, progress);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.locator('.nav-cta').click();
    await page.waitForFunction(() => {
      const launch = document.querySelector('#launch').getBoundingClientRect();
      return launch.top >= 0 && launch.top <= innerHeight / 2;
    });
    assert.equal(new URL(page.url()).hash, '#launch');
    const launch = page.locator('#launch');
    assert.equal(await launch.locator('a[href^="mailto:"]').getAttribute('href'), 'mailto:suporte@movvawellness.com.br?subject=Quero%20saber%20do%20lan%C3%A7amento%20da%20MOVVA');
    assert.equal(await launch.locator('a[href="/support/"]').count(), 1);
    if (engine === 'chromium' && (label === 'desktop' || label === 'iphone')) {
      await launch.screenshot({ path: path.join(output, 'movva-lancamento-' + label + '.jpg'), quality: 86, scale: 'css' });
    }
    await launch.locator('.replay').click();
    await settled(page, 0);
    assert.deepEqual(errors, []);
    console.log(engine + ' ' + label + ' OK');
  } finally { await context.close(); }
}

(async () => {
  await Promise.all([['chromium', chromium], ['webkit', webkit]].map(async ([engine, type]) => {
    const browser = await type.launch();
    try {
      for (const viewport of viewports) await test(browser, engine, viewport);
      const context = await browser.newContext({ ...devices['iPhone 15'], javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(origin + '/#nutrition', { waitUntil: 'load' });
      assert.equal(await page.locator('#nutrition').isVisible(), true);
      assert.equal(await page.locator('.static-shot').count(), 6);
      for (const destination of ['privacy/', 'terms/', 'support/', 'robots.txt', 'sitemap.xml', 'assets/compartilhar-movva.jpg']) {
        assert.equal((await context.request.get(origin + '/' + destination)).status(), 200, destination);
      }
      await context.close();
      console.log(engine + ' sem JavaScript e rotas estáticas OK');
    } finally { await browser.close(); }
  }));
})().catch(error => { console.error(error); process.exitCode = 1; });
