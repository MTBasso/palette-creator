# Map: Palette Creator

Label: `wayfinder:map`

## Destination

A static, deterministic **colour** palette creator: a guided tool that turns a seed colour into a complete, contrast-safe light/dark semantic token set, judged in a live mock-UI preview, and exported as CSS custom properties plus a Tailwind v4 theme.

**Reached.** The destination was originally a spec to hand off; partway through, the user asked for a working, hosted tool instead, and the remaining tickets were resolved in one build session rather than with the user in the loop. Every decision is recorded in its ticket.

Live: https://mtbasso.github.io/palette-creator/

## Notes

**Domain**: design systems, colour theory, static web tooling.

**Skills every session should consult**: `/grilling` and `/domain-modeling` always; `/prototype` on prototype tickets; `/research` on research tickets.

**Standing decisions from charting** — settled, not to be re-litigated without a new reason:

- **Deterministic core, no LLM at the output edge.** A model may only ever sit at the input edge (mood → parameters). A model cannot compute a contrast ratio; that unreliability is the problem this tool exists to remove.
- **Guided by default.** The controls cannot produce a failing palette. An explicit "unlock" reveals manual override with diagnostics still on.
- **Light and dark are generated together** as a pair — dark is never retro-fitted onto a light-first system.
- **The engine must support pinned colours** — any colour can be fixed and the rest solved around it — even though the paste-and-repair UI is out of scope.
- **Stack**: Vite + React 19 + TypeScript strict. `src/palette` is **pure** — no React, no DOM, no clock, no `Math.random` — so the engine is testable in a `for` loop and the UI is replaceable without touching it.
- **Static, no backend, no accounts.** Public GitHub repo, Actions → Pages on push to `main`, same shape as increMon. Repo name defaults to `palette-creator` (unconfirmed by the user).
- **URL hash is the source of truth** for the current palette.
- **Tests**: Vitest over `src/palette` only; no UI tests. Run them after a full feature lands, not per-change — do not sink time into them.
- **APCA's licence is a standing obligation**, not a one-off: constants may never be modified, `apca-w3` must be pinned unmodified and tracked into future releases, and the name "APCA" may only be used while both hold. A repo that falls behind upstream is, in the licence's words, "in breech of license." This binds the project for its whole life — an upstream major release is a required-maintenance trigger.
- **The promise is bounded and the product copy must say so**: guided mode cannot produce a palette failing WCAG 2.x AA, nor one below APCA's floors *for the stated font assumption*. It is **not** "cannot produce an illegible palette".
- **Prototypes on this map are throwaway** artifacts for judging a decision, not the opening move of the build.

## Decisions so far

<!-- one line per closed ticket -->

- [Which colour space does the engine compute in?](issues/01-colour-space-and-gamut.md) — **OKLCH**, gamut-mapped to sRGB before anything leaves the engine; HSL and CIE LCh both rejected on measured evidence. **Vendor ~60 lines** into `src/palette/oklch.ts`, zero runtime deps, with `culori` as a devDependency Vitest asserts against. Forces: ramps parameterised by *gamut-relative* chroma (max in-gamut C varies 3.1× across hue), never emit out-of-gamut `oklch()`, interpolate in polar OkLCh.
- [Which contrast metric do the guardrails enforce?](issues/02-contrast-standard.md) — **the conjunction of APCA `|Lc|` and WCAG 2.x**, both computed, both shown, neither traded against the other; the binding constraint swaps between themes, which is why one metric alone under-constrains a tool that generates both. Assumed body type **16px/400 → Lc 90**, stated in the product. Forces: mid-tone surfaces (`#77`–`#C9`) forbidden for text, light-mode elevation via border/shadow not fill, `accent-fill` and `focus-ring` are solved tokens, APCA polarity must be carried and asserted.
- [What exactly does the export produce?](issues/03-export-format.md) — Tailwind v4 `@theme` **cannot** hold a light/dark pair; the real shape is `:root`/`.dark` custom properties + `@theme inline` bridge + `@custom-variant dark`. Tailwind and shadcn exports are one emitter with a different name map. Four export targets, default shadcn `globals.css`. Forces: tokens are `{light,dark}` pairs, `-foreground` marks a contrast guarantee, alpha must be representable so the checker composites first.

- [What is in the mock preview, and which roles does it demand?](issues/04-preview-surface.md) — one dense app screen, built live rather than as a throwaway. Enumerated the roles, and turned up **`link`**: `primary` is a fill and cannot also clear 4.5:1 as text, so link text needs its own solved role that shadcn does not have.
- [The semantic token schema](issues/05-token-schema.md) — 29 roles, shadcn names plus success/warning/link. Individually solved colours, **no ramps** — a ramp cannot carry a guarantee without knowing its backdrop. `-foreground` is the guarantee marker; 18 pairings are guaranteed, the rest explicitly decorative.
- [How does a seed become a whole palette?](issues/06-generation-model.md) — hue and relative chroma are the brand invariant; **every guaranteed lightness is solved against its actual backdrop**, never tabled. Surface ladders clamped to the elevation budget; fills solved under label-legibility *and* 3:1 visibility; semantic hues absolute.
- [What goes in the URL hash?](issues/07-url-hash-encoding.md) — **inputs, not outputs**, so an old link re-solves if the floors move. Under 80 chars. Accepted cost: a link can change meaning when the engine is tuned, which `v` makes detectable.
- [What must be true so type and radius can slot in later?](issues/08-extensibility-constraint.md) — four rules, **no plugin framework and no `TokenDomain` interface**. Colour's values are solved against each other; radius and type have no equivalent relationship, so an interface generalised from colour alone would be wrong.
- [Which controls does guided mode expose?](issues/09-guided-control-surface.md) — four: seed, character, body-text assumption, guided/unlock. Engine internals stay internal. Unlock removes the guarantee, never the diagnostics.

- [Assemble the build spec](issues/10-assemble-spec.md) — written to [`spec.md`](spec.md). The destination moved mid-map (a working tool was asked for, not a spec to hand off), so the spec became a reference for changing the system rather than instructions for building it. **The map is walked.**

## Not yet specified

- **Character presets** — which named characters exist and what parameters each sets. Waits on the generation model having parameters at all.
- **The saved-palette library** — naming, listing, deleting palettes in `localStorage`. Waits on the palette schema and the hash encoding.
- **Onboarding / empty state** — what you see before you have chosen anything, and whether the tool opens on a random palette or a blank one.
- **A dedicated "match this brand hex" flow.** The engine supports pinning (any override is a pin the rest solves around), but separating it from unlock — so matching a mandated brand colour does not mean giving up the guarantee everywhere — needs its own UI thinking.
- **How pinning is surfaced in guided mode** without collapsing into the free-for-all mode that guided mode exists to avoid.
- **Whether an AAA mode is offered at all** — it is specified (+Lc 15, 7:1) but it forbids mid-tone surfaces outright, so it may constrain the tool into a corner not worth having.
- **Whether the seed can be generated for you** ("surprise me" / explore), and what that means when the point is that you don't trust your own eye.

## Out of scope

- **Other token domains — type scale, radius, spacing, shadow.** Deferred to a future effort; the destination is fixed at colour. Ticket 09 exists solely to keep the door open, not to design them.
- **Paste-and-repair of an existing palette, and the critique report.** The engine must support pinned colours so this is cheap to add later, but no UI for it here.
- **Accounts, backend, server-side persistence.** Static hosting only.
- **An LLM anywhere in the tool's output path.**
