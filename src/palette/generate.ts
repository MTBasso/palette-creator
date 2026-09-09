/**
 * The generation model (ticket 06): seed colour -> complete palette, both themes.
 *
 * What is invariant between light and dark is the BRAND -- the hue, and the
 * gamut-relative chroma. What is re-solved per theme is every lightness. That is
 * the answer to "how do both themes stay recognisably the same brand while both
 * holding contrast", and it is forced by ticket 02: the two themes are not
 * symmetric (light-mode elevation must come from borders because its surface
 * budget stops at ~#E4E4E4, while dark mode may use fill freely up to ~#575757),
 * so a mirrored lightness ramp would fail one of them.
 *
 * Every lightness that carries a guarantee is SOLVED against its actual backdrop,
 * never assigned from a table. That is what makes guided mode's promise true by
 * construction rather than by checking afterwards.
 *
 * PURE: no DOM, no clock, no randomness.
 */

import type { Oklch } from "./oklch.ts";
import { fromRelativeChroma, hexToOklch, toRgb255 } from "./oklch.ts";
import type { ContrastMode, Floors } from "./contrast.ts";
import {
  FLOORS,
  judge,
  solveAgainstBoth,
  solveLightness,
  bestOnColour,
  type Direction,
} from "./contrast.ts";
import type { Palette, Role, Theme, TokenPair } from "./schema.ts";
import { ROLES, isForbiddenSurface } from "./schema.ts";
import { DEFAULT_CHARACTER, getCharacter, type Character } from "./characters.ts";

export const DEFAULT_SEED = "#3b82f6";

export interface GenerateInput {
  readonly seed: string;
  readonly character: string;
  readonly contrastMode: ContrastMode;
  /** Unlock mode: hex overrides applied after solving. Diagnostics stay on. */
  readonly overrides?: Partial<Record<Role, Partial<Record<Theme, string>>>>;
}

/* -------------------------------------------------------------------------- */
/* Surface ladders                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Lightness offsets from the background, scaled by the character's separation.
 *
 * Both ladders are checked against ticket 02's forbidden band (roughly #77-#C9
 * greyscale, which admits no Lc-75 body text at all). Light stays near paper;
 * dark stays well below the band. Neither can drift into it.
 */
const LIGHT_BG = 0.995;
const DARK_BG = 0.178;

const LIGHT_DELTAS = {
  popover: 0.004,
  card: 0.014,
  muted: 0.034,
  secondary: 0.042,
  accent: 0.052,
} as const;

const DARK_DELTAS = {
  popover: 0.036,
  card: 0.028,
  muted: 0.074,
  secondary: 0.084,
  accent: 0.106,
} as const;

/** Semantic hues are absolute: a destructive action must read as red regardless of seed. */
/**
 * The elevation budget (ticket 02, structural constraints 2 and 3).
 *
 * A light surface darker than about #E4E4E4 admits no Lc-90 body text at all,
 * and a dark surface lighter than about #575757 admits none either. The ladder
 * is therefore CLAMPED, not merely intended to stay inside: a character with
 * aggressive separation would otherwise walk the deepest surface past the limit
 * and the solver would have nothing legible to return.
 *
 * This is why light-mode elevation has to come from borders and shadow rather
 * than fill -- light mode simply has less lightness to spend.
 */
const SURFACE_BUDGET = {
  light: { strict: 0.925, relaxed: 0.865 },
  dark: { strict: 0.415, relaxed: 0.5 },
} as const;

const SEMANTIC_HUES = { destructive: 27, success: 148, warning: 82 } as const;

/** Chart hues fan out from the seed with uneven steps, so adjacent series stay distinct. */
const CHART_HUE_OFFSETS = [0, 62, 134, 208, 291] as const;

/* -------------------------------------------------------------------------- */
/* Solvers with guaranteed fallbacks                                           */
/* -------------------------------------------------------------------------- */

/**
 * Guided mode may not emit a failing token, so every solve needs a terminal
 * fallback. Pure black or white against these surface ladders always clears
 * every floor, which is what makes the fallback safe rather than a fudge.
 */
function orExtreme(col: Oklch | null, direction: Direction, hue: number): Oklch {
  if (col) return col;
  return direction === "darker" ? { l: 0.04, c: 0, h: hue } : { l: 0.99, c: 0, h: hue };
}

/** Solve against whichever of two surfaces is the harder backdrop. */
function solveOnBoth(
  hue: number,
  relC: number,
  a: Oklch,
  b: Oklch,
  floors: Floors,
  dir: Direction,
): Oklch {
  return orExtreme(solveAgainstBoth(hue, relC, a, b, floors, dir), dir, hue);
}

/**
 * Solve a saturated fill and its label together.
 *
 * Three constraints at once: the label must clear the on-accent floors, the fill
 * must clear 3:1 against the page background (SC 1.4.11 -- a button is a UI
 * component, not decoration), and the result should sit near the preferred
 * lightness so buttons read as buttons.
 *
 * Ticket 02: if no label clears both floors, MOVE THE FILL, never lower the
 * threshold. That is exactly what scanning lightness here does.
 */
function solveFill(
  hue: number,
  relC: number,
  bg: Oklch,
  preferredL: number,
): { fill: Oklch; on: Oklch } {
  const bg255 = toRgb255(bg);
  const onFloors = FLOORS.onAccent();
  const visibility = FLOORS.border();

  let best: { fill: Oklch; on: Oklch; distance: number } | null = null;

  for (let l = 0.2; l <= 0.9; l += 0.005) {
    const fill = fromRelativeChroma(l, relC, hue);
    if (!judge(toRgb255(fill), bg255, visibility).passes) continue;
    const on = bestOnColour(fill, onFloors);
    if (!on) continue;
    const distance = Math.abs(l - preferredL);
    if (!best || distance < best.distance) best = { fill, on, distance };
  }

  if (best) return { fill: best.fill, on: best.on };

  // Unreachable for any in-gamut hue at these background lightnesses, but the
  // type must be total: fall back to a desaturated fill, which always solves.
  const fill = fromRelativeChroma(preferredL, relC * 0.4, hue);
  return { fill, on: bestOnColour(fill, onFloors) ?? { l: 1, c: 0, h: hue } };
}

/* -------------------------------------------------------------------------- */
/* Theme construction                                                          */
/* -------------------------------------------------------------------------- */

function buildTheme(
  theme: Theme,
  hue: number,
  char: Character,
  mode: ContrastMode,
): Record<Role, Oklch> {
  const isLight = theme === "light";
  const dir: Direction = isLight ? "darker" : "lighter";
  const sep = char.surfaceSeparation;
  const sign = isLight ? -1 : 1;
  const baseL = isLight ? LIGHT_BG : DARK_BG;
  const deltas = isLight ? LIGHT_DELTAS : DARK_DELTAS;

  const budget = SURFACE_BUDGET[theme][mode];
  const surface = (delta: number): Oklch => {
    const raw = baseL + sign * delta * sep;
    const clamped = isLight ? Math.max(raw, budget) : Math.min(raw, budget);
    return fromRelativeChroma(clamped, char.neutralChroma, hue);
  };

  const background = fromRelativeChroma(baseL, char.neutralChroma, hue);
  const popover = surface(deltas.popover);
  const card = surface(deltas.card);
  const muted = surface(deltas.muted);
  const secondary = surface(deltas.secondary);
  const accent = surface(deltas.accent);

  // The forbidden band is asserted, not assumed. If a future ladder edit drifts
  // into it the palette is wrong in a way no visual check would catch.
  for (const s of [background, popover, card, muted, secondary, accent]) {
    if (isForbiddenSurface(s.l)) {
      throw new Error(
        `Surface lightness ${s.l.toFixed(3)} falls in the forbidden mid-tone band; ` +
          `no body text can clear its floors there.`,
      );
    }
  }

  // Text. Each foreground is solved against the surface it actually sits on --
  // ticket 02: never inherit the background's verdict.
  const textC = char.textChroma;
  const body = FLOORS.body(mode);

  const foreground = orExtreme(solveLightness(hue, textC, background, body, dir), dir, hue);
  const cardForeground = orExtreme(solveLightness(hue, textC, card, body, dir), dir, hue);
  const popoverForeground = orExtreme(solveLightness(hue, textC, popover, body, dir), dir, hue);
  const secondaryForeground = orExtreme(solveLightness(hue, textC, secondary, body, dir), dir, hue);
  const accentForeground = orExtreme(solveLightness(hue, textC, accent, body, dir), dir, hue);

  // Muted text appears on both the page and the muted surface, so it is solved
  // against both rather than against whichever happened to be listed first.
  const mutedForeground = solveOnBoth(hue, textC, background, muted, FLOORS.muted(), dir);

  // Structure. Borders must hold on the page and on a card.
  const border = solveOnBoth(hue, char.neutralChroma, background, card, FLOORS.border(), dir);
  const input = solveOnBoth(hue, char.neutralChroma, background, card, { lc: 55, wcag: 3.2 }, dir);

  // The focus ring is the token most likely to be infeasible, and the one where
  // failure is a keyboard-user lockout -- so it is solved against two adjacencies.
  const ring = solveOnBoth(hue, char.accentChroma * 0.9, background, card, FLOORS.ring(), dir);

  // Link text is the "accent used as text" case: a tinted body colour is body
  // text, so chroma has to give way until it clears 4.5:1 and Lc 75.
  const link = solveOnBoth(hue, char.accentChroma * 0.85, background, card, FLOORS.accentText(), dir);

  // Fills. Lightness is solved, never inherited from the seed.
  const preferredFillL = isLight ? 0.56 : 0.66;
  const primary = solveFill(hue, char.accentChroma, background, preferredFillL);
  const destructive = solveFill(SEMANTIC_HUES.destructive, char.semanticChroma, background, preferredFillL);
  const success = solveFill(SEMANTIC_HUES.success, char.semanticChroma, background, preferredFillL);
  const warning = solveFill(SEMANTIC_HUES.warning, char.semanticChroma, background, preferredFillL);

  const chartL = isLight ? 0.62 : 0.7;
  const chart = CHART_HUE_OFFSETS.map((offset) =>
    fromRelativeChroma(chartL, char.accentChroma * 0.85, (hue + offset) % 360),
  );

  return {
    background,
    foreground,
    card,
    "card-foreground": cardForeground,
    popover,
    "popover-foreground": popoverForeground,
    primary: primary.fill,
    "primary-foreground": primary.on,
    secondary,
    "secondary-foreground": secondaryForeground,
    muted,
    "muted-foreground": mutedForeground,
    accent,
    "accent-foreground": accentForeground,
    destructive: destructive.fill,
    "destructive-foreground": destructive.on,
    success: success.fill,
    "success-foreground": success.on,
    warning: warning.fill,
    "warning-foreground": warning.on,
    border,
    input,
    ring,
    link,
    "chart-1": chart[0]!,
    "chart-2": chart[1]!,
    "chart-3": chart[2]!,
    "chart-4": chart[3]!,
    "chart-5": chart[4]!,
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

export function generate(input: GenerateInput): Palette {
  const seedColour = hexToOklch(input.seed) ?? hexToOklch(DEFAULT_SEED)!;
  const char = getCharacter(input.character || DEFAULT_CHARACTER);
  const hue = seedColour.h;

  const light = buildTheme("light", hue, char, input.contrastMode);
  const dark = buildTheme("dark", hue, char, input.contrastMode);

  const tokens = {} as Record<Role, TokenPair>;
  for (const role of ROLES) {
    const override = input.overrides?.[role];
    tokens[role] = {
      light: (override?.light ? hexToOklch(override.light) : null) ?? light[role],
      dark: (override?.dark ? hexToOklch(override.dark) : null) ?? dark[role],
    };
  }

  return {
    tokens,
    seed: input.seed,
    character: char.id,
    contrastMode: input.contrastMode,
  };
}
