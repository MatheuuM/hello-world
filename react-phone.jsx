import React, { Component, useCallback, useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { addAfterEffect } from '@react-three/fiber';
import { IPhoneMockup } from 'react-3d-mockups';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace, Vector3 } from 'three';

const camera = { position: [0, 0, 8], fov: 40 };
const bodyHeight = 4.398; // Body height of the pinned Pro Max model, in world units.
const radians = Math.PI / 180;
const mount = document.querySelector('#react-phone');
const stage = document.querySelector('#stage');
let latestFrame;
let renderer;

function createDisplay(model, cutout, anisotropy) {
  let panel;
  model.traverse(object => {
    if (object.isMesh && object.geometry.type === 'ShapeGeometry' && object.material.isShaderMaterial) panel = object;
  });
  if (!panel) return null;

  const originalGeometry = panel.geometry;
  const originalMaterial = panel.material;
  const geometry = originalGeometry.clone();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) - min.x) / (max.x - min.x), (positions.getY(i) - min.y) / (max.y - min.y));
  }
  const surface = document.createElement('canvas');
  surface.width = 589;
  surface.height = 1280;
  const context = surface.getContext('2d');
  if (!context) {
    geometry.dispose();
    return null;
  }

  const width = parseFloat(cutout.style.width);
  const height = parseFloat(cutout.style.height);
  const top = parseFloat(cutout.style.top);
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.max(1, Math.min(8, anisotropy));
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
  panel.geometry = geometry;
  panel.material = material;

  return {
    panel, min, max,
    paint(image) {
      context.drawImage(image, 0, 0, surface.width, surface.height);
      context.fillStyle = cutout.style.backgroundColor || '#020308';
      context.beginPath();
      const left = (surface.width - width) / 2;
      const radius = height / 2;
      context.arc(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2);
      context.arc(left + radius, top + radius, radius, Math.PI / 2, Math.PI * 1.5);
      context.closePath();
      context.fill();
      texture.needsUpdate = true;
    },
    dispose() {
      panel.geometry = originalGeometry;
      panel.material = originalMaterial;
      geometry.dispose();
      texture.dispose();
      material.dispose();
    }
  };
}

function hide() {
  mount.classList.remove('is-ready');
  stage.classList.remove('phone-story-live');
}

class PhoneFallback extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function StoryPhone() {
  const phone = useRef(null);
  const dispose = useRef(null);

  const onCreated = useCallback(state => {
    dispose.current?.();
    const canvas = state.gl.domElement;
    let display;
    let lastFrame;
    let lastSize;
    let paintedImage;
    let paintedScreen;
    let lost = false;
    let awaitingPaint = false;

    function render(frame) {
      if (!frame || !display || lost || !phone.current) return;
      const { size } = state.get();
      if (!size.width || !size.height) return;
      const { image, screen, progress, x, y, height, pitch, yaw, roll } = frame;
      const painted = image?.naturalWidth && image !== paintedImage;
      if (painted) {
        display.paint(image);
        paintedImage = image;
        paintedScreen = screen;
      }
      if (!paintedImage) return;
      const unchanged = lastSize === size && lastFrame?.progress === progress &&
        lastFrame.x === x && lastFrame.y === y && lastFrame.height === height &&
        lastFrame.pitch === pitch && lastFrame.yaw === yaw && lastFrame.roll === roll;
      if (!painted && unchanged && mount.classList.contains('is-ready')) return;

      const units = 2 * camera.position[2] * Math.tan(camera.fov * radians / 2) / size.height;
      phone.current.position.set((x - size.width / 2) * units, (size.height / 2 - y) * units, 0);
      phone.current.scale.setScalar(height * units / bodyHeight);
      phone.current.rotation.set(pitch * radians, yaw * radians, roll * radians, 'YXZ');
      phone.current.updateMatrixWorld(true);
      mount.dataset.pageProgress = progress.toFixed(5);
      mount.dataset.yaw = yaw.toFixed(3);
      mount.dataset.pitch = pitch.toFixed(3);
      mount.dataset.roll = roll.toFixed(3);
      stage.style.setProperty('--story-shadow-x', x.toFixed(2) + 'px');
      stage.style.setProperty('--story-shadow-y', (y + height * .49).toFixed(2) + 'px');
      stage.style.setProperty('--story-shadow-width', (height * .53).toFixed(2) + 'px');
      lastFrame = frame;
      lastSize = size;
      awaitingPaint = true;
      state.invalidate();
    }

    function projectScreenPoint(u, v) {
      if (!display || !mount.classList.contains('is-ready')) return null;
      const { size, camera } = state.get();
      const { panel, min, max } = display;
      const point = new Vector3(min.x + (max.x - min.x) * u, max.y - (max.y - min.y) * v, 0);
      panel.localToWorld(point).project(camera);
      const normal = new Vector3(0, 0, 1).transformDirection(panel.matrixWorld).z;
      return { x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2, normal, u, v };
    }

    const unsubscribe = addAfterEffect(() => {
      if (lost || !phone.current || !canvas.isConnected || state.gl.info.render.calls === 0) return;
      if (!display) {
        const cutout = mount.querySelector('[data-mockup-cutout]');
        if (!cutout) return;
        display = createDisplay(phone.current, cutout, state.gl.capabilities.getMaxAnisotropy());
        if (display) queueMicrotask(() => render(latestFrame));
        return;
      }
      if (awaitingPaint) {
        awaitingPaint = false;
        mount.dataset.screen = paintedScreen;
        mount.classList.add('is-ready');
        stage.classList.add('phone-story-live');
      }
    });
    const contextLost = event => {
      event.preventDefault();
      lost = true;
      hide();
    };
    const contextRestored = () => {
      lost = false;
      lastFrame = undefined;
      render(latestFrame);
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    renderer = { render, projectScreenPoint };
    dispose.current = () => {
      unsubscribe();
      display?.dispose();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      renderer = undefined;
      hide();
    };
    state.invalidate();
  }, []);

  useLayoutEffect(() => {
    const home = document.querySelector('.css3d-screen-home');
    const refresh = () => renderer?.render(latestFrame);
    home?.addEventListener('load', refresh);
    const resize = new ResizeObserver(() => window.dispatchEvent(new Event('movva:hero-layout')));
    resize.observe(stage);
    return () => {
      home?.removeEventListener('load', refresh);
      resize.disconnect();
      dispose.current?.();
    };
  }, []);

  return (
    <IPhoneMockup
      ref={phone}
      variant="promax"
      color="silver"
      statusBar={false}
      controls={false}
      autoRotate={false}
      float={false}
      shadows={false}
      camera={camera}
      frameloop="demand"
      dpr={[1, 2]}
      resolution={589}
      onCreated={onCreated}
      label="iPhone 17 Pro Max com o aplicativo MOVVA"
    >
      <img src="/assets/home.webp" className="hero-react-screen" alt="" width={589} height={1280} draggable={false} />
    </IPhoneMockup>
  );
}

if (mount && stage && !document.documentElement.classList.contains('static-experience')) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  window.MOVVA_REACT_PHONE = {
    render(frame) {
      latestFrame = frame;
      renderer?.render(frame);
    },
    projectScreenPoint(u, v) {
      return renderer?.projectScreenPoint(u, v);
    }
  };
  let root;
  function syncMotion() {
    if (motion.matches) {
      root?.unmount();
      root = null;
      hide();
    } else if (!root) {
      root = createRoot(mount, { onCaughtError: hide, onUncaughtError: hide });
      root.render(<PhoneFallback><StoryPhone /></PhoneFallback>);
    }
    window.dispatchEvent(new Event('movva:hero-layout'));
  }
  motion.addEventListener('change', syncMotion);
  syncMotion();
}
