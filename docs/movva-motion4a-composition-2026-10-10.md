# MOVVA Wellness — Motion 4A / composition QA (2026-10-10)

## Where this lives
- Repository: `MatheuuM/hello-world`
- Refinement branch: `refine/movva-motion-composition-4a`, based on `refine/phone-safari-profile-qa`
- Public domain `www.movvawellness.com.br` remains on production commit `3741e7032aee1c357380dbe6bda92442884601c0` (verified before final release; do not promote automatically).

## Issue reproduced, before the fix
Chromium CSS3D, 880x765 laptop viewport:
- Home at scroll 0.042: `activity` card overlapped 16.9% of its own projected area with active chapter copy/CTA.
- Evolution at scroll 0.674: `graph` card overlapped 2.7% with chapter copy.
- The renderer previously guarded nav and vertical copy-bottom on mobile, but did not account for active chapter copy bounds on desktop/laptop.

## Surgical fix
`motion-studio.js` now performs deterministic, margin-aware collision avoidance:
- Prefer the nearest feasible horizontal correction away from chapter copy.
- Use a vertical alternate only if neither horizontal side fits; suppress decorative card as a last resort when preserving readable copy is impossible.
- Guard applies only to desktop; existing mobile copy/nav protection is retained.
- Cache stage, nav and active-copy bounds once per render frame instead of querying them for each card.
- No change to screenshots, content, typography, model rotation, chapter timing or production configuration.
- Exposes `protectedCards` in `MOVVA_MOTION_QA` for inspection.

## Test evidence
### Hardware foundation
- Chromium: 52 assertions, 48 captures, 3 viewport sizes; no JS errors.
- WebKit: 52 assertions, 48 captures, 3 viewport sizes; no JS errors.
- Forced poses now cover both sides: -85°, -90°, -265°, -270°.
- Safari physical-profile projection includes correct side-specific buttons and camera plateau. These are structural validations, not final manual art-direction signoff.

### Motion composition
- Browser test: `qa/motion-composition-qa.cjs`
- 4 viewport sizes: 1440x900, 880x765, 393x852, 320x667.
- 7 scroll positions: 0.042, 0.178, 0.336, 0.512, 0.674, 0.842, 0.970.
- Chromium: 28 samples, **zero** chapter-copy/nav/viewport overlap regressions > thresholds, 3 images captured.
- WebKit: 28 samples, **zero** chapter-copy/nav/viewport overlap regressions > thresholds, 3 images captured.
- Visual review is still mandatory before release, even when geometric tests are green.
- Workflow `.github/workflows/stage1a-qa.yml` now runs both hardware and motion QA on this branch, with artefacts retained.

## Next stage (4B: cinematography)
1. Review repeated forward/back scroll across chapters and look for snapping or overly fast spins.
2. Tune easing/scale and card entry/exit by chapter, preserving deterministic scroll scrubbing.
3. Validate card depth/occlusion in 3/4 views; cards should look detached, not glued or cutting through the physical phone.
4. Run visual before/after, interaction and performance comparison on Chromium, WebKit and physical iPhone.
5. Stage 3: replace the five temporary app WebPs after final screen assets are ready. Do not upscale low-resolution placeholders with sharpening tricks.

**Decision:** preview-only; no auto-promotion to `master` or production domain until visual approval.
