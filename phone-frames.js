import { MOBILE_PHONE_QUERY, PHONE_MOTION_END, phoneTurnAt } from './phone-motion.js';

const canvas = document.querySelector('#react-phone-frames');
const live = document.querySelector('#react-phone');
const context = canvas?.getContext('2d');

if (context && live) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia(MOBILE_PHONE_QUERY).matches;
  const surface = canvas.parentElement;
  const atlasSource = mobile ? '/assets/react-phone-frames-mobile.webp' : '/assets/react-phone-frames.webp';
  if (mobile) canvas.width = canvas.height = 384;
  const frameCount = 30;
  let sheet;
  let columns = 0;
  let position = 0;
  let displayed = -1;

  function render(progress) {
    position = progress;
    const liveReady = !mobile && live.classList.contains('is-ready');
    if (liveReady) {
      sheet = undefined;
      columns = 0;
    }
    if (reduced.matches || liveReady) {
      if (mobile) surface.style.removeProperty('--hero-phone-scale');
      canvas.classList.remove('is-frame-ready');
      return;
    }

    // Keep a loaded handset through the fade even if a fast swipe advances the scroll target.
    if (!sheet && progress > PHONE_MOTION_END + .021) return;

    const turn = phoneTurnAt(progress, mobile);
    // The phone also responds to the first swipe while the rendered angles load.
    if (mobile) surface.style.setProperty('--hero-phone-scale', (1 + .08 * turn).toFixed(4));

    if (!sheet) {
      const image = new Image();
      sheet = image;
      image.fetchPriority = mobile ? 'high' : 'low';
      image.src = atlasSource;
      image.decode().then(() => {
        if (sheet !== image) return;
        const tilesAcross = image.naturalWidth / canvas.width;
        const tilesDown = image.naturalHeight / canvas.height;
        if (!Number.isInteger(tilesAcross) || !Number.isInteger(tilesDown) || tilesAcross * tilesDown < frameCount) return;
        columns = tilesAcross;
        render(position);
      }).catch(() => {
        // Keep the opening poster if the frame sheet cannot be decoded.
      });
    }
    if (!columns) return;

    const index = Math.round(turn * (frameCount - 1));
    if (index !== displayed) {
      const { width, height } = canvas;
      const x = (index % columns) * width;
      const y = Math.floor(index / columns) * height;
      context.clearRect(0, 0, width, height);
      context.drawImage(sheet, x, y, width, height, 0, 0, width, height);
      displayed = index;
      canvas.dataset.frame = String(index);
    }
    canvas.classList.add('is-frame-ready');
  }

  new MutationObserver(() => render(position)).observe(live, {
    attributes: true,
    attributeFilter: ['class']
  });
  reduced.addEventListener('change', () => render(position));
  window.MOVVA_PHONE_FRAMES = { render };
  window.dispatchEvent(new Event('movva:hero-layout'));
}
