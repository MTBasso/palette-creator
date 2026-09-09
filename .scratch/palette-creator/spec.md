# Palette Creator — build spec

Ticket 10 asked for a spec one agent session could execute. The destination moved
mid-map — the user asked for a working, hosted tool — so this records the system
**as built**, which is the same content serving a different purpose: the reference
for changing it, rather than for creating it.

Live: https://mtbasso.github.io/palette-creator/

## Shape

```
src/
├── palette/          PURE — no React, no DOM, no clock, no Math.random
│   ├── oklch.ts      colour maths, vendored, zero runtime deps
│   ├── contrast.ts   APCA + WCAG, floors, solvers
│   ├── schema.ts     29 roles, 18 guaranteed pairings, forbidden band
│   ├── characters.ts six presets — name to numeric parameters
│   ├── generate.ts   seed -> palette, both themes
│   ├── diagnose.ts   every guarantee, judged
│   ├── export.ts     four emitters
│   └── hash.ts       URL state, inputs not outputs
└── ui/               React. Replaceable without touching the above.
```

The purity rule is the load-bearing one. It is what makes the engine testable in
a `for` loop — the guarantee test runs 96 palettes through 3,456 pairings in
under half a second — and what would let the UI be rewritten wholesale.

## The chain

1. **Seed hex → OKLCH.** Only hue and gamut-relative chroma survive. Every
   lightness is discarded and re-solved.
2. **Character → parameters.** A deterministic lookup: neutral chroma, text
   chroma, accent chroma, semantic chroma, surface separation.
3. **Surfaces.** A lightness ladder offset from the background, scaled by
   separation, **clamped to the elevation budget**, then asserted against the
   forbidden mid-tone band.
4. **Foregrounds.** Binary search for the lightness *closest to the backdrop*
   that still clears both floors. Softest passing colour, not maximum contrast.
5. **Fills.** Lightness scanned under three simultaneous constraints: label
   clears the on-accent floors, fill clears 3:1 against the page, result lands
   near a preferred lightness.
6. **Gamut mapping** on every value before it leaves the engine.
7. **Diagnose** — all 18 pairings × 2 themes, both metrics, always.

## The invariants

- **Brand = hue + relative chroma.** Lightness is per-theme, because the two
  themes are not symmetric: light mode's elevation budget stops near `#E4E4E4`,
  dark mode's runs to `#575757`.
- **Both metrics, never traded.** Measured on the default palette: light mode
  binds 9 APCA / 9 WCAG, dark mode binds 18 APCA / 0. Either metric alone leaves
  one theme under-constrained.
- **Guaranteed lightnesses are solved, never assigned.** This is why guided mode
  cannot emit a failing palette — not because it checks afterwards.
- **Chroma is always gamut-relative.** Absolute chroma is not hue-portable.
- **Semantic hues are absolute.** Only their chroma follows the character.

## The promise, exactly

Guided mode cannot produce a palette that fails WCAG 2.x AA, and cannot produce
one below APCA's floors *for its stated font assumption*.

It is **not** "cannot produce an illegible palette". No two-colour metric models
legibility — none account for font rendering, ambient light, display gamma, or
the reader's vision. The UI and every export header say so.

## Maintenance obligations

- **`apca-w3` must stay pinned and unmodified**, and must be tracked into future
  releases. Its licence says a project that falls behind is "in breech of
  license". An upstream major release is required maintenance, not an optional
  upgrade.
- **`culori` must stay a devDependency.** It exists to assert the vendored maths
  against an independent implementation. If it reaches `dependencies`, the reason
  for vendoring has been lost.
- **The forbidden-band assertion must stay an assertion.** It throws. A future
  ladder edit that drifts into the mid-tone band is not visually obvious.

## What was deliberately left out

Out of scope on the map, and still out: other token domains (type, radius,
spacing, shadow), paste-and-repair of an existing palette, the critique report,
accounts, and any LLM in the output path.

In the fog, and worth doing next: a dedicated "match this brand hex" flow that
pins a colour without surrendering the guarantee everywhere, a saved-palette
library, and a decision on whether an AAA mode is worth its constraints.
