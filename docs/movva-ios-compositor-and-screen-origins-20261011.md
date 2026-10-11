# MOVVA Wellness — iPhone performance, screen origins and Safari 3D rail
Date: 2026-10-11

## Intent
Reported on iPhone 17 Pro Max: severe scrolling stutter, floating cards exiting from the approximate phone center rather than their corresponding UI components, and edge artifacts as the handset rotates. Site 3D must remain active and premium on all devices. Official domain: https://www.movvawellness.com.br.

## Root causes found in production `8adab0f3495cce3041e89f94174a2231cf78a379`
1. Phone body had **180 independent CSS3D faces** and raised camera another **48 wall faces**. The mobile renderer rewrote both `--shell-w` and `--shell-h` along the scrub timeline, invalidating the many CSS `calc()` transforms and their composed surfaces repeatedly.
2. Floating fragments anchored to `cx ± phoneW*0.13` and `cy + phoneH*level*0.15` instead of the location of a UI feature in the actual `home.webp`, `training.webp`, `nutrition.webp`, `evolution.webp`, or `circle.webp` screenshot. Earlier animation depth worked, but source positions were unrelated to content.
3. Safari/WebKit's safety 2D edge silhouette overlapped real 3D rails across too broad a rotation arc. At nearly edge-on poses, double rails, camera layers and metal controls competed.

## Fix implementation
- `phone-shell.js`: mobile shell uses one continuous metal 3D perimeter layer, 10 arc subdivisions/corner vs three-layer desktop body with 14/corner; camera has 8 subdivisions/corner vs 11 desktop. This keeps **44 shell faces + 36 camera wall faces** on mobile, against **180 + 48** previously. Desktop stays unchanged.
- `mobile-phone.js`: keep the intrinsic mobile CSS3D dimensions at `170 × 356.128...` CSS pixels; use a single outer compositor scale for zoom/responsive screen size instead of re-writing width, height, and parametric shell CSS vars along scroll. Expose `visualSize` and `projectScreenPoint(u,v)`: project screenshot UV through actual phone perspective/rotation, without per-face layout reads.
- `motion-studio.js`: map each of the 12 decorative cards to its corresponding source feature in the actual screenshot via normalized UV positions, with projected origin and scroll-reversible extraction. The Connected chapter is rear-facing, so those decorative cards represent a rear-silhouette branding/overview reveal rather than claim to correspond to a visible screen feature.
- `motion-studio.css`: only visible cards have active compositing hints; suppress huge semi-transparent orbit on mobile.
- `phone-shell.js` / `phone-shell.css`: Safari fallback rail is active only near the true side view; when dominant, its metal silhouette replaces the physical sidewall and control/camera layers, preventing double outlines and floating optical stacks.
- `mobile-phone.js` / `phone-shell.css`: mobile reflections become static low-opacity metallic details, not multiple continuously re-rasterized translucent layers. Desktop's studio reflections remain unchanged.

## Browser evidence (before release)
- Projection onto actual screen markers: desktop maximum ~0.8px; 440×956 emulated iPhone viewport **1.26px Chromium / 1.32px WebKit**; 393px maximum ~1.12–1.18px; 320px maximum <=0.8px. All **12 semantic source points** are present and UV-normalized, screens unchanged.
- Emulated Chrome + WebKit: iPhone viewport, 393px, 320px and desktop semantic source tests: **PASS**; mobile shell writes remain constant after initial setup while outer scale follows scrub.
- Compositor-side profile: WebKit **PASS** 440×956, 320×667 and 1440×900 at angles -60, -78, -85, -90, -95, -115, -270; physical rails, buttons, and optics do not double when fallback dominates.
- Camera integrity: **40 poses in four viewports per browser, PASS**, no camera wall outliers.
- Stage 6A card extraction/reversibility: **56 checks per browser, PASS**, 1440, 880, 393, 320px.
- Stage 4C camera continuity: **35 checks in each of four viewports per browser, PASS**.
- Stage 1A angle QA mobile Chrome/WebKit: **18 structural checks and 16 screenshots per engine, PASS**.
- Motion composition: Chromium/WebKit **28 sampled screen/scroll combinations each, zero collisions**.
- Portrait → landscape → portrait direct screenshot/geometry check: Chromium and WebKit PASS, returns to exact original framing, without horizontal overflow.
- Two controlled Chromium headless runs, 56 frame samples per scenario, 2x CPU throttle in simulated mobile, with software GPU:
  - First: baseline mobile median **83.3ms**, P95 **416.7ms**; candidate median **33.3ms**, P95 **50ms**.
  - Second: baseline mobile median **83.4ms**, P95 **333.3ms**; candidate median **33.3ms**, P95 **50ms**.
  - Baseline: 33–35 inner shell size writes in sample; candidate **1 initial size write** and transform-only scaling afterwards.
  - Desktop control retained its full-fidelity shell with similar median, and lower P95 in both comparisons.
  - Headless software-GPU timings are only directional comparisons. They **are not physical iPhone FPS** nor a claim that slower phones will achieve 60fps.

## Safety, release and next checks
- The source branch is intended to be strictly ahead of production master.
- Existing production commit must be backed up before merge. Update the public site only after all CI checks pass and review of side angles confirms acceptable visual quality.
- Validate new exact SHA and assets at https://www.movvawellness.com.br, HTTPS 200, apex redirect 308, runtime smoke tests in Chrome/WebKit, error-free page, and stable screen anchors after the release.
- The user should physically test a cold-load and scroll down/up on iPhone 17 Pro Max after deployment; investigate any remaining lag with actual Safari Web Inspector frame/layout/paint/compositor traces. Do not claim hardware performance measured in emulation.
- Do not change Supabase, DNS, email, user data, app code, or final app screenshots. Retain static fallback photography and premium MOVVA palette.
