/* An atlas lets either direction of native scroll select a frame immediately. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('visual') === 'estatico') return;
  const stage = document.querySelector('#stage');
  const figure = document.querySelector('.bench-demo');
  if (!stage || !figure) return;

  const copy = document.querySelector('#training .copy');
  const header = document.querySelector('.header');
  const canvas = figure.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cols = 6;
  const frames = 42;
  let atlas;
  let ready = false;
  let frame = -1;
  let lastLook = '';
  let active = false;

  const clamp = value => Math.min(1, Math.max(0, value));
  function ease(value, start, end) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }

  function measure() {
    if (stage.clientWidth > 760) return;
    const top = copy.offsetTop + copy.offsetHeight + 12;
    figure.style.setProperty('--bench-top', Math.max(header.offsetHeight + 12, top) + 'px');
  }
  new ResizeObserver(measure).observe(copy);
  document.fonts?.ready.then(measure);

  function warmAtlas(p) {
    if (atlas || !context || reducedMotion.matches || p < .137 || p > .426) return;
    atlas = new Image();
    atlas.fetchPriority = 'low';
    const compact = matchMedia('(max-width: 760px), (max-height: 540px)').matches;
    if (compact) {
      canvas.width = 480;
      canvas.height = 360;
    }
    atlas.src = compact ? '/assets/training-bench-compact.webp' : '/assets/training-bench-frames.webp';
    atlas.decode().then(() => {
      ready = true;
      window.dispatchEvent(new Event('movva:hero-layout'));
    }).catch(() => {
      // The poster remains visible when the atlas is unavailable.
    });
  }

  function reset() {
    if (!active) return;
    active = false;
    lastLook = '';
    stage.classList.remove('bench-active');
    stage.style.removeProperty('--bench-focus');
    for (const property of ['--bench-presence', '--bench-scale', '--bench-progress']) {
      figure.style.removeProperty(property);
    }
  }

  function render(p, chapter) {
    warmAtlas(p);
    if (chapter !== 2 || p <= .333 || p >= .426) {
      reset();
      return;
    }

    active = true;
    const focus = ease(p, .333, .356) * (1 - ease(p, .404, .426));
    const progress = clamp((p - .343) / (.406 - .343));
    const look = focus.toFixed(4) + ':' + progress.toFixed(4);
    if (look !== lastLook) {
      lastLook = look;
      stage.style.setProperty('--bench-focus', focus.toFixed(4));
      stage.classList.add('bench-active');
      figure.style.setProperty('--bench-presence', focus.toFixed(4));
      figure.style.setProperty('--bench-scale', (.72 + .28 * focus).toFixed(4));
      figure.style.setProperty('--bench-progress', progress.toFixed(4));
    }

    const sampled = Math.round(progress * (frames - 1));
    const playing = ready && !reducedMotion.matches;
    figure.classList.toggle('bench-frames-ready', playing);
    if (!playing || sampled === frame) return;

    frame = sampled;
    const { width, height } = canvas;
    context.drawImage(atlas, (frame % cols) * width, Math.floor(frame / cols) * height,
      width, height, 0, 0, width, height);
    canvas.dataset.frame = String(frame);
  }

  reducedMotion.addEventListener?.('change', () => window.dispatchEvent(new Event('movva:hero-layout')));
  window.MOVVA_TRAINING = { render, reset };
})();
