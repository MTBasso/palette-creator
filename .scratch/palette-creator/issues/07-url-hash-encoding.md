# 07 — What goes in the URL hash?

Type: grilling
Status: open
Blocked by: 06

## Question

The hash is the source of truth for the current palette, which makes its encoding a real design decision, not a serialisation detail — it fixes what a palette fundamentally *is*.

- Does the hash carry the **inputs** (seed + character + parameter overrides + pins) and regenerate the palette on load, or the **outputs** (every resolved token)?
- Inputs are short, readable and self-repairing; they also mean a shared link silently changes meaning when the engine is tuned. Outputs are stable forever and long. Which failure is acceptable?
- What is the **versioning story** for links made before an engine change?
- **Input from [ticket 02](02-contrast-standard.md)**: its recommendation leans hard toward encoding *inputs*, because APCA is beta research whose thresholds may move — inputs let an old link be re-solved under new thresholds, outputs freeze it against a superseded metric. Weigh this against the "shared link silently changes meaning" cost above; it is a strong argument but not an automatic verdict.
- Concrete encoding, length budget, and behaviour on a malformed or unknown-version hash.
