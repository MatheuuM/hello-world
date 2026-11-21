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
  const context = canvas.getContext('2d');
  const button = figure.querySelector('.bench-play');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cols = 6;
  const frames = 42;
  const repetitionMs = 3200;
  let atlas;
  let atlasPromise;
  let ready = false;
  let atlasFailed = false;
  let frame = -1;
  let lastLook = '';
  let active = false;
  let currentProgress = 0;
  let focus = 0;
  let playedOnEntry = false;
  let idleTimer = 0;
  let playbackId = 0;

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

  function loadAtlas() {
    if (atlasPromise) return atlasPromise;
    atlas = new Image();
    atlas.fetchPriority = 'low';
    const compact = matchMedia('(max-width: 760px), (max-height: 540px)').matches;
    if (compact) {
      canvas.width = 480;
      canvas.height = 360;
    }
    atlas.src = compact ? '/assets/training-bench-compact.webp' : '/assets/training-bench-frames.webp';
    atlasPromise = atlas.decode().then(() => {
      ready = true;
      window.dispatchEvent(new Event('movva:hero-layout'));
      return true;
    }).catch(() => {
      atlasFailed = true;
      button.hidden = true;
      return false;
    });
    return atlasPromise;
  }

  function showFrame(progress) {
    figure.style.setProperty('--bench-progress', progress.toFixed(4));
    const sampled = Math.round(progress * (frames - 1));
    if (sampled === frame) return;

    frame = sampled;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.drawImage(atlas, (frame % cols) * width, Math.floor(frame / cols) * height,
      width, height, 0, 0, width, height);
    canvas.dataset.frame = String(frame);
  }

  function stopPlayback() {
    clearTimeout(idleTimer);
    idleTimer = 0;
    if (playbackId) cancelAnimationFrame(playbackId);
    playbackId = 0;
    button.textContent = 'Reproduzir supino';
    if (reducedMotion.matches) figure.classList.remove('bench-frames-ready');
  }

  function play(manual = false) {
    stopPlayback();
    if (!ready || (!manual && reducedMotion.matches) || !active || focus < .55 || document.hidden) return;
    showFrame(0);
    figure.classList.add('bench-frames-ready');
    playedOnEntry = true;
    button.textContent = 'Pausar supino';
    let start;
    const tick = timestamp => {
      start ??= timestamp;
      const progress = clamp((timestamp - start) / repetitionMs);
      showFrame(progress);
      if (progress === 1) stopPlayback();
      else playbackId = requestAnimationFrame(tick);
    };
    playbackId = requestAnimationFrame(tick);
  }
  button.addEventListener('click', async () => {
    if (playbackId) {
      stopPlayback();
      return;
    }
    const position = scrollY;
    button.disabled = true;
    const loaded = await loadAtlas();
    button.disabled = false;
    if (loaded && position === scrollY) play(true);
  });
  window.addEventListener('scroll', () => {
    if (idleTimer || playbackId) stopPlayback();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPlayback();
    else window.dispatchEvent(new Event('movva:hero-layout'));
  });

  function reset() {
    if (!active) return;
    active = false;
    playedOnEntry = false;
    lastLook = '';
    stopPlayback();
    button.hidden = true;
    stage.classList.remove('bench-active');
    stage.style.removeProperty('--bench-focus');
    for (const property of ['--bench-presence', '--bench-scale', '--bench-progress']) {
      figure.style.removeProperty(property);
    }
  }

  function render(p, chapter) {
    if (!atlasPromise && context && !reducedMotion.matches && p >= .137 && p <= .428) loadAtlas();
    if (chapter !== 2 || p <= .298 || p >= .428) {
      reset();
      return;
    }

    active = true;
    currentProgress = p;
    focus = ease(p, .298, .326) * (1 - ease(p, .410, .428));
    const progress = clamp((p - .328) / (.407 - .328));
    const look = focus.toFixed(4);
    if (look !== lastLook) {
      lastLook = look;
      stage.style.setProperty('--bench-focus', look);
      stage.classList.add('bench-active');
      figure.style.setProperty('--bench-presence', look);
      figure.style.setProperty('--bench-scale', (.72 + .28 * focus).toFixed(4));
    }

    const scrub = ready && !reducedMotion.matches;
    figure.classList.toggle('bench-frames-ready', scrub || Boolean(playbackId));
    button.hidden = !context || atlasFailed || focus < .55;
    if (!scrub || playbackId) return;
    showFrame(progress);

    // If the reader pauses on the opening beat, play one complete repetition.
    // Wheel, touch and keyboard scroll always take control back immediately.
    if (!playedOnEntry && !idleTimer && p >= .325 && p <= .337) {
      idleTimer = setTimeout(() => {
        idleTimer = 0;
        if (currentProgress >= .325 && currentProgress <= .337) play();
      }, 400);
    }
  }

  reducedMotion.addEventListener?.('change', () => {
    stopPlayback();
    window.dispatchEvent(new Event('movva:hero-layout'));
  });
  window.MOVVA_TRAINING = { render, reset };
})();
