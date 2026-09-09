# 04 — What is in the mock preview, and which roles does it demand?

Type: prototype
Status: open
Blocked by: —

## Question

The preview is the primary surface: the user judges a palette by looking at a realistic UI, not at swatches. It runs *before* the token schema deliberately — building a realistic mock enumerates the roles that are genuinely needed, instead of inventing a schema from theory and discovering the gaps later.

Build a throwaway static mock (single HTML file, hardcoded colours, no build step, no framework) of a UI dense enough to expose colour problems: a nav, a card or two, body and muted text, a primary button, a secondary/ghost button, an input with a focus ring, a border-separated list, a destructive action, a success/warning notice, a disabled control, and a chart or data-tile if it earns its place.

Deliverables:

1. The mock, linked from this ticket as an asset.
2. A list of every distinct colour role the mock actually required — the raw material for ticket 05.
3. A judgement on whether the preview should be one screen or a small set (marketing page vs app screen), given that palettes that work in an app often fail on a landing page.
