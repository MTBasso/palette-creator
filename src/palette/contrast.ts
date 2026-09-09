/**
 * Contrast: WCAG 2.x ratio and APCA Lc, enforced together.
 *
 * Ticket 02 chose the conjunction because the binding constraint swaps between
 * themes -- on white a border is WCAG-bound, on near-black the same role is
 * APCA-bound. Since this tool always generates both themes, enforcing either
 * metric alone leaves one of them under-constrained.
 *
 * WCAG is implemented from the spec formula. APCA comes from `apca-w3`, pinned
 * and unmodified: its licence forbids modifying the constants and obliges us to
 * track the current version.
 *
 * PURE: no DOM, no clock, no randomness.
 */

import { APCAcontrast, sRGBtoY } from "apca-w3";
import type { Oklch } from "./oklch.ts";
import { toRgb255 } from "./oklch.ts";

export type Rgb255 = [number, number, number];

/* -------------------------------------------------------------------------- */
/* Metrics                                                                     */
/* -------------------------------------------------------------------------- */

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance([r, g, b]: Rgb255): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG 2.x contrast ratio, always >= 1. Order-independent. */
export function wcagRatio(fg: Rgb255, bg: Rgb255): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * APCA lightness contrast. SIGNED: positive is dark text on a light background,
 * negative is light text on dark. Ticket 02's sixth structural constraint: the
 * engine must carry polarity, because an unsigned |Lc| silently accepts a
 * light-on-light pair.
 */
export function apcaLc(fg: Rgb255, bg: Rgb255): number {
  const value = APCAcontrast(sRGBtoY(fg), sRGBtoY(bg));
  return typeof value === "number" ? value : Number(value);
}

/** Alpha-composite a translucent foreground over an opaque backdrop. */
export function composite(fg: Rgb255, alpha: number, bg: Rgb255): Rgb255 {
  const mix = (f: number, b: number): number => Math.round(f * alpha + b * (1 - alpha));
  return [mix(fg[0], bg[0]), mix(fg[1], bg[1]), mix(fg[2], bg[2])];
}

/* -------------------------------------------------------------------------- */
/* Floors                                                                      */
/* -------------------------------------------------------------------------- */

/** A pairing's requirement. Both are hard floors; a pairing must clear both. */
export interface Floors {
  /** Minimum |Lc|. */
  readonly lc: number;
  /** Minimum WCAG ratio. 0 means the pairing is exempt (decorative). */
  readonly wcag: number;
}

/**
 * Ticket 02's threshold table. `strict` assumes body text at 16px/400 (Lc 90);
 * `relaxed` is the labelled Lc 75 concession meaning "safe at 18px/400,
 * 16px/500 or 14px/700". The assumption is stated in the UI and the export.
 */
export type ContrastMode = "strict" | "relaxed";

export const FLOORS = {
  body: (mode: ContrastMode): Floors => ({ lc: mode === "strict" ? 90 : 75, wcag: 4.5 }),
  /** Muted text is still body text under SC 1.4.3 -- there is no legal discount. */
  muted: (): Floors => ({ lc: 75, wcag: 4.5 }),
  /** Lc 60, not Lc 45: Lc 45 does not reach 3:1. */
  heading: (): Floors => ({ lc: 60, wcag: 3 }),
  /** Borders, control outlines, meaningful icons. SC 1.4.11. */
  border: (): Floors => ({ lc: 45, wcag: 3 }),
  /** Decorative rules are exempt from WCAG, but get a minimum-visibility floor. */
  decorative: (): Floors => ({ lc: 15, wcag: 0 }),
  /** A focus ring must clear BOTH adjacent colours. */
  ring: (): Floors => ({ lc: 45, wcag: 3 }),
  /** Exempt from WCAG. We are deliberately stricter; the ceiling matters too. */
  disabled: (): Floors => ({ lc: 30, wcag: 0 }),
  /** Label on a saturated fill, assuming >=16px/600. */
  onAccent: (): Floors => ({ lc: 60, wcag: 4.5 }),
  /** A tinted body text is body text. */
  accentText: (): Floors => ({ lc: 75, wcag: 4.5 }),
} as const;

export interface Verdict {
  readonly lc: number;
  readonly wcag: number;
  readonly floors: Floors;
  readonly passesLc: boolean;
  readonly passesWcag: boolean;
  readonly passes: boolean;
  /** Which metric is doing the work here -- the observation that justifies both. */
  readonly binding: "apca" | "wcag" | "both" | "none";
}

export function judge(fg: Rgb255, bg: Rgb255, floors: Floors): Verdict {
  const lc = apcaLc(fg, bg);
  const wcag = wcagRatio(fg, bg);
  const passesLc = Math.abs(lc) >= floors.lc;
  const passesWcag = floors.wcag === 0 || wcag >= floors.wcag;

  // "Binding" = which floor is closest to being violated, i.e. which one is
  // actually constraining the solver at this pairing.
  const lcSlack = floors.lc === 0 ? Infinity : Math.abs(lc) / floors.lc - 1;
  const wcagSlack = floors.wcag === 0 ? Infinity : wcag / floors.wcag - 1;
  let binding: Verdict["binding"];
  if (!passesLc && !passesWcag) binding = "none";
  else if (!passesLc) binding = "apca";
  else if (!passesWcag) binding = "wcag";
  else if (Math.abs(lcSlack - wcagSlack) < 0.02) binding = "both";
  else binding = lcSlack < wcagSlack ? "apca" : "wcag";

  return {
    lc,
    wcag,
    floors,
    passesLc,
    passesWcag,
    passes: passesLc && passesWcag,
    binding,
  };
}

export function judgeOklch(fg: Oklch, bg: Oklch, floors: Floors): Verdict {
  return judge(toRgb255(fg), toRgb255(bg), floors);
}

/* -------------------------------------------------------------------------- */
/* Solver                                                                      */
/* -------------------------------------------------------------------------- */

import { fromRelativeChroma } from "./oklch.ts";

export type Direction = "darker" | "lighter";

/**
 * Find the lightness *closest to the background* that still clears both floors,
 * at a fixed hue and gamut-relative chroma.
 *
 * "Closest to the background" rather than "maximum contrast" is deliberate: it
 * yields the softest colour that still passes, which is what keeps a palette
 * from looking like pure black on pure white. Contrast is monotone in lightness
 * away from the background, so a binary search is sound; the extreme is checked
 * first so an infeasible request returns null instead of a wrong answer.
 */
export function solveLightness(
  hue: number,
  relChroma: number,
  bg: Oklch,
  floors: Floors,
  direction: Direction,
): Oklch | null {
  const bg255 = toRgb255(bg);
  const at = (l: number): Oklch => fromRelativeChroma(l, relChroma, hue);
  const passesAt = (l: number): boolean => judge(toRgb255(at(l)), bg255, floors).passes;

  const extreme = direction === "darker" ? 0.02 : 0.995;
  if (!passesAt(extreme)) return null;

  let near = bg.l; // fails (no contrast against itself)
  let far = extreme; // passes
  for (let i = 0; i < 40; i++) {
    const mid = (near + far) / 2;
    if (passesAt(mid)) far = mid;
    else near = mid;
  }
  return at(far);
}

/**
 * Solve a foreground against two backdrops at once -- the focus-ring case, which
 * ticket 02 flags as the token most likely to be infeasible and the one where
 * failure is a keyboard-user lockout.
 */
export function solveAgainstBoth(
  hue: number,
  relChroma: number,
  bgA: Oklch,
  bgB: Oklch,
  floors: Floors,
  direction: Direction,
): Oklch | null {
  const a255 = toRgb255(bgA);
  const b255 = toRgb255(bgB);
  const at = (l: number): Oklch => fromRelativeChroma(l, relChroma, hue);
  const passesAt = (l: number): boolean => {
    const fg = toRgb255(at(l));
    return judge(fg, a255, floors).passes && judge(fg, b255, floors).passes;
  };

  const extreme = direction === "darker" ? 0.02 : 0.995;
  if (!passesAt(extreme)) return null;

  let near = direction === "darker" ? Math.max(bgA.l, bgB.l) : Math.min(bgA.l, bgB.l);
  let far = extreme;
  for (let i = 0; i < 40; i++) {
    const mid = (near + far) / 2;
    if (passesAt(mid)) far = mid;
    else near = mid;
  }
  return at(far);
}

/**
 * Pick the label colour for a saturated fill. Ticket 02: if no achromatic
 * `on-accent` clears both floors, the caller must move the fill rather than
 * lower the threshold -- so this returns null instead of degrading.
 */
export function bestOnColour(fill: Oklch, floors: Floors): Oklch | null {
  const fill255 = toRgb255(fill);
  const candidates: Oklch[] = [
    { l: 1, c: 0, h: fill.h },
    { l: 0.985, c: fill.c * 0.06, h: fill.h },
    { l: 0.18, c: fill.c * 0.12, h: fill.h },
    { l: 0.06, c: 0, h: fill.h },
  ];

  let best: { col: Oklch; margin: number } | null = null;
  for (const col of candidates) {
    const v = judge(toRgb255(col), fill255, floors);
    if (!v.passes) continue;
    const margin = Math.abs(v.lc) - floors.lc;
    if (!best || margin > best.margin) best = { col, margin };
  }
  return best ? best.col : null;
}
