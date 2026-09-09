/**
 * Guided mode is the default and the product (ticket 09): the exposed controls
 * cannot produce a palette that fails its floors, because every guaranteed token
 * is solved rather than assigned. Unlock reveals per-role overrides and keeps
 * every diagnostic running -- the guarantee goes away, the checking does not.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHARACTERS,
  DEFAULT_SEED,
  decodeHash,
  encodeHash,
  diagnose,
  failures,
  generate,
  getCharacter,
  type ContrastMode,
  type Role,
  type Theme,
} from "./palette/index.ts";
import { Preview } from "./ui/Preview.tsx";
import { Swatches } from "./ui/Swatches.tsx";
import { ContrastTable } from "./ui/ContrastTable.tsx";
import { ExportPanel } from "./ui/ExportPanel.tsx";

type Tab = "preview" | "tokens" | "contrast" | "export";
type Overrides = Partial<Record<Role, Partial<Record<Theme, string>>>>;

const TABS: readonly { id: Tab; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "tokens", label: "Tokens" },
  { id: "contrast", label: "Contrast" },
  { id: "export", label: "Export" },
];

export function App(): React.JSX.Element {
  const initial = useMemo(() => decodeHash(window.location.hash), []);

  const [seed, setSeed] = useState(initial.seed);
  const [character, setCharacter] = useState(initial.character);
  const [contrastMode, setContrastMode] = useState<ContrastMode>(initial.contrastMode);
  const [overrides, setOverrides] = useState<Overrides>(initial.overrides ?? {});
  const [unlocked, setUnlocked] = useState(Object.keys(initial.overrides ?? {}).length > 0);
  const [theme, setTheme] = useState<Theme>("light");
  const [tab, setTab] = useState<Tab>("preview");

  const input = useMemo(
    () => ({
      seed,
      character,
      contrastMode,
      ...(unlocked && Object.keys(overrides).length > 0 ? { overrides } : {}),
    }),
    [seed, character, contrastMode, overrides, unlocked],
  );

  const palette = useMemo(() => generate(input), [input]);
  const broken = useMemo(() => failures(palette), [palette]);
  const checked = useMemo(() => diagnose(palette).length, [palette]);

  // The hash is the source of truth, and it carries inputs rather than resolved
  // tokens (ticket 07) so an old link can be re-solved if the floors ever move.
  useEffect(() => {
    const next = `#${encodeHash(input)}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [input]);

  const setOverride = useCallback((role: Role, forTheme: Theme, hex: string) => {
    setOverrides((prev) => ({ ...prev, [role]: { ...prev[role], [forTheme]: hex } }));
  }, []);

  const resetOverrides = useCallback(() => setOverrides({}), []);

  const activeCharacter = getCharacter(character);
  const seedValid = /^#[0-9a-f]{6}$/i.test(seed);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>Palette Creator</h1>
          <p>One seed colour, a whole contrast-safe design system.</p>
        </div>

        <div className="field">
          <label htmlFor="seed">Seed colour</label>
          <div className="seed-row">
            <input
              type="color"
              id="seed"
              value={seedValid ? seed : DEFAULT_SEED}
              onChange={(e) => setSeed(e.target.value)}
            />
            <input
              className="text-input"
              aria-label="Seed hex"
              value={seed}
              spellCheck={false}
              onChange={(e) => setSeed(e.target.value)}
            />
          </div>
          <p className="note">
            Only the hue and relative chroma survive into the palette. Every lightness is
            re-solved per theme, which is what lets both themes hold their floors while
            staying the same brand.
          </p>
        </div>

        <div className="field">
          <span className="field-label">Character</span>
          <div className="character-grid">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="character-btn"
                aria-pressed={c.id === character}
                onClick={() => setCharacter(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <p className="character-desc">{activeCharacter.description}</p>
        </div>

        <div className="field">
          <span className="field-label">Body text assumption</span>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={contrastMode === "strict"}
              onClick={() => setContrastMode("strict")}
            >
              16px / 400
            </button>
            <button
              type="button"
              aria-pressed={contrastMode === "relaxed"}
              onClick={() => setContrastMode("relaxed")}
            >
              18px / 400
            </button>
          </div>
          <p className="note">
            {contrastMode === "strict"
              ? "Lc 90 — safe at 16px regular. The stricter target."
              : "Lc 75 — requires at least 18px/400, 16px/500 or 14px/700. Softer text."}
          </p>
        </div>

        <div className={`status ${broken.length === 0 ? "pass" : "fail"}`}>
          {broken.length === 0
            ? `All ${checked} guaranteed pairings clear both floors`
            : `${broken.length} pairing${broken.length === 1 ? "" : "s"} failing`}
        </div>

        <div className="field">
          <span className="field-label">Manual override</span>
          <div className="segmented">
            <button type="button" aria-pressed={!unlocked} onClick={() => setUnlocked(false)}>
              Guided
            </button>
            <button type="button" aria-pressed={unlocked} onClick={() => setUnlocked(true)}>
              Unlocked
            </button>
          </div>
          <p className="note">
            {unlocked
              ? "Per-token colour inputs are on the Tokens tab. Diagnostics keep running, but nothing is guaranteed any more — you are the guardrail now."
              : "Controls cannot produce a failing palette. Unlock to override individual tokens by hand."}
          </p>
          {unlocked && Object.keys(overrides).length > 0 && (
            <button className="link-btn" type="button" onClick={resetOverrides}>
              Clear {Object.keys(overrides).length} override
              {Object.keys(overrides).length === 1 ? "" : "s"}
            </button>
          )}
        </div>

        <p className="note" style={{ marginTop: "auto" }}>
          Enforces APCA and WCAG 2.x together. Not a claim of legibility for every reader on
          every screen — no two-colour metric models that.
        </p>
      </aside>

      <main className="main">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <div className="theme-toggle">
            <div className="segmented">
              <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                Light
              </button>
              <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
                Dark
              </button>
            </div>
          </div>
        </div>

        <div className="tab-body">
          {tab === "preview" && <Preview palette={palette} theme={theme} />}
          {tab === "tokens" && (
            <Swatches
              palette={palette}
              unlocked={unlocked}
              overrides={overrides}
              onOverride={setOverride}
            />
          )}
          {tab === "contrast" && <ContrastTable palette={palette} theme={theme} />}
          {tab === "export" && <ExportPanel palette={palette} />}
        </div>
      </main>
    </div>
  );
}
