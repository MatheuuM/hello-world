# MOVVA Wellness — Studio 3D

Isolated public website preview. Static HTML/CSS and a custom WebGL renderer; no app repository, database, account, payments or DNS changes.

## View

Current preview alias: https://hello-world-jade-alpha.vercel.app/

## Experience

Triangulated rounded phone body, metal frame, front glass, side buttons, rear lens barrels, flash and etched logo. Five supplied MOVVA screenshots are mapped onto the front screen. Native scroll controls rotation, shot changes, UI fragments and demonstrative counters. Reference Wellness Score is 52/100 (partial).

## Accessibility and fallback

All chapters exist as semantic normal-flow HTML. WebGL enhancement activates only after assets initialize. Reduced motion, the movement switch, unavailable WebGL and very short viewports use a complete static experience. No scroll-wheel interception or telemetry.

## QA

The `studio-3d` branch runs `qa/browser-check.cjs` on GitHub Actions. Browser screenshots and a JSON report are published as a workflow artifact. A successful bootstrap run without the test file is not full QA.

Legal pages are expressly provisional and not the final app policy. This preview is noindex. Do not repoint official domains or modify the FERA app infrastructure.
