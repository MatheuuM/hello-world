const assert = require('node:assert/strict');
const { chromium, webkit, devices } = require('playwright');

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:8077';
const chapters = [
  [0, 'home'],
  [.18, 'home'],
  [.33, 'training'],
  [.458, 'nutrition'],
  [.66, 'evolution'],
  [.83, 'circle'],
  [.97, 'circle'],
];
const viewports = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['touch', devices['iPhone 15']],
];
const handset = '#react-phone';
const liveCanvas = handset + '.is-ready canvas';

async function settled(page, progress) {
  await page.waitForFunction(value => {
    const stage = window.__MOVVA_QA__;
    return stage?.settled && Math.abs(stage.progress - value) < .0006;
  }, progress);
}

async function move(page, progress) {
  await page.evaluate(value => window.__MOVVA_QA__.setProgress(value), progress);
  await settled(page, progress);
}

async function livePose(page, progress, screen) {
  await page.waitForFunction(({ progress, screen }) => {
    const phone = document.querySelector('#react-phone.is-ready');
    if (!phone || !phone.querySelector('canvas')) return false;
    return Math.abs(Number(phone.dataset.pageProgress) - progress) < .001
      && Number.isFinite(Number(phone.dataset.yaw))
      && (!screen || phone.dataset.screen === screen);
  }, { progress, screen });
  return page.locator(handset).evaluate(phone => ({
    yaw: Number(phone.dataset.yaw),
    screen: phone.dataset.screen,
  }));
}

async function assertVisibleLayer(page, selector, label) {
  const visible = await page.screenshot({ scale: 'css' });
  const hidden = await page.screenshot({
    scale: 'css',
    style: selector + ' { opacity: 0 !important; }',
  });
  const delta = await page.evaluate(async ([visible, hidden]) => {
    async function pixels(png) {
      const image = new Image();
      image.src = 'data:image/png;base64,' + png;
      await image.decode();
      const sample = document.createElement('canvas');
      sample.width = 192;
      sample.height = Math.round(image.height * sample.width / image.width);
      const context = sample.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, sample.width, sample.height);
      return context.getImageData(0, 0, sample.width, sample.height).data;
    }
    const [a, b] = await Promise.all([pixels(visible), pixels(hidden)]);
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) >= 35) changed++;
    }
    return changed;
  }, [visible.toString('base64'), hidden.toString('base64')]);
  assert.ok(delta >= 25, label + ' precisa pintar o aparelho na página (' + delta + ' pixels na amostra).');
}

async function swipe(context, page) {
  const session = await context.newCDPSession(page);
  const viewport = page.viewportSize();
  const x = Math.round(viewport.width / 2);
  const y = Math.round(viewport.height * .76);
  const point = offset => [{ x, y: y + offset, id: 1 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0) });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(-step * 12) });
    await page.waitForTimeout(24);
  }
  await page.waitForTimeout(160);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

async function checkFallback(page) {
  for (const [progress, screen] of chapters) {
    await move(page, progress);
    await page.waitForFunction(name => document.querySelector('#css3d-device')?.dataset.screen === name, screen);
    const result = await page.locator('#css3d-device').evaluate(rig => {
      const body = rig.querySelector('.css3d-object');
      const styles = getComputedStyle(rig);
      const visibleFaces = [...body.querySelectorAll('.css3d-shell-face, .css3d-fast-edge')].filter(face => {
        const style = getComputedStyle(face);
        return style.display !== 'none' && style.visibility === 'visible' && style.transform.startsWith('matrix3d(');
      });
      const bodyTransform = getComputedStyle(body).transform;
      const transform = bodyTransform === 'none' ? getComputedStyle(body.querySelector('.css3d-front')).transform : bodyTransform;
      return { opacity: Number(styles.opacity), transform, faces: visibleFaces.length };
    });
    assert.ok(result.opacity > .2, 'A contingência precisa mostrar o aparelho em ' + progress);
    assert.match(result.transform, /^matrix3d\(/);
    assert.ok(result.faces >= 4, 'A contingência precisa preservar um volume com faces em 3D em ' + progress);
  }
  await move(page, .294);
  await assertVisibleLayer(page, '#css3d-device', 'A transição CSS 3D');
  const atlasesLoaded = await page.evaluate(() => performance.getEntriesByType('resource').some(entry =>
    /\/assets\/react-phone-frames[^/]*\.webp$/.test(new URL(entry.name).pathname)));
  assert.equal(atlasesLoaded, false, 'A contingência CSS 3D precisa entrar sem sequências de imagens.');
}

async function checkLive(browser, engine, name, options) {
  const context = await browser.newContext(options);
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await settled(page, 0);
    const webgl = await page.evaluate(() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
      return Boolean(probe);
    });
    if (!webgl) {
      await checkFallback(page);
      console.log(engine, name, 'CSS 3D sem WebGL OK');
      return;
    }

    await page.locator(liveCanvas).waitFor();
    assert.equal(await page.locator(liveCanvas).count(), 1);
    const originalCanvas = await page.locator(liveCanvas).elementHandle();
    const assertSameCanvas = () => page.evaluate(canvas =>
      document.querySelector('#react-phone.is-ready canvas') === canvas, originalCanvas)
      .then(same => assert.equal(same, true, 'O mesmo canvas permanece em todos os capítulos.'));

    const opening = await livePose(page, 0, 'home');
    if (name === 'desktop') await page.mouse.wheel(0, 120);
    else if (engine === 'chromium') await swipe(context, page);
    else await page.evaluate(() => scrollBy(0, 120));
    await page.waitForFunction(yaw => {
      const current = document.querySelector('#react-phone').dataset.yaw;
      return scrollY > 20 && window.__MOVVA_QA__?.settled && Math.abs(Number(current) - yaw) > 1;
    }, opening.yaw);
    await move(page, 0);

    const poses = new Map();
    for (const [progress, screen] of chapters) {
      await move(page, progress);
      poses.set(progress, await livePose(page, progress, screen));
      await assertSameCanvas();
      await assertVisibleLayer(page, liveCanvas, 'O capítulo ' + screen);
    }
    assert.ok(new Set([...poses.values()].map(pose => Math.round(pose.yaw))).size >= 4,
      'O modelo precisa girar entre os capítulos.');

    for (const progress of [.267, .285, .294, .295, .305, .312]) {
      await move(page, progress);
      await livePose(page, progress);
      await assertSameCanvas();
      await assertVisibleLayer(page, liveCanvas, 'A transição em ' + progress);
    }

    for (const [progress, screen] of chapters.slice().reverse()) {
      await move(page, progress);
      const pose = await livePose(page, progress, screen);
      assert.ok(Math.abs(pose.yaw - poses.get(progress).yaw) < .4,
        'A rolagem reversa precisa recuperar o ângulo em ' + progress);
      await assertSameCanvas();
    }
    assert.deepEqual(errors, []);
    console.log(engine, name, 'canvas vivo, capítulos, transição e retorno OK');
  } finally {
    await context.close();
  }
}

async function checkNoWebGL(browser) {
  const context = await browser.newContext(devices['iPhone 15']);
  try {
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return /webgl/i.test(type) ? null : getContext.call(this, type, ...args);
      };
    });
    const page = await context.newPage();
    await page.goto(origin + '/#nutrition');
    await settled(page, .458);
    await page.waitForFunction(() => document.querySelector('#css3d-device')?.dataset.screen === 'nutrition');
    assert.equal(await page.locator(liveCanvas).count(), 0);
    await checkFallback(page);
    console.log('Contingência CSS 3D com WebGL bloqueado e link direto OK');
  } finally {
    await context.close();
  }
}

async function checkSlowLoad(browser) {
  const context = await browser.newContext(devices['iPhone 15']);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  try {
    await context.route('**/react-phone-build.js', async route => {
      await held;
      await route.continue();
    });
    const page = await context.newPage();
    const timing = await context.newCDPSession(page);
    await timing.send('Emulation.setCPUThrottlingRate', { rate: 2 });
    await page.goto(origin, { waitUntil: 'commit' });
    await settled(page, 0);
    await move(page, .33);
    await page.waitForFunction(() => document.querySelector('#css3d-device')?.dataset.screen === 'training');
    assert.equal(await page.locator(liveCanvas).count(), 0);
    await assertVisibleLayer(page, '#css3d-device', 'Treinos durante o carregamento do modelo');
    release();
    await livePose(page, .33, 'training');
    assert.equal(await page.locator(liveCanvas).count(), 1);
    await assertVisibleLayer(page, liveCanvas, 'Treinos após o carregamento do modelo');
    console.log('Modelo atrasado assume o capítulo atual durante rolagem em CPU mais lenta');
  } finally {
    release();
    await context.close();
  }
}

async function checkDirectAndStatic(browser) {
  const visualPage = await browser.newPage(devices['iPhone 15']);
  try {
    await visualPage.goto(origin + '/#circle');
    await settled(visualPage, .83);
    await visualPage.waitForFunction(() => {
      const live = document.querySelector('#react-phone.is-ready');
      if (live) return live.dataset.screen === 'circle';
      const rig = document.querySelector('#css3d-device');
      return getComputedStyle(rig).display !== 'none' && rig.dataset.screen === 'circle';
    });
    await visualPage.goto(origin + '/?visual=estatico#nutrition');
    assert.equal(await visualPage.locator('html.enhanced').count(), 0);
    assert.equal(await visualPage.locator('#nutrition .static-shot').isVisible(), true);
    assert.equal(await visualPage.locator(liveCanvas).count(), 0);
  } finally {
    await visualPage.close();
  }

  const staticPage = await browser.newPage({ ...devices['iPhone 15'], javaScriptEnabled: false });
  try {
    await staticPage.goto(origin + '/#nutrition');
    assert.equal(await staticPage.locator('#nutrition .static-shot').isVisible(), true);
    assert.equal(await staticPage.locator(liveCanvas).count(), 0);
  } finally {
    await staticPage.close();
  }
  console.log('Acesso direto, modo estático e página sem JavaScript OK');
}

async function main() {
  const engines = [['chromium', chromium], ['webkit', webkit]];
  for (const [name, type] of engines) {
    if (process.env.QA_ENGINE && process.env.QA_ENGINE !== name) continue;
    const browser = await type.launch();
    try {
      for (const [viewport, options] of viewports) {
        if (process.env.QA_VIEWPORT && process.env.QA_VIEWPORT !== viewport) continue;
        await checkLive(browser, name, viewport, options);
      }
      if (name === 'chromium') await checkSlowLoad(browser);
      await checkNoWebGL(browser);
      await checkDirectAndStatic(browser);
    } finally {
      await browser.close();
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
