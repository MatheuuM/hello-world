# Stage 4 — bounded validation closeout

Scope: test infrastructure only. No HTML, CSS, JavaScript runtime, screenshots, phone geometry, animation, app, DNS or production-branch changes.

## Verified interruption cause

GitHub Actions run 37681568318, job 112998655773, started the browser command at 2026-10-07T20:23:18Z. The command was `timeout 360s node qa/intro-check.cjs`. It exited at 20:29:18Z with code 124 while reading the immutable baseline. The page-closed error coincides with the external 360-second termination. The recorded 32 assertions before that termination passed. This identifies this CI interruption; it does not certify runtime performance on a physical device.

## Repair

The original 43 distinct checks remain, with unchanged matrix tolerance (<0.001), scroll thresholds, viewport dimensions and fallback assertions. They are partitioned into four isolated browser jobs: layout, sequence, regression and controls. Each keeps its own 240-second command deadline, logs checkpoint timestamps and always writes its report. No retry or skip can count as success. Runtime blob hashes are checked after baseline preparation. The last gate rejects missing groups, failed checks, wrong source commits and unexpected browser disconnects; it requires all 43 distinct check names.

## Acceptance and evidence

Only a successful `Stage 4 / all original checks` job is approval of the complete suite. Its `movva-stage4-closeout` artifact contains summary.json and all four detailed reports. A deployment marked READY alone is not QA approval. Desktop/mobile-emulated Chromium only: real iPhone/Safari validation and higher-resolution app screenshots remain separate pending items.
