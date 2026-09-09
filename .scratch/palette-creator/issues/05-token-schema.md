# 05 — The semantic token schema

Type: grilling
Status: resolved
Blocked by: 02, 03, 04

## Question

Define the complete set of tokens the tool outputs, and the vocabulary for them. This is the spine of the whole spec — the generation model, the export, the hash encoding and the extensibility story all hang off it.

- Which **semantic roles** exist (background, surface, raised surface, text, muted text, border, primary, on-primary, destructive, success, focus ring, …) — using the roles ticket 04 proved were needed, not a list copied from a framework.
- Are roles backed by **ramps** (a 50–950 scale per hue) or by individually solved colours? What does each cost in complexity, and does the user ever see the ramp?
- What is the **minimal complete set** — the smallest schema where nothing in the preview has to reach for a colour that isn't named.
- How do light and dark relate: are they two values of one role, or two full sets?
- Which pairings carry a **contrast guarantee** (from ticket 02), and which are decorative and unconstrained?

Record the resolved vocabulary in `CONTEXT.md`.

## Answer

29 roles, in `src/palette/schema.ts`. Names follow shadcn exactly where shadcn has them, because ticket 03 made a shadcn-compatible `globals.css` the default export and matching a convention costs nothing while making output paste-able. Six roles are ours: `success`, `warning`, `link` and their foregrounds, plus `destructive-foreground` (shadcn v4 dropped it; we keep it internally and omit it from the shadcn export).

**A role is a `{light, dark}` pair, not a value** — forced by ticket 03, since the export defines both themes from one declaration site.

**No ramps.** Individually solved colours only. A 50–950 scale per hue would be ~250 values of which the UI uses 29, and every one of them would need a guarantee it cannot have without knowing its backdrop. Ramps buy nothing here and cost the ability to solve.

**`-foreground` is the guarantee marker.** shadcn's naming convention already encodes exactly the pairing relationship the contrast checker needs, so `GUARANTEES` reuses it rather than inventing a parallel structure. 18 pairings carry a guarantee; everything else (chart colours, decorative fills) is explicitly unconstrained.

`FORBIDDEN_SURFACE_BAND` is exported and asserted at generation time rather than merely intended — ticket 02's mid-tone ban is the kind of constraint that no visual check would catch being violated.
