/**
 * URL hash encoding (ticket 07).
 *
 * The hash carries INPUTS, not resolved tokens. Ticket 02 forced this: APCA is
 * beta research whose thresholds can still move, and inputs let an old link be
 * re-solved under new thresholds, where frozen outputs would preserve a palette
 * generated against a superseded metric.
 *
 * The cost, accepted knowingly: a shared link can change meaning when the engine
 * is tuned. `v` is what makes that detectable rather than silent.
 *
 * PURE: no DOM, no clock, no randomness. (Reading `location` is the caller's job.)
 */

import type { ContrastMode } from "./contrast.ts";
import type { GenerateInput } from "./generate.ts";
import { DEFAULT_SEED } from "./generate.ts";
import { DEFAULT_CHARACTER } from "./characters.ts";
import { ROLES, type Role, type Theme } from "./schema.ts";

const VERSION = "1";

export function encodeHash(input: GenerateInput): string {
  const params = new URLSearchParams();
  params.set("v", VERSION);
  params.set("seed", input.seed.replace(/^#/, ""));
  params.set("c", input.character);
  params.set("m", input.contrastMode);

  const overrides: string[] = [];
  for (const role of ROLES) {
    const o = input.overrides?.[role];
    if (!o) continue;
    for (const theme of ["light", "dark"] as const) {
      const hex = o[theme];
      if (hex) overrides.push(`${role}:${theme}:${hex.replace(/^#/, "")}`);
    }
  }
  if (overrides.length > 0) params.set("o", overrides.join(","));

  return params.toString();
}

const ROLE_SET = new Set<string>(ROLES);

export function decodeHash(hash: string): GenerateInput {
  const params = new URLSearchParams(hash.replace(/^#/, ""));

  const rawSeed = params.get("seed");
  const seed = rawSeed && /^[0-9a-f]{6}$/i.test(rawSeed) ? `#${rawSeed}` : DEFAULT_SEED;
  const mode: ContrastMode = params.get("m") === "relaxed" ? "relaxed" : "strict";

  const overrides: Partial<Record<Role, Partial<Record<Theme, string>>>> = {};
  const raw = params.get("o");
  if (raw) {
    for (const entry of raw.split(",")) {
      const [role, theme, hex] = entry.split(":");
      if (!role || !theme || !hex) continue;
      if (!ROLE_SET.has(role)) continue;
      if (theme !== "light" && theme !== "dark") continue;
      if (!/^[0-9a-f]{6}$/i.test(hex)) continue;
      const slot = overrides[role as Role] ?? {};
      slot[theme] = `#${hex}`;
      overrides[role as Role] = slot;
    }
  }

  return {
    seed,
    character: params.get("c") ?? DEFAULT_CHARACTER,
    contrastMode: mode,
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  };
}
