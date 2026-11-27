'use strict';
/**
 * MOVVA public-domain post-deploy acceptance.
 * Verifies the REAL public domain, not a local git checkout or Vercel preview.
 * No user login, write operations, user data, or external services needed.
 */
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://www.movvawellness.com.br';
const browserName = process.env.QA_ENGINE || 'chromium';
const requireContinuous = process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/master';
const browserType = { chromium, webkit }[browserName];
const output = path.join('qa-live', browserName);
fs.mkdirSync(output, { recursive: true });
const report = { engine: browserName, url: SITE, tests: [], errors: [], status: 'RUNNING' };

async function waitForPublicAssets(request) {
  let last = '';
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const [phone, motion, shell, shellCss] = await Promise.all([
        request.get(SITE + '/mobile-phone.js', { timeout: 20000 }),
        request.get(SITE + '/motion-studio.js', { timeout: 20000 }),
        request.get(SITE + '/phone-shell.js', { timeout: 20000 }),
        request.get(SITE + '/phone-shell.css', { timeout: 20000 })
      ]);
      const [a, b, c, d] = await Promise.all([phone.text(), motion.text(), shell.text(), shellCss.text()]);
      const continuous = a.includes('MOVVA_REACT_PHONE?.render') && c.includes('fastEdgeCount:0');
      const legacy = c.includes('fastEdgeCount') && d.includes('css3d-fast-edge');
      const available = phone.ok() && motion.ok() && shell.ok() && shellCss.ok()
        && a.includes('projectScreenPoint') && b.includes('screenOrigins');
      if (available && (continuous || (!requireContinuous && legacy))) {
        return { attempts: attempt, continuous,
          assets: { mobilePhone: a.length, motion: b.length, shell: c.length, shellCss: d.length } };
      }
      last = 'HTTP ' + [phone, motion, shell, shellCss].map(r => r.status()).join('/') +
        ' expected release markers not all present';
    } catch (error) {
      last = String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Official domain did not serve the expected release after polling: ' + last);
}

async function main() {
  const browser = await browserType.launch({
    headless: true,
    args: browserName === 'chromium' ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : []
  });
  try {
    const shared = await browser.newContext({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true });
    const assets = await waitForPublicAssets(shared.request);
    report.tests.push({ name: 'Current release assets', ...assets });
    const apex = await shared.request.get('https://movvawellness.com.br/', { maxRedirects: 0, timeout: 22000 });
    assert.equal(apex.status(), 308, 'Apex must redirect to www');
    assert.ok((apex.headers()['location'] || '').includes('www.movvawellness.com.br'));
    report.tests.push({ name: 'HTTPS apex redirect', status: apex.status() });
    await shared.close();

    for (const [view, width, height] of [['desktop', 1440, 900], ['iphone17', 440, 956]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 761, hasTouch: width < 761 });
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(view + ': ' + e.message));
      const response = await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      assert.equal(response.status(), 200);
      await page.waitForFunction(() =>
        window.__MOVVA_QA__?.ready && window.MOVVA_DOM_DEVICE?.projectScreenPoint &&
        window.MOVVA_MOTION?.origins && window.MOVVA_3D_STATUS?.().active,
      null, { timeout: 65000 });

      const livePhone = page.locator('#react-phone.is-ready canvas');
      const expectsLive = assets.continuous && await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return Boolean(gl);
      });
      if (expectsLive) await livePhone.waitFor({ timeout: 65000 });
      const initialCanvas = expectsLive ? await livePhone.elementHandle() : null;
      const scenes = [];
      const sequence = assets.continuous
        ? [[0, 'home'], [.178, 'home'], [.335, 'training'], [.512, 'nutrition'],
          [.672, 'evolution'], [.842, 'circle'], [.97, 'circle'], [.335, 'training']]
        : [[.178], [.335], [.512], [.842], [.335]];
      for (const [progress, screen] of sequence) {
        await page.evaluate(value => __MOVVA_QA__.setProgress(value), progress);
        await page.waitForFunction(value => Math.abs(__MOVVA_QA__.progress - value) < .003, progress, { timeout: 65000 });
        if (expectsLive) {
          await page.waitForFunction(({ canvas, screen }) => {
            const housing = document.querySelector('#react-phone.is-ready');
            return housing?.querySelector('canvas') === canvas && housing.dataset.screen === screen
              && Number(getComputedStyle(housing).opacity) > .9;
          }, { canvas: initialCanvas, screen }, { timeout: 65000 });
        } else if (assets.continuous) {
          await page.waitForFunction(screen => {
            const rig = document.querySelector('#css3d-device');
            return rig.dataset.screen === screen && Number(getComputedStyle(rig).opacity) > .2
              && getComputedStyle(rig).visibility === 'visible';
          }, screen, { timeout: 65000 });
        }
        scenes.push(await page.evaluate(() => ({
          p: __MOVVA_QA__.progress, chapter: Number(document.querySelector('#css3d-device').dataset.chapter),
          overflow: document.documentElement.scrollWidth - innerWidth,
          cardCount: [...document.querySelectorAll('.motion-fragment')].filter(el =>
            getComputedStyle(el).visibility !== 'hidden' && +getComputedStyle(el).opacity > .3).length,
          renderer: MOVVA_3D_STATUS().engine,
          compact: MOVVA_SHELL.compact, shellFaces: MOVVA_SHELL.partCount,
          cameraFaces: MOVVA_SHELL.cameraWallCount,
          renderedFaces: [...document.querySelectorAll('.css3d-shell-face,.css3d-camera-wall-face')].filter(el => getComputedStyle(el).display !== 'none').length,
          fastPlanes: [...document.querySelectorAll('.css3d-fast-edge')].filter(el => getComputedStyle(el).display !== 'none').length,
          legacyGeometry: Boolean(MOVVA_SHELL.legacyGeometry),
          launch: Boolean(document.querySelector('#launch-title')),
          origins: MOVVA_MOTION.origins.length
        })));
      }
      const order = assets.continuous ? [0, 1, 2, 3, 4, 5, 6, 2] : [1, 2, 3, 5, 2];
      assert.deepEqual(scenes.map(s => s.chapter), order, 'Wrong chapters on scroll or rewind');
      assert.ok(scenes.every(s => s.origins === (s.launch ? 11 : 12)));
      assert.ok(scenes.every(s => Math.abs(s.overflow) <= 1));
      assert.ok(scenes.some(s => s.cardCount >= 1));
      if (assets.continuous) {
        assert.ok(scenes.every(s => s.compact === (width <= 760) && s.shellFaces >= 20 && s.cameraFaces >= 12 &&
          s.renderedFaces === s.shellFaces + s.cameraFaces && s.fastPlanes === 0 && !s.legacyGeometry),
        'The geometry fallback must retain a rounded wall and camera body.');
      } else if (width <= 760) {
        assert.ok(scenes.every(s => s.compact && s.shellFaces === 44 && s.cameraFaces === 36 &&
          s.renderedFaces === 0 && s.fastPlanes === 4 && !s.legacyGeometry),
          'The previous public release must retain its compact geometry.');
      } else {
        assert.ok(scenes.every(s => !s.compact && s.shellFaces === 180 && s.cameraFaces === 48 &&
          s.renderedFaces === 228 && s.fastPlanes === 0),
          'The previous public release must retain its desktop geometry.');
      }
      assert.deepEqual(report.errors, [], 'Browser JavaScript exceptions');
      const image = view + '.png';
      await page.screenshot({ path: path.join(output, image), timeout: 22000 });
      report.tests.push({ name: view + ' official-domain scroll + rewind', samples: scenes, screenshot: image });
      console.log('PASS', browserName, view, 'HTTP 200, ' + (expectsLive ? 'live WebGL' : 'CSS 3D') + ', reversible scroll');
      await context.close();
    }
    report.status = 'PASS';
  } catch (e) {
    report.status = 'FAIL'; report.failure = e.stack || String(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, engine: browserName, tests: report.tests.length, errors: report.errors, failure: report.failure || null }));
  }
}

main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
