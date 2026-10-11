# MOVVA Wellness — Stage 6A Motion Signature (2026-10-11)

## Product intent

Continue the MOVVA brand direction (calm, high-end, wellness, warm beige and sage). Increase perceived cinematic craft **without** auto-playing particles, hard UI swaps, oversized blur, or redesigning app content. Scroll controls all movements forward and backward.

This change is intentionally scoped to the first of three motion phases. Stages 6B/6C (editorial kinetic type, Living Data, Circle interaction, finale polish and real-device performance) are separate.

## Implementation

- `motion-studio.js`: each fragment in Connected, Training, Nutrition, Evolution and Circle starts near a stable anchor inside the device's silhouette, scaled down and rotated towards the phone. The same monotone, scroll-derived extraction progress moves it outwards, raises depth, unfolds toward the viewer, then reverses exactly on upward scroll. Connected's rear-facing reveal uses the back silhouette; on front-facing chapters it emerges from the display area. The hero cards retain their existing design. Existing chapter-copy protection remains in effect.
- `mobile-phone.js`: a subtle **3.2%** uniform 3D dolly highlights the rear camera near the Connected transition without changing phone width/height or reconstructing all shell facets. The dolly was reduced from 4.4% after Safari accessory containment reported a 0.048px tolerance exceedance; 3.2% passed.
- `phone-shell.css`: separate clipped, low-opacity specular ribbons across the glass, satin rear and camera platform. They move with scroll through custom CSS properties on only three sub-elements (no wall geometry, no autoplay).
- `qa/stage6a-motion-signature.cjs`: cross-browser origin-vs-destination, scrubbing and rewind, controlled dolly bounds, specular properties and copy/nav protection across 1440×900, 880×765, 393×852 and 320×667.
- `qa/stage1a-shell.cjs`: optional per-viewport QA filter to isolate expensive browser screenshots, no change to normal all-view CI execution.
- `.github/workflows/stage1a-qa.yml`: independent Stage 6A job in Chromium and WebKit, plus existing regression suite.

## Verified browser evidence

At the current final design with 3.2% dolly:

- Stage 6A signature: **56 checks per browser, Chromium and WebKit; all passed**, including all four viewports and reversible card-to-phone motion. Desktop training fragment starts roughly 5px from its phone anchor and ends roughly 193px away; final positions preserve existing copy layout.
- Stage 4C continuity: **35 checks per viewport × four viewports per browser; all passed**, including reversible camera position and no chapter-switch teleports.
- Camera-wall containment: **40 poses per browser; all passed**. No detached metal strips, additional lens shift or outlying buttons.
- Hardware Stage 1A regression: desktop, mobile and 320px tested separately in Chromium and WebKit: **18 checks and 16 captures per viewport**, all passed. Per-viewport filtering avoided headless runner exhaustion after a previous uninterrupted combined capture job was stopped near its end.
- Stage 4B cinema reversible scroll: **32 checks per browser; passed** on the new motion code prior to reducing the dolly by 1.2 percentage points; dolly scale is separately validated at the final setting.
- Motion composition: **28 positions per browser; no recorded copy/navigation overlaps** on the new motion code before that purely hardware-scale adjustment.
- Visual comparison captured the Training fragment initially close to the phone and at its released position in desktop/mobile; camera rear remains legible.

Automated desktop/mobile WebKit and Chromium rendering is not a physical Safari/iPhone FPS certification. The original screenshots in the app device remain swappable.

## Release controls

Target: `www.movvawellness.com.br`, apex redirected 308. Current production baseline on starting branch: `8faf3c03241a6144a2c38fa112c9692c56ee20a3`. Preserve a rollback branch before merging.

Only merge tested branch if it remains strictly ahead of master. Wait for Vercel `READY`, confirm the official domain alias and exact deployed commit, then verify HTTPS 200, apex 308, script markers and a real browser scroll pass. If anything breaks, restore the previous deployment/commit. Do not modify DNS, Supabase, email, the native app, or user content.

## Next

Stage 6B: restrained headline masks and fine-grained Living Data progress, Circle connection and ending motion; do not merely add more free-floating cards.
