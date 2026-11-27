import { MOBILE_PHONE_QUERY, PHONE_MOTION_END, phoneTurnAt } from './phone-motion.js';

const canvas = document.querySelector('#react-phone-frames');
const live = document.querySelector('#react-phone');
const context = canvas?.getContext('2d');
const query = new URLSearchParams(location.search);

if (context && live && query.get('visual') !== 'estatico') {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia(MOBILE_PHONE_QUERY).matches;
  const paths = mobile
    ? ['/assets/react-phone-frames-mobile.webp', '/assets/react-phone-frames-mobile-end.webp']
    : ['/assets/react-phone-frames.webp'];
  const frameCount = 30;
  const framesPerSheet = frameCount / paths.length;
  const tileSize = mobile ? 544 : 672;
  const outputSize = mobile ? 1088 : 1344;
  const first = canvas.parentElement.querySelector('.hero-react-poster');
  const last = canvas.parentElement.querySelector('.hero-react-front');
  const sheets = [];
  let useFrames = mobile || query.get('renderer') === 'webgl';
  let fallbackTimer;
  let position = 0;
  let displayedIndex = -1;
  let displayedImage;

  function startFallback() {
    useFrames = true;
    clearTimeout(fallbackTimer);
    render(position);
  }

  function loadSheet(page) {
    if (sheets[page]) return sheets[page];
    const image = new Image();
    const sheet = { image, columns: 0 };
    sheets[page] = sheet;
    image.fetchPriority = mobile && page === 0 ? 'high' : 'low';
    image.src = paths[page];
    image.decode().then(() => {
      if (sheets[page] !== sheet) return;
      const across = image.naturalWidth / tileSize;
      const down = image.naturalHeight / tileSize;
      if (!Number.isInteger(across) || !Number.isInteger(down) || across * down < framesPerSheet) return;
      sheet.columns = across;
      render(position);
    }).catch(() => {
      // Keep the poster or last usable frame on an unavailable sheet.
    });
    return sheet;
  }

  function render(progress) {
    position = progress;
    const liveReady = !mobile && live.classList.contains('is-ready');
    if (liveReady) {
      clearTimeout(fallbackTimer);
      useFrames = true;
      sheets.length = 0;
      displayedImage = undefined;
    }
    if (reduced.matches || liveReady) {
      canvas.classList.remove('is-frame-ready');
      return;
    }
    if (!sheets.length && progress > PHONE_MOTION_END + .021) return;

    // Give the desktop model a chance to start before downloading its fallback.
    if (!useFrames) {
      if (fallbackTimer === undefined) fallbackTimer = setTimeout(startFallback, 1800);
      return;
    }

    const index = Math.round(phoneTurnAt(progress, mobile) * (frameCount - 1));
    const page = Math.floor(index / framesPerSheet);
    const sheet = loadSheet(page);
    if (mobile && page === 0 && index >= 8) loadSheet(1);
    if (!sheet.columns) return;

    // Reuse the full-resolution stills at the two poses where the phone rests.
    const poster = index === 0 ? first : index === frameCount - 1 ? last : null;
    const image = poster?.complete && poster.naturalWidth ? poster : sheet.image;
    if (index !== displayedIndex || image !== displayedImage) {
      if (canvas.width !== outputSize) canvas.width = canvas.height = outputSize;
      context.clearRect(0, 0, outputSize, outputSize);
      context.imageSmoothingQuality = 'high';
      if (image === poster) {
        context.drawImage(image, 0, 0, outputSize, outputSize);
      } else {
        const offset = index % framesPerSheet;
        const x = (offset % sheet.columns) * tileSize;
        const y = Math.floor(offset / sheet.columns) * tileSize;
        context.drawImage(image, x, y, tileSize, tileSize, 0, 0, outputSize, outputSize);
      }
      displayedIndex = index;
      displayedImage = image;
      canvas.dataset.frame = String(index);
    }
    canvas.classList.add('is-frame-ready');
  }

  new MutationObserver(() => render(position)).observe(live, {
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('movva:phone-fallback', startFallback);
  for (const poster of [first, last]) poster?.addEventListener('load', () => render(position));
  reduced.addEventListener('change', () => render(position));
  window.MOVVA_PHONE_FRAMES = { render };
  window.dispatchEvent(new Event('movva:hero-layout'));
}
