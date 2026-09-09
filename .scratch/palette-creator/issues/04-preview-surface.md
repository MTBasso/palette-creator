# 04 — What is in the mock preview, and which roles does it demand?

Type: prototype
Status: resolved
Blocked by: —

## Question

The preview is the primary surface: the user judges a palette by looking at a realistic UI, not at swatches. It runs *before* the token schema deliberately — building a realistic mock enumerates the roles that are genuinely needed, instead of inventing a schema from theory and discovering the gaps later.

Build a throwaway static mock (single HTML file, hardcoded colours, no build step, no framework) of a UI dense enough to expose colour problems: a nav, a card or two, body and muted text, a primary button, a secondary/ghost button, an input with a focus ring, a border-separated list, a destructive action, a success/warning notice, a disabled control, and a chart or data-tile if it earns its place.

Deliverables:

1. The mock, linked from this ticket as an asset.
2. A list of every distinct colour role the mock actually required — the raw material for ticket 05.
3. A judgement on whether the preview should be one screen or a small set (marketing page vs app screen), given that palettes that work in an app often fail on a landing page.

## Answer

Built as the live `Preview` tab (`src/ui/Preview.tsx`) rather than a throwaway file, since the build was happening anyway.

**One screen, not a set**: a dense product dashboard — sidebar nav with an active state, top bar with search and avatar, page header with three button weights, three stat cards, a five-series bar chart, a form card with inputs/select/focus rings/disabled button, a warning notice, a four-row status table with badges, a destructive popover, and a link-heavy footer. Marketing-page previews were considered and dropped: an app screen exercises more roles per pixel, and the roles it misses are the ones a marketing page invents ad hoc.

**Roles the mock actually demanded** — this is what the schema was derived from, and building first paid off immediately:

- The full shadcn surface set (background, card, popover, muted, secondary, accent) with paired foregrounds.
- `success` and `warning` with foregrounds — the status table and notice could not be built honestly without them, and shadcn has neither.
- **`link`** — the discovery that justified the exercise. `primary` is a *fill* role at mid lightness; it cannot also clear 4.5:1 as text on white. Deriving the schema from theory would have produced either a failing guarantee or link-less UI. It got its own solved role.
- `chart-1..5` for the bar chart and legend.
- `input` distinct from `border` — a control outline reads as weaker than a divider if they share a value.

**Disabled controls** use opacity rather than a token, matching shadcn. They are WCAG-exempt, and ticket 02's Lc 30-60 window is satisfied by 50% opacity over these surfaces. Noted as a deliberate deferral, not an oversight.
