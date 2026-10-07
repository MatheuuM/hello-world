# Stage 6 — Evolution

Scope: Evolution presentation only, 0.595 < progress < 0.775. Approved baseline: 044119d5012f40534ceeaa72ae5b70d54cc19d5b.

The hook delegates the Stage 5/4 controllers. Renderer, phone geometry, materials, other chapter files, global CSS and five source images stay byte-identical. Native scroll first reveals the seven daily activity bars and their total, then fills the Wellness Score ring. Reversing scroll reverses all derived states. No autoplay, wheel interception, analytics, account access or new framework.

Reference data: 56,45,66,45,0,45,168 minutes (425 total, six active days). Score 52/100, explicitly partial. The animation is a demonstration, not live application data or an improvement forecast. Fixed accessible reference text remains available without announcing intermediate numbers.

Composition: sage ambient surface, phone framed to the right on desktop and below copy on mobile. The real Evolution UI crop appears only on wide desktops after the main chart. Existing reduced-resolution textures and physical iPhone/Safari testing remain pending.

Review 1 found that the initial 320px composition made the phone only 141px tall. A two-line mobile heading and compact metric spacing restored meaningful product size without hiding the daily chart or partial-score qualification. Review 2 confirmed all four mobile dimensions pass, then found the copy bounding box too near the fixed header at 1024x768; the compact-desktop typography and chart height were adjusted specifically for that height. Acceptance thresholds were not weakened.

The controls test explicitly starts loading its off-screen lazy screenshot before awaiting decode; otherwise the no-WebGL fallback image can wait indefinitely before the test scrolls it into view. This changes the test only, not the application.

Acceptance: four independent bounded QA jobs, 49 explicit assertions, eight viewports, exact reference totals, bidirectional determinism, ten outside-scope comparisons and complete static fallbacks. Only a successful final gate on the final commit is approval; a READY deployment or earlier partial test run is not.
