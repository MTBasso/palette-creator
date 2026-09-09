# 03 — What exactly does the export produce?

Research findings for ticket `03-export-format`. Sources are primary: Tailwind CSS v4 official
docs (site reports **v4.3** as current, 2026-09), MDN, the CSS Color Module Level 5 editor's
draft, the shadcn/ui docs and the live shadcn registry JSON. Blog posts were not used.

Colour values in the worked examples are **illustrative placeholders** in the shape the engine
will emit; they are not engine output.

---

## 1. Tailwind v4 `@theme` — the exact current syntax

### 1.1 What `@theme` is

Theme variables are declared with the `@theme` at-rule, and they are *not* just custom
properties — they generate utility classes.

> "Theme variables aren't *just* CSS variables — they also instruct Tailwind to create new
> utility classes that you can use in your HTML."
> — <https://tailwindcss.com/docs/theme>

```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

…makes `bg-mint-500`, `text-mint-500`, `fill-mint-500`, `border-mint-500` exist. The namespace
prefix is what selects the utility family; `--color-*` is the colour namespace
(<https://tailwindcss.com/docs/theme#theme-variable-namespaces>).

Tailwind then also emits every theme variable as a plain custom property on `:root`, so
`var(--color-mint-500)` works in hand-written CSS and inline styles
(<https://tailwindcss.com/docs/theme#using-your-theme-variables>).

### 1.2 The constraint that decides the whole export shape

> "Theme variables are also required to be defined **top-level and not nested under other
> selectors or media queries**, and using a special syntax makes it possible to enforce that."
> — <https://tailwindcss.com/docs/theme> ("Why `@theme` instead of `:root`?")

**This is the single most important fact for us.** You cannot write:

```css
/* INVALID — Tailwind will reject this */
.dark {
  @theme { --color-background: oklch(0.17 0.01 265); }
}
```

There is therefore **no such thing as a light/dark `@theme` pair**. A `@theme` block is a flat,
static list. Any v3 instinct along the lines of `theme.extend.colors` with nested variants has
no v4 equivalent, and any v3 `tailwind.config.js` / `darkMode: 'class'` config is gone —
`@custom-variant` replaces `darkMode` (§2.4).

### 1.3 `@theme` vs `@theme inline` — and why the pair forces `inline`

Because a `@theme` block cannot vary by theme, the idiomatic v4 pattern is an **indirection**:
ordinary custom properties hold the values and *do* vary by selector; `@theme inline` maps them
into the `--color-*` namespace so utilities exist.

The `inline` option exists precisely for referencing other variables:

> "When defining theme variables that reference other variables, use the `inline` option […]
> Using the `inline` option, the utility class will use the theme variable **value** instead of
> referencing the actual theme variable."
> — <https://tailwindcss.com/docs/theme#referencing-other-variables>

Concretely, given `@theme inline { --color-background: var(--background); }` Tailwind emits:

```css
.bg-background { background-color: var(--background); }
```

i.e. the utility resolves `--background` **at the element where the utility is used**. Without
`inline` it would emit `background-color: var(--color-background)`, and `--color-background`
resolves where *it* is defined (`:root`) — so a `--background` override on any element that is
not `:root` would be ignored. Tailwind's docs give the same failure mode with fonts:

> "Without using `inline`, your utility classes might resolve to unexpected values because of
> how variables are resolved in CSS. […] this text will fall back to `sans-serif` instead of
> using Inter […] because `var(--font-sans)` is resolved where `--font-sans` is defined."

Practical consequence: a non-`inline` `@theme` happens to *appear* to work when the `.dark`
class sits on `<html>` (same element as `:root`, so the cascade resolves it there), but breaks
the moment a consumer scopes a theme to a subtree (`<div class="dark">…`, a dark footer, a
themed preview pane). **Always emit `@theme inline` for colour tokens.**

Other `@theme` options, for completeness:

- `@theme static { … }` — always emit all CSS variables, not only the used ones
  (<https://tailwindcss.com/docs/theme#generating-all-css-variables>). Relevant if a consumer
  reads tokens from JS or from a canvas/chart library rather than via utilities.
- `--color-*: initial;` inside `@theme` wipes the whole default colour namespace;
  `--*: initial;` wipes the entire default theme
  (<https://tailwindcss.com/docs/theme#overriding-the-default-theme>). **Our export must not do
  either by default** — it would delete `bg-red-500` etc. from the consumer's project.

### 1.4 How `dark:` resolves against tokens

By default `dark:` is a media query:

> "By default, the `dark:` variant uses the `prefers-color-scheme` CSS media feature."
> — <https://tailwindcss.com/docs/dark-mode>

To drive it manually, override it with `@custom-variant`. Tailwind documents both hooks:

```css
/* class hook */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

```css
/* data-attribute hook */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

— both verbatim from <https://tailwindcss.com/docs/dark-mode>.

The block form with `@slot` is also available when a variant needs nesting
(<https://tailwindcss.com/docs/adding-custom-styles#adding-custom-variants>):

```css
@custom-variant theme-midnight {
  &:where([data-theme="midnight"] *) { @slot; }
}

@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover { @slot; }
  }
}
```

**Critical interaction:** `dark:` is a *selector or media-query* mechanism. It has **no
knowledge of the `color-scheme` property**, and CSS offers no selector for "the used
colour-scheme is dark". So a token set switched purely by `light-dark()` + `color-scheme` and a
`dark:` utility written by the consumer **cannot be kept in sync**. Any export aimed at a
Tailwind consumer must therefore expose a *selector* hook (class or attribute), and should emit
`color-scheme` alongside it rather than instead of it.

Tailwind ships `color-scheme` utilities for this: `scheme-normal`, `scheme-light`,
`scheme-dark`, `scheme-light-dark`, `scheme-only-light`, `scheme-only-dark`, and documents
`<html class="scheme-light dark:scheme-dark">` (<https://tailwindcss.com/docs/color-scheme>).

---

## 2. Light/dark mechanics in CSS today

### 2.1 `prefers-color-scheme`

Two values only — `light` and `dark`; `no-preference` is gone, and `light` covers "has not
expressed an active preference". The value comes from an OS or user-agent setting.
(<https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme>)

Support: Chrome 76, Edge 79, Firefox 67, Safari 12.1 (iOS 13) — MDN browser-compat-data,
`css.at-rules.media.prefers-color-scheme`.

It is a **read-only signal about the OS**. It cannot express "the user chose dark inside this
app". That is exactly why a three-state pattern needs a second mechanism.

### 2.2 `color-scheme`

```css
color-scheme: normal | [ light | dark ]+ | only ...
```

Values: `normal`, `light`, `dark`, `light dark`, `only light`, `only dark`. It is **inherited**,
applies to all elements and text, initial value `normal`.
(<https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme>)

What it actually changes:

> "The color of the canvas surface. The default colors of scrollbars and other interaction UI.
> The default colors of form controls. The default colors of other browser-provided UI, such as
> 'spellcheck' underlines."

So it is not decoration — it is the only way to make native `<input>`, `<select>`, date pickers,
scrollbars and the pre-paint canvas match the palette. **An export that sets colours but not
`color-scheme` produces white scrollbars and white date pickers on a dark page.**

`only light` additionally opts an element out of Chrome's Auto Dark Theme.

Support: Chrome/Edge 81, Firefox 96, Safari 13 (iOS 13) — MDN BCD, `css.properties.color-scheme`.

MDN also recommends `<meta name="color-scheme">` in `<head>` "before any CSS style information,
to inform user agents about the preferred color scheme, helping prevent unwanted screen flashes
during page load."

### 2.3 `light-dark()`

Normative definition, CSS Color Module Level 5 §7 "Reacting to the used color-scheme: the
`light-dark()` Function" (<https://drafts.csswg.org/css-color-5/#light-dark>):

```
light-dark() = <light-dark-color> | <light-dark-image>
<light-dark-color> = light-dark(<color>, <color>)
<light-dark-image> = light-dark( [ <image> | none ] , [ <image> | none ] )
```

> "For the color form, this function computes to the computed value of the first color, if the
> element color scheme is light, or to the computed value of the second color, if the element
> color scheme is dark."

Mixing one image and one colour "will result in a parse-time error."

MDN adds the enabling condition and the default:

> "To enable support for the `light-dark()` color function, the `color-scheme` must have a value
> of `light dark`, usually set on the `:root` pseudo-class."
> "The `light-dark()` function returns the first value if the used color scheme is `light` **or
> if no preference is set**, and the second value if the used color scheme is `dark`."
> — <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark>

Support: **Baseline 2024 (newly available May 2024)** — Chrome 123, Edge 123, Firefox 120,
Safari 17.5 (iOS 17.5). MDN BCD, `css.types.color.light-dark`.

**Caveats that matter to this tool:**

1. **It is inert without `color-scheme`.** With the initial `normal`, you get the light value.
   Copy-pasting `light-dark()` tokens into a page that never sets `color-scheme` silently yields
   a permanently-light site.
2. **It resolves against the *element's* used colour scheme, not the OS.** That is a feature —
   it is what makes the three-state pattern in §2.5 work with zero media queries.
3. **Tailwind's `dark:` cannot see it** (§1.4).
4. **It is opaque to JS.** `getComputedStyle(el).getPropertyValue('--background')` on a custom
   property holding `light-dark(a, b)` returns the literal substring, not a resolved colour,
   because custom-property values are unparsed token streams substituted at computed-value time.
   Anything that reads tokens in JS — chart libraries, canvas, a colour-contrast debug overlay —
   will get a string it cannot parse. Read a *real* property (`getComputedStyle(el).color`) or
   read the raw `--light-*` / `--dark-*` variables instead.
5. It is **not** a "dark mode" switch: it switches on colour scheme only, so it cannot express a
   third brand theme, a high-contrast theme, etc.

Note also `contrast-color()` (CSS Color 5 §8) exists in the spec and now ships (Chrome/Edge 147,
Firefox 146, Safari 26 — MDN BCD `css.types.color.contrast-color`), but it "resolves to either
white or black" with a **UA-defined** contrast algorithm. It is therefore useless to us: this
tool exists to make contrast deterministic, and `contrast-color()` is by definition not.

### 2.4 `[data-theme]` / `.dark` attribute overrides

A plain selector override. Tailwind documents both spellings (§1.4). shadcn currently ships the
class form (§3.2). Neither is more correct; the attribute form is marginally safer because
`class` is a shared namespace and `.dark` / `.light` are plausible collisions, and because
`[data-theme="light"]` gives you an *explicit light* state that `.dark` alone cannot express.

### 2.5 The three-state problem, and the two correct answers

A real app has three states, not two: **explicit light**, **explicit dark**, **follow the
system**. The states are not symmetric — "system" is the absence of a choice, and it must
survive an OS change while the tab is open.

Tailwind's own documented JS for this (verbatim, <https://tailwindcss.com/docs/dark-mode>):

```js
// On page load or when changing themes, best to add inline in `head` to avoid FOUC
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),
);

// Whenever the user explicitly chooses light mode
localStorage.theme = "light";

// Whenever the user explicitly chooses dark mode
localStorage.theme = "dark";

// Whenever the user explicitly chooses to respect the OS preference
localStorage.removeItem("theme");
```

shadcn's Vite provider does the same thing (<https://ui.shadcn.com/docs/dark-mode/vite>) —
note that it resolves `"system"` in JS down to a concrete class and never leaves the root bare:

```tsx
type Theme = "dark" | "light" | "system"
…
useEffect(() => {
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light"
    root.classList.add(systemTheme)
    return
  }
  root.classList.add(theme)
}, [theme])
```

**Pattern A — selector-driven, system resolved in JS.** The CSS contains *no media query at
all*: `:root` holds the light values, `.dark` / `[data-theme="dark"]` holds the dark values,
both unconditional. "System" is resolved before paint by a tiny inline script. This is what
Tailwind and shadcn both do, and it is the only pattern under which token values and `dark:`
utilities share one switch. Cost: a blocking inline `<script>` in `<head>` to avoid FOUC.

**Pattern B — `light-dark()` + `color-scheme`, system handled by the browser.** Every token is
declared once, in the base rule, carrying *both* values. The three states are three
`color-scheme` declarations and nothing else:

```css
:root                  { color-scheme: light dark; }  /* system default */
:root[data-theme=light]{ color-scheme: light; }       /* explicit light */
:root[data-theme=dark] { color-scheme: dark; }        /* explicit dark  */
```

Cost: no `dark:` interop, opaque to JS, Baseline-2024 floor. Benefit: **zero JavaScript for the
system default, zero FOUC, and native form controls/scrollbars follow for free.**

### 2.6 "No colour defined only inside a media query" — how each pattern satisfies it

Both do, by construction:

- **Pattern A** contains no `@media` block whatsoever. Light values live in `:root`, dark values
  live in `.dark`. Both are always in the stylesheet, always readable by JS and by tooling.
- **Pattern B** contains no `@media` block either. Both values sit inside one `light-dark()`
  declaration in the base rule.

The anti-pattern to avoid is the common one:

```css
/* DO NOT EMIT THIS */
:root { --background: #fff; }
@media (prefers-color-scheme: dark) {
  :root { --background: #111; }   /* dark value exists ONLY here */
}
```

Three things break: a manual "dark" toggle on a light-set OS has no dark values to reach; a
manual "light" toggle on a dark-set OS needs a `:not()` escape hatch bolted onto the media
query; and the dark palette is unreadable to any tool that isn't currently in dark mode. If a
media query is used at all, it must only ever **re-point** already-declared variables
(`--background: var(--dark-background)`), never introduce a colour literal.

---

## 3. shadcn/ui-style consumers

### 3.1 The convention

> "We use semantic **background and foreground pairs**. The base token controls the surface
> color and the `-foreground` token controls the text and icon color that sits on that surface.
> The `background` suffix is omitted for the surface token. For example, `primary` pairs with
> `primary-foreground`."
> — <https://ui.shadcn.com/docs/theming>

Two structural details worth copying:

- The **surface token is unsuffixed** (`--primary`, not `--primary-background`); only the
  contrasting ink carries `-foreground`.
- Not every token is paired. `--destructive`, `--border`, `--input`, `--ring` are **single**
  tokens in the current schema — there is no `--destructive-foreground` any more, and none of
  the shadcn v4 base colours emit one.

Token list and what each controls (verbatim role descriptions from the same page):

| Token | Controls |
|---|---|
| `background` / `foreground` | The default app background and text color. |
| `card` / `card-foreground` | Elevated surfaces and the content inside them. |
| `popover` / `popover-foreground` | Floating surfaces and the content inside them. |
| `primary` / `primary-foreground` | High-emphasis actions and brand surfaces. |
| `secondary` / `secondary-foreground` | Lower-emphasis filled actions and supporting surfaces. |
| `muted` / `muted-foreground` | Subtle surfaces and lower-emphasis content. |
| `accent` / `accent-foreground` | Interactive hover, focus, and active surfaces. |
| `destructive` | Destructive actions and error emphasis. |
| `border` | Default borders and separators. |
| `input` | Form control borders and input surface treatment. |
| `ring` | Focus rings and outlines. |
| `chart-1` … `chart-5` | The default chart palette. |
| `sidebar`, `sidebar-foreground`, `sidebar-primary(-foreground)`, `sidebar-accent(-foreground)`, `sidebar-border`, `sidebar-ring` | The sidebar surface and its own nested scale. |
| `radius` | Base corner radius; `--radius-sm…4xl` are derived from it. |

### 3.2 What changed under Tailwind v4

Three concrete breaks from the v3-era shadcn everyone still has muscle memory for:

1. **Colour format is now `oklch()`, not bare HSL channels.** v3 shadcn stored
   `--background: 0 0% 100%;` — a *fragment* that had to be re-wrapped as `hsl(var(--background))`
   at every use site. v4 shadcn stores complete colour values: `--background: oklch(1 0 0);`,
   used directly as `var(--background)`. (Compare the legacy `cssVarsTemplate` and the current
   `cssVarsV4` in <https://ui.shadcn.com/r/colors/neutral.json>, and the current default theme on
   <https://ui.shadcn.com/docs/theming>.) **Emit complete `oklch()` values.**
2. **`tailwind.config.js` is gone.** The `content`, `darkMode` and `theme.extend.colors` config
   is replaced by `@import "tailwindcss"`, `@custom-variant dark (…)` and `@theme inline { … }`
   in the CSS file itself. `components.json` still carries `tailwind.css` (the path to
   globals.css), `tailwind.baseColor` and `tailwind.cssVariables`, but `tailwind.config` is now
   an empty string.
3. **Alpha is baked into tokens.** Current dark values include
   `--border: oklch(1 0 0 / 10%)` and `--input: oklch(1 0 0 / 15%)` — translucent whites over the
   dark surface rather than solid greys. Our engine must be able to emit an alpha channel, and
   the contrast checker must know that a translucent border composites over its surface.

The literal current shadcn scaffold header (verbatim from <https://ui.shadcn.com/docs/theming>,
"Default Theme CSS"):

```css
@import "tailwindcss";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* … one line per token … */
  --radius-lg: var(--radius);
}

:root { --radius: 0.625rem; --background: oklch(1 0 0); /* … */ }
.dark { --background: oklch(0.145 0 0); /* … */ }
```

Note shadcn's variant is `&:is(.dark *)` — descendants only, so it does **not** match the `.dark`
element itself. Tailwind's own docs use `&:where(.dark, .dark *)`, which does. `:where()` also
has zero specificity, which is the safer choice for generated output; `:is()` takes the
specificity of its most specific argument. Our export should use the `:where()` form and include
both the element and its descendants.

### 3.3 Adding tokens the shadcn way

The documented extension point, verbatim:

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}

@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

This is the exact shape our export must produce for any role beyond shadcn's own list
(`success`, `warning`, `info`, …). It confirms the three-part structure: **`:root` block +
`.dark` block + `@theme inline` map.**

---

## 4. Worked example exports

One palette, three renderings. Seed is an indigo `oklch(0.55 0.19 264)`. Ten tokens shown; the
real export carries the full ticket-05 schema.

### 4.1 Target A — plain CSS custom properties (`palette.css`)

No build step, no framework, no JavaScript. Three-state via `[data-theme]` + `color-scheme`.
Every colour appears in the base rule; there is no media query in the file.

```css
/*  Palette: "Harbour"  ·  seed oklch(0.55 0.19 264)
 *  Generated by palette-creator — do not edit by hand.
 *
 *  Themes:  <html>                      → follows the OS
 *           <html data-theme="light">   → forced light
 *           <html data-theme="dark">    → forced dark
 */

:root {
  color-scheme: light dark;

  /* Raw ramps — both themes, always present, readable from JS. */
  --background-light:         oklch(0.994 0.002 264);
  --background-dark:          oklch(0.178 0.014 264);
  --foreground-light:         oklch(0.212 0.021 264);
  --foreground-dark:          oklch(0.961 0.005 264);
  --surface-light:            oklch(1     0     0);
  --surface-dark:             oklch(0.228 0.017 264);
  --muted-foreground-light:   oklch(0.512 0.019 264);
  --muted-foreground-dark:    oklch(0.708 0.017 264);
  --border-light:             oklch(0.905 0.008 264);
  --border-dark:              oklch(1     0     0 / 12%);
  --primary-light:            oklch(0.550 0.190 264);
  --primary-dark:             oklch(0.702 0.158 264);
  --primary-foreground-light: oklch(0.995 0.004 264);
  --primary-foreground-dark:  oklch(0.178 0.045 264);
  --destructive-light:        oklch(0.552 0.216  27);
  --destructive-dark:         oklch(0.712 0.176  22);
  --ring-light:               oklch(0.550 0.190 264);
  --ring-dark:                oklch(0.702 0.158 264);

  /* Semantic tokens — one declaration each, both values inline. */
  --background:         light-dark(var(--background-light),         var(--background-dark));
  --foreground:         light-dark(var(--foreground-light),         var(--foreground-dark));
  --surface:            light-dark(var(--surface-light),            var(--surface-dark));
  --muted-foreground:   light-dark(var(--muted-foreground-light),   var(--muted-foreground-dark));
  --border:             light-dark(var(--border-light),             var(--border-dark));
  --primary:            light-dark(var(--primary-light),            var(--primary-dark));
  --primary-foreground: light-dark(var(--primary-foreground-light), var(--primary-foreground-dark));
  --destructive:        light-dark(var(--destructive-light),        var(--destructive-dark));
  --ring:               light-dark(var(--ring-light),               var(--ring-dark));
}

/* The three states. These re-point the colour scheme; they define no colours. */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

Pair it with `<meta name="color-scheme" content="light dark">` in `<head>` to avoid a white
flash before the stylesheet lands (MDN, `color-scheme`).

### 4.2 Target B — Tailwind v4 `@theme` (`theme.css`)

Neutral token names (no shadcn dependency). Selector-driven so `dark:` utilities stay in sync;
`color-scheme` emitted in the same rules so native UI follows.

```css
/*  Palette: "Harbour"  ·  seed oklch(0.55 0.19 264)
 *  Generated by palette-creator — do not edit by hand.
 *  Tailwind CSS v4. Requires a `.dark` class or [data-theme="dark"] on <html>.
 */

@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));

/* `inline` is required: it makes utilities emit var(--background) rather than
   var(--color-background), so the .dark override resolves at the use site.
   A @theme block cannot be nested in a selector or media query, so the light/dark
   pair must live in :root / .dark and be mapped in here. */
@theme inline {
  --color-background:         var(--background);
  --color-foreground:         var(--foreground);
  --color-surface:            var(--surface);
  --color-muted-foreground:   var(--muted-foreground);
  --color-border:             var(--border);
  --color-primary:            var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive:        var(--destructive);
  --color-ring:               var(--ring);
}

:root {
  color-scheme: light;
  --background:         oklch(0.994 0.002 264);
  --foreground:         oklch(0.212 0.021 264);
  --surface:            oklch(1     0     0);
  --muted-foreground:   oklch(0.512 0.019 264);
  --border:             oklch(0.905 0.008 264);
  --primary:            oklch(0.550 0.190 264);
  --primary-foreground: oklch(0.995 0.004 264);
  --destructive:        oklch(0.552 0.216  27);
  --ring:               oklch(0.550 0.190 264);
}

.dark,
[data-theme="dark"] {
  color-scheme: dark;
  --background:         oklch(0.178 0.014 264);
  --foreground:         oklch(0.961 0.005 264);
  --surface:            oklch(0.228 0.017 264);
  --muted-foreground:   oklch(0.708 0.017 264);
  --border:             oklch(1     0     0 / 12%);
  --primary:            oklch(0.702 0.158 264);
  --primary-foreground: oklch(0.178 0.045 264);
  --destructive:        oklch(0.712 0.176  22);
  --ring:               oklch(0.702 0.158 264);
}
```

Now `bg-background`, `text-foreground`, `border-border`, `bg-primary text-primary-foreground`,
`ring-ring`, and `dark:bg-surface` all exist and all follow the same switch.

Ship this three-state bootstrap next to it (Tailwind's own snippet, extended to set an explicit
`light` class so `[data-theme]`-free consumers still get a real light state):

```html
<!-- in <head>, before any stylesheet, to avoid FOUC -->
<meta name="color-scheme" content="light dark" />
<script>
  (function () {
    var t = localStorage.getItem("theme"); // "light" | "dark" | null (= system)
    var dark =
      t === "dark" ||
      (t === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  })();
</script>
```

```ts
// setTheme("light") / setTheme("dark") / setTheme("system")
export function setTheme(t: "light" | "dark" | "system") {
  if (t === "system") localStorage.removeItem("theme");
  else localStorage.setItem("theme", t);
  // re-run the bootstrap
}
```

### 4.3 Target C — shadcn-compatible (`globals.css`)

Identical mechanics to Target B; only the token names change, to shadcn's exact vocabulary, so
it can be pasted straight over an existing `app/globals.css`.

```css
/*  Palette: "Harbour"  ·  seed oklch(0.55 0.19 264)
 *  Generated by palette-creator — drop-in replacement for app/globals.css.
 */

@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background:           var(--background);
  --color-foreground:           var(--foreground);
  --color-card:                 var(--card);
  --color-card-foreground:      var(--card-foreground);
  --color-popover:              var(--popover);
  --color-popover-foreground:   var(--popover-foreground);
  --color-primary:              var(--primary);
  --color-primary-foreground:   var(--primary-foreground);
  --color-secondary:            var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:                var(--muted);
  --color-muted-foreground:     var(--muted-foreground);
  --color-accent:               var(--accent);
  --color-accent-foreground:    var(--accent-foreground);
  --color-destructive:          var(--destructive);
  --color-border:               var(--border);
  --color-input:                var(--input);
  --color-ring:                 var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  color-scheme: light;
  --radius:               0.625rem;
  --background:           oklch(0.994 0.002 264);
  --foreground:           oklch(0.212 0.021 264);
  --card:                 oklch(1     0     0);
  --card-foreground:      oklch(0.212 0.021 264);
  --popover:              oklch(1     0     0);
  --popover-foreground:   oklch(0.212 0.021 264);
  --primary:              oklch(0.550 0.190 264);
  --primary-foreground:   oklch(0.995 0.004 264);
  --secondary:            oklch(0.958 0.008 264);
  --secondary-foreground: oklch(0.288 0.032 264);
  --muted:                oklch(0.958 0.008 264);
  --muted-foreground:     oklch(0.512 0.019 264);
  --accent:               oklch(0.940 0.020 264);
  --accent-foreground:    oklch(0.288 0.032 264);
  --destructive:          oklch(0.552 0.216  27);
  --border:               oklch(0.905 0.008 264);
  --input:                oklch(0.905 0.008 264);
  --ring:                 oklch(0.550 0.190 264);
}

.dark {
  color-scheme: dark;
  --background:           oklch(0.178 0.014 264);
  --foreground:           oklch(0.961 0.005 264);
  --card:                 oklch(0.228 0.017 264);
  --card-foreground:      oklch(0.961 0.005 264);
  --popover:              oklch(0.228 0.017 264);
  --popover-foreground:   oklch(0.961 0.005 264);
  --primary:              oklch(0.702 0.158 264);
  --primary-foreground:   oklch(0.178 0.045 264);
  --secondary:            oklch(0.288 0.022 264);
  --secondary-foreground: oklch(0.961 0.005 264);
  --muted:                oklch(0.288 0.022 264);
  --muted-foreground:     oklch(0.708 0.017 264);
  --accent:               oklch(0.322 0.030 264);
  --accent-foreground:    oklch(0.961 0.005 264);
  --destructive:          oklch(0.712 0.176  22);
  --border:               oklch(1     0     0 / 12%);
  --input:                oklch(1     0     0 / 15%);
  --ring:                 oklch(0.702 0.158 264);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

The `@layer base` block is shadcn's own (<https://ui.shadcn.com/r/styles/new-york-v4/index.json>,
`css` field).

---

## 5. Consequences for the token schema (feeds ticket 05)

Things the export format forces on the schema, not the other way round:

- **A token is a pair of values, not one value.** Every role resolves to `{ light, dark }`. Both
  targets require both values to exist unconditionally, so the schema can have no "derive dark
  later" escape hatch. This confirms the standing "generated together" decision.
- **The `-foreground` suffix is the contrast-pair marker.** `X` / `X-foreground` should be the
  schema's way of saying "these two carry a contrast guarantee" (ticket 02). Roles with no
  `-foreground` twin (`border`, `input`, `ring`) are non-text and take a different guarantee.
- **Names must be flat, kebab-case, and legal as the tail of `--color-*`.** No nesting, no dots.
  Every token name `t` must produce a sensible utility `bg-{t}` / `text-{t}`.
- **Values are complete `oklch()` colours**, optionally with `/ <alpha>%`. Not HSL channel
  fragments (that's the dead v3 shadcn form).
- **Alpha must be representable** — the current shadcn dark `--border` / `--input` are
  translucent whites, and matching that idiom means the engine's contrast checker must composite
  a translucent token over its declared surface before measuring.
- **Emit `color-scheme`, always.** It is a per-theme property in the schema's output, not an
  afterthought.
- **A `--radius` slot should be reserved** even though radius is out of scope for colour, because
  the shadcn target's file will otherwise clobber the consumer's radius scale on paste. Emit the
  consumer's existing value or shadcn's default `0.625rem`; do not omit the key.

---

## 6. RECOMMENDATION

**Ship three export formats. Default to the shadcn-compatible one.**

**1. `globals.css` — shadcn-compatible (DEFAULT).**
Exact shadcn v4 token names, `@import "tailwindcss"` + `@custom-variant dark` + `@theme inline`
+ `:root` / `.dark`, `oklch()` values, `color-scheme` in both blocks. Default because it is the
widest-installed convention in exactly the React/Vite/TS projects this is for, because matching
it costs nothing, and because it is a genuine drop-in: pasting it over `app/globals.css`
re-themes a whole shadcn app with no other edit.

**2. `theme.css` — Tailwind v4, neutral names.**
Identical machinery, our own role vocabulary instead of shadcn's. For Tailwind projects that
aren't shadcn projects.

> **Key finding for the build spec: (1) and (2) are one emitter, not two.** The idiomatic v4
> expression of a light/dark pair *is* `:root`/`.dark` custom properties bridged by
> `@theme inline` — a bare `@theme` block cannot express a pair, because Tailwind requires theme
> variables to be "defined top-level and not nested under other selectors or media queries"
> (<https://tailwindcss.com/docs/theme>). So the only difference between the two files is a
> token-**name** map. Build one Tailwind emitter plus a name-mapping table; expose the choice in
> the UI as a *naming* toggle ("shadcn names / our names"), not as two independent formats.

**3. `palette.css` — plain CSS custom properties.**
`light-dark()` + `color-scheme` + `[data-theme]`, no framework, no build step, **no JavaScript
required for the system default**. For the static sites. Also emits the raw `--<role>-light` /
`--<role>-dark` variables above the semantic layer, so the palette stays machine-readable and so
a consumer can opt out of `light-dark()` without regenerating.

**Cross-cutting rules for every export:**

- Never define a colour literal inside `@media (prefers-color-scheme: …)`. Targets 1–2 contain
  no media query at all (system resolved in JS before paint); target 3 contains none either
  (both values live in one `light-dark()` declaration). If a media query is ever added, it may
  only re-point an already-declared variable.
- Always emit `color-scheme` for each state. Without it, native form controls, date pickers and
  scrollbars ignore the palette, and `light-dark()` silently pins to light
  (<https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme>,
  <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark>).
- Use `:where(…)` in the `dark` custom variant, and match both the themed element and its
  descendants: `&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *)`. Zero
  specificity, and unlike shadcn's `&:is(.dark *)` it also styles the `.dark` element itself.
- Never emit `--color-*: initial` or `--*: initial` — that would delete the consumer's default
  Tailwind palette (<https://tailwindcss.com/docs/theme#overriding-the-default-theme>).
- Ship the three-state bootstrap snippet (§4.2) with targets 1 and 2, and the
  `<meta name="color-scheme">` line with all three.
- Do **not** use `light-dark()` in the Tailwind targets. Tailwind's `dark:` variant is
  selector/media-driven and has no way to observe `color-scheme`, so `light-dark()` tokens and
  `dark:` utilities would drift apart with no way to reconcile them.
- Do **not** use `contrast-color()` anywhere. Its algorithm is explicitly UA-defined
  (<https://drafts.csswg.org/css-color-5/#contrast-color>), which is precisely the
  non-determinism this tool exists to eliminate.

**Also ship a fourth, non-CSS export: `palette.json`** — the full `{ role: { light, dark } }`
object plus the seed and generation parameters. It is what makes the palette round-trippable
(alongside the URL hash), what feeds a consumer's chart library or React Native / Figma
pipeline, and it is the format nothing else can be recovered from. It should be a first-class
tab, not an afterthought.

---

## Sources

- Tailwind CSS v4 — Theme variables: <https://tailwindcss.com/docs/theme>
- Tailwind CSS v4 — Dark mode: <https://tailwindcss.com/docs/dark-mode>
- Tailwind CSS v4 — Functions and directives: <https://tailwindcss.com/docs/functions-and-directives>
- Tailwind CSS v4 — Adding custom styles (`@custom-variant`, `@slot`): <https://tailwindcss.com/docs/adding-custom-styles>
- Tailwind CSS v4 — `color-scheme` utilities: <https://tailwindcss.com/docs/color-scheme>
- shadcn/ui — Theming: <https://ui.shadcn.com/docs/theming>
- shadcn/ui — Dark mode (Vite): <https://ui.shadcn.com/docs/dark-mode/vite>
- shadcn/ui registry — neutral base colour, v3 and v4 token sets: <https://ui.shadcn.com/r/colors/neutral.json>
- shadcn/ui registry — style scaffold `@layer base` block: <https://ui.shadcn.com/r/styles/new-york-v4/index.json>
- MDN — `light-dark()`: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark>
- MDN — `color-scheme`: <https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme>
- MDN — `prefers-color-scheme`: <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme>
- CSS Color Module Level 5, §7 `light-dark()`: <https://drafts.csswg.org/css-color-5/#light-dark>
- CSS Color Module Level 5, §8 `contrast-color()`: <https://drafts.csswg.org/css-color-5/#contrast-color>
- Browser support figures: `@mdn/browser-compat-data` (`css.types.color.light-dark`, `css.properties.color-scheme`, `css.at-rules.media.prefers-color-scheme`, `css.types.color.contrast-color`)
