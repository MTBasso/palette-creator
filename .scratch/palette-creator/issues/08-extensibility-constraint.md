# 08 — What must be true so type and radius can slot in later?

Type: grilling
Status: open
Blocked by: 05, 06

## Question

Other token domains are out of scope for this map, but the architecture must not make them a rewrite. The trap is over-abstracting now from a single imagined example.

- What is the **minimum** structural commitment — a domain-shaped module boundary, a token schema that isn't colour-specific at its outer layer, an export pipeline that concatenates per-domain output, a hash format with room for more sections?
- What should explicitly **not** be abstracted yet, and why — where would a general "token domain" interface invented today be wrong?
- What is the concrete **test of the constraint**: describe, in a paragraph, exactly what adding a radius scale would touch. If that paragraph is short, the constraint holds.

The output is a short list of rules the spec imposes, not a plugin framework.
