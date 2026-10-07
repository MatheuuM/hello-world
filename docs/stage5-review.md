# Stage 5 — Nutrition

Scope: Nutrition presentation only, 0.435 < progress < 0.595. Base: f6795872907f3b458a346bf720fdafb4ccbf32e4.

The new hook delegates the existing Stage 4 controller. The 3D engine, hardware, camera implementation, earlier chapter files and all five screenshot assets are unchanged. A fitted Nutrition pose creates reading space on small screens; the wide desktop hydration crop appears after the full screen settles. Hydration counts to the reference capture's 2.0 L of 2.7 L and reverses with scroll. It is a demonstration, not a live app or health recommendation.

Visual review 1: browser captures showed the original stacked readout made the device too small on phones, despite technically fitting. The mobile-only composition now hides the redundant three-item rail and uses a compact horizontal hydration readout. Desktop caption inheritance was corrected. The final gate additionally requires the model height to be at least 30% of the viewport and 180 px on all four tested phone dimensions. Screenshots must still receive manual visual review.

All old global styles and subsequent chapters are preserved. New CSS is restricted to Nutrition and a scene-specific ambient surface. There is no tracking, backend, payment, domain, DNS, production-branch or mobile-app change.

QA is partitioned into bounded layout, sequence, regression and controls jobs. Each reports failures and a final gate requires every group from the same commit. READY deployment does not imply passing QA. Screenshots still have their prior reduced resolution. Physical iPhone/Safari validation remains pending.
