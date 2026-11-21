(() => {
  'use strict';
  const track = document.querySelector('.sequence');
  const stage = track.querySelector('.stage');
  const glass = stage.querySelector('.phone-screen');
  const caption = stage.querySelector('[data-caption]');
  const cameraStatus = stage.querySelector('[data-camera-status]');
  const controls = [...stage.querySelectorAll('[data-step]')];
  const cards = [...stage.querySelectorAll('.insight')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frontal = new URLSearchParams(location.search).get('enquadramento') === 'frontal';
  const steps = [
    {start: 0, jump: 0, phase: 'aim', title: 'Ajuste o ângulo'},
    {start: .36, jump: .43, phase: 'aligned', title: 'Inclinação adequada'},
    {start: .55, jump: .64, phase: 'processing', title: 'Analisando a refeição'},
    {start: .72, jump: .94, phase: 'results', title: 'Resultado da análise'}
  ];

  const clamp = value => Math.min(1, Math.max(0, value));
  const mix = (from, to, amount) => from + (to - from) * amount;
  const ease = (value, from, to) => {
    const t = clamp((value - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  function set(element, values) {
    for (const [name, value] of Object.entries(values)) element.style.setProperty(name, value);
  }
  const px = value => value.toFixed(2) + 'px';
  const deg = value => value.toFixed(2) + 'deg';
  let frame = 0;
  let progress;
  let lastTime = 0;
  let phase = -1;

  function render(p) {
    const align = ease(p, 0, .365);
    const capture = ease(p, .487, .547);
    const results = ease(p, .72, .94);
    const flash = reduced.matches ? 0 : ease(p, .525, .546) * (1 - ease(p, .546, .555));
    const small = stage.clientWidth <= 650;
    set(stage, {
      '--table-x': px(mix(-9, 6, align)),
      '--table-y': px(mix(4, -7, align)),
      '--table-scale': mix(1.09, 1.045, align).toFixed(4),
      '--rig-x': px(mix(-9, 18, align) - (small ? 50 : 34) * results),
      '--rig-y': px(mix(14, -8, align) - (small ? 5 : 23) * results),
      '--rig-roll': deg(mix(frontal ? -3.2 : -11, frontal ? 0 : 1.5, align) - 2 * results),
      '--rig-pitch': deg(mix(frontal ? 7 : 14, -1, align)),
      '--rig-yaw': deg(mix(frontal ? -3 : -21, 0, align)),
      '--rig-scale': (1 - .04 * capture - .065 * results).toFixed(4),
      '--camera-x': mix(-13, 0, align).toFixed(2) + '%',
      '--camera-y': mix(7, 0, align).toFixed(2) + '%',
      '--camera-roll': deg(mix(13, 0, align)),
      '--camera-scale': mix(1.45, 1.065, align).toFixed(4),
      '--shutter-scale': (1 - .13 * capture).toFixed(4),
      '--flash': flash.toFixed(4),
      '--analysis': mix(.12, 1, ease(p, .55, .72)).toFixed(4)
    });

    const index = steps.findLastIndex(step => p >= step.start);
    if (index !== phase) {
      phase = index;
      const step = steps[index];
      stage.dataset.phase = step.phase;
      caption.textContent = step.title;
      cameraStatus.textContent = index === 0 ? 'Incline um pouco o celular' : 'Inclinação adequada';
      controls.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }

    if (p < .72) {
      for (const card of cards) card.style.setProperty('--card-alpha', '0');
      return;
    }

    const origin = glass.getBoundingClientRect();
    const dock = cards[0].parentElement.getBoundingClientRect();
    for (const [i, card] of cards.entries()) {
      const takeoff = ease(p, .72 + i * .028, .858 + i * .034);
      const targetX = dock.left + card.offsetLeft + card.offsetWidth / 2;
      const targetY = dock.top + card.offsetTop + card.offsetHeight / 2;
      set(card, {
        '--card-alpha': ease(p, .728 + i * .028, .798 + i * .028).toFixed(4),
        '--card-x': px((origin.left + origin.width * .60 - targetX) * (1 - takeoff)),
        '--card-y': px((origin.top + origin.height * .48 - targetY) * (1 - takeoff) - 22 * Math.sin(Math.PI * takeoff)),
        '--card-scale': mix(.19, 1, takeoff).toFixed(4),
        '--card-turn': deg(mix(-22, 0, takeoff))
      });
    }
  }

  function travel() { return Math.max(1, track.offsetHeight - stage.offsetHeight); }
  function requestFrame() {
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    const target = clamp((scrollY - track.offsetTop) / travel());
    const elapsed = Math.min(120, time - (lastTime || time - 16));
    lastTime = time;
    const next = progress === undefined || reduced.matches || Math.abs(target - progress) < .0004
      ? target : mix(progress, target, 1 - Math.exp(-elapsed / 75));
    if (next !== progress) {
      progress = next;
      render(progress);
    }
    if (next !== target) requestFrame();
  }

  function resize() {
    progress = undefined;
    lastTime = 0;
    requestFrame();
  }

  controls.forEach((button, i) => button.addEventListener('click', () => {
    scrollTo({top: track.offsetTop + steps[i].jump * travel(), behavior: reduced.matches ? 'instant' : 'smooth'});
  }));
  addEventListener('scroll', requestFrame, {passive: true});
  addEventListener('resize', resize, {passive: true});
  reduced.addEventListener?.('change', resize);
  document.documentElement.classList.add('pov-ready');
  requestFrame();
})();
