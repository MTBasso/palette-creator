# 02 — Which contrast metric do the guardrails enforce?

Research findings. Date: 2026-09-07. Primary sources only (W3C Recommendations and
Working Drafts, the APCA authors' own repositories and licence text, the reference
implementation source, and one independent academic evaluation). Blog summaries and
secondary write-ups were deliberately not used.

**Method note.** Every number in this document that is not a quotation was computed
locally by implementing both metrics from their normative definitions:

- WCAG 2.x from the `contrast ratio` and `relative luminance` definitions in
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance).
- APCA from the `SA98G` constants and `APCAcontrast()` in the W3-licensed reference
  implementation, [`Myndex/apca-w3/src/apca-w3.js`](https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js).

The APCA implementation was verified against the project's own test vectors in
[`Myndex/apca-w3/test/index.js`](https://github.com/Myndex/apca-w3/blob/master/test/index.js)
— `#888` on `#FFF` → `63.056469930209424`, `#FFF` on `#888` → `-68.54146436644962`,
`#123` on `#def` → `91.66830811481631`, `#def` on `#123` → `-93.06770049484275`,
`#000` on `#aaa` → `58.146262578561334`, `#aaa` on `#000` → `-56.24113336839742` —
and reproduces all six to full double precision. The numbers below are therefore
APCA's own numbers, not an approximation of them.

---

## TL;DR

Enforce **both, as a conjunction**. Guided mode's solver must satisfy an APCA `Lc`
floor **and** a WCAG 2.x ratio floor simultaneously, and report both. Neither implies
the other; the conjunction is only very slightly more expensive than APCA alone, and
it is the only choice that keeps both the tool's perceptual promise and its legal
promise. Details and thresholds in [RECOMMENDATION](#recommendation).

---

## 1. WCAG 2.x contrast ratio — what is actually normative

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) is a **W3C Recommendation, published
12 December 2024**. It is the only one of the two candidates that is a finished
standard.

### 1.1 The normative text

From <https://www.w3.org/TR/WCAG22/#contrast-minimum>:

> **1.4.3 Contrast (Minimum) (Level AA)** — The visual presentation of text and images
> of text has a contrast ratio of at least 4.5:1, except for the following:
> **Large Text** — Large-scale text and images of large-scale text have a contrast
> ratio of at least 3:1;
> **Incidental** — Text or images of text that are part of an inactive user interface
> component, that are pure decoration, that are not visible to anyone, or that are part
> of a picture that contains significant other visual content, have no contrast
> requirement.
> **Logotypes** — Text that is part of a logo or brand name has no contrast requirement.

> **1.4.6 Contrast (Enhanced) (Level AAA)** — … at least 7:1 … Large Text … at least 4.5:1 …

> **1.4.11 Non-text Contrast (Level AA)** — The visual presentation of the following
> have a contrast ratio of at least 3:1 against adjacent color(s):
> **User Interface Components** — Visual information required to identify user
> interface components and states, **except for inactive components** or where the
> appearance of the component is determined by the user agent and not modified by the
> author;
> **Graphical Objects** — Parts of graphics required to understand the content, except
> when a particular presentation of graphics is essential to the information being conveyed.

> **2.4.13 Focus Appearance (Level AAA)** — … an area of the focus indicator … is at
> least as large as the area of a 2 CSS pixel thick perimeter of the unfocused
> component …, and has a **contrast ratio of at least 3:1 between the same pixels in
> the focused and unfocused states**.

`large scale (text)` is defined as **"at least 18 point or 14 point bold"** — i.e.
≈24px, or ≈18.66px bold at the usual 96dpi mapping
(<https://www.w3.org/TR/WCAG22/#dfn-large-scale>).

Two exemptions matter directly to this tool: **inactive/disabled components are exempt
from both 1.4.3 (via "Incidental") and 1.4.11**, and
[Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
confirms it: *"User Interface Components that are not available for user interaction
(e.g., a disabled control in HTML) are not required to meet contrast requirements."*
It also confirms the border case: *"Text inputs that have no border and are
differentiated only by a background color must have a 3:1 contrast ratio to the
adjacent background."*

### 1.2 The maths

From <https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio> and `#dfn-relative-luminance`:

```
contrast ratio = (L1 + 0.05) / (L2 + 0.05)

L = 0.2126 * R + 0.7152 * G + 0.0722 * B

where for each channel C in {R, G, B}:
    if C_sRGB <= 0.04045 then C = C_sRGB / 12.92
    else                      C = ((C_sRGB + 0.055) / 1.055) ^ 2.4
```

> Note 1 Contrast ratios can range from 1 to 21 (commonly written 1:1 to 21:1).

> Note 2 Before May 2021 the value of 0.04045 in the definition was different (0.03928).
> … It has no practical effect on the calculations in the context of these guidelines.

### 1.3 Where the constants come from

[Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
gives the provenance of both magic numbers:

> The `.05` value used is based on Typical Viewing Flare. … The ANSI/HFS 100-1988
> standard calls for the contribution from ambient light to be included in the
> calculation of L1 and L2.

> The 4.5:1 ratio is used in this success criterion to account for the loss in contrast
> that results from moderately low visual acuity, congenital or acquired color
> deficiencies … A user with 20/40 would thus require a contrast ratio of `3 * 1.5 = 4.5 to 1`.

So: **`+0.05` is a fixed additive flare term**, and **4.5 is a 1988 print/CRT-era
threshold multiplied by an acuity fudge factor.** Both are the root of the failure
modes below.

---

## 2. WCAG 2.x's failure modes, precisely

### 2.1 The flare constant destroys the metric near black

`+0.05` is added to *both* luminances. Near black, the true luminance is far smaller
than 0.05, so the constant **dominates the numerator and denominator**, and the ratio
stops tracking any perceptual quantity — it starts measuring the flare constant against
itself. The practical consequence, computed:

The lightest grey text that WCAG still calls "AA-passing body text" on a dark
background, and what APCA says about that same pair:

| background | lightest text passing 4.5:1 | WCAG ratio | APCA Lc |
|---|---|---|---|
| `#000000` | `#757575` | 4.56:1 | **−29.6** |
| `#080808` | `#787878` | 4.54:1 | **−30.9** |
| `#121212` | `#7D7D7D` | 4.55:1 | **−32.8** |
| `#181818` | `#818181` | 4.56:1 | **−34.1** |
| `#202020` | `#878787` | 4.54:1 | **−36.0** |

Lc 30 is APCA's *"absolute minimum for … placeholder text, disabled elements"*
([APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)).
So WCAG 2.x will certify `#757575` on `#000000` as legal body copy while APCA rates it
at the level of a disabled control. This is the single most damaging fact for a dark
theme built by a WCAG-2-only generator.

Conversely, reaching APCA's body-text minimum on those same backgrounds requires far
more:

| background | text for Lc 75 | its WCAG ratio |
|---|---|---|
| `#000000` | `#CBCBCB` | 12.94:1 |
| `#121212` | `#CCCCCC` | 11.67:1 |
| `#181818` | `#CDCDCD` | 11.17:1 |

A dark theme that is actually readable sits at **11–13:1**, roughly *AAA plus 70%* —
nowhere near the 4.5:1 that WCAG 2 would let you stop at.

The APCA project states this directly
([Why APCA](https://git.apcacontrast.com/documentation/WhyAPCA)): WCAG 2.x *"cannot be
used for guidance designing 'dark mode'"* because it *"overstates contrast for dark
colors to the point that 4.5:1 can be functionally unreadable when a color is near
black."* The table above is that claim, reproduced from first principles.

### 2.2 A single ratio means wildly different things at different lightnesses

A fixed 4.5:1 is not a fixed perceptual quantity. Sweeping greyscale backgrounds and
solving for the text colour that lands exactly on 4.5:1:

| bg | text | WCAG | Lc |
|---|---|---|---|
| `#00` | `#74` | 4.49 | −29.2 |
| `#20` | `#86` | 4.48 | −35.5 |
| `#40` | `#AB` | 4.52 | −47.0 |
| `#60` | `#DA` | 4.50 | −62.7 |
| `#70` | `#F4` | 4.50 | −72.5 |
| `#80` | `#18` | 4.50 | +35.7 |
| `#A0` | `#38` | 4.48 | +43.9 |
| `#C0` | `#4F` | 4.50 | +52.2 |
| `#E0` | `#64` | 4.48 | +61.4 |
| `#F0` | `#6E` | 4.47 | +66.3 |

**At a constant WCAG 4.5:1, the perceptual contrast delivered ranges from Lc 29 to
Lc 73 — a factor of 2.5.** For a tool whose promise is "you cannot produce something
illegible", a metric with 2.5× slack in what it certifies is not a guardrail.

The same holds for the non-text 3:1 threshold: at a constant 3:1, Lc ranges from
−17.7 (bg `#00`) to +52.7 (bg `#F0`). A 3:1 divider on a dark background is
*below APCA's Lc 15 "treat anything below this as invisible" line*.

### 2.3 WCAG 2.x is polarity-blind

`(L1+0.05)/(L2+0.05)` sorts its arguments, so the ratio is symmetric. Dark-on-light and
light-on-dark of the same pair get the same number. Human vision does not work that
way, and APCA does not either:

| pair | WCAG (both directions) | Lc dark-on-light | Lc light-on-dark |
|---|---|---|---|
| `#888888` / `#FFFFFF` | 3.54:1 | +63.1 | −68.5 |
| `#666666` / `#FFFFFF` | 5.74:1 | +78.8 | −84.0 |

This matters specifically because **this tool generates a light theme and a dark theme
together**. A symmetric metric cannot express the thing that differs between them.

### 2.4 The mid-tone contradiction band

This is the failure mode with the most independent corroboration. Over the mid-tone
range, WCAG 2.x and APCA *disagree about which text colour to use*.

Sampling 1,296 saturated backgrounds across hue, saturation and lightness, WCAG and
APCA pick **different** text colours (white vs black) on **30.2%** of them. Examples:

| background | white text | black text | WCAG picks | APCA picks |
|---|---|---|---|---|
| `#FF0000` | 4.00:1 / Lc −70 | 5.25:1 / Lc +40 | black | **white** |
| `#D14747` | 4.46:1 / Lc −75 | 4.70:1 / Lc +34 | black | **white** |
| `#FF4D4D` | 3.27:1 / Lc −64 | 6.42:1 / Lc +45 | black | **white** |
| `#3B82F6` | 3.68:1 / Lc −69 | 5.71:1 / Lc +40 | black | **white** |

Sam Waller (Engineering Design Centre, University of Cambridge, April 2022),
[*Does the contrast ratio actually predict the legibility of website text?*](https://www.cedc.tools/article.html)
— announced to the W3C Low Vision Task Force at
<https://lists.w3.org/Archives/Public/public-low-vision-a11y-tf/2022Apr/0002.html> —
independently locates the greyscale band:

> for backgrounds with RGB values between 118 and 168, the two algorithms contradict
> each other. For any background within this range, 'WCAG Contrast Ratio' predicts that
> black text is more legible, whereas 'APCA Lightness Contrast' predicts that white text
> is more legible.

with worked pairs: `RGB255 vs RGB118` = 4.5:1 / Lc 77; `RGB0 vs RGB118` = 4.6:1 / Lc 33.
Both pass WCAG AA; APCA rates one at body-text level and the other at disabled-control
level.

Waller does **not** declare APCA the winner. His conclusion is explicitly cautious:

> This author would be glad to see further research to confirm which algorithm is more
> accurate for: Both fluent reading of paragraphs of text, and legibility of individual
> words, For the diverse range of vision conditions and vision abilities within the
> population, For the diverse range of screens and environments within which websites are
> viewed.

and he notes a limitation that applies to *both* metrics:

> both 'APCA Lightness Contrast' and 'WCAG Contrast Ratio' were two-colour models that
> do not account for the effect of the page background, which limits the accuracy of the
> models. Attempting to optimise a universally applicable two-colour model will
> necessarily involve attempting to find a compromise that is equally inaccurate for both
> black page backgrounds and white page backgrounds.

That last point is worth internalising: **no two-colour metric, APCA included, is a
complete model of legibility.** Neither choice makes the guarantee absolute.

### 2.5 AAA (7:1) is arithmetically unreachable on mid-tone surfaces

Because WCAG ratios are bounded by the lighter colour's luminance, mid-tone backgrounds
cap the achievable ratio below 7:1 entirely:

| background | max achievable WCAG ratio | AAA 7:1? |
|---|---|---|
| `#606060` | 6.29:1 | impossible |
| `#707070` | 4.95:1 | impossible |
| `#808080` | 5.32:1 | impossible |
| `#909090` | 6.58:1 | impossible |
| `#A0A0A0` | 8.03:1 | possible |

An AAA mode in this tool therefore cannot be a simple "raise the number" toggle; it
constrains which surfaces may exist at all.

---

## 3. APCA (Lc) — what it is, and what it is not

### 3.1 What it fixes

APCA (Accessible Perceptual Contrast Algorithm), derived from SAPC, is described by its
author as *"a contrast assessment method for predicting the perceived contrast between
sRGB colors on a computer monitor … developed as an assessment method for W3
Silver/WCAG3"*
([apca-w3 README](https://github.com/Myndex/apca-w3#readme)).

Structurally it fixes the three things above:

- It uses a **soft black-level clamp** (`blkThrs = 0.022`, `blkClmp = 1.414` — applied
  to each luminance before the comparison) instead of an additive flare constant, so the
  near-black region does not collapse.
- It is **asymmetric by construction**: separate exponent pairs for the two polarities
  (`normBG 0.56 / normTXT 0.57` for dark-on-light; `revBG 0.65 / revTXT 0.62` for
  light-on-dark), and it returns a **signed** value — negative for light text on dark.
  The reference source says explicitly: *"IMPORTANT: Do not swap, polarity is important."*
- It is **perceptually uniform**, so one Lc number means the same thing at every
  lightness — *"Halving or doubling the APCA value relates to a similar change in
  perceived contrast"*
  ([Easy Intro](https://git.apcacontrast.com/documentation/APCAeasyIntro)).

### 3.2 The maths (verbatim constants, `SA98G`, algorithm `0.0.98G-4g`)

From [`src/apca-w3.js`](https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js):

```
mainTRC = 2.4                                  // simple power TRC, NOT the sRGB piecewise curve
sRco = 0.2126729, sGco = 0.7151522, sBco = 0.0721750
normBG = 0.56, normTXT = 0.57, revTXT = 0.62, revBG = 0.65
blkThrs = 0.022, blkClmp = 1.414
scaleBoW = 1.14, scaleWoB = 1.14
loBoWoffset = 0.027, loWoBoffset = 0.027
deltaYmin = 0.0005, loClip = 0.1
```

```
Y = sRco*(R/255)^2.4 + sGco*(G/255)^2.4 + sBco*(B/255)^2.4      // per colour

Y' = Y                        if Y >  blkThrs
Y' = Y + (blkThrs - Y)^blkClmp  otherwise                        // SoftToe black clamp

if bgY' > txtY':   SAPC = (bgY'^normBG - txtY'^normTXT) * scaleBoW ;  Lc = (SAPC - 0.027) * 100
else:              SAPC = (bgY'^revBG  - txtY'^revTXT ) * scaleWoB ;  Lc = (SAPC + 0.027) * 100
// with a low-clip to 0 when |SAPC| < 0.1, and 0 when |ΔY| < deltaYmin
```

Range is **0 to ±Lc 106** in practice (±127 by construction).

### 3.3 Threshold model — a function of size and weight, not a single number

This is the substantive difference from WCAG 2.x. APCA does not have "a threshold"; it
has a lookup table. From `fontMatrixAscend` in
[`src/apca-w3.js`](https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js)
(Public Beta 0.1.7 (G), 28 May 2022), **minimum font size in px at each CSS weight for a
given Lc**:

| Lc | w100 | w200 | w300 | w400 | w500 | w600 | w700 | w800 | w900 |
|---|---|---|---|---|---|---|---|---|---|
| 90 | 48 | 32 | 21 | **16** | 15.5 | 14.5 | 14 | 16 | 18 |
| 75 | 60 | 42 | 24 | **18** | 16 | 15 | 14 | 16 | 18 |
| 60 | 72 | 48 | 42 | **24** | 21 | 18 | 16 | 16 | 18 |
| 45 | 108 | 96 | 72 | **42** | 32 | 28 | 24 | 24 | 24 |
| 30 | — | — | 120 | **108** | 108 | 96 | 72 | 72 | 72 |

The source annotates the table: `999` = *"prohibited - too low contrast"*, `777` =
*"NON TEXT at this minimum weight stroke"*, `666` = *"this is for spot text, not
fluent"*, and — critically — **"Lc values under 70 should have Lc 15 ADDED if used for
body text"**. Reference font is Barlow; the prose guidance assumes an
*"x-height ratio of 0.52"* and gives adjustment methods for other faces.

**Read the w400 column.** The most common body size on the web is 16px/400. The matrix
says 16px/400 needs **Lc 90**, not Lc 75. Lc 75 buys you 18px/400, or 16px/500, or
14px/700. This is the single most actionable fact in this document for a palette
generator, because a palette generator does not know the consumer's type scale and must
therefore assume the worst plausible case.

The prose levels, from
[APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
and [Easy Intro](https://git.apcacontrast.com/documentation/APCAeasyIntro):

- **Lc 90** — *"Preferred level for fluent text and columns of body text"*; also a
  *"suggested maximum for very large and bold fonts (greater than 36px bold)"*.
- **Lc 75** — *"The minimum level for columns of body text"*.
- **Lc 60** — *"The minimum level recommended for content text that is not body, column,
  or block text"*.
- **Lc 45** — minimum for *"headlines, and large text that should be fluently readable but
  is not body text"*, plus *"pictograms with fine details"*.
- **Lc 30** — *"The absolute minimum for any text not listed above"*, incl. placeholder
  text, disabled elements, and large solid icons.
- **Lc 15** — *"The absolute minimum for any non-semantic non-text that needs to be
  discernible"*; *"treat anything below this level as invisible"*.
- For AAA-equivalent, **add Lc 15** to the above.

The [APCA Readability Criterion](https://readtech.org/ARC/) also defines a
**"Bronze Simple Mode"** for teams that will not do lookups — *"There is no font lookup
table, only a set of general conformance levels"*, *"There is no specified minimum font
size"* — with **body text minimum Lc 75 / preferred Lc 90**, **other content text
Lc 60**, and **large fluent content (>36px) minimum Lc 45, maximum Lc 90**. Bronze
Simple Mode explicitly excludes *"spot text (disabled, placeholder, ancillary,
decorative)"* and logos.

Bronze Simple Mode is the right shape for this tool, because it is the only APCA
conformance mode that does not require knowing the consumer's typography.

### 3.4 Standardisation status — this is weaker than the community assumes

**As of 2026-09-07, APCA is not in any W3C standard, and it is not in the current
WCAG 3 draft.**

- The current [WCAG 3.0 Working Draft is dated **3 March 2026**](https://www.w3.org/TR/wcag-3.0/).
  Fetching and text-searching the full draft returns **zero occurrences of "APCA"** and
  zero of "Lc". Its contrast-related requirements are placeholders at **"Developing"**
  maturity — e.g. *"Parts of graphical object required to understand the content meet a
  minimum contrast ratio test"*, and *"The default pointer meets the
  `@@[non-text-contrast]` requirement"* (an unfilled cross-reference). Its definition of
  `color contrast` is, verbatim and at "Developing" maturity: *"relationship of hue,
  saturation, and lightness values between two colors"* — i.e. no algorithm at all.
- The draft's own warning: *"The final set of requirements in WCAG 3 will be different
  from what is in this draft. Requirements are likely to be added, combined, and
  removed."* The [March 2026 announcement](https://www.w3.org/WAI/news/2026-03-03/wcag3/)
  gives no timeline; the draft says the work *"still has several years of work"* ahead.
- The W3C group that was doing the work,
  [Visual Contrast of Text Subgroup](https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup)
  (wiki last updated **3 June 2024**), states at the top of its own page:
  **"This subgroup is not active. None of the material on this page has been approved by
  the working group to move forward into WCAG 3 at this time."** and *"The work will be
  restarted in the future as part of the new guideline writing process."*
- [w3c/wcag3 issue #29](https://github.com/w3c/wcag3/issues/29), *"Contrast Research:
  APCA Peer Reviews + Defining a Visual Contrast Guideline"*, is still **open** (last
  substantive update March 2025). It compiles the independent-review evidence but the
  adoption decision has not been taken.
- The APCA Readability Criterion itself, [readtech.org/ARC](https://readtech.org/ARC/),
  is a **Public Beta Draft dated 12 March 2023**, and says of itself: *"ARC are a
  separate, independent set of guidelines, and are not presently an official
  recommendation"* and *"This document should only be referred to as a work in progress."*
- The reference library is **version 0.1.9 (w3) (98G4g), marked beta**, algorithm
  `0.0.98G-4g` frozen at **15 February 2021**, library last updated **3 July 2022**.

Meanwhile the *legal* references are all WCAG 2.x. Per
[W3C WAI's policy index](https://www.w3.org/WAI/policies/): the US **ADA Title II rule
(2024) references WCAG 2.1**; **Section 508 references WCAG 2.0**; the EU **Web and
Mobile Accessibility Directive (2016/2102) references WCAG 2.1**; and the **European
Accessibility Act references WCAG 2.2**.

**Conclusion on status: APCA is a well-argued, actively-defended, beta research
algorithm with no standards status and a stalled adoption path. WCAG 2.x is what
auditors, procurement, and courts use.** A tool that enforced only APCA would be
enforcing something no client can point at in a contract.

### 3.5 Licensing — usable, with real conditions

This is the part most write-ups get wrong, so here it is verbatim. There are **two**
licences and they are very different.

**Do not use `Myndex/SAPC-APCA`.** Its
[LICENSE.md](https://github.com/Myndex/SAPC-APCA/blob/master/LICENSE.md) says
*"Registered Beta Testers OR Personal use only is permitted unless authorized in
writing"*. That repository is not licensed for a public tool.

**Use `Myndex/apca-w3` (npm: `apca-w3`).** Its
[LICENSE.md](https://github.com/Myndex/apca-w3/blob/master/LICENSE.md) grants:

> Files in this repository are licensed to the W3/AGWG under their cooperative agreement
> for use with WCAG accessibility guidelines for web-delivered and web-based content
> only, and not for any other use. Certain limitations do apply.

> **apca-w3** is an embodiment of certain supra-threshold contrast prediction
> technologies and it is licensed to the W3 on a limited basis for use in WCAG
> accessibility guidelines for web content only. **apca-w3** may be used for predicting
> contrast for web content used for that specific purpose **without royalty**.

> Commercial use is prohibited without a written and signed commercial license agreement,
> **except as provided by the W3 cooperative agreement for web content only.**

> Prohibited uses include medical, clinical evaluation, human safety related, aerospace,
> transportation, military applications, and uses which are not specific to web-based
> content presented on self-illuminated displays or devices.

Underneath, the grant is the
[W3C Software and Document License](http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document),
subject to the exclusions above. Files outside the W3 cooperative agreement fall under
what the licence calls *"the AGPU v3 License"* (evidently AGPL v3) — not relevant if you
only take `/src` and `/dist`.

**Verdict for this tool: permitted.** A free, static, open-source web tool that predicts
contrast for web content is squarely inside the granted use case, royalty-free. But
these conditions attach and must be honoured:

1. **No modification of the essential elements.**
   > such use must be without modification to the essential elements of the code or
   > specific approved constants, except as required to port to a given language.

   A port to TypeScript is explicitly allowed. Changing a constant is not.
   The licence also fixes the algorithm: *"Current base reference algorithm is
   0.0.98G-4g WITH an output clamp at approximately ±Lc10."*

2. **Duty to stay current.**
   > Developers … have a duty to ensure that the most recent version of this code is used
   > in their current or any future release.

   With a semver carve-out: minor/patch releases need only track the latest non-breaking
   branch; a major release must adopt the most recent stable `apca-w3`. **This is an
   ongoing maintenance obligation on a project that is otherwise fire-and-forget.**

3. **Naming is trademarked and conditional.**
   > Use of the acronyms APCA™, SAPC™, or SACAM … is only permitted for code that is
   > properly implementing the APCA algorithm, and maintaining sync with the current
   > version.

   Calling it "APCA" in the UI is allowed *only* while (1) and (2) hold. Get either wrong
   and the licence says you are *"in breech of license and a copyright violation."*

4. **The APCA logo and "Powered by APCA" require written consent** and a qualification
   submission. Do not use them.

5. **Right to audit.** Applies to commercial/paywalled integrations; not applicable to a
   free static tool, but worth knowing.

6. **Withdrawal clause.**
   > license for use is revoked when any such asset is removed from this repository.

   Vendoring a pinned copy is therefore slightly risky in principle. Practically: depend
   on `apca-w3` from npm, pin the version, and re-check on each major release.

**Contrast this with WCAG 2.x, which has no licensing question at all** — it is a
three-line formula in a W3C Recommendation, freely implementable, with no trademark,
no currency obligation, and no revocation clause. That asymmetry is itself an argument
for computing WCAG 2.x natively and treating APCA as the dependency.

---

## 4. Is "compute both, enforce one, report the other" defensible?

Partly. The stronger position is **compute both and enforce both as a conjunction**,
and here is the evidence for why.

### 4.1 APCA does not imply WCAG

The attractive story is "Lc 75 is strictly stronger than 4.5:1, so enforce APCA and
WCAG comes free." **That story is false**, and it fails exactly where you would expect.

Over 400,000 random sRGB pairs, it *appears* true — zero counterexamples, minimum
observed WCAG ratio among `|Lc| ≥ 75` pairs was 4.60:1. But an **exhaustive** sweep of
all 65,536 greyscale pairs finds the counterexample immediately:

| pair | Lc | WCAG |
|---|---|---|
| `#FFFFFF` text on `#7A7A7A` | **75.0** | **4.29:1 — fails AA** |

Exhaustive greyscale minima, by Lc floor:

| Lc floor | min WCAG ratio over all greyscale pairs | witnessed at |
|---|---|---|
| ≥ 90 | 7.226:1 | `#FF` on `#57` |
| ≥ 75 | **4.292:1** | `#FF` on `#7A` |
| ≥ 60 | **2.885:1** | `#FF` on `#98` |
| ≥ 45 | 2.073:1 | `#FF` on `#B4` |
| ≥ 30 | 1.590:1 | `#FF` on `#CD` |
| ≥ 15 | 1.271:1 | `#FF` on `#E4` |

So **Lc 75 does not guarantee AA**, and **Lc 60 does not guarantee 3:1**. Both leak, and
both leak in the mid-tone reverse-polarity band that Waller identified. The leak is
narrow — only greyscale backgrounds `#75`–`#7A` (6 of 256) admit an Lc-75 solution that
fails AA — but "narrow" is not "none", and a tool whose entire pitch is a guarantee
cannot ship a metric that is right 97.7% of the time.

### 4.2 WCAG very much does not imply APCA

The converse leak is enormous. Of 400,000 random pairs, **47,945 pass WCAG AA 4.5:1**,
and of those **3,034 (6.3%) have `|Lc| < 45`** — below APCA's threshold for
*large headline* text, let alone body copy. Restricted to dark backgrounds, as §2.1
shows, the figure approaches 100%.

### 4.3 Therefore: conjunction

Enforce `|Lc| ≥ L` **AND** `ratio ≥ R`. This costs almost nothing:

| greyscale bg | # text colours passing AA | # passing Lc 75 | # passing **both** |
|---|---|---|---|
| `#00` | 139 | 53 | **53** |
| `#20` | 121 | 49 | **49** |
| `#40` | 85 | 37 | **37** |
| `#60` | 37 | 18 | **18** |
| `#70` | 12 | 8 | **8** |
| `#D0` | 90 | 37 | **37** |
| `#F0` | 110 | 90 | **90** |

Outside the mid-tone band the conjunction is *identical* to the APCA constraint alone —
the WCAG term is free. Inside the band it removes the handful of pairs where APCA is
generous and WCAG is not. That is precisely the behaviour you want.

The "enforce one, report the other" variant is defensible only in **unlock mode**, where
the guarantee is explicitly void: there, showing both numbers side by side with the
disagreement highlighted is genuinely more informative than a single verdict. In guided
mode it is not defensible, because "reporting" a violation the user is told they cannot
produce is a contradiction.

### 4.4 What the conjunction costs: the mid-tone dead zone

The conjunction makes an entire region of the lightness axis uninhabitable, and the
engine must know this up front. Exhaustively, for greyscale backgrounds:

- **`Lc ≥ 75` + AA body text is satisfiable only on backgrounds `#00`–`#76` and
  `#CA`–`#FF`.** Backgrounds `#77`–`#C9` admit **no** text colour at all.
- **`Lc ≥ 90` + AA body text: only `#00`–`#57` and `#E4`–`#FF`.**
- **`Lc ≥ 60` + 3:1: only `#00`–`#76` and `#AE`–`#FF`.**

This is not a defect of the conjunction — the ceiling comes from APCA. On `#808080` the
maximum achievable `|Lc|` against *any* colour is 72.4; on `#909090` it is 64.6. **Body
text on a mid-tone surface is simply not a thing that can be done**, and WCAG 2.x's
willingness to certify it at 4.5:1 is one more instance of §2.2.

Practical consequence for the engine's surface ramp:

| | light theme | dark theme |
|---|---|---|
| darkest/lightest surface still supporting **Lc 90** body text | **`#E4E4E4`** | **`#575757`** |
| darkest/lightest surface still supporting **Lc 75** body text | **`#CACACA`** | **`#767676`** |

Note the asymmetry, which is the opposite of folk wisdom: **the light theme's elevation
budget is tiny** (white → `#E4E4E4` is about 1.25:1 of separation, ~Lc 12), while the
**dark theme has enormous headroom** (`#0B0B0C` → `#575757`). Dark themes can afford
strongly differentiated elevated surfaces; light themes cannot, and must express
elevation with borders and shadow rather than fill.

---

## 5. The hardest case: text on a saturated accent

Named accents, computed both ways:

| accent | white label | black label | WCAG picks | Lc 75 + AA achievable? |
|---|---|---|---|---|
| `#2563EB` blue | 5.17:1 / Lc −80 | 4.06:1 / Lc +29 | white | **yes** (white) |
| `#3B82F6` blue | 3.68:1 / Lc −69 | 5.71:1 / Lc +40 | black | **no** |
| `#DC2626` red | 4.83:1 / Lc −77 | 4.35:1 / Lc +33 | white | **yes** (white) |
| `#9333EA` purple | 5.38:1 / Lc −81 | 3.90:1 / Lc +29 | white | **yes** (white) |
| `#16A34A` green | 3.30:1 / Lc −65 | 6.37:1 / Lc +44 | black | **no** |
| `#22C55E` green | 2.28:1 / Lc −49 | **9.22:1** / Lc +60 | black | **no** |
| `#14B8A6` teal | 2.49:1 / Lc −53 | 8.44:1 / Lc +56 | black | **no** |
| `#F59E0B` amber | 2.15:1 / Lc −46 | **9.78:1** / Lc +62 | black | **no** |
| `#FBBF24` amber | 1.67:1 / Lc −33 | **12.58:1** / Lc +75 | black | marginal |
| `#22D3EE` cyan | 1.81:1 / Lc −37 | 11.62:1 / Lc +71 | black | **no** |

Look at `#22C55E`: black text scores **9.22:1 — comfortably WCAG AAA** — and **Lc 60**,
which APCA says is only good enough for a 16px/700 label, not body text. Look at
`#F59E0B`: **9.78:1 AAA, Lc 62.** The tool must not present these as safe just because
WCAG loves them.

**The structural conclusion: the accent's lightness is not free.** For a given hue and
saturation, only certain accent lightnesses admit *any* achromatic label. At **Lc 60 +
AA** (an appropriate floor for a ≥16px/600 button label), sweeping hue at S=0.85:

| hue | white label works at L* | black label works at L* | **dead band** |
|---|---|---|---|
| 0 (red) | 15–49% | 77–90% | **50–76%** |
| 30 (orange) | 15–38% | 61–90% | **39–60%** |
| 60 (yellow) | 15–25% | 39–90% | **26–38%** |
| 120 (green) | 15–29% | 43–90% | **30–42%** |
| 180 (cyan) | 15–28% | 41–90% | **29–40%** |
| 210 (azure) | 15–46% | 71–90% | **47–70%** |
| 240 (blue) | 15–67% | 82–90% | **68–81%** |
| 270 (violet) | 15–61% | 79–90% | **62–78%** |
| 330 (pink) | 15–48% | 76–90% | **49–75%** |

At **Lc 75 + AA** (a 14px/400 or 16px/500 label) the dead bands widen substantially —
for red, black text is viable only above L\* 86%; for blue, only above 88%.

`#22C55E` sits at hue ≈145, L\* ≈45% — dead centre of green's dead band. That is why
nothing works on it.

**Design implication for the engine, and it is a big one:** the seed colour cannot be
used unmodified as an accent *fill*. The engine must distinguish

- **accent-as-text** (accent used as a link/label colour on `background`/`surface`), and
- **accent-as-fill** (accent used as a solid button background carrying a label),

and it must **solve `accent-fill`'s lightness into its hue's feasible band** rather than
inheriting it from the seed. Then the `on-accent` token is derived from that fill, not
guessed. The feasible bands above are the constraint set.

---

## 6. RECOMMENDATION

### 6.1 The metric

**Enforce the conjunction of APCA `|Lc|` and WCAG 2.x contrast ratio. Report both,
always. Treat WCAG 2.x as the compliance floor and APCA as the legibility floor, and
never allow either to be traded against the other.**

Concretely:

1. `src/palette` computes **both** metrics for every pairing. WCAG 2.x is implemented
   directly from the spec formula (≈15 lines, zero dependencies, no licence). APCA comes
   from `apca-w3` (pinned, unmodified constants) or a faithful unmodified TypeScript port
   of it.
2. Guided mode's solver satisfies **both floors simultaneously**. A pairing that fails
   either is not producible.
3. The UI shows both numbers on every pairing, with APCA labelled as the reason a value
   was rejected when WCAG alone would have passed it. This is the tool's actual selling
   point over every WCAG-only palette generator, and it should be visible.
4. Unlock mode keeps both diagnostics on and flags disagreement explicitly.
5. The **export** carries both numbers plus the assumed typography (below) as comments,
   so a downstream auditor can reproduce the verdict.
6. Ship the **APCA Bronze Simple Mode** interpretation, not the font lookup table,
   because the tool does not know the consumer's type scale — but *state the assumed
   font spec in the UI and export* so the assumption is falsifiable.

**Assumed typography (must be stated in the product):** body = **16px / weight 400**.
Per APCA's `fontMatrixAscend`, that cell requires **Lc 90**. Lc 75 is offered as an
explicit, labelled relaxation meaning *"safe at 18px/400, 16px/500, or 14px/700"*.

### 6.2 Thresholds

Both columns are hard floors; a pairing must clear both. `Lc` is `|Lc|` (polarity is
tracked separately and must be correct for the theme).

| Pairing | APCA floor | WCAG floor | Notes |
|---|---|---|---|
| **Body text on background** | **Lc 90** target / **Lc 75** floor | **4.5:1** | Lc 90 = safe at 16px/400. Lc 75 is the relaxed mode and must be labelled "requires ≥18px/400". |
| **Body text on surface** | same as above, **recomputed against the surface**, not the background | **4.5:1** | Never inherit the background's verdict. Constrains light surfaces to ≥ `#E4E4E4` (Lc 90) or ≥ `#CACACA` (Lc 75). |
| **Large / heading text** (≥24px, or ≥18.66px bold) | **Lc 60** | **3:1** | Lc 60 is APCA's non-body minimum; 3:1 is WCAG's Large Text allowance. Do **not** use Lc 45 here — Lc 45 does not reach 3:1 (min observed 2.07:1). |
| **Muted / secondary text** | **Lc 75** | **4.5:1** | Muted text is still body text in the eyes of SC 1.4.3. There is no legal "secondary text" discount. Refuse to let "muted" mean "failing"; achieve muting with a *smaller* Lc gap from body, not by dropping below the floor. |
| **UI borders, control outlines, icons** | **Lc 45** | **3:1** | SC 1.4.11 + APCA's "pictograms with fine details". Applies to input borders, checkbox/radio outlines, meaningful icons. Note WCAG's 3:1 is the binding constraint in light themes (`#949494` on white = 3.03:1 / Lc 57); APCA is binding in dark themes. |
| **Decorative dividers / non-semantic rules** | **Lc 15** | none | Exempt from 1.4.11 (not required to identify a component). Lc 15 is APCA's "below this, treat as invisible" line — enforce it as a *minimum visibility* floor, which WCAG does not give you at all. |
| **Focus rings** | **Lc 45** against **both** adjacent colours | **3:1** against **both** adjacent colours, **and 3:1 between focused and unfocused states** | The two-adjacency rule is the trap: a ring must clear the component fill *and* the page background. SC 1.4.11 gives the 3:1; SC 2.4.13 (AAA) gives the focused-vs-unfocused 3:1. Enforce all three; a focus ring is the one token where failure is a keyboard-user lockout. |
| **Disabled controls / placeholder text** | **Lc 30** floor, **Lc 60** ceiling | none required (exempt) | WCAG exempts these entirely ("Incidental"; "except for inactive components"). **Be stricter than the law here**: Lc 30 is APCA's absolute minimum for disabled/placeholder. The *ceiling* matters as much as the floor — a disabled control must read as disabled, so cap it below the enabled state's Lc. |
| **Text on a saturated accent (`on-accent` on `accent-fill`)** | **Lc 60** floor for a label ≥16px/600; **Lc 75** if the label may be 14–15px or weight <600 | **4.5:1** | **The accent fill's lightness must be solved into its hue's feasible band** (§5), not inherited from the seed. If no achromatic `on-accent` clears both, the engine must move the fill, not lower the threshold. |
| **Accent used as text** (links, on background/surface) | **Lc 75** | **4.5:1** | A tinted body-text colour is body text. Chroma must be reduced until it clears; this is usually the binding constraint on how saturated a light-theme link colour can be. |
| **AAA mode**, if offered | **+Lc 15** to every text floor (APCA's own AAA rule) | **7:1** body, **4.5:1** large | Must also refuse mid-tone surfaces: 7:1 is arithmetically unreachable on backgrounds `#60`–`#9F` (§2.5). |

### 6.3 Computed anchor values (sanity targets for the engine)

Greyscale reference solutions satisfying both floors. Useful as unit-test fixtures.

**Light, background `#FFFFFF`:**

| role | colour | Lc | WCAG |
|---|---|---|---|
| body (Lc 90) | `#4A4A4A` | 90 | 8.86:1 |
| body (Lc 75) | `#6E6E6E` | 75 | 5.10:1 |
| large/heading | `#8E8E8E` | 60 | 3.28:1 |
| border/icon | `#949494` | 57 | 3.03:1 ← WCAG-bound |
| disabled | `#C7C7C7` | 30 | 1.69:1 |
| decorative divider | `#E1E1E1` | 15 | 1.31:1 |

**Dark, background `#0B0B0C`:**

| role | colour | Lc | WCAG |
|---|---|---|---|
| body (Lc 90) | `#E4E4E4` | 90 | 15.47:1 |
| body (Lc 75) | `#CCCCCC` | 75 | 12.25:1 |
| large/heading | `#B2B2B2` | 60 | 9.28:1 |
| border/icon | `#969696` | 45 | 6.65:1 ← APCA-bound |
| disabled | `#777777` | 30 | 4.39:1 |
| decorative divider | `#535353` | 15 | 2.56:1 |

Note how the binding constraint **swaps between themes** — WCAG binds in light, APCA
binds in dark. That is the whole argument for the conjunction in one observation.

### 6.4 Structural constraints the engine inherits from this choice

1. **Mid-tone surfaces are forbidden for text.** Greyscale-equivalent backgrounds
   `#77`–`#C9` admit no Lc-75 body text at all. The surface ramp must never enter this
   band in either theme.
2. **The light theme's elevation budget is ~`#E4E4E4`** (Lc 90 body) or **`#CACACA`**
   (Lc 75). Elevation in light mode must come from borders and shadow, not fill.
3. **The dark theme's elevation budget runs to `#575757`** (Lc 90). Dark themes may use
   fill for elevation freely.
4. **`accent-fill` is a solved token, not the seed.** Its lightness is determined by its
   hue's feasible band for the chosen `on-accent`.
5. **`focus-ring` is solved against two adjacencies**, and is the token most likely to be
   infeasible; it may need to be a different hue from the accent.
6. **APCA is signed.** The engine must carry polarity and assert it matches the theme;
   an unsigned `|Lc|` will silently accept a light-on-light pair.

### 6.5 The failure mode being accepted

State this in the product, not just in this file. Three things are being accepted:

**(a) APCA is beta research, not a standard, and it can move.** Algorithm `0.0.98G-4g`
has been frozen since 15 February 2021, but the W3C subgroup that would ratify it is
**inactive** and has approved **nothing** for WCAG 3; the March 2026 WCAG 3 draft does
not contain the string "APCA". If the eventual WCAG 3 visual-contrast method differs
from APCA — or if APCA revises its constants — **palettes generated by this tool will
have been generated against a superseded metric.** Mitigation: the `apca-w3` licence
already obliges tracking the current version, the export records which algorithm version
and thresholds produced it, and the URL hash encodes inputs rather than outputs so a
palette can be re-solved under new thresholds.

**(b) The APCA licence attaches an ongoing obligation to an otherwise fire-and-forget
static tool.** Constants may not be modified; the current version must be tracked into
future releases; the name "APCA" may only be used while both hold. A dormant repo that
falls behind `apca-w3` is, by the licence's own words, *"in breech of license."*
Mitigation: pin `apca-w3` from npm, never vendor a modified copy, and treat an upstream
major release as a required-maintenance trigger.

**(c) No two-colour metric is a model of legibility, and the tool will still certify
palettes that are hard to read for some users on some screens.** Waller's caution is the
honest framing: further research is needed on *"the diverse range of vision conditions
and vision abilities within the population"* and *"the diverse range of screens and
environments"*, and both models *"do not account for the effect of the page background,
which limits the accuracy of the models."* Font rendering, anti-aliasing, ambient light,
display gamma, and the reader's own vision are all outside both metrics. Additionally,
the tool assumes **16px/400** body text; a consumer who ships 12px/300 will fall below
APCA's matrix regardless of what the palette guarantees.

**What the promise therefore actually is:** *guided mode cannot produce a palette that
fails WCAG 2.x AA, and cannot produce one that falls below APCA's perceptual floors for
its stated font assumption.* That is a strong, checkable, deterministic claim. It is not
"cannot produce an illegible palette", and the product copy must not say that.

---

## Sources

- WCAG 2.2 (W3C Recommendation, 12 Dec 2024) — <https://www.w3.org/TR/WCAG22/>
  (SC 1.4.3, 1.4.6, 1.4.11, 2.4.13; definitions of `contrast ratio`, `relative luminance`, `large scale (text)`)
- Understanding SC 1.4.3 Contrast (Minimum) — <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- Understanding SC 1.4.11 Non-text Contrast — <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
- WCAG 3.0 (W3C Working Draft, 3 Mar 2026) — <https://www.w3.org/TR/wcag-3.0/>
- WAI announcement of the March 2026 WCAG 3 draft — <https://www.w3.org/WAI/news/2026-03-03/wcag3/>
- W3C WAI, Visual Contrast of Text Subgroup wiki (last updated 3 Jun 2024; marked inactive) — <https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup>
- w3c/wcag3 issue #29, "Contrast Research: APCA Peer Reviews + Defining a Visual Contrast Guideline" (open) — <https://github.com/w3c/wcag3/issues/29>
- W3C WAI, Web Accessibility Laws & Policies — <https://www.w3.org/WAI/policies/>
- APCA reference implementation, constants and font lookup table — <https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js>
- APCA official test vectors — <https://github.com/Myndex/apca-w3/blob/master/test/index.js>
- `apca-w3` licence (W3 cooperative agreement version) — <https://github.com/Myndex/apca-w3/blob/master/LICENSE.md>
- `SAPC-APCA` licence (personal / registered-beta-tester only — do not use) — <https://github.com/Myndex/SAPC-APCA/blob/master/LICENSE.md>
- APCA in a Nutshell — <https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html>
- The Easy Intro to the APCA Contrast Method — <https://git.apcacontrast.com/documentation/APCAeasyIntro>
- Why APCA — <https://git.apcacontrast.com/documentation/WhyAPCA>
- APCA Readability Criterion (Public Beta Draft, 12 Mar 2023) — <https://readtech.org/ARC/>
- ARC Bronze Simple Mode test method — <https://readtech.org/ARC/tests/bronze-simple-mode/>
- Sam Waller, *Does the contrast ratio actually predict the legibility of website text?*, Engineering Design Centre, University of Cambridge, April 2022 — <https://www.cedc.tools/article.html> (announced at <https://lists.w3.org/Archives/Public/public-low-vision-a11y-tf/2022Apr/0002.html>)
