/**
 * The semantic token schema (ticket 05).
 *
 * Names follow shadcn/ui, because ticket 03 made a shadcn-compatible
 * `globals.css` the default export and matching an existing convention costs
 * nothing while making the output paste-able. Four roles are ours rather than
 * shadcn's -- success and warning and their foregrounds -- because the preview
 * (ticket 04) could not render a realistic app without them.
 *
 * A role is a PAIR, not a value: ticket 03 established that light and dark are
 * two values of one role, since the export defines both from one declaration
 * site.
 *
 * PURE: no DOM, no clock, no randomness.
 */

import type { Oklch } from "./oklch.ts";
import type { ContrastMode, Floors } from "./contrast.ts";
import { FLOORS } from "./contrast.ts";

export const ROLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "border",
  "input",
  "ring",
  "link",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type Role = (typeof ROLES)[number];

export type Theme = "light" | "dark";

/** One role, both themes. */
export interface TokenPair {
  readonly light: Oklch;
  readonly dark: Oklch;
}

export interface Palette {
  readonly tokens: Readonly<Record<Role, TokenPair>>;
  readonly seed: string;
  readonly character: string;
  readonly contrastMode: ContrastMode;
}

/**
 * The pairings that carry a contrast guarantee, and the floor each must clear.
 *
 * The `-foreground` suffix is the marker: ticket 03 found that shadcn's naming
 * convention already encodes exactly this relationship, so the schema reuses it
 * rather than inventing a parallel one.
 *
 * Anything not listed here is decorative and deliberately unconstrained.
 */
export interface Guarantee {
  readonly fg: Role;
  readonly bg: Role;
  readonly floors: (mode: ContrastMode) => Floors;
  readonly label: string;
}

export const GUARANTEES: readonly Guarantee[] = [
  { fg: "foreground", bg: "background", floors: FLOORS.body, label: "Body text on background" },
  { fg: "card-foreground", bg: "card", floors: FLOORS.body, label: "Body text on card" },
  { fg: "popover-foreground", bg: "popover", floors: FLOORS.body, label: "Body text on popover" },
  { fg: "muted-foreground", bg: "background", floors: FLOORS.muted, label: "Muted text on background" },
  { fg: "muted-foreground", bg: "muted", floors: FLOORS.muted, label: "Muted text on muted surface" },
  { fg: "primary-foreground", bg: "primary", floors: FLOORS.onAccent, label: "Label on primary" },
  { fg: "secondary-foreground", bg: "secondary", floors: FLOORS.body, label: "Label on secondary" },
  { fg: "accent-foreground", bg: "accent", floors: FLOORS.body, label: "Label on accent surface" },
  { fg: "destructive-foreground", bg: "destructive", floors: FLOORS.onAccent, label: "Label on destructive" },
  { fg: "success-foreground", bg: "success", floors: FLOORS.onAccent, label: "Label on success" },
  { fg: "warning-foreground", bg: "warning", floors: FLOORS.onAccent, label: "Label on warning" },
  { fg: "border", bg: "background", floors: FLOORS.border, label: "Border on background" },
  { fg: "border", bg: "card", floors: FLOORS.border, label: "Border on card" },
  { fg: "input", bg: "background", floors: FLOORS.border, label: "Input outline on background" },
  { fg: "ring", bg: "background", floors: FLOORS.ring, label: "Focus ring on background" },
  { fg: "ring", bg: "card", floors: FLOORS.ring, label: "Focus ring on card" },
  // `primary` is a FILL role. A mid-lightness brand fill cannot also clear 4.5:1
  // as text on white, so ticket 02's "accent used as text" case gets its own
  // solved role rather than a guarantee `primary` would have to fail.
  { fg: "link", bg: "background", floors: FLOORS.accentText, label: "Link text on background" },
  { fg: "link", bg: "card", floors: FLOORS.accentText, label: "Link text on card" },
];

/** Surfaces a foreground may be painted on. Used by the generator's solver. */
export const SURFACE_ROLES: readonly Role[] = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
  "accent",
];

/**
 * Ticket 02's forbidden band, in OKLCH lightness.
 *
 * Greyscale backgrounds between roughly #77 and #C9 admit no Lc-75 body text at
 * all, so no surface may land here in either theme. Exported so the generator
 * asserts it rather than merely intending it.
 */
export const FORBIDDEN_SURFACE_BAND = { min: 0.56, max: 0.86 } as const;

export function isForbiddenSurface(l: number): boolean {
  return l > FORBIDDEN_SURFACE_BAND.min && l < FORBIDDEN_SURFACE_BAND.max;
}
