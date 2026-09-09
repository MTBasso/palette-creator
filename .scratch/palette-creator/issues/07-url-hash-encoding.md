# 07 — What goes in the URL hash?

Type: grilling
Status: resolved
Blocked by: 06

## Question

The hash is the source of truth for the current palette, which makes its encoding a real design decision, not a serialisation detail — it fixes what a palette fundamentally *is*.

- Does the hash carry the **inputs** (seed + character + parameter overrides + pins) and regenerate the palette on load, or the **outputs** (every resolved token)?
- Inputs are short, readable and self-repairing; they also mean a shared link silently changes meaning when the engine is tuned. Outputs are stable forever and long. Which failure is acceptable?
- What is the **versioning story** for links made before an engine change?
- **Input from [ticket 02](02-contrast-standard.md)**: its recommendation leans hard toward encoding *inputs*, because APCA is beta research whose thresholds may move — inputs let an old link be re-solved under new thresholds, outputs freeze it against a superseded metric. Weigh this against the "shared link silently changes meaning" cost above; it is a strong argument but not an automatic verdict.
- Concrete encoding, length budget, and behaviour on a malformed or unknown-version hash.

## Answer

`src/palette/hash.ts`. **Inputs, not outputs**: `v`, `seed`, `c` (character), `m` (contrast mode), and optional `o` (overrides as `role:theme:hex` triples). Under 80 characters for a normal palette.

Ticket 02's recommendation decided it. APCA is beta research whose thresholds can still move; encoding inputs lets an old link be **re-solved** under new floors, where frozen outputs would preserve a palette generated against a superseded metric.

**The accepted cost**: a shared link can change meaning when the engine is tuned. `v` is what makes that detectable rather than silent — a future engine can branch on it.

Malformed, unknown or hostile hashes degrade to defaults field by field rather than throwing; a bad seed falls back to the default seed while a valid character in the same hash still applies. Tested against empty, garbage, and injection-shaped inputs.
