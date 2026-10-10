# MOVVA Wellness — Cinema 4B / 10 October 2026

## Decision and deployment
The user has explicitly requested direct updates to `movvawellness.com.br` for future site refinement. From this point forward, the verified web build may be released to the official domain without requiring a separate approval round. The official hostname remains `www.movvawellness.com.br`; apex redirects HTTP 308 to www.

This work is based on `refine/movva-motion-composition-4a` and includes previous unmerged premium-device and Motion 4A refinements. No changes to Supabase, customer data, email, or native app.

## Changes
- `mobile-phone.js`: replace piecewise smoothstep interpolation with monotone cubic Hermite camera curves; first derivative is continuous at keyframes, held poses and direction reversals do not overshoot; every frame is computed from normalized scroll progress alone.
- `motion-studio.js`: cards lift along a depth trajectory from -38 px to +110 px with controlled 3-axis angles, slower appearance and calmer horizontal motion; protect readable copy against new perspective enlargement. Added inspectable `--movva-card-depth` while retaining the 4A collision guard.
- `motion-studio.css`: subtle glass glint and shadow treatment, centered depth origin; typography and actual content unchanged.
- `qa/cinema-scrub-qa.cjs`: test angular speed, C1 keyframe continuity, correct rotation direction, reversible screen poses and card depth; captures Chromium/WebKit on desktop and mobile.
- `.github/workflows/stage1a-qa.yml`: add cinema QA for feature branch and `master`.

## Verified via isolated Vercel Sandbox
- Browser JS syntax checks: PASS for all changed scripts.
- Chromium and WebKit: **cinematic QA 32 checks each**, 11 screenshot captures each, zero JS exceptions.
- Chromium and WebKit: **motion composition 28 samples each**, no copy/nav/viewport collision regressions detected, three captures each.
- Chromium and WebKit: **hardware Stage 1A QA 52 checks each**, 48 captures each, no JS errors.
- Camera velocity discontinuity metric at knots: 8.618 degrees/progress unit for a 0.0001 derivative sample (test limit 38).
- Maximum angular displacement at a 0.002 scroll-progress step: 5.708° (limit 10°).
- No reverse rotation during the main back-of-device transition.
- Representative 3D visuals reviewed: desktop rear scene, Training dark scene, Nutrition mobile scene.

These are browser-emulation tests; hands-on validation on a physical iPhone remains distinct and pending. The current app WebP captures are temporary and intentionally not enlarged/sharpened.

## Next stage
1. Stage 4C — inspect the cinematic camera/card silhouettes at finer scroll increments and assess device performance/fps on a real iPhone.
2. Stage 5 — review per-scene camera/card choreography for Training, Nutrition, Evolution, Circle and end sequence while guarding copy and CTAs.
3. Stage 3 asset swap — once final app captures are available, replace independent WebPs and verify recrop, contrast and fidelity at 3D perspective.
4. Stage 7/8 — responsive polish, brand typography/contrast and field QA on desktop Chrome and iOS Safari.

## Release controls
- Capture a reference to the previous production `master` SHA before release.
- Merge tested feature branch into `master` only after verifying no drift from the previously tested HEAD.
- Wait for Vercel production to reach `READY` and verify aliases, actual deployed commit, HTTPS, and apex 308.
- If production postflight fails, restore prior deployment/commit rather than leaving a broken landing page.
