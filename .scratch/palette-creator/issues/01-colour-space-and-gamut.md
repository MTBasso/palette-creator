# 01 — Which colour space does the engine compute in?

Type: research
Status: resolved
Blocked by: —

## Question

A palette engine that builds ramps by eye in HSL produces uneven lightness and muddy mid-tones; that unevenness is a large part of what makes hand-made palettes look amateur. Establish the current (2026) state of play so the engine's colour space is chosen on evidence rather than habit:

- **OKLCH / OKLab vs LCH vs HSL** for perceptually-even lightness ramps and hue rotation. Where does each actually fail?
- **sRGB gamut mapping**: OKLCH can name colours sRGB cannot show. What is the standard approach (chroma reduction, CSS Color 4 gamut mapping) and what does it do to a ramp's evenness?
- **CSS `oklch()` browser support**, and whether a tool exporting `oklch()` values directly is safe or should export hex/sRGB fallbacks.
- **Candidate JS libraries** — `culori`, `colorjs.io`, `chroma-js`: bundle size and tree-shaking, conversion accuracy, gamut-mapping support, maintenance. Or is the needed maths small enough to vendor directly and keep `src/palette` dependency-free?

Answer with a recommendation and the trade-off that decides it.

## Context pointer

Findings land at `.scratch\/palette-creator\/research\/01-colour-space-and-gamut.md`.

## Answer

Full findings: [`research/01-colour-space-and-gamut.md`](../research/01-colour-space-and-gamut.md) — measured against `culori@4.0.2`, `colorjs.io@0.7.1` and `chroma-js@3.2.0` on Node 26, method in its Appendix A.

**Space: OKLCH**, computed internally as `number` triples, gamut-mapped to sRGB before anything leaves the engine.

- **HSL rejected**: at constant `L=50%` its colours span 0.452–0.968 real perceptual lightness — half the lightness axis — so any contrast guarantee derived from ramp position is meaningless.
- **CIE LCh rejected**: constant-hue chroma reduction, the engine's most common operation, drifts up to 34.9° of perceived hue through the blues. The CSS spec names this defect; OkLCh was built to fix it.

**Library: vendor the maths** into `src/palette/oklch.ts` (~60 lines, zero runtime dependencies). Keep `culori` as a **devDependency only**, used by Vitest to assert the vendored module against an independent implementation.

- **chroma-js rejected**: it clips rather than gamut-maps, so it cannot honour a contrast guarantee.
- **colorjs.io rejected as a runtime dep**: the most capable and current library, and the right call for a general colour tool — but 19 KB gzip and a global mutable colour-space registry, for maths that fits in 60 verified lines.

**Deciding trade-off**: the engine's contract is determinism and a contrast guarantee in a module with no ambient state. The vendored 60 lines reproduce the spec's published values to five significant figures and agree with both libraries to 3.7 × 10⁻⁸. We trade "someone else maintains the colour maths" for "no dependencies, no globals, no unused bytes" — and buy the maintenance back as a Vitest assertion against culori, at zero runtime cost.

### Constraints this imposes downstream

1. **Parameterise ramps by gamut-relative chroma** (fraction of max in-gamut C at that L and h), never absolute chroma. Max in-gamut C at `L=0.55` varies **3.1× across hue** (0.095 at h=210, 0.294 at h=300), so a fixed-chroma ramp is silently rewritten by the gamut mapper — up to a 6× chroma collapse. Needs a max-chroma solver: binary search on C at fixed (L, h), ~10 lines, reusing the mapper's `inGamut` primitive.
2. **Contrast may be computed from requested lightness** — it survives gamut mapping. Worst measured drift is +0.016, inside the one-JND budget local MINDE allows.
3. **Never emit an out-of-gamut `oklch()`.** No shipping browser implements CSS gamut mapping — they channel-clip, which moves lightness and can break the guarantee. WPT `oklch-009`/`oklch-010` fail on Chromium 152; WebKit 255939 open since 2023. `@supports (color: oklch(...))` tests syntax only and cannot detect this.
4. **If both hex and `oklch()` ship, gate the `oklch()` block on `@supports`** — never on declaration order. Custom properties accept any token sequence, so an `oklch()` declaration wins the cascade even where it cannot render, and the failure lands as invalid-at-computed-value-time on the consuming property. Since every emitted value is already gamut-mapped, hex and `oklch()` are the same colour and the fallback is purely cosmetic.
5. **Interpolate in polar OkLCh, not rectangular Oklab.** Measured midpoint chroma on a red→green blend: 0.196 (OkLCh) vs 0.084 (Oklab) vs 0.050 (naive sRGB).
