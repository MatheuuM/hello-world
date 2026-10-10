# MOVVA — Hardware atelier (2026-10-10)

## Scope & release guard
- Site: `hello-world`; branch `refine/phone-18promax-hardware`, based on `refine/phone-stage1a2-corners-camera`.
- Official domain: `www.movvawellness.com.br`; **no production promotion**.
- MOVVA logo and existing seven scroll chapters remain unchanged. App screenshots are placeholders to be swapped after final app artwork.

## Design reference (shape, not branding)
- Contemporary Pro Max proportions: 78.0 × 163.4 × 8.75 mm (iPhone 18 Pro Max physical reference).
- Brushed aluminum/silver-sage MOVVA frame; satin lower ceramic rear window; a single integrated wide upper camera plateau.
- Three diagonal lenses, independent extruded camera deck/sidewalls and lens barrel/metal rims/glass.
- Smaller front pill; separate action, volume, lock, and camera-control buttons; antenna bands, USB-C edge, speaker holes.

## Implemented in source
- `phone-shell.js`: shared device ratio, 14-segment rounded corners, true rounded plateau sidewalls, mechanical details, observable geometry metadata.
- `phone-shell.css`: shell finish, lower ceramic panel, elevated camera deck, three lens stacks, microphone/flash/LiDAR, machined controls and bottom edge.
- `mobile-phone.js`: same ratio for viewport scaling.
- `index.html`: microphone node for hardware.
- `experience.js`: WebGL counterpart with full-width geometry, metallic stacked optics, rear glass window, corrected model aspect, smaller Dynamic Island.
- `qa/stage1a-shell.cjs`: Chromium/WebKit CSS 3D geometry assertions and screenshots. Optional experimental GPU path is gated behind `QA_EXPERIMENTAL_WEBGL=1`.
- `.github/workflows/stage1a-qa.yml`: new refinement branch included in QA trigger.

## Verification evidence (do not overstate)
- The Vercel preview deployment was `READY` after updates; this means deployment succeeded, **not** that all browser visual criteria passed.
- In an isolated Ubuntu 26.04 Vercel Sandbox, `node --check` succeeded for `phone-shell.js`, `mobile-phone.js`, `experience.js`, and the QA script.
- Chromium desktop CSS3D checks passed: shared shell geometry, raised plateau with three optical barrels, eight forced camera angles, two real-scroll poses and chapter integrity (16 reported PASS checkpoints, 14 saved screenshots).
- Explicit WebGL loaded and its hardware metadata passed, but taking a full screenshot with the software GPU exceeded 30 seconds. The combined QA command returned `FAIL` at that screenshot, so **no final cross-renderer certification**.
- Chromium mobile/small-width and WebKit were not completed in that timed session. They remain mandatory visual acceptance tests.
- Browser screenshots were generated within the ephemeral QA sandbox, which expired, so no durable before/after images were recovered.

## Next acceptance pass
1. Run primary CSS renderer QA on desktop, 393 px and 320 px in Chromium and WebKit independently.
2. Review the same rotation markers in production baseline vs preview: 0°, 25°, 55°, 85/90°, 145° and rear, including the screenshot's formerly broken four corners and blue-marked camera plateau.
3. Observe live scrolling with cards, test reverse scroll, ensure no camera disappearance in Safari and no device clipping.
4. Retry WebGL on a hardware-accelerated runner or on a native device; compare the fallback with CSS. Do not treat software-GPU screenshot timeouts as proof of device slowness.
5. Record before/after, check actual iPhone hardware before merging or promoting.

**Release status: preview only; visual acceptance pending.**
