# 06 — How does a seed become a whole palette?

Type: grilling
Status: resolved
Blocked by: 01, 05

## Question

The engine's actual algorithm. Given a seed colour and a character, produce every token in the schema, deterministically, in both themes, with every contrast guarantee held.

- How are the **other hues derived** from the seed — fixed harmony rules (analogous / triadic / complementary), perceptual-distance rules, or a small set of hand-tuned relationships per character?
- How is a **lightness ramp constructed**, and how is it made even across hues where equal lightness reads differently by hue?
- How do light and dark stay recognisably the **same brand** while both holding contrast — what is invariant between them?
- What happens when a guarantee **cannot be met** (a neon seed that no text will sit on)? Does the engine bend the seed, bend the guarantee, or refuse?
- Where does **pinning** enter: given one or more fixed colours, what does the engine solve for and in what order?
- Which of these become the **parameters** the guided controls expose (feeds the control-surface question still in fog).

## Answer

`src/palette/generate.ts`. The governing rule: **every lightness carrying a guarantee is solved against its actual backdrop, never assigned from a table.** That is what makes guided mode's promise true by construction rather than by checking afterwards.

**What is invariant between themes: the hue and the gamut-relative chroma.** What is re-solved per theme: every lightness. This answers "how do both themes stay the same brand while both holding contrast", and ticket 02 forced it — the themes are *not* symmetric, since light mode's elevation budget stops around `#E4E4E4` while dark mode's runs to `#575757`. A mirrored ramp would fail one of them.

- **Surfaces** are a lightness ladder offset from the background, scaled by the character's separation, then **clamped to the elevation budget**. The clamp is not decoration: the test suite caught the `brutal` character walking the deepest light surface past the point where no text clears Lc 90.
- **Text** is solved with a binary search for the lightness *closest to the background* that still clears both floors — the softest passing colour, not the highest-contrast one, which is what stops every palette collapsing to black on white. `muted-foreground` is solved against both the page and the muted surface, never inheriting one verdict for the other.
- **Fills** (primary, destructive, success, warning) scan lightness under three simultaneous constraints: the label must clear the on-accent floors, the fill must clear 3:1 against the background (SC 1.4.11 — a button is a UI component), and the result should land near a preferred lightness. This is ticket 02's "move the fill, never lower the threshold", implemented literally.
- **Chroma is always gamut-relative**, per ticket 01 — absolute chroma is not hue-portable.
- **Semantic hues are absolute** (destructive 27, success 148, warning 82). A destructive action must read as red regardless of the seed. Only the *chroma* follows the character.
- **Infeasibility**: every solve has a terminal fallback to a near-extreme achromatic value, which always clears the floors against these clamped ladders. The engine bends the fill, never the guarantee.
