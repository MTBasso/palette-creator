# 03 — What exactly does the export produce?

Type: research
Status: resolved
Blocked by: —

## Question

The export format constrains the token schema, so it is worth pinning before the schema is designed. Establish the current idiomatic shape of:

- **Tailwind v4 `@theme`** — exact syntax for a themed colour token set, and how a light/dark pair is expressed idiomatically in v4 rather than in v3 habits.
- **Light/dark mechanics in CSS today** — `light-dark()`, `prefers-color-scheme`, `[data-theme]` attribute overrides, and the three-state pattern (explicit light / explicit dark / system default). Which combination should the export emit so a consumer gets a working theme toggle *and* correct system-default behaviour?
- **shadcn/ui-style consumers** — what variable names and structure such a project expects, since matching a convention costs nothing and makes the output paste-able.

Answer with the literal text of a small example export in each target format.

## Context pointer

Findings land at `.scratch\/palette-creator\/research\/03-export-format.md`.

## Answer

Full findings: [`research/03-export-format.md`](../research/03-export-format.md) (806 lines, sources cited inline).

**The ticket's premise was wrong.** A Tailwind v4 `@theme` block *cannot* express a light/dark pair — theme variables must be defined top-level, never nested under a selector or media query. So the idiomatic v4 shape is a three-part sandwich, not a `@theme` block:

1. `:root { --background: … }` + `.dark { --background: … }` — plain custom properties, which *can* vary by selector.
2. `@theme inline { --color-background: var(--background); }` — the bridge that creates `bg-background`. `inline` is **mandatory**: without it the utility emits `var(--color-background)`, which resolves where it is *defined* (`:root`), so any subtree-scoped `.dark` silently fails.
3. `@custom-variant dark (…)` — replaces v3's `darkMode` config.

Consequence: **the Tailwind export and the shadcn export are one emitter with a different token-name map.** Build one; expose the choice as a naming toggle.

### Three-state light/dark — two patterns, never mixed

- **Selector-driven** (Tailwind / shadcn targets): `:root` + `.dark`, **zero media queries**; "system" is resolved to a concrete class by a pre-paint inline script. The only pattern where token values and `dark:` utilities share one switch.
- **`light-dark()`** (plain-CSS target): one declaration per token carrying both values; three states driven purely by `color-scheme` on `[data-theme]`. No JS, no FOUC. Baseline 2024.

Both satisfy "no colour defined only inside a media query" by containing no media query at all.

**Trap**: `light-dark()` resolves against `color-scheme`, and CSS has no selector for "used colour-scheme is dark" — Tailwind's `dark:` variant can never observe it. Never use `light-dark()` in a Tailwind export. It is also opaque to `getComputedStyle`, which breaks JS token readers. Always emit `color-scheme` regardless of pattern, or native controls, date pickers and scrollbars ignore the palette entirely.

### shadcn under v4 — what changed

- Values are complete `oklch()` colours (`--background: oklch(1 0 0)`), not v3's bare HSL channel fragments.
- `tailwind.config.js` is gone; `components.json` carries `tailwind.config: ""`.
- **Alpha is baked in**: dark `--border: oklch(1 0 0 / 10%)`, `--input: oklch(1 0 0 / 15%)`.
- `--destructive`, `--border`, `--input`, `--ring` are single tokens — no `--destructive-foreground` any more.

### Decision

Ship four exports, defaulting to **shadcn-compatible `globals.css`**:

| File | Target |
|---|---|
| `globals.css` *(default)* | exact shadcn token names, drop-in over `app/globals.css` |
| `theme.css` | same machinery, our own role names |
| `palette.css` | plain CSS, `light-dark()` + `color-scheme`, plus raw `--<role>-light`/`--<role>-dark` so it stays machine-readable |
| `palette.json` | `{ role: { light, dark } }` + seed + params — the only round-trippable format |

Cross-cutting rules: use `:where()` rather than shadcn's `:is()` in the dark variant (zero specificity, and it matches the themed element itself, which `&:is(.dark *)` does not); never emit `--color-*: initial` (it deletes the consumer's default palette); never use `contrast-color()` — its algorithm is explicitly UA-defined, which is exactly the non-determinism this tool exists to remove.

### What this forces downstream

- **Tokens are pairs, not values** — a role is `{light, dark}` at the schema level.
- **`-foreground` is the contrast-guarantee marker** — the naming convention carries the constraint.
- Role names must be flat kebab-case, legal as a `--color-*` tail.
- **Alpha must be representable**, which means the contrast checker must composite translucent tokens over their surface before measuring.
- Reserve a `--radius` slot so a shadcn paste does not clobber it.
