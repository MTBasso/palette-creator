# 09 — Which controls does guided mode expose?

Type: prototype
Status: resolved
Blocked by: 06

## Question

Guided mode's promise is that its controls cannot produce a failing palette. That makes control selection a product decision: every knob exposed is a way for the user's untrusted eye back into the loop, and every knob withheld is a palette they cannot reach.

- Which of the engine's parameters become **visible controls**, and which stay internal?
- What does the **unlock** reveal, what does it look like once unlocked, and how does the UI show that diagnostics are now the only thing standing between you and a bad palette?
- How is a **pinned colour** entered without the unlock — the common case of "I must match this brand hex" is not the same as wanting manual control.
- **The typography assumption is a control.** [Ticket 02](02-contrast-standard.md) fixes body text at 16px/400 (Lc 90) with Lc 75 as a labelled relaxation ("requires ≥18px/400"). Is that a user-facing switch, a fixed assumption stated in the UI, or a per-project setting? It changes every text token, so it cannot be silent.
- Prototype the panel and react to it.

## Answer

Four controls, in `src/App.tsx`.

- **Seed colour** — picker plus hex field.
- **Character** — six presets. Deterministic lookups to numeric parameters, never an interpreted mood.
- **Body text assumption** — `16px/400` (Lc 90) or `18px/400` (Lc 75). Ticket 02 required this be *stated*, not silent, so it is a visible control rather than a constant, and it appears in every export header.
- **Guided / Unlocked**.

**The engine's internals stay internal**: neutral chroma, accent chroma, surface separation and the semantic hues are not exposed. Each is a way for the untrusted eye back into the loop, and the character presets already span the useful range. If a specific palette proves unreachable, that is evidence for a new character, not a new slider.

**Unlock** reveals per-role colour inputs on the Tokens tab for both themes, marks overridden roles with `*`, and offers a "clear N overrides" escape. The status panel switches from "all N pairings clear both floors" to a failure count. Diagnostics never stop — the guarantee is what goes away, and the UI says so in those words.

**Pinning** is deliberately *not* separated from unlock in this version. The engine supports it (any override is a pin the rest solves around), but a distinct "match this brand hex exactly" flow needs its own UI thinking. Left in the fog rather than half-built.
