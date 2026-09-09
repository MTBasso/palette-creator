/**
 * Diagnostics: every guaranteed pairing, in both themes, judged.
 *
 * Guided mode solves so that these all pass by construction. Unlock mode keeps
 * them running -- ticket 09's rule is that the guarantee goes away, not the
 * diagnostics.
 *
 * PURE: no DOM, no clock, no randomness.
 */

import { toRgb255 } from "./oklch.ts";
import { judge, type Verdict } from "./contrast.ts";
import type { Palette, Role, Theme } from "./schema.ts";
import { GUARANTEES } from "./schema.ts";

export interface Diagnostic {
  readonly theme: Theme;
  readonly label: string;
  readonly fg: Role;
  readonly bg: Role;
  readonly verdict: Verdict;
}

export function diagnose(palette: Palette): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const g of GUARANTEES) {
      const fg = palette.tokens[g.fg][theme];
      const bg = palette.tokens[g.bg][theme];
      out.push({
        theme,
        label: g.label,
        fg: g.fg,
        bg: g.bg,
        verdict: judge(toRgb255(fg), toRgb255(bg), g.floors(palette.contrastMode)),
      });
    }
  }
  return out;
}

export function failures(palette: Palette): Diagnostic[] {
  return diagnose(palette).filter((d) => !d.verdict.passes);
}

/**
 * How often each metric is the binding constraint.
 *
 * This is ticket 02's argument made visible: the counts are lopsided in opposite
 * directions between the two themes, which is why neither metric alone would do.
 */
export function bindingSummary(palette: Palette): Record<Theme, { apca: number; wcag: number }> {
  const summary = { light: { apca: 0, wcag: 0 }, dark: { apca: 0, wcag: 0 } };
  for (const d of diagnose(palette)) {
    if (d.verdict.binding === "apca") summary[d.theme].apca++;
    else if (d.verdict.binding === "wcag") summary[d.theme].wcag++;
  }
  return summary;
}
