# Palette Creator

A deterministic colour-palette creator for design systems: one seed colour in, a complete
contrast-safe light/dark semantic token set out, judged in a live mock-UI preview and
exported as CSS custom properties, a Tailwind v4 theme, or a shadcn-compatible
`globals.css`.

> **Status: design phase. There is no application yet.** This repository currently holds
> the design map and the research behind it. Nothing is deployable.

## Why

Picking colours by eye is a skill; assembling a *system* of them that holds its contrast
in two themes is arithmetic. This tool does the arithmetic, so the only judgement left is
whether you like the result — which you make by looking at a realistic UI, not at swatches.

## Design principles

These are settled decisions, not aspirations:

- **Deterministic.** No model in the output path. The same inputs always produce the same
  palette. An LLM cannot compute a contrast ratio; that unreliability is the problem this
  tool exists to remove.
- **Guided by default.** The controls cannot produce a palette that fails its contrast
  guarantees. An explicit unlock allows manual override, with diagnostics still on.
- **Both themes at once.** Light and dark are generated together, never retro-fitted.
- **A pure engine.** `src/palette` will have no React, no DOM, no clock, no `Math.random`,
  so the colour maths is testable in a `for` loop and the UI is replaceable.

## Where the design lives

| Path | What it is |
|---|---|
| [`.scratch/palette-creator/map.md`](.scratch/palette-creator/map.md) | The map — destination, standing decisions, decisions so far, what is deliberately unspecified, what is out of scope |
| [`.scratch/palette-creator/issues/`](.scratch/palette-creator/issues/) | Ten decision tickets, with answers appended as they resolve |
| [`.scratch/palette-creator/research/`](.scratch/palette-creator/research/) | Long-form research with sources — colour space, contrast metrics, export formats |
| [`CONTEXT.md`](CONTEXT.md) | Glossary. Terms only, no implementation detail |

`.scratch/` is normally throwaway; here it is the actual work product, so it is committed
deliberately.

## Decisions already made

- **Colour space: OKLCH**, gamut-mapped to sRGB before any value leaves the engine. HSL
  and CIE LCh both rejected on measured evidence. The maths is vendored (~60 lines, zero
  runtime dependencies), with `culori` as a devDependency used only to assert it in tests.
- **Contrast: APCA and WCAG 2.x enforced together.** Neither is traded against the other,
  because the binding constraint swaps between themes — WCAG binds in light, APCA in dark.
- **Export: four targets**, defaulting to a shadcn-compatible `globals.css`. A Tailwind v4
  `@theme` block cannot itself express a light/dark pair; the working shape is
  `:root`/`.dark` custom properties bridged by `@theme inline`.

Each is written up in full, with sources, under `.scratch/palette-creator/research/`.

## What the guarantee actually is

Guided mode cannot produce a palette that fails WCAG 2.x AA, and cannot produce one below
APCA's perceptual floors *for its stated font assumption* (16px / weight 400).

It is **not** a claim that the result is legible for every reader on every screen. No
two-colour metric models legibility: neither accounts for font rendering, ambient light,
display gamma, or the reader's own vision.

## Licence note

The contrast implementation will depend on `apca-w3`, whose licence carries an **ongoing**
obligation: constants may not be modified, and the current version must be tracked into
future releases. An upstream major release is a required-maintenance trigger, not an
optional upgrade.
