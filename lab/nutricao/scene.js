(() => {
  'use strict';

  const track = document.querySelector('.sequence');
  const stage = track.querySelector('.stage');
  const slider = stage.querySelector('input.progress-control, .progress-control input[type="range"]');
  const hint = stage.querySelector('[data-scroll-hint]');
  const announcement = stage.querySelector('[data-state]');
  const opening = stage.querySelector('.opening');
  const finder = stage.querySelector('.finder-photo');
  const sourcePicker = stage.querySelector('#reference-file');
  const sourceMessage = stage.querySelector('[data-source-message]');
  const cards = Array.from(stage.querySelectorAll('.result-card'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const phases = [
    { start: 0, name: 'aim', label: 'Incline um pouco o celular' },
    { start: 0.29, name: 'aligned', label: 'Inclinação adequada' },
    { start: 0.54, name: 'processing', label: 'Analisando a refeição' },
    { start: 0.72, name: 'results', label: 'Resultado da análise' }
  ];

  const clamp = value => Math.max(0, Math.min(1, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));
  const mix = (from, to, progress) => from + (to - from) * progress;
  const smooth = progress => progress * progress * (3 - 2 * progress);
  let frame = 0;
  let currentPhase = '';

  function phaseAt(progress) {
    for (let index = phases.length - 1; index > 0; index--) {
      if (progress >= phases[index].start) return phases[index];
    }
    return phases[0];
  }

  function render(progress) {
    const alignment = 1 - (1 - range(progress, 0, phases[1].start)) ** 2;
    const flash = reducedMotion.matches
      ? 0
      : smooth(range(progress, 0.475, 0.522)) * (1 - smooth(range(progress, 0.522, 0.555)));
    const style = stage.style;
    style.setProperty('--finder-x', mix(-36, 0, alignment).toFixed(2) + 'px');
    style.setProperty('--finder-y', mix(26, 0, alignment).toFixed(2) + 'px');
    style.setProperty('--finder-roll', mix(-8, 0, alignment).toFixed(2) + 'deg');
    style.setProperty('--finder-scale', mix(1.18, 1.03, alignment).toFixed(4));
    style.setProperty('--flash', flash.toFixed(4));
    style.setProperty('--analysis', range(progress, phases[2].start, phases[3].start).toFixed(4));
    const visorOpacity = stage.dataset.artwork !== 'custom' ? 1
      : reducedMotion.matches ? Number(progress > 0) : range(progress, 0, 0.045);
    style.setProperty('--visor-alpha', visorOpacity.toFixed(4));

    const phase = phaseAt(progress);
    if (currentPhase !== phase.name) {
      currentPhase = phase.name;
      stage.dataset.phase = phase.name;
      if (announcement) announcement.textContent = phase.label;
      if (slider) slider.setAttribute('aria-valuetext', phase.label);
    }
    if (slider) slider.value = Math.round(progress * 1000);

    cards.forEach((card, index) => {
      const start = phases[3].start + index * 0.028;
      const rise = smooth(range(progress, start, start + 0.16));
      card.style.setProperty('--card-alpha', smooth(range(progress, start, start + 0.075)).toFixed(4));
      card.style.setProperty('--card-rise', rise.toFixed(4));
      card.style.setProperty('--card-scale', mix(0.18, 1, rise).toFixed(4));
    });
  }

  function travel() {
    return Math.max(1, track.offsetHeight - stage.offsetHeight);
  }

  function syncScroll() {
    frame = 0;
    render(clamp(-track.getBoundingClientRect().top / travel()));
  }

  function requestSync() {
    if (!frame) frame = requestAnimationFrame(syncScroll);
  }

  function fitArtboard() {
    const {clientWidth: width, clientHeight: height} = stage;
    const portraitCloseup = width <= 650 && width < height && stage.dataset.artwork !== 'custom';
    const scale = portraitCloseup ? Math.min(width / 830, height / 1040)
      : Math.min(width / 1672, height / 941);
    stage.style.setProperty('--art-scale', scale.toFixed(6));
    stage.style.setProperty('--art-shift', portraitCloseup ? (306 * scale).toFixed(2) + 'px' : '0px');
    requestSync();
  }

  function seek(progress) {
    const destination = window.scrollY + track.getBoundingClientRect().top + progress * travel();
    window.scrollTo(0, destination);
    render(progress);
  }

  function showReference() {
    stage.dataset.source = opening.naturalWidth > 0 ? 'ready' : 'missing';
  }

  opening.addEventListener('load', showReference);
  opening.addEventListener('error', showReference);
  if (opening.complete) showReference();
  let localReference;
  let sourceAttempt = 0;
  sourcePicker.addEventListener('change', () => {
    const file = sourcePicker.files[0];
    if (!file) return;
    const attempt = ++sourceAttempt;
    const candidate = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (attempt !== sourceAttempt) {
        URL.revokeObjectURL(candidate);
        return;
      }
      if (Math.abs(image.naturalWidth / image.naturalHeight - 1672 / 941) > .07) {
        sourceMessage.textContent = 'Selecione o quadro horizontal de referência.';
        URL.revokeObjectURL(candidate);
        return;
      }
      if (localReference) URL.revokeObjectURL(localReference);
      localReference = candidate;
      stage.dataset.artwork = 'custom';
      finder.src = candidate;
      opening.src = candidate;
      sourceMessage.textContent = 'Selecione a imagem com o celular e o prato verde.';
      fitArtboard();
      seek(0);
    };
    image.onerror = () => {
      if (attempt === sourceAttempt) {
        sourceMessage.textContent = 'O navegador não conseguiu abrir a imagem. Use PNG, JPG ou WebP.';
      }
      URL.revokeObjectURL(candidate);
    };
    image.src = candidate;
  });

  if (slider) slider.addEventListener('input', () => seek(Number(slider.value) / 1000));
  if (hint) hint.addEventListener('click', () => seek(phases[1].start + 0.012));
  window.addEventListener('scroll', requestSync, { passive: true });
  window.addEventListener('resize', fitArtboard, { passive: true });
  window.addEventListener('pageshow', fitArtboard);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', requestSync);
  else if (reducedMotion.addListener) reducedMotion.addListener(requestSync);
  if (window.ResizeObserver) new ResizeObserver(fitArtboard).observe(stage);

  document.documentElement.classList.add('scene-ready');
  fitArtboard();
})();
