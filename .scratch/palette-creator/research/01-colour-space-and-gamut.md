# 01 — Colour space and gamut mapping

Research for ticket `01-colour-space-and-gamut`. Date of research: **2026-09-07**.
Primary sources: CSS Color Module Level 4 (W3C Candidate Recommendation Draft, **1 September 2026**), Björn Ottosson's own posts, MDN/caniuse/WPT compatibility data, library source and npm/GitHub metadata.

All numeric claims below marked **[measured]** were produced by running code during this research (Node 26, `culori@4.0.2`, `colorjs.io@0.7.1`, `chroma-js@3.2.0`, plus a hand-written reference implementation). The method is described in [Appendix A](#appendix-a--how-the-measurements-were-made) so it can be re-run.

---

## 1. Which space: OKLCH vs CIE LCH vs HSL

### The spec's own position

CSS Color 4 is unusually direct about this. It says HSL "was developed in an attempt to give similar usability benefits for RGB that LCH gave to Lab, but [is] significantly less accurate", and gives the failing example itself:

> "because the lightness is simply the mean of the gamma-corrected red, green and blue components it does not correspond to the visual perception of lightness across hues. For example, blue is represented in HSL as `hsl(240deg 100% 50%)` while yellow is `hsl(60deg 100% 50%)`. Both have an HSL Lightness of 50%, but clearly the yellow looks much lighter than the blue."
> — [CSS Color 4 §9.1](https://www.w3.org/TR/css-color-4/#lab-colors)

and on hue:

> "The hue angle in HSL is not perceptually uniform; colors appear bunched up in some areas and widely spaced in others. For example, the pair of hues `hsl(220deg 100% 50%)` and `hsl(250deg 100% 50%)` have an HSL hue difference of 30 deg and look fairly similar, while another pair of colors `hsl(50deg 100% 50%)` and `hsl(80deg 100% 50%)`, which also have a hue difference of 30 deg, look very different."
> — [CSS Color 4 §7](https://www.w3.org/TR/css-color-4/#the-hsl-notation)

For CIE LCh it names two specific defects:

> "**Hue linearity** — In the blue region (LCH Hue between 270° and 330°), visual hue departs from what LCH predicts. […] as a saturated blue has its Chroma progressively reduced, it becomes noticeably purple.
> **Hue uniformity** — While hues in LCH are in general evenly spaced, (and far better than HSL or HWB), uniformity is not perfect.
> **Over-prediction of high Chroma differences** […] These deficiencies affect, for example, **creation of evenly spaced gradients**, gamut mapping from one color space to a smaller one, and computation of the visual difference between two colors."
> — [CSS Color 4 §9.1](https://www.w3.org/TR/css-color-4/#lab-colors)

And on Oklab:

> "It was produced by numerical optimization of a large dataset of visually similar colors, and has improved hue linearity, hue uniformity, and chroma uniformity compared to CIE LCH."
> — [CSS Color 4 §9.2](https://www.w3.org/TR/css-color-4/#ok-lab)

Ottosson's original announcement makes the same argument from the other end: CIELAB's "largest issue is their inability to predict hue. In particular blue hues are predicted badly", and HSV gradients "show clear differences in lightness for different hues. Yellow, magenta and cyan appear much lighter than red and blue." — [bottosson.github.io/posts/oklab](https://bottosson.github.io/posts/oklab/)

### The failure modes, quantified

**HSL failure 1 — lightness is not lightness. [measured]**
Holding HSL lightness at exactly 50% and sweeping hue in 30° steps, Oklab L ranges from **0.452** (blue) to **0.968** (yellow) — a spread of **0.516**, i.e. more than half the entire perceptual lightness axis, across colours HSL claims are all the same lightness:

| HSL | hex | Oklab L |
|---|---|---|
| `hsl(0 100% 50%)` | `#ff0000` | 0.628 |
| `hsl(60 100% 50%)` | `#ffff00` | **0.968** |
| `hsl(120 100% 50%)` | `#00ff00` | 0.866 |
| `hsl(180 100% 50%)` | `#00ffff` | 0.905 |
| `hsl(240 100% 50%)` | `#0000ff` | **0.452** |
| `hsl(300 100% 50%)` | `#ff00ff` | 0.702 |

This is the concrete reason a hand-built HSL ramp looks amateur: "primary-500" and "accent-500" are the same number and nowhere near the same brightness, and every contrast ratio derived from the ramp position is a lie. For a tool whose entire promise is *guaranteed contrast*, this alone disqualifies HSL as the computation space.

**HSL failure 2 — muddy mid-tones on interpolation.** Worth being precise, because the folk wisdom conflates two different faults:

| interpolation space | midpoint of `#e11d48` → `#16a34a` | resulting OkLCh |
|---|---|---|
| sRGB (naive hex lerp) | `#7c6049` | L=0.511 **C=0.050** h=61.3 |
| linear sRGB | `#a67849` | L=0.609 C=0.085 h=66.2 |
| Oklab | `#a47849` | L=0.606 C=0.084 h=66.9 |
| HSL | `#b5c21a` | **L=0.778** C=0.170 h=114.4 |
| CIE LCh | `#a07c00` | L=0.603 C=0.135 h=90.1 |
| OkLCh | `#b97100` | L=0.606 **C=0.196** h=83.4 |

**[measured]**. And the canonical case: the sRGB midpoint of blue→yellow is **`#808080`**, dead neutral grey; in Oklab it is `#6cabc7`, in OkLCh `#00cfbd`. **[measured]**

So "muddy mid-tones" is really a *rectangular-space* fault, not an HSL fault: lerping in sRGB or Oklab crosses the neutral axis and drops chroma ~4× at the midpoint. HSL does not go muddy — it goes *bright*, sliding lightness to 0.778 where the perceptual spaces hold ~0.605. **Polar** interpolation (LCh, OkLCh) is what keeps chroma up, and OkLCh keeps the most (0.196 vs CIE LCh's 0.135) while holding lightness where it belongs. A ramp generator wants polar-OkLCh reasoning, not Oklab-rectangular.

**CIE LCh failure — the blue purpling, quantified. [measured]**
Holding CIE LCh hue constant at **301.37°** (the hue of sRGB blue) at L=32 and sweeping chroma from 10 to 131, the *perceived* hue — read as OkLCh hue — drifts by **34.9°**:

| CIE LCh | resulting OkLCh hue | hex |
|---|---|---|
| `lch(32 10 301.37)` | 302.0 | `#4f4959` |
| `lch(32 50 301.37)` | 293.5 | `#553d90` |
| `lch(32 100 301.37)` | 279.0 | `#4828d7` |
| `lch(32 131 301.37)` | **267.1** | `#220dff` |

A "same hue, less saturated" step in CIE LCh visibly turns violet. The inverse check confirms it is CIE LCh that is wrong, not a definitional artefact: holding *OkLCh* hue at 264° and sweeping chroma, CIE LCh hue drifts 270.5° → 301.2°, and the swatches look like one hue throughout. This is exactly the ramp operation a palette generator performs constantly — "same hue, tint/shade it" — so CIE LCh's specific defect sits directly on the hot path.

### Where OKLCH itself fails

Honest limitations, so the choice is not made on hype:

- **Oklab is a mediocre colour-*difference* metric.** ΔEOK is plain Euclidean distance in Oklab ([CSS Color 4 §20.3](https://www.w3.org/TR/css-color-4/#color-difference-OK)); the spec itself adds a **ΔEOK2** variant because "ΔEOK under-estimates differences in colorfulness, compared to differences in lightness. Experimentation revealed that scaling a and b by a factor of 2 greatly increased the predictive accuracy." A June 2026 preprint ([Uchida, *Oklch+*, arXiv:2606.05255](https://arxiv.org/abs/2606.05255) — **not peer-reviewed**, submitted to *Color Research & Application*) measures Oklab at STRESS 51.45 against CIEDE2000's 29.13 on colour-difference discrimination. This is a real weakness but it is *not* the property the engine needs: the engine needs correct **ordering and spacing of lightness** and **hue constancy under chroma change**, which is appearance uniformity, not discrimination uniformity. Where the engine does need a difference metric (gamut mapping's JND test) the spec mandates ΔEOK at JND=0.02 anyway, so we match browser behaviour by using it.
- **The sRGB gamut is a badly-shaped blob in OkLCh.** This is the practical pain. Ottosson wrote Okhsv/Okhsl precisely because "the sRGB gamut has a quite irregular shape in these color spaces. As a result, changing one parameter … can easily create a color outside the target gamut" ([bottosson.github.io/posts/colorpicker](https://bottosson.github.io/posts/colorpicker/)). Measured, the **maximum in-gamut chroma at L=0.55 varies 3.1×** by hue: **[measured]**

  | hue | 0 | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 | 300 | 330 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | max C | .223 | .221 | .129 | .112 | .131 | .151 | .100 | **.095** | .126 | .248 | **.294** | .251 |

  Consequence for the engine: **a ramp specified by absolute chroma cannot be hue-rotated.** `oklch(0.55 0.20 300)` is comfortably inside sRGB; `oklch(0.55 0.20 210)` is not, and will be silently rewritten by the gamut mapper. This is design constraint #1 falling out of the research — see §2.
- Interpolating *lightness* linearly in Oklab is slightly biased dark relative to CIELAB (raised repeatedly in [coloraide#102](https://github.com/facelessuser/coloraide/issues/102)); it affects the aesthetic placement of mid-steps, not their ordering.
- Oklab is a **static** model — no surround, no adaptation for the viewer's actual display or ambient light. Nothing in this tool's scope needs that.

**Verdict for §1: OKLCH.** It is the only one of the three that gets lightness ordering *and* hue constancy right, it is the space the CSS spec itself uses for gamut mapping and (via Oklab) for default interpolation, and the properties it fails at are not the ones a ramp generator depends on.

---

## 2. sRGB gamut mapping

### The standard, as of the 1 Sept 2026 CRD

CSS Color 4 §14.2 now specifies **three** interchangeable algorithms — a change from the single binary-search algorithm the spec carried previously:

> "Implementations may choose any of the three algorithms based on their quality and runtime efficiency tradeoffs […] **All three CSS gamut mapping algorithms aim at constant-lightness, constant-hue chroma reduction in the OkLCh color space.**"
> — [CSS Color 4 §14.2](https://www.w3.org/TR/css-color-4/#css-gamut-mapping)

1. **Binary Search Gamut Mapping with Local MINDE** ([§14.2.1](https://www.w3.org/TR/css-color-4/#binsearch)) — the reference. Binary-search chroma down in OkLCh at fixed L and h; at each step compare the candidate to its channel-clipped version with ΔEOK; if that difference is below one JND, accept the clipped version. `JND = 0.02`, `epsilon = 0.0001`. The spec explains the JND scale: "In CIE Lab […] using deltaE2000, one JND is 2. Because the range of Lightness in Oklab and OkLCh is 0 to 1, using deltaEOK, one JND is 100 times smaller."
2. **EdgeSeeker** ([§14.2.3](https://www.w3.org/TR/css-color-4/#edge-seeker)) — LUT of the maximum-chroma OkLCh colour per hue slice, then a geometric intersection. "Good results, at the expense of memory for the LUT." Originated by Alexey Ardov for color.js.
3. **Ray Trace** ([§14.2.5](https://www.w3.org/TR/css-color-4/#ray-trace)) — cast a ray in linear-light RGB from the achromatic anchor to the colour, intersect the RGB cube, correct back onto the constant-L/h path in OkLCh, repeat at most four times. "Results are comparable to binary search with local MINDE using a low JND, but resolves much faster and within more predictable, consistent time." Originated by Isaac Muse for Coloraide.

The spec's rationale for both the *space* and the *local clip* refinement is worth quoting, because it is the argument against plain chroma reduction and against doing this in CIE LCh:

> "this simple MINDE approach will give sub-optimal results for certain colors, principally very light colors like yellow and cyan, if the upper edge of the gamut boundary is shallow, or even slightly concave. The line of constant lightness can skim just above the gamut boundary, resulting in an excessively low chroma."
> "Simple gamut mapping in CIE LCH would give unsatisfactory results. […] reduction in OkLCh chroma is better behaved."
> — [CSS Color 4 §14.1.4](https://www.w3.org/TR/css-color-4/#GM-chroma-reduce)

Also settled by the spec, and directly relevant: **out-of-range lightness short-circuits.** "if the Lightness of `origin_OkLCh` is greater than or equal to 100%, convert `oklab(1 0 0 / alpha)` […] if less than or equal to 0%, convert `oklab(0 0 0 / alpha)`". Naive channel clipping is *worse than nothing*, as the spec demonstrates: clipping `color(srgb-linear 0.5 1 3)` shifts its OkLCh hue by **69°** ([§14.1.1](https://www.w3.org/TR/css-color-4/#gamut-mapping-clip)).

Ottosson reached a compatible conclusion independently: naive per-channel clipping "heavily distorts" hue; he recommends projecting toward an adaptive L₀ (α≈0.05) rather than either pure chroma reduction or projection to a fixed point ([bottosson.github.io/posts/gamutclipping](https://bottosson.github.io/posts/gamutclipping/)). His scheme trades a little lightness for chroma, much as local-MINDE does.

### What gamut mapping does to a ramp's evenness — the answer that shapes the engine

Take a naive ramp: fix hue and chroma, sweep L. Measured, mapping each step to sRGB with the spec algorithm: **[measured]**

Blue, `h=264`, `C=0.20`:

| requested L | in gamut? | mapped hex | **actual L** | **actual C** |
|---|---|---|---|---|
| 0.15 | no | `#01003e` | 0.1663 | **0.114** |
| 0.25 | no | `#02007c` | 0.2663 | 0.183 |
| 0.35 | yes | `#0022a0` | 0.3500 | 0.200 |
| 0.55 | yes | `#3266e4` | 0.5500 | 0.200 |
| 0.75 | no | `#7dabff` | 0.7430 | 0.132 |
| 0.95 | no | `#e0efff` | 0.9454 | **0.027** |

Yellow, `h=110`, `C=0.20` — almost the whole ramp is out of gamut:

| requested L | in gamut? | mapped hex | actual L | actual C |
|---|---|---|---|---|
| 0.15 | no | `#0d0c00` | 0.1516 | **0.033** |
| 0.55 | no | `#787700` | 0.5519 | 0.120 |
| 0.95 | yes | `#f8f929` | 0.9500 | 0.200 |

Two conclusions, and they are the operative findings of this document:

1. **Gamut mapping preserves the lightness ramp.** Worst observed lightness drift is **+0.016** (blue at L=0.15), inside the one-JND budget the local-MINDE step is allowed to spend. Every step lands within ~1.6% of its requested L. **A contrast guarantee computed on requested lightness survives gamut mapping.** That is the single most important fact here for this tool.
2. **Gamut mapping destroys constant chroma, silently and unevenly.** The requested C=0.20 becomes anywhere from 0.027 to 0.200 depending on L and hue — up to a **6× collapse**. So the *saturation* profile of a ramp is not something the engine can specify absolutely and expect to get.

**Design constraint falling out of this:** the engine must not parameterise ramps by absolute OkLCh chroma. It should parameterise by **chroma as a fraction of the maximum in-gamut chroma at that (L, h)** — gamut-relative chroma — so a ramp is even *by construction* and gamut mapping becomes a no-op safety net rather than an invisible editor of the designer's intent. This is not an invention: it is exactly Ottosson's Okhsl ([colorpicker post](https://bottosson.github.io/posts/colorpicker/)), and colorjs.io v0.7.0 shipped the same idea as first-class spaces — `oklch-srgb`, `oklch-p3`, `oklch-rec2020`, "where `c = 1` is the most colorful in-gamut color at a given lightness and hue so you never have to worry about getting out of gamut", with the stated caveat that "this loses you some of the perceptual uniformity of the original spaces […] After all, perceptual uniformity only applies in-gamut anyway" ([color.js v0.7.0 release notes](https://github.com/color-js/color.js/releases/tag/v0.7.0)).

The engine therefore needs a **max-in-gamut-chroma solver** — a binary search on C at fixed (L, h), ~10 lines, the same primitive the gamut mapper already uses.

---

## 3. `oklch()` browser support, and whether to export it raw

### Syntax support: yes, comfortably

- **MDN Baseline: "Widely available"**, since **May 2023** — [MDN `oklch()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch).
- First supporting versions ([caniuse `mdn-css_types_color_oklch`](https://caniuse.com/mdn-css_types_color_oklch)): **Chrome 111, Edge 111, Firefox 113, Safari 15.4, Safari iOS 15.4**. Global support **94.25%**. Non-supporting: IE, Opera Mini, KaiOS, older UC/QQ Android browsers.
- The stack already forces a higher floor than this: **Tailwind v4 requires Chrome 111 / Safari 16.4 / Firefox 128** ([Tailwind compatibility docs](https://tailwindcss.com/docs/compatibility)) and ships its *own default palette* in `oklch()` with no fallbacks at all — e.g. `--color-red-500: oklch(63.7% 0.237 25.331)` ([Tailwind colors docs](https://tailwindcss.com/docs/colors)). A tool that emits a Tailwind v4 `@theme` block has already inherited a browser floor above `oklch()` support.

### Rendering behaviour: *not* safe for out-of-gamut values

This is the real risk and it is not visible in a support table. **No shipping browser implements the CSS gamut mapping algorithm; they channel-clip instead.**

- Hard evidence, current: on [wpt.fyi](https://wpt.fyi/results/css/css-color), the two WPT reftests the spec names for its gamut-mapping section — `oklch-009.html` and `oklch-010.html` — **fail** on the Chromium run reporting results (Edge 152, 6 Sept 2026), while `oklch-001` … `008` and `011` all pass. The identical pair `lch-009` / `lch-010` also fail. **[measured — wpt.fyi API]** Those tests are minimal: `oklch(100% 110 60)` must render **white** and `oklch(0% 1.1 60)` must render **black** per §14.2's lightness short-circuit. Clipping renders neither.
- [WebKit bug 255939, "(OK)LCH implementation is not according to spec"](https://bugs.webkit.org/show_bug.cgi?id=255939) — filed 2023-04-25, status **NEW**, last touched **2026-04-21**. Still open.
- [mdn/browser-compat-data#26838](https://github.com/mdn/browser-compat-data/issues/26838), "Browsers are not spec compliant, support is only partial" — still open; the complaint is precisely that clipping "destroys the perceptual uniformity that makes these spaces valuable for accessibility", so authors "cannot reliably ensure text remains readable".
- [web-platform-tests/interop#443](https://github.com/web-platform-tests/interop/issues/443) proposed gamut mapping as an Interop focus area; the underlying browser bugs remain.

The consequence for *this* tool is sharp. If the engine emitted an out-of-gamut `oklch()` value, the browser would clip it — and a clip can move lightness far enough to break the contrast guarantee the tool exists to provide, differently in different browsers and differently on P3 vs sRGB displays. Note also that `@supports (color: oklch(...))` cannot rescue this: it tests *syntax parsing*, not whether the value is rendered correctly.

**Therefore: the engine must gamut-map to sRGB itself, and only ever emit in-gamut `oklch()`.** Once every emitted value is in gamut, browser clipping is a no-op and `oklch()` output is exactly as safe as the equivalent hex — with the advantage that the numbers stay legible and editable by a human.

### The fallback trap: custom properties do not cascade-fallback

The usual progressive-enhancement pattern — declare the old syntax, then the new one, and let the parser drop what it can't read — **does not work for CSS custom properties**, and this tool's entire output is custom properties (including inside Tailwind's `@theme`).

Custom property values are parsed as `<declaration-value>`, which "matches *any* sequence of one or more tokens", so `--brand: oklch(0.62 0.21 260)` parses fine in a browser that cannot render `oklch()` and *wins the cascade over the hex declaration above it*. The failure then happens at substitution: "the property containing the `var()` function is **invalid at computed-value time**", which makes the consuming property inherit or unset rather than fall back — [CSS Custom Properties Level 1](https://www.w3.org/TR/css-variables-1/).

So the export must use `@supports`, not declaration order:

```css
:root {
  --brand-500: #3b6fe0;              /* sRGB fallback, always present */
}
@supports (color: oklch(0% 0 0)) {
  :root {
    --brand-500: oklch(0.552 0.163 262.4);
  }
}
```

Whether to ship that block at all is ticket 03's call. The finding here is narrower and firm: **because every emitted value is already gamut-mapped, the hex and the `oklch()` are the same colour** — the fallback is cosmetic, never corrective, and dropping it costs correctness in exactly zero supported browsers. Emitting hex-only, `oklch()`-only, or both are all defensible; emitting an un-gamut-mapped `oklch()` is not.

---

## 4. Libraries, or vendor the maths

### The three candidates, measured

Bundle sizes are **real esbuild output** for a minimal entry point doing sRGB↔OkLCh conversion, CSS-algorithm gamut mapping to sRGB, and hex serialisation — bundled, minified, ESM. **[measured]**

| | culori `4.0.2` | colorjs.io `0.7.1` | chroma-js `3.2.0` | vendored |
|---|---|---|---|---|
| min / gzip (tree-shaken entry) | **16.9 KB / 6.9 KB** (`culori/fn`) | 44.9 KB / 19.0 KB (`colorjs.io/fn`) | 42.5 KB / 17.2 KB | **1.6 KB / 0.9 KB** |
| min / gzip (default entry) | 45.1 KB / 15.8 KB | 83.6 KB / 33.7 KB | 42.5 KB / 17.2 KB | — |
| installed size | 1.6 MB | **17 MB** | 756 KB | 0 |
| runtime deps | none | none | none | none |
| tree-shakeable | yes, via `culori/fn` + `useMode()` | yes, via `colorjs.io/fn` | partial, via `chroma-js/src/*` | n/a |
| **CSS Color 4 gamut mapping** | **yes** — `toGamut()` | **yes** — `toGamut({method:'css'})`, plus `raytrace` | **no — clips only** | yes (60 lines) |
| gamut-relative OkLCh spaces | no | **yes** (`oklch-srgb` etc., v0.7.0) | no | trivial to add |
| TypeScript types | DefinitelyTyped `@types/culori@4.0.1` | **first-party**, `./types` | DefinitelyTyped `@types/chroma-js@3.1.2` | yours |
| latest release | 2025-06-27 | **2026-07-24** | 2025-11-28 |  |
| last commit / stars | 2026-07-02 / 1.2k | **2026-09-07** / 2.3k | 2026-03-02 / 10.6k |  |
| licence | MIT | MIT | BSD-3 AND Apache-2.0 |  |

Sources: [npm registry](https://registry.npmjs.org/culori), [jsDelivr](https://data.jsdelivr.com/v1/packages/npm/colorjs.io@0.7.1), GitHub API, and local builds.

**Conversion accuracy.** All three agree with each other and with the reference implementation. Over a 16³ grid of the sRGB cube, maximum deviation in OkLCh L and C between the vendored code and culori, and between the vendored code and colorjs.io, is **3.7 × 10⁻⁸** — i.e. all implementations use the same Ottosson matrices and differ only in how many digits they keep. **[measured]** There is no accuracy argument for any of them.

**Gamut-mapping agreement.** On five hard out-of-gamut cases, vendored / culori `toGamut()` / colorjs `method:'css'` agree exactly or within 1/255; colorjs `raytrace` differs slightly (a different, faster algorithm); chroma-js — which only clips — visibly over-saturates: **[measured]**

| input | vendored | culori | colorjs `css` | colorjs `raytrace` | chroma-js (clip) |
|---|---|---|---|---|---|
| `oklch(0.55 0.30 29)` | `#dd0000` | `#dd0000` | `#dd0000` | `#d60003` | **`#f00000`** |
| `oklch(0.45 0.31 264)` | `#0005fc` | `#0005fc` | `#0005fd` | `#000cfb` | `#0005fd` |
| `oklch(0.6 0.40 330)` | `#d600d0` | `#d600d0` | `#d600d0` | `#d100cb` | **`#ef00eb`** |

Per-library notes:

- **chroma-js** is out on capability, not size. Its docs are explicit that "when converting colors from CIELab color spaces to RGB the color channels get **clipped**" ([chroma.js docs](https://gka.github.io/chroma.js/)). Clipping is the failure mode §2 exists to avoid; no amount of `oklch()` support compensates. It is also the least actively maintained of the three.
- **colorjs.io** is the most capable and the most current (its editors are CSS Color 4's editors; the spec cites its implementations as reference for two of the three algorithms). Its `oklch-srgb` gamut-relative space is genuinely the right primitive for §2's design constraint, and it ships first-party types. Costs: ~19 KB gzip tree-shaken, 17 MB installed, a **global mutable `ColorSpace` registry** you must populate at import time — and v0.7.0's own release notes record fixing "a dual-instance bug where importing from `src/` vs. the package root could yield different `Color` registries". A global registry with load-order-sensitive behaviour is a poor fit for a module whose defining property is "same inputs, same palette, testable in a `for` loop".
- **culori** is the best-behaved dependency of the three: 6.9 KB gzip for what we need, zero runtime deps, and a `toGamut()` whose docstring says outright that "the default arguments for this function correspond to the gamut mapping algorithm defined in CSS Color Level 4", with `jnd = 0.02` matching the spec ([culori `src/clamp.js`](https://github.com/Evercoder/culori/blob/main/src/clamp.js)). Two traps worth writing down if it is chosen: its **`clampChroma()` defaults to `mode = 'lch'`, not `oklch`** — the CIE space with the blue purpling from §1 — so `toGamut('rgb','oklch')` is the function you want, not the more obviously-named one; and `culori/fn` requires `useMode()` registration, the same global-registry pattern as colorjs.

### Vendoring: yes, and it is smaller than expected

The maths the engine needs is **sRGB transfer function ↔ linear sRGB ↔ Oklab ↔ OkLCh, plus the CSS gamut mapping algorithm, plus hex I/O**. Nothing else — crucially **no XYZ, no D50/D65 chromatic adaptation, no Bradford matrix**, because Ottosson's matrices go straight from *linear sRGB* to LMS. Everything heavy in a general colour library exists to serve the other twenty colour spaces.

A complete implementation was written and tested during this research: **61 lines total, 50 non-blank non-comment**, TypeScript-ready, no dependencies, no globals, no allocation beyond arrays. Breakdown:

| piece | lines |
|---|---|
| sRGB transfer function both ways | 2 |
| linear sRGB → Oklab (Ottosson matrices) | 10 |
| Oklab → linear sRGB | 10 |
| Oklab ↔ OkLCh polar | 2 |
| sRGB entry points + `inGamut` + clip + ΔEOK | 6 |
| CSS Color 4 binary search + local MINDE | 18 |
| hex parse / format | 3 |

Verification against the spec's *own* worked examples: **[measured]**

| check | vendored result | spec value |
|---|---|---|
| sRGB blue → OkLCh | `0.452 0.3132 264.05` | "oklch(0.452 0.313 264.1)" (§9.1) |
| sRGB yellow → OkLCh | `0.968 0.2110 109.77` | "oklch(0.968 0.211 109.8)" (§9.1) |
| P3 yellow as sRGB → OkLCh | `0.96476 0.24504 110.2299` | "color(oklch 0.96476 0.24503 110.23)" (§14.1.3) |
| max sRGB round-trip error over 53³ cube | **1.69 × 10⁻⁶** | — |
| deviation from culori / colorjs.io | **3.7 × 10⁻⁸** | — |

The gamut mapper reproduces culori's and colorjs's CSS-method output exactly on the cases in the table above. On the spec's own §14.1.3 yellow example it returns a slightly *higher*-chroma yellow than pure chroma reduction — which is the local-MINDE refinement doing its job, avoiding the "excessive chroma reduction near concave gamut surfaces" §14.1.4 warns about.

The genuine costs of vendoring: you own the correctness, and you cannot reach for a fourth colour space later without writing it. The mitigation is cheap and belongs in the spec — **keep culori as a devDependency and assert the vendored module against it in Vitest** over a grid of the sRGB cube. That converts "we hand-rolled colour maths" from a risk into a test, at zero shipped bytes. It also directly serves the standing decision that `src/palette` be a pure, `for`-loop-testable module.

---

## RECOMMENDATION

**Colour space: OKLCH (OkLab in polar form), computing internally in `number` triples, gamut-mapped to sRGB before anything leaves the engine.**

Rejected: HSL, because at constant L=50% its colours span 0.452–0.968 in real perceptual lightness — half the lightness axis — which makes a contrast guarantee derived from ramp position meaningless. Rejected: CIE LCh, because a constant-hue chroma reduction, the engine's single most common operation, drifts 34.9° of perceived hue through the blues; the CSS spec names this defect and OkLCh was designed to fix it.

**Library: vendor the maths into `src/palette/oklch.ts` (≈60 lines, zero runtime dependencies), and keep `culori` as a devDependency used only by Vitest to assert the vendored module against an independent implementation.**

Rejected: chroma-js, which clips instead of gamut-mapping and so cannot honour a contrast guarantee. Rejected as a runtime dependency: colorjs.io — the most capable and most current library, and the one to reach for if this were a general colour tool, but 19 KB gzip and a global mutable colour-space registry for maths that fits in 60 verified lines.

**The single trade-off that decides it:** the engine's contract is *determinism and a contrast guarantee in a module with no ambient state*. Everything a general colour library gives you — twenty colour spaces, CAM16, chromatic adaptation, CSS parsing — is paid for in a global registry and 6–19 KB, and none of it is on this engine's path; the 60 lines it actually needs reproduce the spec's own published values to five significant figures and agree with both maintained libraries to 3.7 × 10⁻⁸. **We trade "someone else maintains the colour maths" for "the engine has no dependencies, no globals, and no bytes it does not use" — and we buy the maintenance back as a Vitest assertion against culori, which costs nothing at runtime.**

### Consequential findings the build spec must carry

1. **Parameterise ramps by gamut-relative chroma** (fraction of maximum in-gamut C at that L and h), never by absolute chroma. Absolute chroma is not hue-portable: maximum in-gamut C at L=0.55 varies 3.1× across hue (0.095 at h=210, 0.294 at h=300), so a fixed-chroma ramp is silently rewritten by the gamut mapper — up to a 6× chroma collapse. Requires a max-chroma solver: a binary search on C at fixed (L, h), ~10 lines, reusing the gamut mapper's `inGamut` primitive.
2. **Compute contrast from requested lightness; it survives gamut mapping.** Worst measured lightness drift through the CSS algorithm is +0.016, within the one-JND budget local MINDE is permitted. (The actual metric and thresholds are ticket 02's; this only establishes that the space does not undermine them.)
3. **Never emit an out-of-gamut `oklch()`.** No shipping browser implements CSS gamut mapping — they channel-clip, which moves lightness and can break the guarantee. Current evidence: WPT `oklch-009`/`oklch-010` fail on Chromium 152; [WebKit 255939](https://bugs.webkit.org/show_bug.cgi?id=255939) open since 2023, last touched April 2026. `@supports (color: oklch(...))` tests syntax only and cannot detect this.
4. **If both hex and `oklch()` are exported, gate the `oklch()` block on `@supports` — never on declaration order.** Custom properties accept any token sequence, so an `oklch()` declaration wins the cascade even where it cannot render, and the failure lands as *invalid at computed-value time* on the consuming property. Because every emitted value is already gamut-mapped, hex and `oklch()` are the same colour and the fallback is cosmetic. (Final export shape: ticket 03.)
5. **Interpolate in polar OkLCh, not rectangular Oklab**, wherever the engine blends two colours: measured midpoint chroma 0.196 (OkLCh) vs 0.084 (Oklab) vs 0.050 (naive sRGB) on a red→green blend.

---

## Appendix A — how the measurements were made

Node 26, in a scratch directory, against `culori@4.0.2`, `colorjs.io@0.7.1`, `chroma-js@3.2.0`:

- **Reference implementation** — 61 lines implementing the sRGB transfer function, Ottosson's linear-sRGB↔Oklab matrices ([bottosson.github.io/posts/oklab](https://bottosson.github.io/posts/oklab/)), Oklab↔OkLCh, ΔEOK ([CSS Color 4 §20.3](https://www.w3.org/TR/css-color-4/#color-difference-OK)), and the §14.2.2 binary-search-with-local-MINDE pseudocode transcribed directly (JND 0.02, epsilon 0.0001).
- **Accuracy** — 16³ grid over the sRGB cube, comparing OkLCh L and C against `culori.converter('oklch')` and `new Color('srgb',…).to('oklch')`; 53³ grid for sRGB round-trip error.
- **Gamut mapping** — five saturated OkLCh inputs through the vendored mapper, `culori.toGamut('rgb','oklch')`, `colorjs .toGamut({method:'css'})` and `{method:'raytrace'}`, and `chroma.oklch().hex()`.
- **Ramp evenness** — fixed (h, C), L swept 0.15→0.95 in 0.1 steps, recording in-gamut status and the actual OkLCh of the mapped result.
- **HSL spread** — `hsl(h 100% 50%)` for h in 0…330 step 30, converted to Oklab L.
- **Interpolation** — `culori.interpolate([a,b], space)(0.5)` for `rgb`, `lrgb`, `oklab`, `hsl`, `lch`, `oklch`.
- **Hue curvature** — CIE LCh at L=32, h=301.37, C ∈ {10,25,50,75,100,131}, read back as OkLCh hue; and the inverse, OkLCh L=0.45, h=264, read back as CIE LCh hue.
- **Max in-gamut chroma** — 40-iteration bisection on C at L=0.55 per 30° of hue.
- **Bundle sizes** — `esbuild --bundle --minify --format=esm` on minimal entry points, then `gzip -9`.
- **WPT status** — `https://wpt.fyi/api/search?q=css/css-color/oklch-0`, run set of 2026-09-06/07.

## Sources

- [CSS Color Module Level 4, W3C CRD, 1 September 2026](https://www.w3.org/TR/css-color-4/) — §7 (HSL), §9.1–9.2 (Lab/LCH, Oklab/OkLCh), §13 (interpolation), §14 (gamut mapping), §20.3–20.4 (ΔEOK, ΔEOK2)
- [Björn Ottosson, "A perceptual color space for image processing" (Oklab)](https://bottosson.github.io/posts/oklab/)
- [Björn Ottosson, "sRGB gamut clipping"](https://bottosson.github.io/posts/gamutclipping/)
- [Björn Ottosson, "Okhsv and Okhsl — two new color spaces for color picking"](https://bottosson.github.io/posts/colorpicker/)
- [MDN — `oklch()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)
- [MDN — CSS Custom Properties / css-variables-1](https://www.w3.org/TR/css-variables-1/)
- [caniuse — `mdn-css_types_color_oklch`](https://caniuse.com/mdn-css_types_color_oklch)
- [wpt.fyi — css/css-color results](https://wpt.fyi/results/css/css-color)
- [WebKit bug 255939 — "(OK)LCH implementation is not according to spec"](https://bugs.webkit.org/show_bug.cgi?id=255939)
- [mdn/browser-compat-data#26838 — oklab/oklch partial support](https://github.com/mdn/browser-compat-data/issues/26838)
- [web-platform-tests/interop#443 — Gamut mapping](https://github.com/web-platform-tests/interop/issues/443)
- [Tailwind CSS v4 — Colors](https://tailwindcss.com/docs/colors) and [Compatibility](https://tailwindcss.com/docs/compatibility)
- [culori](https://culorijs.org/) / [API](https://culorijs.org/api/) / [`src/clamp.js`](https://github.com/Evercoder/culori/blob/main/src/clamp.js)
- [colorjs.io — Gamut Mapping](https://colorjs.io/docs/gamut-mapping) / [v0.7.0 release notes](https://github.com/color-js/color.js/releases/tag/v0.7.0)
- [chroma.js documentation](https://gka.github.io/chroma.js/)
- [facelessuser/coloraide#102 — Gamut Mapping and Interpolation with Oklab/Oklch by default?](https://github.com/facelessuser/coloraide/issues/102)
- [Uchida, "Oklch+: A Three-Parameter Extension of Oklab", arXiv:2606.05255 (preprint, June 2026, not peer-reviewed)](https://arxiv.org/abs/2606.05255)
