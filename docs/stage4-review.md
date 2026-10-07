# MOVVA — Stage 4: Hero → Connected → Training

2026-10-07. Limited to native scroll progress 0.08–0.435. No production/master promotion.

## Implemented

- Measured 3D device slots keep copy and hardware separate on mobile and desktop.
- Front → side → rear, then edge-on travel from right to left after Connected copy exits.
- A deliberate readable hold precedes Training; actual app screen switches during the profile shot.
- Quintic interpolation, staggered pillar/modality labels and a later-emerging real Training screenshot crop all use the same reversible scroll position.
- Scoped beige-to-charcoal transition; header contrast follows the scene.
- Original hardware, screenshot assets, hero initial appearance, Nutrition/Evolution/Circle and legal pages preserved.

## Evidence

Reviewed runtime in GitHub Actions run 37679715106: 43 passing checks, 25 browser screenshots, zero collected page errors and local HTTP failures. The four runtime Git blob hashes are locked in qa/stage4-runtime-manifest.json and checked again on the final source commit.

Eight viewports: 320×667, 375×667, 393×852, 430×932, 768×1024, 1024×768, 1440×960, 1920×1080. Geometry projections were checked at Connected and Training holds. Nine additional transition positions were captured; five reverse-scroll comparisons were performed. Six points outside Stage 4 were compared against the immutable Stage 3 baseline. CTA, chapter navigation, motion-off, reduced-motion and no-JavaScript reading were checked.

First test run failed a rounding-boundary score comparison because it sampled easing before final settlement. Runtime/calculation was not changed: the test now waits for actual pixel scroll position and the final animation frame. The complete suite passed afterward.

## Limits

Chromium automation, not physical iPhone/Safari validation. Sampled frames and geometry checks do not prove all-device performance. Existing app textures remain low-resolution (320–480 px wide). Legal pages remain provisional. No app data, accounts, FERA repository, DNS, email or official domain changes.

Next stage, only after user approval: Nutrition. Do not silently broaden Stage 4.
