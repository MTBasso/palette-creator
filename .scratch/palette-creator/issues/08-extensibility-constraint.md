# 08 — What must be true so type and radius can slot in later?

Type: grilling
Status: resolved
Blocked by: 05, 06

## Question

Other token domains are out of scope for this map, but the architecture must not make them a rewrite. The trap is over-abstracting now from a single imagined example.

- What is the **minimum** structural commitment — a domain-shaped module boundary, a token schema that isn't colour-specific at its outer layer, an export pipeline that concatenates per-domain output, a hash format with room for more sections?
- What should explicitly **not** be abstracted yet, and why — where would a general "token domain" interface invented today be wrong?
- What is the concrete **test of the constraint**: describe, in a paragraph, exactly what adding a radius scale would touch. If that paragraph is short, the constraint holds.

The output is a short list of rules the spec imposes, not a plugin framework.

## Answer

Four rules, no plugin framework. Adding a radius scale should touch four named places, and this ticket exists to keep that number small — not to build the abstraction now.

1. **Roles are a flat, exported list.** `ROLES` drives export, swatches, overrides and the hash. A second domain adds its own list; nothing enumerates colour roles by hand.
2. **The export emitter is name-map-driven, not colour-specific.** `emitTailwindStyle(palette, roles)` already serves both the shadcn and the full targets by varying only the role list — the same seam a second domain slots into. `--radius` is already emitted and its scale already derived, so the slot is real rather than reserved in a comment.
3. **The hash is a `URLSearchParams` keyed namespace**, not a positional format. A domain adds a key; old links keep parsing.
4. **The engine exports pure functions, not a configured object.** No registry, no globals, no init order.

**What is deliberately NOT abstracted**: there is no `TokenDomain` interface, and there should not be one until a second domain exists. Colour's defining feature is that its values are *solved against each other* under a contrast constraint; radius and type have no equivalent relationship. An interface generalised from colour alone would encode the solver as though it were universal, and be wrong.

**The test**: adding a radius scale touches `schema.ts` (a second role list), `generate.ts` (a scale function — no solver), `export.ts` (one more bridge block), and one UI panel. It touches nothing in `oklch.ts`, `contrast.ts`, `diagnose.ts` or `hash.ts`. That paragraph is short, so the constraint holds.
