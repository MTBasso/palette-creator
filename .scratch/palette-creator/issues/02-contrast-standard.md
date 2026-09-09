# 02 — Which contrast metric do the guardrails enforce?

Type: research
Status: resolved
Blocked by: —

## Question

Guided mode promises the user cannot produce a failing palette. That promise is only as good as the metric behind it, and the obvious choice is contested:

- **WCAG 2.x contrast ratio** (4.5:1 / 3:1 / 7:1) — the legal and industry standard, and known to misjudge dark themes and mid-tones badly.
- **APCA / Lc** — designed to fix exactly those failures. What is its status in WCAG 3, its licensing, and its threshold model (Lc values by font size and weight)?

Determine what a tool that must *guarantee* legibility should enforce, including whether it should compute both — enforcing one, reporting the other — and what the thresholds should be for each token pairing the tool will produce (body text, large text, UI borders, disabled states, text on accent).

Answer with a recommendation, the thresholds, and the failure mode being accepted.

## Context pointer

Findings land at `.scratch\/palette-creator\/research\/02-contrast-standard.md`.

## Answer

Full findings: [`research/02-contrast-standard.md`](../research/02-contrast-standard.md) — normative text, both algorithms' constants, licensing, and worked anchor values.

**Enforce the conjunction of APCA `|Lc|` and WCAG 2.x ratio. Report both, always.** WCAG 2.x is the *compliance* floor; APCA is the *legibility* floor. Neither may be traded against the other.

The single observation that settles it: **the binding constraint swaps between themes.** On white, a `#949494` border is WCAG-bound (3.03:1, Lc 57); on near-black, a `#969696` border is APCA-bound (Lc 45, 6.65:1). Enforcing either metric alone leaves one of the two themes under-constrained — and this tool generates both together.

- WCAG 2.x implemented directly from the spec (~15 lines, no dependency, no licence).
- APCA from **pinned, unmodified `apca-w3`** — never a modified copy.
- Guided mode's solver satisfies both floors simultaneously; a pairing failing either is not producible.
- The UI shows both numbers, labelling APCA as the reason a value was rejected where WCAG alone would have passed it. **This is the tool's actual differentiator over every WCAG-only palette generator and should be visible.**
- Ship APCA's **Bronze Simple Mode**, not the font lookup table — the tool cannot know the consumer's type scale.

**Assumed typography, which must be stated in the product: body = 16px / weight 400 → Lc 90.** Lc 75 is offered as an explicitly labelled relaxation meaning "safe at 18px/400, 16px/500, or 14px/700".

### Thresholds — both columns are hard floors

| Pairing | APCA | WCAG | Note |
|---|---|---|---|
| Body text on background | Lc 90 target / Lc 75 floor | 4.5:1 | Lc 75 must be labelled "requires ≥18px/400" |
| Body text on surface | same, **recomputed against the surface** | 4.5:1 | Never inherit the background's verdict |
| Large / heading (≥24px, or ≥18.66px bold) | Lc 60 | 3:1 | **Not** Lc 45 — Lc 45 does not reach 3:1 (min observed 2.07:1) |
| Muted / secondary text | Lc 75 | 4.5:1 | Still body text under SC 1.4.3. There is no legal "secondary text" discount — mute via a smaller Lc gap from body, never by dropping below the floor |
| Borders, control outlines, icons | Lc 45 | 3:1 | WCAG binds in light themes, APCA in dark |
| Decorative dividers | Lc 15 | none | Exempt from 1.4.11; Lc 15 enforced as a *minimum visibility* floor WCAG does not provide |
| Focus rings | Lc 45 vs **both** adjacencies | 3:1 vs **both**, **and** 3:1 focused-vs-unfocused | The trap: a ring must clear the component fill *and* the page background (1.4.11), plus state change (2.4.13). The one token where failure is a keyboard-user lockout |
| Disabled / placeholder | Lc 30 floor, **Lc 60 ceiling** | exempt | Be stricter than the law. The ceiling matters as much as the floor — a disabled control must *read* as disabled |
| Text on saturated accent | Lc 60 (label ≥16px/600); Lc 75 otherwise | 4.5:1 | If no achromatic `on-accent` clears both, **move the fill, never lower the threshold** |
| Accent used as text (links) | Lc 75 | 4.5:1 | A tinted body text is body text; chroma must reduce until it clears |
| AAA mode, if offered | +Lc 15 to every text floor | 7:1 / 4.5:1 | Must also refuse mid-tone surfaces — 7:1 is arithmetically unreachable on `#60`–`#9F` |

### Structural constraints the engine inherits

1. **Mid-tone surfaces are forbidden for text.** Greyscale-equivalent backgrounds `#77`–`#C9` admit no Lc-75 body text at all. The surface ramp must never enter this band in either theme.
2. **Light theme's elevation budget stops at ~`#E4E4E4`** (Lc 90) or `#CACACA` (Lc 75) — so light-mode elevation must come from borders and shadow, not fill.
3. **Dark theme's elevation budget runs to `#575757`**, so dark mode may use fill for elevation freely. *(Note: light and dark are therefore not symmetric — this constrains ticket 06's "what is invariant between them".)*
4. **`accent-fill` is a solved token, not the seed** — its lightness is determined by its hue's feasible band for the chosen `on-accent`.
5. **`focus-ring` is solved against two adjacencies** and is the token most likely to be infeasible; it may need a different hue from the accent.
6. **APCA is signed** — the engine must carry polarity and assert it matches the theme. An unsigned `|Lc|` silently accepts a light-on-light pair.

Greyscale anchor values for both themes are tabulated in §6.3 of the research file and should become Vitest fixtures.

### Failure modes being accepted — must appear in the product, not just here

**(a) APCA is beta research, not a standard.** Algorithm `0.0.98G-4g` has been frozen since Feb 2021, but the W3C subgroup that would ratify it is inactive and has approved nothing for WCAG 3; the March 2026 WCAG 3 draft does not contain the string "APCA". Palettes may prove to have been generated against a superseded metric. Mitigated by recording the algorithm version and thresholds in the export, and by encoding **inputs** rather than outputs in the URL hash so a palette can be re-solved under new thresholds *(a direct input to ticket 07)*.

**(b) The APCA licence attaches an ongoing obligation to an otherwise fire-and-forget static tool.** Constants may not be modified; the current version must be tracked into future releases; the name "APCA" may only be used while both hold. A dormant repo that falls behind `apca-w3` is, in the licence's own words, "in breech of license."

**(c) No two-colour metric models legibility.** Neither model accounts for page background, font rendering, ambient light, display gamma, or the reader's vision. A consumer shipping 12px/300 falls below the matrix regardless of the palette.

**Therefore the promise is precisely**: *guided mode cannot produce a palette that fails WCAG 2.x AA, and cannot produce one below APCA's perceptual floors for its stated font assumption.* It is **not** "cannot produce an illegible palette", and the product copy must not say that.
