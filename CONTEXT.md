# Context: Palette Creator

Glossary for the palette creator. Terms only — no implementation detail. Decisions live in `.scratch/palette-creator/`.

## Palette

The complete colour output of the tool for one design system: every semantic role resolved, in both themes. A palette is a single shareable thing — one URL, one export.

Not a list of swatches. A bag of hex codes with no roles attached is not a palette.

## Theme pair

The light theme and the dark theme of one palette, generated together as a unit. Neither is primary; a palette without both is incomplete.

## Seed

The colour the user supplies as the starting point — normally a brand colour. One palette has one seed.

## Pinned colour

A colour the user has fixed, which the engine must not move and must solve the rest of the palette around. The seed is the common case; there may be others.

## Character

The named quality the user picks alongside the seed — the qualitative half of the input, which resolves deterministically to engine parameters. It is not a mood the tool interprets; it is a lookup.

## Engine

The pure module that turns inputs into a palette. Deterministic: the same inputs always produce the same palette. Knows nothing about React, the DOM, or the browser.

## Guided mode

The default operating mode, in which the exposed controls cannot produce a palette that fails its contrast guarantees.

## Unlock

The explicit act of leaving guided mode for manual control. Diagnostics remain on after unlocking; the guarantee does not.

## Contrast guarantee

The promise attached to a pairing of two tokens: that it clears **both** the APCA legibility floor and the WCAG 2.x compliance floor, for the palette's stated font assumption. A pairing either carries a guarantee or is decorative; there is no partial guarantee.

Bounded deliberately — it is not a claim that the result is legible for every reader on every screen.

## Preview

The realistic mock UI rendered in the current palette. The surface on which a palette is judged.

---

## Open terms

Awaiting resolution — do not use these loosely until their ticket closes:

- **Role**, **Token**, **Ramp** — ticket 05.
