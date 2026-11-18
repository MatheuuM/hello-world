# MOVVA Wellness — mobile rounded hybrid unibody (2026-11-18)

## User-visible regression

The November 17 mobile ultralight path hid its rounded perimeter and physical camera walls and rendered only four rectangular side strips. At edge-on and three-quarter poses, front/back panels and camera optics appeared disconnected from a tubular metal rail. A four-plane body does not follow a rounded phone contour.

## Corrective change

- Keep the single physical 78 / 163.4 aspect ratio and 0.112 × shell width depth for the entire device.
- Mobile default: 24 connected perimeter faces (four straight spans plus five tangents per rounded corner); 20 camera-plateau wall faces (four tangents per rounded corner). Front/back remain actual clipped panels, and lenses, controls, seams, ports and glass stay intact.
- Retain desktop full detail (180 perimeter faces, 48 camera walls) and ?quality=legacy on mobile (44 perimeter faces, 36 camera walls) for diagnostic comparisons.
- Remove the four mobile fast planes and the CSS rules hiding the actual 3D perimeter and plateau. Add narrow overlap to compensate for subpixel seams on high-DPI devices.
- Preserve existing scroll camera tracks, app screenshot content, 12 card source anchors, Safari WebKit side-profile handoff, accessibility fallback, no-login architecture and ambient editorial design.
- Existing performance regression compares headless software-renderer timings to the pre-ultralight baseline. Those samples are directional only; they are **not** measurements on a physical iPhone.

## Release gate

1. Confirm exact geometry metadata and active computed faces across 320, 393, 440 and 1440 px viewports.
2. Inspect canonical poses including front, 18°, 30°, 42°, 60°, 78°, 85°, 90°, 95°, 115°, rear and reverse transitions, in Chromium and WebKit; no separate white slivers, holes, duplicated rails or clipping.
3. Require existing camera containment, Stage 1A hardware, cinematic reversible scroll, card origins and no-overflow regressions to pass.
4. Back up pre-release master. Publish only the tested revision, wait for the domain and verify HTTPS 200, apex 308 and official-domain Chrome/WebKit smoke checks.
5. Review real iPhone Safari cold-load and scroll in both directions after deployment. Emulated WebKit is not real-device visual/performance certification.

No DNS, mobile app, Supabase, email, user records, or legal content changes in this patch.
