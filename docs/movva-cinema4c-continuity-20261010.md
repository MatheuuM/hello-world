# MOVVA Wellness — Stage 4C: continuous device choreography

Date: 2026-10-10. Target: `www.movvawellness.com.br` (`movvawellness.com.br` apex redirects 308 to www).

## Root-cause discovery

The CSS3D device in `mobile-phone.js` positioned itself based on the integer `active` chapter index. The camera teleported between x=73% and x=27% on chapter changes, despite continuous rotations from the scroll clock.

Measured on the previous published commit `ac6feeba1743f380331abb8eb4fae36f206e3c1c`:
- At progress 0.280 (Connected → Training): **662.4px** instantaneous horizontal teleport on 1440px desktop.
- At progress 0.593 (Nutrition → Evolution): **662.4px** instantaneous horizontal teleport.
- Finale at 0.939: 381.3px sudden position displacement and 310px instant device-height change.

## Surgical implementation

`mobile-phone.js`:
- A continuous, easing-based camera X track independent of discrete chapter changes, with controlled beats on Connected → Training, Nutrition → Evolution, Evolution → Circle, and Circle → Finale.
- Gradual closing camera movement and scale without a separate terminal jump.
- On mobile, interpolate camera height and Y from the measured copy bounds of adjacent chapters on either side of their cut; preserve 54vw maximum handset width and aspect ratio 78 / 163.4.
- Preserve all prior hardware, camera, logo, app screenshots, card content and deterministic scroll reversibility.

`qa/stage4c-camera-continuity.cjs`: new dedicated close-spaced boundary regression on desktop 1440x900, laptop 880x765, mobile 393x852, small 320x667; direct deterministic renderer sampling avoids browser scroll-event quantization, while the existing browser QA continues exercising real scrolling.

`.github/workflows/stage1a-qa.yml`: include Stage 4C on the feature branch and `master`.

## Evidence

In isolated browser tests at HEAD of the current feature branch:
- Stage 4C deterministic camera continuity, Chromium and WebKit: four viewports, **35 assertions per viewport per engine**; all passed; reversible coordinate checks passed.
- Maximum displacement over each close-spaced progress interval (0.004 normalized): desktop **34.84px**, laptop **21.29px**, 393px mobile **3.84px**, 320px mobile **2.43px**.
- Browser-real motion composition: **28 samples per browser**, no copy/nav/viewport collisions.
- Browser-real 4B cinema QA: **32 checks per browser**, 11 screenshot captures per browser; scroll reversibility and card depth preserved.
- 3D device hardware regression: **52 checks per browser**, 48 screenshots per browser; no page JavaScript errors.
- Synthetic viewport/browser emulation is not a substitute for a physical iPhone Safari performance and appearance review. Final app captures remain temporary.

## Next priorities

1. Stage 5: detailed direction of art and per-scene camera/card placement at full desktop and mobile breakpoints.
2. Stage 3 final asset swap when completed screen artwork is supplied; preserve swappable WebP slots.
3. Accessibility, SEO and contrast readiness, mobile performance and actual iPhone QA.
4. Evaluate WebGL alternative as a separate opt-in experiment; default CSS3D remains always on.

## Release controls

- Prior production commit: `ac6feeba1743f380331abb8eb4fae36f206e3c1c`.
- Create a named rollback branch before merging and keep DNS, e-mail, Supabase and native app unchanged.
- Promote through GitHub master → Vercel production, verify READY and active domain aliases, HTTP 200 on www and 308 on apex, and verify updated script content over HTTPS.
- If any release postflight fails, revert/promote the known prior production deployment.

