import { PHONE_TURN_END, PHONE_MOTION_END } from './phone-motion.js';

const canvas = document.querySelector('#react-phone-frames');
const live = document.querySelector('#react-phone');
const context = canvas?.getContext('2d');

if (context && live) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frameCount = 30;
  let sheet;
  let columns = 0;
  let position = 0;
  let displayed = -1;

  function render(progress) {
    position = progress;
    const liveReady = live.classList.contains('is-ready');
    if (liveReady) {
      sheet = undefined;
      columns = 0;
    }
    if (reduced.matches || liveReady || progress > PHONE_MOTION_END + .021) {
      canvas.classList.remove('is-frame-ready');
      return;
    }

    if (!sheet) {
      const image = new Image();
      sheet = image;
      image.fetchPriority = 'low';
      image.src = '/assets/react-phone-frames.webp';
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

    const index = Math.round(Math.min(1, Math.max(0, progress / PHONE_TURN_END)) * (frameCount - 1));
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
