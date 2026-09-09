# 09 — Which controls does guided mode expose?

Type: prototype
Status: open
Blocked by: 06

## Question

Guided mode's promise is that its controls cannot produce a failing palette. That makes control selection a product decision: every knob exposed is a way for the user's untrusted eye back into the loop, and every knob withheld is a palette they cannot reach.

- Which of the engine's parameters become **visible controls**, and which stay internal?
- What does the **unlock** reveal, what does it look like once unlocked, and how does the UI show that diagnostics are now the only thing standing between you and a bad palette?
- How is a **pinned colour** entered without the unlock — the common case of "I must match this brand hex" is not the same as wanting manual control.
- **The typography assumption is a control.** [Ticket 02](02-contrast-standard.md) fixes body text at 16px/400 (Lc 90) with Lc 75 as a labelled relaxation ("requires ≥18px/400"). Is that a user-facing switch, a fixed assumption stated in the UI, or a per-project setting? It changes every text token, so it cannot be silent.
- Prototype the panel and react to it.
