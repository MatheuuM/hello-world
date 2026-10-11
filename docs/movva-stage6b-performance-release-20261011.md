# MOVVA Wellness — Stage 6B / Cinematic chapters and performance review

Date: 2026-10-11. Repository: `MatheuuM/hello-world`. Planned release: `www.movvawellness.com.br`.

## Scope completed

1. **Editorial typography.** Each of the seven existing headings reveals its pre-existing lines, driven by normalized native scroll progress. Original heading text and manual line breaks remain intact. Reduced-motion preferences disable the additional title movement.
2. **Nutrition.** Existing demonstration ring graphics and nutrition meter are animated without altering or inventing source measurements. Reversible on upward scroll.
3. **Evolution.** A restrained marker travels the original SVG chart; existing score and activity calculations continue to use their original 52-point partial wellness score and 425-minute reference.
4. **Circle.** Four hairline connections join the already existing visual nodes. They are decorative only, not real users or social connections.
5. **Finale.** A small line appears beneath the existing closing headline in response to the scroll.
6. All chapter animation uses **the existing Experience render clock**; no autoplay, new timer loop, new network request, dependency, or authentication change.

## Performance fixes (surgical)

- `experience.js`: when the production CSS3D renderer is active, skip the unused WebGL camera pose-fit and matrix projection computations. Preserve scene-specific background and side-effects, and move only the rendering-dependent code into the WebGL branch.
- `experience.js`: cache scene opacity, visibility, transform, accessibility state and navigation values. Avoid rewriting unchanged DOM attributes on each scroll frame.
- `hero-layout.js`: preserve hero lighting separately from WebGL-only projection fit.
- `phone-shell.js`: replace 48 per-camera-wall CSS brightness filters with baked linear-gradient shading. Preserve geometry and camera positions.
- `motion-studio.css`: remove a visually imperceptible tiny blur filter and disable backdrop blur on mobile cards; preserve the paper/glass palette and spacing.
- `chapter-motion.js`: cache authored SVG/CSS values instead of reading or rewriting the same styles on every frame.

## Evidence

- GitHub Actions: all 6 browser-matrix jobs passed on the initial 6B implementation (two browsers across shell, Stage 6A and Stage 6B jobs). Re-run after final QA changes is required before release.
- Stage 6B functional animation: Chromium 84 checks over four viewports passed. GitHub Actions includes WebKit validation.
- Performance guard: Chromium and WebKit desktop + phone confirm **zero** unused WebGL fit calls, **zero** camera wall filters, and no mobile backdrop filters. 48 camera wall faces preserved.
- Exact text/layout parity to previously published Stage 6A: 28 cases, seven scenes across 1440, 880, 393 and 320px. Identical headings, no >5px title height drift, no content height shift and no horizontal overflow.
- Two independent runs of the same Chromium headless benchmark (96? current script uses **56** frame samples per view, desktop 1x / mobile 2x CPU throttling) comparing the previous production on local port 8078 with this branch on 8077:
  - Run 1 desktop median 66.7 → 33.3ms, P95 600 → 50ms.
  - Run 1 simulated mobile median 199.9 → 66.7ms, P95 450 → 333.4ms.
  - Run 2 desktop median 50 → 33.3ms, P95 733.3 → 50ms.
  - Run 2 simulated mobile median 166.7 → 83.4ms, P95 466.7 → 316.7ms.
  - These are **headless software-GPU stress comparisons, not representative actual FPS readings**. Real PC and iPhone profiling remains necessary. The large variation in baseline tail latencies indicates the software-rendered environment is unstable; avoid implying precise percentage speedups.
- Source: `qa/stage6b-browser-performance.cjs`, `qa/stage6b-performance-guard.cjs`, `qa/stage6b-chapter-motion.cjs`, `qa/stage6b-visual-parity.cjs`.

## Release guardrails

- User explicitly requested **direct official-domain deployment** after browser validation.
- Preserve the exact existing production `master` SHA as backup before merging.
- Confirm pull request head is strictly ahead of master, current GitHub Actions checks completed and successful, Vercel preview READY.
- Postflight: Vercel production READY on merged SHA, HTTPS 200, apex 308, required CSS/JS assets present, Chrome + Safari scene smoke tests and no browser exceptions.
- No DNS, Supabase, email, OAuth, native app or user-data changes.

## Remaining optimization

- Production phone is a DOM CSS3D device comprising many facets. Software GPU headless comparisons still have high tail frame times at mobile. This is an area for performance tracing on real Chrome desktop and Safari on a physical iPhone, comparing hardware compositing and interactions instead of guessing from simulated FPS.
- Keep 3D always active, as requested. Only consider geometry simplification or adaptive quality after a visually faithful before/after and device measurements.
