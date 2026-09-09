# 10 — Assemble the build spec

Type: task
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09

## Question

Terminal ticket: the destination itself. Fold every resolved decision on this map into a single build spec that one agent session can execute without needing to decide anything.

Must cover: project scaffold and deploy pipeline, the pure engine's module boundary and API, the token schema, the generation algorithm, the contrast guarantees and their thresholds, the export formats with literal examples, the hash encoding, the guided control surface and unlock, the preview surface, and the test strategy (Vitest over `src/palette` only, run per feature).

Publish it as `.scratch/palette-creator/spec.md`.

## Answer

Written to [`spec.md`](../spec.md).

The destination moved while this map was being walked: the user asked for a working, hosted tool rather than a spec to hand off. So the spec's purpose changed from *instructions for building* to *reference for changing* — the same content, pointed the other way. It records the module shape, the seven-step generation chain, the invariants, the exact promise, and three standing maintenance obligations (pin `apca-w3` unmodified, keep `culori` a devDependency, keep the forbidden-band check an assertion).

The tool is live at https://mtbasso.github.io/palette-creator/ — the map is walked.
