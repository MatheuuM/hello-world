/* The exercise card and the handset share a scroll-driven camera. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('visual') === 'estatico') return;
  const stage = document.querySelector('#stage');
  const figure = document.querySelector('.bench-demo');
  if (!stage || !figure) return;

  const scene = document.querySelector('#training');
  const copy = scene.querySelector('.copy');
  const chapters = document.querySelector('.chapter-bar');
  const canvas = figure.querySelector('canvas');
  const context = canvas.getContext('2d', {alpha: false});
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const columns = 6;
  const frames = 42;
  const scrubStart = .315;
  const scrubEnd = .419;
  let atlas;
  let atlasReady = false;
  let imageFrame = -1;
  let active = false;
  let mobileCenter = 0;
  let mobileSpace = 0;

  const clamp = value => Math.min(1, Math.max(0, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  function ease(value, start, end) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }

  function measure() {
    if (stage.clientWidth > 760) return;
    const top = copy.offsetTop + copy.offsetHeight + 8;
    const bottom = stage.clientHeight - (chapters.clientHeight || 32) - 21;
    mobileSpace = Math.max(96, bottom - top);
    mobileCenter = top + mobileSpace * .49;
    figure.style.setProperty('--bench-mobile-y', mobileCenter + 'px');
    figure.style.setProperty('--bench-mobile-room', mobileSpace + 'px');
  }
  new ResizeObserver(measure).observe(copy);
  document.fonts?.ready.then(measure);

  function strength(p) {
    return ease(p, .296, .338) * (1 - ease(p, .399, .432));
  }

  function frame(p, chapter, base, width, height) {
    if (chapter !== 2 || p <= .296 || p >= .432) return base;
    const amount = strength(p);
    const portrait = width <= 760;
    return {
      cx: lerp(base.cx, width * (portrait ? .206 : .145), amount),
      cy: lerp(base.cy, portrait ? (mobileCenter || base.cy) : height * .54, amount),
      h: lerp(base.h, portrait
        ? Math.max(136, Math.min(mobileSpace * .88, width * .68))
        : Math.min(base.h * .80, height * .58), amount)
    };
  }

  function loadAtlas() {
    atlas = new Image();
    atlas.fetchPriority = 'low';
    const compact = matchMedia('(max-width: 760px), (max-height: 540px)').matches;
    if (compact) {
      canvas.width = 480;
      canvas.height = 360;
    }
    atlas.src = compact ? '/assets/training-bench-compact.webp' : '/assets/training-bench-frames.webp';
    atlas.decode().then(() => {
      atlasReady = true;
      window.dispatchEvent(new Event('movva:hero-layout'));
    }).catch(() => {}); // Keep the poster if the atlas cannot be decoded.
  }

  function showFrame(progress) {
    figure.style.setProperty('--bench-progress', progress.toFixed(4));
    const sampled = Math.round(progress * (frames - 1));
    if (sampled === imageFrame) return;
    const {width, height} = canvas;
    context.drawImage(atlas, (sampled % columns) * width, Math.floor(sampled / columns) * height,
      width, height, 0, 0, width, height);
    imageFrame = sampled;
    canvas.dataset.frame = String(sampled);
  }

  function reset() {
    if (!active) return;
    active = false;
    figure.classList.remove('bench-frames-ready');
    stage.classList.remove('bench-active');
  }

  function render(p, chapter, scrollProgress = p) {
    if (!atlas && context && !reduced.matches && p >= .137 && p <= .432) loadAtlas();
    if (chapter !== 2 || p <= .296 || p >= .432) {
      reset();
      return;
    }
    active = true;
    const flight = strength(p);
    const presence = ease(p, .300, .325) * (1 - ease(p, .412, .432));
    const start = window.MOVVA_DOM_DEVICE?.projectScreenPoint(.53, .41);
    const localTop = scene.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    const offsetX = reduced.matches ? 0 : ((start?.x ?? stage.clientWidth * .26) - figure.offsetLeft) * (1 - flight);
    const offsetY = reduced.matches ? 0 : ((start?.y ?? stage.clientHeight * .52) - figure.offsetTop - localTop) * (1 - flight);
    stage.classList.add('bench-active');
    stage.style.setProperty('--bench-presence', presence.toFixed(4));
    figure.style.setProperty('--bench-x', offsetX.toFixed(2) + 'px');
    figure.style.setProperty('--bench-y', offsetY.toFixed(2) + 'px');
    figure.style.setProperty('--bench-turn', (-19 * (1 - flight)).toFixed(2) + 'deg');
    figure.style.setProperty('--bench-scale', (.22 + .78 * flight).toFixed(4));

    const scrub = atlasReady && !reduced.matches;
    if (scrub) showFrame(clamp((scrollProgress - scrubStart) / (scrubEnd - scrubStart)));
    figure.classList.toggle('bench-frames-ready', scrub);
  }

  reduced.addEventListener?.('change', () => {
    window.dispatchEvent(new Event('movva:hero-layout'));
  });
  window.MOVVA_TRAINING = {frame, render, reset};
})();
