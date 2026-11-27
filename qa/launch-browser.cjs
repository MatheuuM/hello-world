const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit, devices } = require('playwright');
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:8077';
const output = path.resolve(process.env.QA_OUTPUT || 'qa-launch');
require('node:fs').mkdirSync(output, { recursive: true });
const viewports = [
  ['desktop', { viewport: { width: 1920, height: 1080 } }],
  ['janela', { viewport: { width: 648, height: 870 } }],
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

async function verifyImage(page, selector, expectedWidth, expectedHeight) {
  const image = page.locator(selector);
  const size = await image.evaluate(async element => {
    await element.decode();
    return [element.naturalWidth, element.naturalHeight];
  });
  assert.deepEqual(size, [expectedWidth, expectedHeight], selector + ' deve usar a captura atual.');
}

async function scrollToProgress(page, progress, useWheel) {
  const distance = await page.evaluate(p => {
    const experience = document.getElementById('experience');
    const travel = experience.offsetHeight - document.getElementById('stage').clientHeight;
    return Math.round(experience.offsetTop + p * travel) - scrollY;
  }, progress);
  if (distance) {
    // Mobile WebKit does not expose the wheel through Playwright.
    if (useWheel) await page.mouse.wheel(0, distance);
    else await page.evaluate(delta => window.scrollBy(0, delta), distance);
  }
  await settled(page, progress);
}

async function verifyOpening(page, useWheel, capture) {
  const compiled = await page.locator('script[type="module"]').evaluateAll(scripts =>
    scripts.some(script => script.textContent.includes('react-phone-build.js') || script.src.includes('react-phone-build'))
  );
  const supported = compiled && await page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('webgl2');
    probe?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(probe);
  });
  const selector = supported ? '#react-phone.is-ready canvas' : '#css3d-device';
  const display = page.locator(selector);
  await display.waitFor({ timeout: 30000 });
  if (supported) {
    assert.equal(await page.locator('#react-phone.is-ready canvas').count(), 1);
    assert.equal(await page.locator('.hero-react-poster').isVisible(), false);
  }
  const phase = () => page.evaluate(supported => {
    if (supported) return Number(document.querySelector('#react-phone').dataset.yaw);
    const body = document.querySelector('#css3d-object');
    const bodyTransform = getComputedStyle(body).transform;
    const transform = bodyTransform === 'none' ? getComputedStyle(body.querySelector('.css3d-front')).transform : bodyTransform;
    const matrix = new DOMMatrixReadOnly(transform);
    return Math.atan2(-matrix.m13, matrix.m11) * 180 / Math.PI;
  }, supported);
  const firstPhase = await phase();
  assert.ok(Number.isFinite(firstPhase));
  if (useWheel) {
    const { width, height } = page.viewportSize();
    await page.mouse.move(width / 2, height / 2);
  }
  await capture();
  const shortScroll = await page.evaluate(() => 150 /
    (document.querySelector('#experience').offsetHeight - document.querySelector('#stage').clientHeight));
  await scrollToProgress(page, shortScroll, useWheel);
  const forwardPhase = await phase();
  assert.ok(Math.abs(forwardPhase - firstPhase) >= 3, 'Uma rolagem de 150 px deve girar o celular.');
  await page.waitForTimeout(400);
  assert.ok(Math.abs(await phase() - forwardPhase) < .2, 'O celular deve ficar parado até a próxima rolagem.');
  await scrollToProgress(page, 0, useWheel);
  assert.ok(Math.abs(await phase() - firstPhase) < .4, 'Voltar ao início deve recuperar o mesmo ângulo.');
  return { display, node: await display.elementHandle() };
}

async function backdropLuminance(page) {
  const { height } = page.viewportSize();
  const strip = await page.screenshot({
    clip: { x: 2, y: Math.round(height * .2), width: 4, height: Math.round(height * .55) }, scale: 'css'
  });
  return page.evaluate(async encoded => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + encoded;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 9;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 1, 9);
    const { data } = context.getImageData(0, 0, 1, 9);
    const samples = [];
    for (let i = 0; i < data.length; i += 4) {
      samples.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    return samples;
  }, strip.toString('base64'));
}

async function verifyOpeningTransition(page, useWheel) {
  const levels = [];
  for (const progress of [.08, .103, .12, .14, .16, .18]) {
    await scrollToProgress(page, progress, useWheel);
    const samples = await backdropLuminance(page);
    assert.ok(Math.max(...samples) - Math.min(...samples) < 24,
      'Uma borda horizontal dividiu o fundo da abertura em ' + progress);
    levels.push(samples[4]);
    await page.locator('#start, #start .copy, #start h1, .hero-surface, #connected, #connected .copy, #connected h2')
      .evaluateAll(elements => {
        for (const element of elements) {
          if (getComputedStyle(element).clipPath !== 'none') throw new Error('Recorte no título ou aparelho: ' + element.className);
        }
      });
  }
  assert.ok(levels[0] - levels.at(-1) > 100, 'O fundo deveria passar de branco a verde-escuro.');
  assert.ok(levels.slice(1, -1).filter(value => value < levels[0] - 15 && value > levels.at(-1) + 15).length >= 2,
    'A passagem deve incluir tons intermediários.');
}

async function verifyNutrition(page, useWheel) {
  const chapter = page.locator('#nutrition');
  const take = chapter.locator('#nutrition-take');
  const video = take.locator('video[data-scroll-video]');
  assert.equal(await chapter.getAttribute('aria-hidden'), 'false');
  assert.equal(await page.locator('.chapter-dots [aria-current]').getAttribute('href'), '#nutrition');
  assert.equal(await page.locator('.nutrition-camera, .nc-results, .nc-result-card').count(), 0);
  await verifyImage(page, '.css3d-screen-nutrition', 589, 1280);

  const hasSource = await video.evaluate(el => Boolean(el.dataset.src || el.getAttribute('src') || el.querySelector('source[src]')));
  if (!hasSource) {
    assert.equal(await take.evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await chapter.locator('h2:not(.take-title)').isVisible(), true);
    assert.equal(await chapter.locator('.nutrition-local').isVisible(), false);
    assert.equal(await chapter.locator('.description').isVisible(), true);
    return;
  }

  await scrollToProgress(page, .49, useWheel);
  await page.locator('#nutrition-take.is-scroll-ready').waitFor();
  const firstTime = await video.evaluate(el => el.currentTime);
  await scrollToProgress(page, .54, useWheel);
  await page.waitForFunction(start => {
    const clip = document.querySelector('#nutrition-take video');
    return !clip.seeking && clip.currentTime > start;
  }, firstTime);
  const forwardTime = await video.evaluate(el => el.currentTime);
  await page.waitForTimeout(700);
  assert.deepEqual(await video.evaluate(el => [el.currentTime, el.paused]), [forwardTime, true]);
  await scrollToProgress(page, .49, useWheel);
  await page.waitForFunction(start => {
    const clip = document.querySelector('#nutrition-take video');
    return !clip.seeking && Math.abs(clip.currentTime - start) < .04;
  }, firstTime);
}

async function sampleBenchFrame(page) {
  await page.waitForSelector('.bench-demo.bench-frames-ready');
  return page.locator('.bench-demo canvas').evaluate(canvas => {
    const {width, height} = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    let hash = 0;
    for (let i = 0; i < pixels.length; i += 13) hash = Math.imul(hash ^ pixels[i], 16777619);
    return {frame: Number(canvas.dataset.frame), hash};
  });
}

async function verifyBenchPoster(page) {
  const poster = '.bench-visual img';
  await verifyImage(page, poster, 640, 480);
  await page.waitForFunction(selector => {
    const image = document.querySelector(selector);
    const canvas = image.nextElementSibling;
    return +getComputedStyle(image).opacity === 1 && +getComputedStyle(canvas).opacity === 0;
  }, poster);
  assert.equal(await page.locator(poster).isVisible(), true);
  assert.equal(await page.locator('.bench-demo button').count(), 0);
}

async function verifyChapterPhone(page, screen) {
  await page.waitForFunction(name => {
    const live = document.querySelector('#react-phone.is-ready');
    if (live) return live.dataset.screen === name;
    const rig = document.querySelector('#css3d-device');
    return rig?.dataset.screen === name && getComputedStyle(rig).visibility === 'visible';
  }, screen);
  const rig = page.locator('#css3d-device');
  const image = rig.locator('.css3d-screen-' + screen);
  await image.evaluate(async element => {
    if (!element.getAttribute('src')) return;
    await element.decode();
    if (element.naturalWidth !== 589 || element.naturalHeight !== 1280) {
      throw new Error('Captura do capítulo com dimensões inesperadas');
    }
  });
  const projection = await page.evaluate(() => window.MOVVA_DOM_DEVICE?.projectScreenPoint(.53, .41));
  assert.ok(Number.isFinite(projection?.x) && Number.isFinite(projection?.y),
    'Origem projetada do cartão inválida em ' + screen);
}

async function verifyBench(page, label, capture, useWheel) {
  const demo = page.locator('.bench-demo');
  const samples = [];
  if (useWheel) {
    const {width, height} = page.viewportSize();
    await page.mouse.move(width / 2, height / 2);
  }
  for (const progress of [.33, .375, .404, .375]) {
    await scrollToProgress(page, progress, useWheel);
    samples.push(await sampleBenchFrame(page));
  }
  const [start, middle, end, reverse] = samples;
  assert.ok(start.frame < middle.frame && middle.frame < end.frame, 'Supino não avançou com a rolagem');
  assert.deepEqual(reverse, middle, 'Retroceder precisa devolver o mesmo quadro e os mesmos pixels');
  assert.equal(new Set(samples.slice(0, 3).map(sample => sample.hash)).size, 3, 'O supino deve mudar os pixels do canvas');
  assert.equal(await demo.locator('button').count(), 0);

  const picture = await demo.locator('.bench-visual').boundingBox();
  const caption = await demo.locator('figcaption').boundingBox();
  const chapters = await page.locator('.chapter-bar').boundingBox();
  const header = await page.locator('header').boundingBox();
  assert.ok(picture.height >= 110 && picture.y >= header.y + header.height - 1, 'Enquadramento do supino');
  assert.ok(caption.y + caption.height <= chapters.y, 'Legenda do supino invade a navegação');
  await capture('supino-' + label);
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
    assert.equal(await page.locator('#telas').count(), 0);
    assert.equal(await page.getByRole('heading', { name: 'Por dentro do app', exact: true, includeHidden: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://www.movvawellness.com.br/');
    assert.equal(await page.locator('meta[name=robots]').count(), 0);
    const screenshot = n => page.screenshot({ path: path.join(output, n + '.jpg'), quality: 86, scale: 'css' });
    const opening = await verifyOpening(page, engine !== 'webkit' || !viewport.hasTouch, () => screenshot(engine + '-abertura-' + label));
    await verifyOpeningTransition(page, engine !== 'webkit' || !viewport.hasTouch);
    await page.evaluate(() => window.__MOVVA_QA__.setProgress(0));
    await settled(page, 0);
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
    if (label === 'desktop') {
      assert.equal(await page.locator('#connected h2').evaluate(heading => heading === document.activeElement), true,
        'O teclado precisa levar o foco ao título do capítulo.');
    }
    assert.equal(await page.locator('#connected .static-shot').isVisible(), false);
    assert.equal(await opening.display.evaluate((el, initial) => el === initial, opening.node), true);
    await page.locator('.chapter-dots a[href="#training"]').click();
    await settled(page, .33);
    assert.equal(new URL(page.url()).hash, '#training');
    const entryFrame = await sampleBenchFrame(page);
    await page.waitForTimeout(700);
    assert.deepEqual(await sampleBenchFrame(page), entryFrame, 'Parar de rolar deve congelar o supino');
    await page.goBack();
    await settled(page, .18);
    await page.goForward();
    await settled(page, .33);
    const nutritionJump = Number(await page.locator('.chapter-dots a[href="#nutrition"]').getAttribute('data-jump'));
    await page.goto(origin + '/#nutrition', { waitUntil: 'load' });
    await settled(page, nutritionJump);
    await verifyNutrition(page, engine !== 'webkit' || !viewport.hasTouch);
    for (const progress of [.70, .86, .98, .66, .52, .365, 0]) {
      await page.evaluate(value => window.__MOVVA_QA__.setProgress(value), progress);
      await settled(page, progress);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (label === 'paisagem' && [.70, .86, .98, .52, .365].includes(progress)) {
        const copy = await page.locator('.scene[aria-hidden="false"] .copy').boundingBox();
        const chapters = await page.locator('.chapter-bar').boundingBox();
        assert.ok(copy.y + copy.height <= chapters.y, 'Conteúdo invadiu a navegação em ' + progress);
      }
      const chapterScreen = { [.365]: 'training', [.52]: 'nutrition', [.66]: 'evolution', [.86]: 'circle' }[progress];
      if (chapterScreen) {
        await verifyChapterPhone(page, chapterScreen);
        if (['desktop', 'iphone'].includes(label) && ['training', 'nutrition'].includes(chapterScreen)) {
          await screenshot(engine + '-' + chapterScreen + '-' + label);
        }
      }
    }
    await verifyBench(page, label, name => screenshot(engine + '-' + name), engine !== 'webkit' || !viewport.hasTouch);
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
      await verifyBenchPoster(page);
      await page.goto(origin + '/?visual=estatico#nutrition', { waitUntil: 'load' });
      assert.equal(await page.locator('html.enhanced').count(), 0);
      assert.equal(await page.locator('#react-phone canvas').count(), 0);
      assert.equal(await page.locator('.hero-react-poster').isVisible(), true);
      assert.equal(await page.locator('#nutrition .static-shot').isVisible(), true);
      await verifyImage(page, '#nutrition .static-shot', 589, 1280);
      assert.equal(await page.locator('#nutrition-take').isVisible(), false);
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
      await page.locator('#connected .static-shot').scrollIntoViewIfNeeded();
      await verifyImage(page, '#connected .static-shot', 589, 1280);
      assert.equal(await page.locator('#telas').count(), 0);
      assert.equal(await page.locator('#react-phone.is-ready').count(), 0);
      assert.equal(await page.locator('.hero-react-poster').isVisible(), true);
      assert.equal(await page.locator('#nutrition .static-shot').isVisible(), true);
      await verifyImage(page, '#nutrition .static-shot', 589, 1280);
      assert.equal(await page.locator('#nutrition-take').isVisible(), false);
      await page.locator('.hero-react-poster').scrollIntoViewIfNeeded();
      await verifyImage(page, '.hero-react-poster', 1344, 1344);
      await page.locator('.bench-visual img').scrollIntoViewIfNeeded();
      await verifyBenchPoster(page);
      for (const destination of ['privacy/', 'terms/', 'support/', 'robots.txt', 'sitemap.xml', 'assets/compartilhar-movva.jpg']) {
        assert.equal((await context.request.get(origin + '/' + destination)).status(), 200, destination);
      }
      await context.close();
      console.log(engine + ' sem JavaScript e rotas estáticas OK');
    } finally { await browser.close(); }
  }));
})().catch(error => { console.error(error); process.exitCode = 1; });
