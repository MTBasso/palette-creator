# 05 — The semantic token schema

Type: grilling
Status: open
Blocked by: 02, 03, 04

## Question

Define the complete set of tokens the tool outputs, and the vocabulary for them. This is the spine of the whole spec — the generation model, the export, the hash encoding and the extensibility story all hang off it.

- Which **semantic roles** exist (background, surface, raised surface, text, muted text, border, primary, on-primary, destructive, success, focus ring, …) — using the roles ticket 04 proved were needed, not a list copied from a framework.
- Are roles backed by **ramps** (a 50–950 scale per hue) or by individually solved colours? What does each cost in complexity, and does the user ever see the ramp?
- What is the **minimal complete set** — the smallest schema where nothing in the preview has to reach for a colour that isn't named.
- How do light and dark relate: are they two values of one role, or two full sets?
- Which pairings carry a **contrast guarantee** (from ticket 02), and which are decorative and unconstrained?

Record the resolved vocabulary in `CONTEXT.md`.
