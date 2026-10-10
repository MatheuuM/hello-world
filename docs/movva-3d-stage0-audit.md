# MOVVA Wellness — 3D Stage 0 Audit

**Production source reviewed:** `3741e7032aee1c357380dbe6bda92442884601c0`.  
**Scope:** visual and structural baseline, **no production changes**.  
**Full report and screenshots:** delivered to user as `MOVVA_ETAPA_0_AUDITORIA.md` and `MOVVA_ETAPA_0_EVIDENCIAS.zip`.

## Reproduction
Browser capture at the exact same scroll locations on Chromium and WebKit:
- 1440×900 desktop: 8 scenes/poses
- 393×852 mobile: 8 scenes/poses
- 320×667 small mobile: 4 poses
- 820×1180 tablet: 4 poses

**48 screenshots total**; 0 script errors or horizontal-overflow findings in those samples. A successful render does not equal visual approval.

## Root causes in order
1. **P0 – body seams:** `mobile-phone.css` creates front and rear planes with `translateZ(7px)`, independent 14px side rails and independent 14px top/bottom caps. Corners are not one continuous swept geometry; top-edge slivers and open seams appear during rotation.
2. **P0 – lateral silhouette:** disconnected side rail and buttons visually separate from the front/back panel. The device becomes a thin strip in profile.
3. **P1 – rear cameras:** `.css3d-camera` and child lenses are flat CSS gradients rather than truly recessed glass/barrels with shared occlusion.
4. **P1 – screenshot texture resolution:** Home/Training/Circle 320×696; Nutrition/Evolution 480×1043, WebP. UI is blurred under enlargement and at high-DPI.
5. **P2 – floating cards:** `motion-studio.js` positions DOM fragments on top of the product independent of depth testing. Card occlusion zones and shadow hierarchy need design review per scene.
6. **P2 – pose/culling risk:** `mobile-phone.js` uses interpolated Y rotations and explicit front/back visibility thresholds. Needs review for discontinuities around profile angles.

## Swap-in policy for final app screenshots
Current stable asset contract: `assets/{home,training,nutrition,evolution,circle}.webp`. Replace screenshots after user finishes the app layout; no remodel required for normal same-aspect replacements. Refresh any floating HTML cards and crop regions when screen UI content moves. Recommend native-resolution originals, consistent aspect ratio, no personal or debug overlays.

## Next step: Stage 1A (requires user OK)
Prototype a continuous rounded body including front, back, corners and sidewall as a single coherent object, with CSS3D-compatible fallback. Compare against unchanged baseline screenshots at 0/30/60/90/135/180 degrees on Chromium and WebKit. No camera-polish or final screenshots until base shape approved. Preserve `master` and official domain until acceptance.
