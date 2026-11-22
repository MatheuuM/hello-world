import React, { Component, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { addAfterEffect } from '@react-three/fiber';
import { IPhoneMockup } from 'react-3d-mockups';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';

const screenUrl = '/assets/home.webp';
const openingPortion = .105;
const toRadians = Math.PI / 180;

function yawAt(progress) {
  return -25 + 22 * progress;
}

function mountScreenTexture(model, image, cutout) {
  let panel;
  model.traverse(object => {
    // The pinned mockup draws its display cutout using a rounded shader mesh.
    if (object.isMesh && object.geometry.type === 'ShapeGeometry' && object.material.isShaderMaterial) {
      panel = object;
    }
  });
  if (!panel) return null;

  // Reuse the display's actual curved boundary and position for the texture.
  const originalGeometry = panel.geometry;
  const originalMaterial = panel.material;
  const geometry = originalGeometry.clone();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index++) {
    uv.setXY(index,
      (positions.getX(index) - min.x) / (max.x - min.x),
      (positions.getY(index) - min.y) / (max.y - min.y));
  }

  const surface = document.createElement('canvas');
  surface.width = image.naturalWidth;
  surface.height = image.naturalHeight;
  const context = surface.getContext('2d');
  if (!context) {
    geometry.dispose();
    return null;
  }
  context.drawImage(image, 0, 0);

  // Preserve the mockup's Dynamic Island at its own measured screen coordinates.
  const width = parseFloat(cutout.style.width);
  const height = parseFloat(cutout.style.height);
  const left = (surface.width - width) / 2;
  const top = parseFloat(cutout.style.top);
  const radius = height / 2;
  context.fillStyle = cutout.style.backgroundColor || '#020308';
  context.beginPath();
  context.arc(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2);
  context.arc(left + radius, top + radius, radius, Math.PI / 2, Math.PI * 1.5);
  context.closePath();
  context.fill();

  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
  panel.geometry = geometry;
  panel.material = material;

  return () => {
    panel.geometry = originalGeometry;
    panel.material = originalMaterial;
    geometry.dispose();
    texture.dispose();
    material.dispose();
  };
}

class PhoneFallback extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function OpeningPhone({ mount, experience, stage }) {
  const [progress, setProgress] = useState(0);
  const phone = useRef(null);
  const screenImage = useRef(null);
  const renderer = useRef(null);

  useLayoutEffect(() => {
    const sync = trigger => {
      const next = trigger.progress;
      mount.dataset.progress = next.toFixed(5);
      mount.dataset.yaw = yawAt(next).toFixed(3);
      setProgress(next);
    };
    const trigger = ScrollTrigger.create({
      trigger: experience,
      start: 'top top',
      end: () => '+=' + Math.max(1, (experience.offsetHeight - stage.clientHeight) * openingPortion),
      onUpdate: sync,
      onRefresh: sync,
    });
    sync(trigger);

    const observer = new ResizeObserver(() => trigger.refresh());
    observer.observe(experience);
    observer.observe(stage);
    return () => {
      observer.disconnect();
      trigger.kill();
      delete mount.dataset.progress;
      delete mount.dataset.yaw;
    };
  }, [mount, experience, stage]);

  const onCreated = useCallback(state => {
    renderer.current?.dispose();
    const canvas = state.gl.domElement;
    const hide = () => mount.classList.remove('is-ready');
    let disposeScreen;
    const unsubscribe = addAfterEffect(() => {
      const context = state.gl.getContext();
      if (!screenImage.current || !phone.current || !canvas.isConnected || context.isContextLost() ||
          state.gl.info.render.calls === 0) return;
      if (!disposeScreen) {
        const cutout = mount.querySelector('[data-mockup-cutout]');
        if (!cutout) return;
        disposeScreen = mountScreenTexture(phone.current, screenImage.current, cutout);
        if (disposeScreen) queueMicrotask(state.invalidate);
        return;
      }
      mount.classList.add('is-ready');
      unsubscribe();
    });
    canvas.addEventListener('webglcontextlost', hide, { once: true });
    renderer.current = {
      invalidate: state.invalidate,
      dispose() {
        unsubscribe();
        disposeScreen?.();
        canvas.removeEventListener('webglcontextlost', hide);
        hide();
      },
    };
    state.invalidate();
  }, [mount]);

  useLayoutEffect(() => {
    let mounted = true;
    const image = new Image();
    image.src = screenUrl;
    image.decode().then(() => {
      if (!mounted) return;
      screenImage.current = image;
      renderer.current?.invalidate();
    }, () => {});
    return () => {
      mounted = false;
      renderer.current?.dispose();
      renderer.current = null;
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
      shadows
      frameloop="demand"
      dpr={[1, 1.75]}
      resolution={589}
      rotation={[
        (5 - 4 * progress) * toRadians,
        yawAt(progress) * toRadians,
        (-3 + 2 * progress) * toRadians,
      ]}
      onCreated={onCreated}
      label="iPhone 17 Pro Max com o aplicativo MOVVA"
    >
      <img
        src={screenUrl}
        className="hero-react-screen"
        alt=""
        width={589}
        height={1280}
        draggable={false}
      />
    </IPhoneMockup>
  );
}

const mount = document.querySelector('#react-phone');
const experience = document.querySelector('#experience');
const stage = document.querySelector('#stage');
const staticMode = new URLSearchParams(location.search).get('visual') === 'estatico';
if (mount && experience && stage && !staticMode &&
    !document.documentElement.classList.contains('static-experience')) {
  gsap.registerPlugin(ScrollTrigger);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hide = () => mount.classList.remove('is-ready');
  let root;
  function syncMotion() {
    if (motion.matches) {
      root?.unmount();
      root = null;
      hide();
      return;
    }
    if (root) return;
    root = createRoot(mount, { onCaughtError: hide, onUncaughtError: hide });
    root.render(
      <PhoneFallback>
        <OpeningPhone mount={mount} experience={experience} stage={stage} />
      </PhoneFallback>
    );
  }
  motion.addEventListener('change', syncMotion);
  syncMotion();
}
