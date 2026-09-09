/**
 * Vitest over `src/palette` only. No UI tests: a preview panel's whole value is
 * that a human looks at it.
 *
 * The engine is pure maths with objective right answers, which is the rare case
 * where tests are unambiguously worth their cost.
 */

import { describe, expect, it } from "vitest";
import { converter } from "culori";
import {
  CHARACTERS,
  ROLES,
  apcaLc,
  decodeHash,
  deltaEOk,
  diagnose,
  encodeHash,
  exportPalette,
  failures,
  fromRelativeChroma,
  gamutMap,
  generate,
  hexToOklch,
  inGamut,
  isForbiddenSurface,
  maxChroma,
  oklchToHex,
  oklchToRgb,
  rgbToOklch,
  toRgb255,
  wcagRatio,
  type ContrastMode,
} from "./index.ts";

const toCuloriOklch = converter("oklch");

const SEEDS = ["#3b82f6", "#e11d48", "#16a34a", "#f59e0b", "#8b5cf6", "#0d9488", "#000000", "#ffffff"];
const MODES: ContrastMode[] = ["strict", "relaxed"];

/* -------------------------------------------------------------------------- */

describe("oklch: vendored maths against culori", () => {
  it("matches culori across the sRGB cube", () => {
    let worstL = 0;
    let worstC = 0;

    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const ours = rgbToOklch({ r: r / 255, g: g / 255, b: b / 255 });
          const theirs = toCuloriOklch({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
          worstL = Math.max(worstL, Math.abs(ours.l - theirs.l));
          worstC = Math.max(worstC, Math.abs(ours.c - (theirs.c ?? 0)));
        }
      }
    }

    expect(worstL).toBeLessThan(1e-6);
    expect(worstC).toBeLessThan(1e-6);
  });

  it("round-trips rgb -> oklch -> rgb", () => {
    for (let r = 0; r <= 255; r += 23) {
      for (let g = 0; g <= 255; g += 29) {
        for (let b = 0; b <= 255; b += 31) {
          const start = { r: r / 255, g: g / 255, b: b / 255 };
          const back = oklchToRgb(rgbToOklch(start));
          // Worst measured round-trip error is ~1.1e-6, from the cbrt pair.
          expect(Math.abs(back.r - start.r)).toBeLessThan(1e-5);
          expect(Math.abs(back.g - start.g)).toBeLessThan(1e-5);
          expect(Math.abs(back.b - start.b)).toBeLessThan(1e-5);
        }
      }
    }
  });

  it("normalises hue to zero for greys, so greys compare equal", () => {
    expect(rgbToOklch({ r: 0.5, g: 0.5, b: 0.5 }).h).toBe(0);
    expect(rgbToOklch({ r: 0.5, g: 0.5, b: 0.5 }).c).toBeLessThan(1e-6);
  });
});

describe("oklch: gamut", () => {
  it("maps every out-of-gamut colour back into sRGB", () => {
    for (let h = 0; h < 360; h += 11) {
      for (let l = 0.05; l < 1; l += 0.07) {
        const mapped = gamutMap({ l, c: 0.45, h });
        expect(inGamut(oklchToRgb(mapped))).toBe(true);
      }
    }
  });

  it("leaves in-gamut colours untouched", () => {
    const col = rgbToOklch({ r: 0.4, g: 0.6, b: 0.8 });
    expect(deltaEOk(gamutMap(col), col)).toBeLessThan(1e-9);
  });

  it("preserves lightness through mapping, which is what contrast is computed from", () => {
    let worst = 0;
    for (let h = 0; h < 360; h += 13) {
      for (let l = 0.1; l < 0.95; l += 0.05) {
        worst = Math.max(worst, Math.abs(gamutMap({ l, c: 0.4, h }).l - l));
      }
    }
    // Ticket 01 measured +0.016 worst case, inside the one-JND budget.
    expect(worst).toBeLessThan(0.02);
  });

  it("confirms max in-gamut chroma varies several-fold across hue", () => {
    // The finding that forces gamut-RELATIVE chroma: a fixed absolute chroma is
    // not hue-portable, so a fixed-chroma ramp gets silently rewritten.
    const at210 = maxChroma(0.55, 210);
    const at300 = maxChroma(0.55, 300);
    expect(at300 / at210).toBeGreaterThan(2.5);
  });

  it("keeps relative chroma in gamut by construction", () => {
    for (let h = 0; h < 360; h += 17) {
      for (let l = 0.1; l < 0.95; l += 0.1) {
        expect(inGamut(oklchToRgb(fromRelativeChroma(l, 1, h)))).toBe(true);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("contrast: metrics against known values", () => {
  it("computes WCAG's extremes exactly", () => {
    expect(wcagRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(wcagRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(wcagRatio([12, 40, 90], [240, 240, 240])).toBeCloseTo(
      wcagRatio([240, 240, 240], [12, 40, 90]),
      10,
    );
  });

  it("reproduces the researched APCA anchors", () => {
    // These are the values ticket 02 tabulated as engine fixtures.
    expect(apcaLc([0x4a, 0x4a, 0x4a], [255, 255, 255])).toBeCloseTo(90, 0);
    expect(apcaLc([0xe4, 0xe4, 0xe4], [0x0b, 0x0b, 0x0c])).toBeCloseTo(-90, 0);
  });

  it("carries polarity, so light-on-light cannot pass as light-on-dark", () => {
    expect(apcaLc([0, 0, 0], [255, 255, 255])).toBeGreaterThan(0);
    expect(apcaLc([255, 255, 255], [0, 0, 0])).toBeLessThan(0);
  });
});

/* -------------------------------------------------------------------------- */

describe("the guarantee", () => {
  it("holds for every character, seed and contrast mode", () => {
    for (const seed of SEEDS) {
      for (const character of CHARACTERS) {
        for (const contrastMode of MODES) {
          const palette = generate({ seed, character: character.id, contrastMode });
          const broken = failures(palette);
          expect(
            broken.map((f) => `${f.theme}/${f.label} Lc=${f.verdict.lc.toFixed(1)} wcag=${f.verdict.wcag.toFixed(2)}`),
          ).toEqual([]);
        }
      }
    }
  });

  it("checks every guaranteed pairing in both themes", () => {
    const palette = generate({ seed: "#3b82f6", character: "calm", contrastMode: "strict" });
    const results = diagnose(palette);
    expect(results.length).toBeGreaterThan(30);
    expect(results.filter((d) => d.theme === "light")).toHaveLength(results.length / 2);
  });

  it("never places a surface in the forbidden mid-tone band", () => {
    for (const seed of SEEDS) {
      for (const character of CHARACTERS) {
        const palette = generate({ seed, character: character.id, contrastMode: "strict" });
        for (const role of ["background", "card", "popover", "muted", "secondary", "accent"] as const) {
          expect(isForbiddenSurface(palette.tokens[role].light.l)).toBe(false);
          expect(isForbiddenSurface(palette.tokens[role].dark.l)).toBe(false);
        }
      }
    }
  });

  it("emits every role in both themes", () => {
    const palette = generate({ seed: "#8b5cf6", character: "vivid", contrastMode: "strict" });
    for (const role of ROLES) {
      expect(oklchToHex(palette.tokens[role].light)).toMatch(/^#[0-9a-f]{6}$/);
      expect(oklchToHex(palette.tokens[role].dark)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("determinism", () => {
  it("produces byte-identical output for identical input", () => {
    const input = { seed: "#e11d48", character: "editorial", contrastMode: "strict" as const };
    expect(exportPalette(generate(input), "globals")).toBe(exportPalette(generate(input), "globals"));
  });

  it("keeps the brand hue across both themes", () => {
    const seed = hexToOklch("#3b82f6")!;
    const palette = generate({ seed: "#3b82f6", character: "calm", contrastMode: "strict" });
    // Hue is the invariant; lightness is re-solved per theme.
    expect(palette.tokens.primary.light.h).toBeCloseTo(seed.h, 4);
    expect(palette.tokens.primary.dark.h).toBeCloseTo(seed.h, 4);
    expect(palette.tokens.primary.light.l).not.toBeCloseTo(palette.tokens.primary.dark.l, 2);
  });

  it("falls back to the default seed rather than throwing on rubbish", () => {
    expect(() => generate({ seed: "not a colour", character: "calm", contrastMode: "strict" })).not.toThrow();
  });
});

/* -------------------------------------------------------------------------- */

describe("hash encoding", () => {
  it("round-trips inputs", () => {
    const input = {
      seed: "#16a34a",
      character: "brutal",
      contrastMode: "relaxed" as const,
      overrides: { background: { light: "#ffffff" }, ring: { dark: "#ff00ff" } },
    };
    const decoded = decodeHash(encodeHash(input));
    expect(decoded.seed).toBe(input.seed);
    expect(decoded.character).toBe(input.character);
    expect(decoded.contrastMode).toBe(input.contrastMode);
    expect(decoded.overrides).toEqual(input.overrides);
  });

  it("carries inputs, not resolved tokens, so old links can be re-solved", () => {
    const encoded = encodeHash({ seed: "#3b82f6", character: "calm", contrastMode: "strict" });
    expect(encoded).toContain("seed=3b82f6");
    expect(encoded.length).toBeLessThan(80);
  });

  it("survives a malformed or hostile hash", () => {
    for (const hash of ["", "#", "#garbage", "#seed=zzzzzz&c=nope&m=??", "#o=badrole:light:xyz"]) {
      const decoded = decodeHash(hash);
      expect(() => generate(decoded)).not.toThrow();
    }
  });
});

describe("exports", () => {
  const palette = generate({ seed: "#3b82f6", character: "calm", contrastMode: "strict" });

  it("emits the Tailwind v4 three-part sandwich, not a themed @theme block", () => {
    const css = exportPalette(palette, "globals");
    expect(css).toContain("@custom-variant dark");
    expect(css).toContain("@theme inline");
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/\.dark\s*\{/);
    // The failure this prevents: theme variables nested under a selector.
    expect(css).not.toMatch(/@theme[^i][^\n]*\{[^}]*\.dark/);
  });

  it("uses :where() so the dark variant matches the themed element itself", () => {
    expect(exportPalette(palette, "globals")).toContain(":where(.dark, .dark *)");
  });

  it("never emits --color-*: initial, which would delete the consumer's palette", () => {
    for (const format of ["globals", "theme"] as const) {
      expect(exportPalette(palette, format)).not.toContain(": initial");
    }
  });

  it("omits our non-shadcn roles from the shadcn export but keeps them in ours", () => {
    expect(exportPalette(palette, "globals")).not.toContain("--success:");
    expect(exportPalette(palette, "theme")).toContain("--success:");
    expect(exportPalette(palette, "theme")).toContain("--link:");
  });

  it("emits color-scheme in every CSS target, or native controls ignore the palette", () => {
    for (const format of ["globals", "theme", "plain"] as const) {
      expect(exportPalette(palette, format)).toContain("color-scheme");
    }
  });

  it("uses light-dark() only in the plain target, never in a Tailwind one", () => {
    expect(exportPalette(palette, "plain")).toContain("light-dark(");
    expect(exportPalette(palette, "globals")).not.toContain("light-dark(");
    expect(exportPalette(palette, "theme")).not.toContain("light-dark(");
  });

  it("emits only gamut-mapped oklch(), never an unrenderable value", () => {
    const css = exportPalette(palette, "theme");
    for (const match of css.matchAll(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/g)) {
      const l = Number(match[1]) / 100;
      const c = Number(match[2]);
      const h = Number(match[3]);
      expect(inGamut(oklchToRgb({ l, c, h }))).toBe(true);
    }
  });

  it("records the assumptions that make the verdict reproducible", () => {
    const json = JSON.parse(exportPalette(palette, "json"));
    expect(json.assumptions.apcaAlgorithm).toBe("0.0.98G-4g");
    expect(json.assumptions.enforced).toEqual(["APCA", "WCAG 2.x"]);
    expect(json.input.seed).toBe("#3b82f6");
  });

  it("produces valid hex for every token in the JSON target", () => {
    const json = JSON.parse(exportPalette(palette, "json"));
    for (const role of ROLES) {
      expect(json.tokens[role].light).toMatch(/^#[0-9a-f]{6}$/);
      expect(json.tokens[role].dark).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("overrides", () => {
  it("applies an override verbatim and lets diagnostics catch the damage", () => {
    const palette = generate({
      seed: "#3b82f6",
      character: "calm",
      contrastMode: "strict",
      overrides: { foreground: { light: "#f2f2f2" } },
    });
    expect(toRgb255(palette.tokens.foreground.light)).toEqual([242, 242, 242]);
    // Unlock removes the guarantee, not the checking.
    expect(failures(palette).length).toBeGreaterThan(0);
  });
});
