/**
 * OKLCH colour maths, vendored.
 *
 * Ticket 01 chose OKLCH and chose to vendor rather than depend: the engine needs
 * sRGB<->Oklab, polar OkLCh, gamut mapping and a max-chroma solver, and nothing
 * else. That is ~200 lines with no ambient state, against 6-19 KB and a global
 * mutable colour-space registry for a general library.
 *
 * `culori` is a devDependency and appears only in the tests, where it asserts
 * this module against an independent implementation.
 *
 * Sources:
 *   Oklab matrices    https://bottosson.github.io/posts/oklab/
 *   Gamut mapping     https://www.w3.org/TR/css-color-4/#gamut-mapping
 *   Colour difference https://www.w3.org/TR/css-color-4/#color-difference-OK
 *
 * PURE: no DOM, no clock, no randomness.
 */

/** Polar Oklab. `l` in 0..1, `c` >= 0, `h` in degrees 0..360. */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/** sRGB with channels in 0..1. May be out of gamut before mapping. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* -------------------------------------------------------------------------- */
/* sRGB transfer function                                                      */
/* -------------------------------------------------------------------------- */

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/* -------------------------------------------------------------------------- */
/* sRGB <-> Oklab <-> OkLCh                                                    */
/* -------------------------------------------------------------------------- */

function rgbToOklab(rgb: Rgb): { L: number; a: number; b: number } {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const bl = toLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(lab: { L: number; a: number; b: number }): Rgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function rgbToOklch(rgb: Rgb): Oklch {
  const { L, a, b } = rgbToOklab(rgb);
  const c = Math.sqrt(a * a + b * b);
  // Hue is meaningless at zero chroma; normalise it to 0 so greys compare equal.
  const h = c < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToRgb(col: Oklch): Rgb {
  const rad = (col.h * Math.PI) / 180;
  return oklabToRgb({
    L: col.l,
    a: col.c * Math.cos(rad),
    b: col.c * Math.sin(rad),
  });
}

/* -------------------------------------------------------------------------- */
/* Gamut                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tolerance for the cube test. Must exceed the round-trip error of
 * rgb -> oklch -> rgb (measured worst case ~1.1e-6), or a colour that was just
 * clamped INTO gamut reads as outside it again after one conversion.
 */
const GAMUT_EPS = 1e-5;

export function inGamut(rgb: Rgb): boolean {
  return (
    rgb.r >= -GAMUT_EPS &&
    rgb.r <= 1 + GAMUT_EPS &&
    rgb.g >= -GAMUT_EPS &&
    rgb.g <= 1 + GAMUT_EPS &&
    rgb.b >= -GAMUT_EPS &&
    rgb.b <= 1 + GAMUT_EPS
  );
}

/** CSS Color 4 colour difference for OkLab (plain Euclidean in rectangular form). */
export function deltaEOk(a: Oklch, b: Oklch): number {
  const ar = (a.h * Math.PI) / 180;
  const br = (b.h * Math.PI) / 180;
  const dL = a.l - b.l;
  const da = a.c * Math.cos(ar) - b.c * Math.cos(br);
  const db = a.c * Math.sin(ar) - b.c * Math.sin(br);
  return Math.sqrt(dL * dL + da * da + db * db);
}

const JND = 0.02;
const MAP_EPSILON = 0.0001;

/**
 * CSS Color 4 §14.2.2 gamut mapping: binary search on chroma, with local MINDE
 * so a clipped result within one JND is preferred to a further chroma reduction.
 *
 * Ticket 01 requires this rather than channel clipping: clipping moves lightness,
 * and lightness is what the contrast guarantee is computed from.
 */
export function gamutMap(col: Oklch): Oklch {
  if (col.l >= 1) return { l: 1, c: 0, h: col.h };
  if (col.l <= 0) return { l: 0, c: 0, h: col.h };
  if (inGamut(oklchToRgb(col))) return col;

  let lo = 0;
  let hi = col.c;
  let current: Oklch = col;

  while (hi - lo > MAP_EPSILON) {
    const mid = (lo + hi) / 2;
    current = { l: col.l, c: mid, h: col.h };
    const rgb = oklchToRgb(current);

    if (inGamut(rgb)) {
      lo = mid;
      continue;
    }

    const clipped = clipToGamut(current);
    if (deltaEOk(clipped, current) < JND) {
      return clipped;
    }
    hi = mid;
  }

  return clipToGamut({ l: col.l, c: lo, h: col.h });
}

function clipToGamut(col: Oklch): Oklch {
  const rgb = oklchToRgb(col);
  return rgbToOklch({
    r: clamp01(rgb.r),
    g: clamp01(rgb.g),
    b: clamp01(rgb.b),
  });
}

/**
 * Largest in-gamut chroma at a given lightness and hue.
 *
 * Ticket 01's first consequential finding: max in-gamut chroma varies 3.1x across
 * hue, so ramps must be parameterised by a *fraction* of this rather than by an
 * absolute chroma, or the gamut mapper silently rewrites them.
 */
export function maxChroma(l: number, h: number): number {
  if (l <= 0 || l >= 1) return 0;
  let lo = 0;
  let hi = 0.5; // safely beyond sRGB's maximum OkLCh chroma (~0.32)

  while (hi - lo > 0.0001) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ l, c: mid, h }))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Build a colour from a fraction (0..1) of the in-gamut chroma at this L and h. */
export function fromRelativeChroma(l: number, relC: number, h: number): Oklch {
  return { l, c: maxChroma(l, h) * relC, h };
}

/* -------------------------------------------------------------------------- */
/* Hex                                                                         */
/* -------------------------------------------------------------------------- */

const to255 = (c: number): number => Math.round(clamp01(c) * 255);

export function rgbToHex(rgb: Rgb): string {
  const hex = (c: number): string => to255(c).toString(16).padStart(2, "0");
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  let body = m[1];
  if (body.length === 3) {
    body = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const n = parseInt(body, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

/** Gamut-map, then render as hex. The only way a colour should leave the engine. */
export function oklchToHex(col: Oklch): string {
  return rgbToHex(oklchToRgb(gamutMap(col)));
}

/**
 * Render as an `oklch()` string. Always gamut-mapped first: no shipping browser
 * implements CSS gamut mapping, so an out-of-gamut value gets channel-clipped and
 * the contrast guarantee breaks (ticket 01, finding 3).
 */
export function oklchToCss(col: Oklch, alpha?: number): string {
  const m = gamutMap(col);
  const l = (m.l * 100).toFixed(2);
  const c = m.c.toFixed(4);
  const h = m.h.toFixed(2);
  const a = alpha === undefined || alpha >= 1 ? "" : ` / ${Math.round(alpha * 100)}%`;
  return `oklch(${l}% ${c} ${h}${a})`;
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToOklch(rgb) : null;
}

/** 0..255 integer triple, the form apca-w3 and the WCAG formula both want. */
export function toRgb255(col: Oklch): [number, number, number] {
  const rgb = oklchToRgb(gamutMap(col));
  return [to255(rgb.r), to255(rgb.g), to255(rgb.b)];
}
