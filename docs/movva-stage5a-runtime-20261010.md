# MOVVA Wellness — Stage 5A: runtime invalidation and visual-parity release

Date: 2026-10-10. Official site: `https://www.movvawellness.com.br/` (apex HTTP 308 -> www).

## Problem being addressed

The production CSS3D renderer previously rewrote the device width, height, CSS sizing variables, all five screenshot visibility states, and chapter attributes on **every** requestAnimationFrame, even when no physical dimension or screen changed. The camera shell has many dependent 3D perimeter and camera faces, so these unnecessary writes risk triggering repeated style and composite work. Motion Studio also read card dimensions and queried metrics widgets on every frame.

The headless WebKit software-compositing runtime showed a slow initial scroll at roughly 1–2 observed frames per second. That measurement is **not representative of real iPhone hardware** and does not prove a real-world FPS problem or speedup. Stage 5A aims at eliminating demonstrably redundant work without degrading the design.

## Surgical implementation

- `mobile-phone.js`: cache the last device dimensions, center, chosen screen, rear/front visibility, opacity and chapter index. Change only the properties whose values actually changed. Call `MOVVA_SHELL.setSize` only when size changes; expose read-only `MOVVA_DOM_DEVICE.metrics` counters for QA.
- `motion-studio.js`: cache intrinsic card sizes per viewport and after webfonts finish loading, rather than reading DOM layout repeatedly during animated transforms. Cache score, activity and water elements, updating text and width only when values change. Preserve the original Z motion, scene choreography, collision protection and widget content.
- `qa/stage5a-runtime-qa.cjs`: cross-browser checks for single screenshot swaps, reversed scroll, retained layout and aspect ratio, and the reduced shell invalidations.
- `.github/workflows/stage1a-qa.yml`: add Stage 5A QA for branch and master.

## Evidence — before public promotion

- Chromium and WebKit runtime: **39/39 checks per engine** across 1440x900, 393x852 and 320x667; zero browser JS errors.
- Desktop Chromium: **53 renders, one shell-size write**. Desktop WebKit: **38 renders, one shell-size write**. Mobile geometry legitimately changes size during choreography, so some writes remain.
- Motion layout measurements: 2 per viewport in automated exercise, instead of forcing layout for each active fragment on every animation frame.
- Existing motion composition regression: Chromium/WebKit **28 samples per engine**, zero newly introduced copy/nav/viewport collisions.
- Existing reversible cinema regression: Chromium/WebKit **32 checks per engine**, 11 screenshots each; no reported errors.
- Stage 4C camera continuity (Chromium): **35 checks × 4 viewports**, all passed.
- Screenshot parity: 14 Chromium before/after screenshots, seven scenes on desktop and mobile; largest mean pixel difference **<0.21 level on 0–255 RGB**.
- Safari Stage 4C camera-continuity re-run and production smoke test: required before release (record the actual results).
- Physical iPhone/Safari FPS: remains unverified. No quantified real-user speedup claimed.

## Release guardrails

This patch is a performance-oriented change with no intended visible design or navigation change. Review GitHub branch divergence before merge; create a rollback branch from current `master`; merge only if QA is clear. Wait for Vercel production `READY`, confirm the exact commit at `www.movvawellness.com.br`, HTTPS 200, apex 308 and loaded JS markers. Do not touch domain DNS, Supabase, email, native app or screenshots.

## Next scope

Stage 5B: fine-tune visual direction and pacing for each chapter after real-device validation, then replace final screenshots when available. Investigate remaining mobile compositor cost using actual device tooling, not by guessing from headless WebKit frame rates.
