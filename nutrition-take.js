(() => {
  'use strict';

  const scene = document.querySelector('#nutrition-take');
  const video = scene?.querySelector('video[data-scroll-video]');
  if (!video) return;

  const deferredSource = video.dataset.src;
  if (!deferredSource && !video.getAttribute('src') && !video.querySelector('source[src]')) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const requestedFps = Number(video.dataset.fps);
  const fps = Number.isFinite(requestedFps) && requestedFps > 0 ? requestedFps : 30;
  const videoStart = .12;
  const videoEnd = .78;
  let progress = null;
  let near = false;
  let requested = false;
  let failed = false;
  let pendingFrame = null;
  let displayedFrame = null;

  function resolveFrame(position) {
    const lastFrame = Math.max(0, Math.ceil(video.duration * fps - .5) - 1);
    const start = Math.max(0, Number(video.dataset.start) || 0);
    const end = Number(video.dataset.end) || video.duration;
    const first = Math.min(lastFrame, Math.ceil(start * fps - .5));
    const last = Math.max(first, Math.min(lastFrame, Math.ceil(end * fps - .5) - 1));
    const index = Math.round(first + clamp((position - videoStart) / (videoEnd - videoStart)) * (last - first));
    return {index, progress: last === first ? 0 : (index - first) / (last - first)};
  }

  function display(frame) {
    displayedFrame = frame.index;
    scene.style.setProperty('--take-video-progress', frame.progress.toFixed(5));
  }

  function sync() {
    if (failed || preference.matches || progress === null || pendingFrame !== null ||
        video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !Number.isFinite(video.duration) || video.duration <= 0) return;

    const frame = resolveFrame(progress);
    if (frame.index === displayedFrame) {
      scene.classList.add('is-scroll-ready');
      return;
    }

    // Seek inside the frame instead of directly on a timestamp boundary.
    const time = Math.min((frame.index + .5) / fps, video.duration * .999999);
    if (Math.abs(video.currentTime - time) < .001) {
      display(frame);
      scene.classList.add('is-scroll-ready');
      return;
    }

    pendingFrame = frame;
    try {
      video.currentTime = time;
    } catch {
      fail();
    }
  }

  function fail() {
    failed = true;
    pendingFrame = null;
    scene.classList.remove('is-scroll-ready');
  }

  function prepare() {
    if (requested || failed) return;
    requested = true;
    video.preload = 'auto';
    if (deferredSource) video.src = deferredSource;
    // A metadata-only preload can otherwise leave a paused clip unloaded.
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) video.load();
  }

  function render(position, approaching = position !== null) {
    progress = Number.isFinite(position) ? clamp(position) : null;
    near = approaching;
    if (progress === null) scene.classList.remove('is-scroll-ready');
    if (preference.matches || failed) return;
    if (near || progress !== null) prepare();
    sync();
  }

  video.autoplay = false;
  video.controls = false;
  video.addEventListener('play', () => video.pause());
  video.addEventListener('error', fail);
  video.addEventListener('loadeddata', sync);
  video.addEventListener('seeked', () => {
    if (pendingFrame !== null) display(pendingFrame);
    pendingFrame = null;
    sync();
  });

  preference.addEventListener('change', () => {
    if (preference.matches) scene.classList.remove('is-scroll-ready');
    else render(progress, near);
  });

  window.MOVVA_NUTRITION_TAKE = {render};
})();
