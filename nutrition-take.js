(() => {
  'use strict';

  const scene = document.querySelector('#nutrition-take');
  const video = scene?.querySelector('video[data-scroll-video]');
  if (!video) return;

  const deferredSource = video.dataset.src;
  const embeddedSource = video.hasAttribute('src') || Boolean(video.querySelector('source[src]'));
  const options = new URLSearchParams(location.search);
  const localMode = options.get('video') === 'local' && options.get('visual') !== 'estatico';
  const localPicker = localMode ? document.querySelector('#nutrition .nutrition-local') : null;
  const localInput = localPicker?.querySelector('input[type="file"]');
  const localStatus = localPicker?.querySelector('.nutrition-local-status');
  if (!localInput && !deferredSource && !embeddedSource) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const requestedFps = Number(video.dataset.fps);
  const defaultFps = 30;
  const sourceFps = Number.isFinite(requestedFps) && requestedFps > 0 ? requestedFps : defaultFps;
  const videoStart = .12;
  const videoEnd = .78;
  let progress = null;
  let near = false;
  let requested = false;
  let failed = false;
  let pendingFrame = null;
  let displayedFrame = null;
  let localSource = null;

  function resolveFrame(position) {
    const fps = localSource ? defaultFps : sourceFps;
    const lastFrame = Math.max(0, Math.ceil(video.duration * fps - .5) - 1);
    const start = localSource ? 0 : Math.max(0, Number(video.dataset.start) || 0);
    const end = localSource ? video.duration : Number(video.dataset.end) || video.duration;
    const first = Math.min(lastFrame, Math.ceil(start * fps - .5));
    const last = Math.max(first, Math.min(lastFrame, Math.ceil(end * fps - .5) - 1));
    const index = Math.round(first + clamp((position - videoStart) / (videoEnd - videoStart)) * (last - first));
    return {index, time: (index + .5) / fps, progress: last === first ? 0 : (index - first) / (last - first)};
  }

  function display(frame) {
    displayedFrame = frame.index;
    scene.style.setProperty('--take-video-progress', frame.progress.toFixed(5));
  }

  function sync() {
    if (failed || preference.matches || progress === null || pendingFrame !== null ||
        video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        (localSource && video.currentSrc !== localSource) ||
        !Number.isFinite(video.duration) || video.duration <= 0) return;

    const frame = resolveFrame(progress);
    if (frame.index === displayedFrame) {
      scene.classList.add('is-scroll-ready');
      return;
    }

    // Seek inside the frame instead of directly on a timestamp boundary.
    const time = Math.min(frame.time, video.duration * .999999);
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

  function setLocalStatus(message) {
    if (localStatus && localStatus.textContent !== message) localStatus.textContent = message;
  }

  function releaseLocalSource(detach) {
    if (!localSource) return;
    if (detach && video.getAttribute('src') === localSource) {
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    }
    URL.revokeObjectURL(localSource);
    localSource = null;
  }

  function fail() {
    failed = true;
    pendingFrame = null;
    scene.classList.remove('is-scroll-ready');
    if (localSource) {
      releaseLocalSource(true);
      localInput.value = '';
      setLocalStatus('Não foi possível abrir o vídeo. Escolha outro arquivo.');
    }
  }

  function prepare() {
    const source = localSource || deferredSource;
    if (requested || failed || (!source && !embeddedSource)) return;
    requested = true;
    video.preload = 'auto';
    if (source) video.src = source;
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

  function updateLocalStatus() {
    if (!localSource) return;
    if (preference.matches) {
      setLocalStatus('Vídeo selecionado. O movimento reduzido está ativo.');
      return;
    }
    const decoded = video.currentSrc === localSource && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    setLocalStatus(decoded ? 'Vídeo pronto para rolagem.' : 'Preparando o vídeo…');
  }

  if (localInput) {
    localPicker.hidden = false;
    localInput.addEventListener('change', () => {
      const file = localInput.files[0];
      if (!file) return;
      releaseLocalSource(true);
      requested = false;
      failed = false;
      pendingFrame = null;
      displayedFrame = null;
      scene.classList.remove('is-scroll-ready');
      scene.style.removeProperty('--take-video-progress');
      try {
        localSource = URL.createObjectURL(file);
      } catch {
        localInput.value = '';
        setLocalStatus('Não foi possível abrir o vídeo. Escolha outro arquivo.');
        return;
      }
      if (!preference.matches) prepare();
      updateLocalStatus();
    });
    window.addEventListener('pagehide', event => {
      if (!event.persisted) releaseLocalSource(false);
    });
  }

  video.autoplay = false;
  video.controls = false;
  video.addEventListener('play', () => video.pause());
  video.addEventListener('error', () => {
    if (video.error) fail();
  });
  video.addEventListener('loadeddata', () => {
    updateLocalStatus();
    sync();
  });
  video.addEventListener('seeked', () => {
    if (pendingFrame !== null) display(pendingFrame);
    pendingFrame = null;
    sync();
  });

  preference.addEventListener('change', () => {
    if (preference.matches) scene.classList.remove('is-scroll-ready');
    else {
      if (localSource) prepare();
      render(progress, near);
    }
    updateLocalStatus();
  });

  window.MOVVA_NUTRITION_TAKE = {render};
})();
