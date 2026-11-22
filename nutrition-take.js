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
  const localWaitLimit = 12000;
  const cannotOpen = 'Não foi possível abrir o vídeo. Tente um arquivo MP4 em H.264.';
  let progress = null;
  let near = false;
  let requested = false;
  let failed = false;
  let pendingFrame = null;
  let displayedFrame = null;
  let localSource = null;
  let localDeadline = 0;
  let localPoll = 0;

  function resolveFrame(position) {
    const fps = localSource ? defaultFps : sourceFps;
    const lastFrame = Math.max(0, Math.ceil(video.duration * fps - .5) - 1);
    const start = localSource ? 0 : Math.max(0, Number(video.dataset.start) || 0);
    const end = localSource ? video.duration : Number(video.dataset.end) || video.duration;
    const first = Math.min(lastFrame, Math.ceil(start * fps - .5));
    const last = Math.max(first, Math.min(lastFrame, Math.ceil(end * fps - .5) - 1));
    const index = Math.round(first + clamp((position - videoStart) / (videoEnd - videoStart)) * (last - first));
    const time = localSource && index === 0 ? 0 : (index + .5) / fps;
    return {index, time, progress: last === first ? 0 : (index - first) / (last - first)};
  }

  function display(frame) {
    displayedFrame = frame.index;
    scene.style.setProperty('--take-video-progress', frame.progress.toFixed(5));
    if (localSource) stopLocalWait();
  }

  function sync() {
    const decoded = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    const canSeek = decoded || (localSource && video.readyState >= HTMLMediaElement.HAVE_METADATA);
    if (failed || preference.matches || progress === null || pendingFrame !== null ||
        video.seeking || !canSeek ||
        (localSource && video.currentSrc !== localSource) ||
        !Number.isFinite(video.duration) || video.duration <= 0) return;

    const frame = resolveFrame(progress);
    if (decoded && frame.index === displayedFrame) {
      reveal();
      return;
    }

    // Intermediate frames use their sample centres rather than exact boundaries.
    const time = Math.min(frame.time, video.duration * .999999);
    const atFrame = Math.abs(video.currentTime - time) < .001;
    if (decoded && atFrame) {
      display(frame);
      reveal();
      return;
    }

    pendingFrame = frame;
    try {
      // A local file can expose metadata while remaining paused without a frame.
      video.currentTime = atFrame ? Math.min(time + .005, video.duration * .999999) : time;
      watchLocalFrame();
    } catch {
      fail();
    }
  }

  function setLocalStatus(message) {
    if (localStatus && localStatus.textContent !== message) localStatus.textContent = message;
  }

  function stopLocalWait() {
    clearTimeout(localPoll);
    localPoll = 0;
    localDeadline = 0;
  }

  function reveal() {
    scene.classList.add('is-scroll-ready');
    if (localSource) {
      stopLocalWait();
      setLocalStatus('Vídeo pronto. Role para ajustar o enquadramento.');
    }
  }

  function watchLocalFrame() {
    if (!localSource || failed || preference.matches || localPoll) return;
    if (!localDeadline) localDeadline = performance.now() + localWaitLimit;
    localPoll = setTimeout(() => {
      localPoll = 0;
      advanceFrame();
      if (!localDeadline || !localSource) return;
      const decoded = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      if (progress === null && decoded && !pendingFrame) stopLocalWait();
      else if (performance.now() >= localDeadline) fail('O navegador demorou para abrir o vídeo. Tente um MP4 em H.264.');
      else watchLocalFrame();
    }, 160);
  }

  function releaseLocalSource(detach) {
    stopLocalWait();
    if (!localSource) return;
    if (detach && video.getAttribute('src') === localSource) {
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    }
    URL.revokeObjectURL(localSource);
    localSource = null;
  }

  function fail(message = cannotOpen) {
    failed = true;
    pendingFrame = null;
    scene.classList.remove('is-scroll-ready');
    if (localSource) {
      releaseLocalSource(true);
      setLocalStatus(message);
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
    watchLocalFrame();
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
    if (scene.classList.contains('is-scroll-ready')) return;
    if (video.currentSrc === localSource && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setLocalStatus('Vídeo selecionado. Preparando o enquadramento…');
    }
  }

  function advanceFrame() {
    if (pendingFrame !== null && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        (!localSource || video.currentSrc === localSource)) {
      display(pendingFrame);
      pendingFrame = null;
    }
    updateLocalStatus();
    sync();
  }

  if (localInput) {
    localPicker.hidden = false;
    const selectFile = () => {
      const file = localInput.files[0];
      if (!file) return;
      localInput.value = '';
      setLocalStatus('Vídeo selecionado. Abrindo o arquivo…');
      releaseLocalSource(true);
      requested = false;
      failed = false;
      pendingFrame = null;
      displayedFrame = null;
      scene.classList.remove('is-scroll-ready');
      scene.style.removeProperty('--take-video-progress');
      if (!file.size) {
        setLocalStatus('O arquivo está vazio. Escolha o vídeo novamente.');
        return;
      }
      try {
        localSource = URL.createObjectURL(file);
      } catch {
        setLocalStatus(cannotOpen);
        return;
      }
      if (!preference.matches) prepare();
      updateLocalStatus();
    };
    localInput.addEventListener('input', selectFile);
    localInput.addEventListener('change', selectFile);
    localInput.addEventListener('cancel', () => {
      if (!localSource && !failed) setLocalStatus('Nenhum vídeo selecionado. Escolha um arquivo para começar.');
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
  for (const event of ['loadedmetadata', 'loadeddata', 'canplay', 'seeked']) {
    video.addEventListener(event, advanceFrame);
  }

  preference.addEventListener('change', () => {
    if (preference.matches) {
      scene.classList.remove('is-scroll-ready');
      stopLocalWait();
    } else {
      if (localSource) prepare();
      render(progress, near);
      watchLocalFrame();
    }
    updateLocalStatus();
  });

  window.MOVVA_NUTRITION_TAKE = {render};
})();
