const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit, devices } = require('playwright');
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:8077';
const output = path.resolve(process.env.QA_OUTPUT || 'qa-launch');
require('node:fs').mkdirSync(output, { recursive: true });
const viewports = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['iphone', { ...devices['iPhone 15'], viewport: { width: 393, height: 852 } }],
  ['compacto', { ...devices['iPhone 15'], viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 }],
  ['paisagem', { ...devices['iPhone 15'], viewport: { width: 844, height: 390 } }],
];

async function settled(page, target) {
  await page.waitForFunction(t => {
    const runtime = window.__MOVVA_QA__;
    return runtime?.settled && Math.abs(runtime.progress - t) < .0005;
  }, target, { timeout: 24000 }).catch(async error => {
    const current = await page.evaluate(() => ({
      hash: location.hash,
      scroll: scrollY,
      progress: window.__MOVVA_QA__?.progress
    }));
    throw new Error('Capítulo esperado ' + target + ', estado ' + JSON.stringify(current), { cause: error });
  });
}

async function verifyBench(page, label, capture) {
  const demo = page.locator('.bench-demo');
  const frames = [];
  const fingerprints = [];
  for (const progress of [.348, .375, .404, .375]) {
    await page.evaluate(value => window.__MOVVA_QA__.setProgress(value), progress);
    await settled(page, progress);
    await page.waitForFunction(() => document.querySelector('.bench-demo').classList.contains('bench-frames-ready'));
    const sample = await demo.locator('canvas').evaluate(canvas => {
      const {width, height} = canvas;
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      let hash = 0;
      for (let i = 0; i < pixels.length; i += 13) hash = Math.imul(hash ^ pixels[i], 16777619);
      return {frame: Number(canvas.dataset.frame), hash};
    });
    frames.push(sample.frame);
    fingerprints.push(sample.hash);
  }
  assert.ok(frames[0] < frames[1] && frames[1] < frames[2], 'Supino não avançou com a rolagem');
  assert.equal(frames[1], frames[3], 'Voltar a rolagem deve revelar o mesmo quadro');
  assert.equal(new Set(fingerprints.slice(0, 3)).size, 3, 'O supino deve mudar os pixels do canvas');
  assert.equal(fingerprints[1], fingerprints[3], 'Retroceder precisa devolver a mesma imagem');

  const picture = await demo.locator('.bench-visual').boundingBox();
  const caption = await demo.locator('figcaption').boundingBox();
  const chapters = await page.locator('.chapter-bar').boundingBox();
  const header = await page.locator('header').boundingBox();
  assert.ok(picture.height >= 110 && picture.y >= header.y + header.height - 1, 'Enquadramento do supino');
  assert.ok(caption.y + caption.height <= chapters.y, 'Legenda do supino invade a navegação');
  await capture('supino-' + label);
  if (label === 'desktop') {
    const scrollOrigin = await page.evaluate(() => scrollY);
    await page.mouse.move(650, 480);
    await page.mouse.wheel(0, 106);
    await page.waitForFunction(({y, frame}) =>
      scrollY > y + 70 && Number(document.querySelector('.bench-demo canvas').dataset.frame) > frame + 4,
    {y: scrollOrigin, frame: frames[1]});
    await page.mouse.wheel(0, -106);
    await page.waitForFunction(({y, frame}) =>
      Math.abs(scrollY - y) < 2 &&
      Number(document.querySelector('.bench-demo canvas').dataset.frame) === frame,
    {y: scrollOrigin, frame: frames[1]});
  }
}

async function test(browser, engine, [label, viewport]) {
  console.log('QA', engine, label);
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
    await screenshot(engine + '-abertura-' + label);
    if (label === 'paisagem') {
      const cta = await page.locator('.hero-cta').boundingBox();
      const chapters = await page.locator('.chapter-bar').boundingBox();
      assert.ok(cta.y + cta.height <= chapters.y, 'CTA invadiu a navegação de capítulos');
    }

    if (label === 'desktop') {
      const hero = page.locator('.hero-cta');
      await hero.focus();
      await page.keyboard.press('Enter');
    } else {
      await page.locator('.hero-cta').click();
    }
    await settled(page, .18);
    assert.equal(new URL(page.url()).hash, '#connected');
    await page.locator('.chapter-dots a[href="#training"]').click();
    await settled(page, .33);
    assert.equal(new URL(page.url()).hash, '#training');
    const pause = page.getByRole('button', { name: 'Pausar supino' });
    await pause.waitFor();
    await page.waitForFunction(() => Number(document.querySelector('.bench-demo canvas').dataset.frame) >= 8);
    await pause.click();
    await page.getByRole('button', { name: 'Reproduzir supino' }).waitFor();
    await page.goBack();
    await settled(page, .18);
    await page.goForward();
    await settled(page, .33);
    await page.goto(origin + '/#nutrition', { waitUntil: 'load' });
    await settled(page, .48);
    assert.equal(await page.locator('#nutrition').getAttribute('aria-hidden'), 'false');
    for (const progress of [.70, .86, .98, .66, .52, .365, 0]) {
      await page.evaluate(value => window.__MOVVA_QA__.setProgress(value), progress);
      await settled(page, progress);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (label === 'paisagem' && [.70, .86, .98, .52, .365].includes(progress)) {
        const copy = await page.locator('.scene[aria-hidden="false"] .copy').boundingBox();
        const chapters = await page.locator('.chapter-bar').boundingBox();
        assert.ok(copy.y + copy.height <= chapters.y, 'Conteúdo invadiu a navegação em ' + progress);
      }
      if ((label === 'desktop' || label === 'iphone') && (progress === .365 || progress === .52)) {
        const name = progress === .365 ? 'training' : 'nutrition';
        const screen = page.locator('.css3d-screen-' + name);
        await screen.evaluate(img => img.decode());
        assert.equal(await screen.evaluate(img => img.naturalWidth), 804);
        await page.waitForFunction(name => Number(getComputedStyle(document.querySelector('.css3d-screen-' + name)).opacity) > .95, name);
        await screenshot(engine + '-' + name + '-' + label);
      }
    }
    await verifyBench(page, label, name => screenshot(engine + '-' + name));
    await page.evaluate(() => window.__MOVVA_QA__.setProgress(0));
    await settled(page, 0);
    await page.locator('.nav-cta').click();
    await page.waitForFunction(() => {
      const launch = document.querySelector('#launch').getBoundingClientRect();
      return launch.top >= -1 && launch.top <= innerHeight / 2;
    });
    assert.equal(new URL(page.url()).hash, '#launch');
    const launch = page.locator('#launch');
    assert.equal(await launch.locator('.animated-link').isVisible(), false);
    assert.equal(await launch.locator('a[href^="/?visual=estatico"]').isVisible(), true);
    assert.equal(await launch.locator('a[href^="mailto:"]').getAttribute('href'), 'mailto:suporte@movvawellness.com.br?subject=Quero%20saber%20do%20lan%C3%A7amento%20da%20MOVVA');
    assert.equal(await launch.locator('a[href="/support/"]').count(), 1);
    if (label === 'desktop' || label === 'iphone') {
      await launch.screenshot({ path: path.join(output, engine + '-lancamento-' + label + '.jpg'), quality: 86, scale: 'css' });
    }
    await launch.locator('.replay').click();
    await settled(page, 0);
    if (label === 'desktop') {
      const keyboard = await context.newPage();
      await keyboard.goto(origin, { waitUntil: 'load' });
      await settled(keyboard, 0);
      await keyboard.keyboard.press('Tab');
      assert.equal(await keyboard.evaluate(() => document.activeElement.className), 'skip');
      await keyboard.keyboard.press('Enter');
      await keyboard.waitForFunction(() => document.activeElement.id === 'overview');
      await keyboard.close();
    }
    if (label === 'iphone') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => window.MOVVA_3D_STATUS().active), true);
      await page.evaluate(() => window.__MOVVA_QA__.setProgress(.375));
      await settled(page, .375);
      assert.equal(await page.locator('.bench-frames-ready').count(), 0);
      await page.getByRole('button', { name: 'Reproduzir supino' }).click();
      await page.getByRole('button', { name: 'Pausar supino' }).waitFor();
      assert.equal(await page.locator('.bench-frames-ready').count(), 1);
      await page.goto(origin + '/?visual=estatico#nutrition', { waitUntil: 'load' });
      assert.equal(await page.locator('html.enhanced').count(), 0);
      assert.equal(await page.locator('#nutrition .static-shot').isVisible(), true);
      assert.equal(await page.locator('.animated-link').isVisible(), true);
      assert.equal(await page.locator('#launch .static-link:visible').count(), 0);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
      await page.locator('.animated-link').click();
      await settled(page, 0);
    }
    assert.deepEqual(errors, []);
    console.log(engine + ' ' + label + ' OK');
  } finally { await context.close(); }
}

(async () => {
  await Promise.all([['chromium', chromium], ['webkit', webkit]].map(async ([engine, type]) => {
    if (process.env.QA_ENGINE && engine !== process.env.QA_ENGINE) return;
    const browser = await type.launch();
    try {
      for (const viewport of viewports) {
        if (!process.env.QA_VIEWPORT || viewport[0] === process.env.QA_VIEWPORT) await test(browser, engine, viewport);
      }
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
