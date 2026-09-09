/**
 * Swatches: the secondary surface. Both themes side by side per role, plus the
 * per-role override inputs that unlock mode reveals (ticket 09).
 */

import type { Palette, Role, Theme } from "../palette/index.ts";
import { ROLES, oklchToHex } from "../palette/index.ts";

interface Props {
  palette: Palette;
  unlocked: boolean;
  overrides: Partial<Record<Role, Partial<Record<Theme, string>>>>;
  onOverride: (role: Role, theme: Theme, hex: string) => void;
}

export function Swatches({ palette, unlocked, overrides, onOverride }: Props): React.JSX.Element {
  return (
    <div className="swatch-grid">
      {ROLES.map((role) => {
        const light = oklchToHex(palette.tokens[role].light);
        const dark = oklchToHex(palette.tokens[role].dark);
        const overridden = overrides[role];

        return (
          <div className="swatch" key={role}>
            <div className="swatch-chips">
              <span style={{ background: light }} title={`light ${light}`} />
              <span style={{ background: dark }} title={`dark ${dark}`} />
            </div>
            <div className="swatch-meta">
              <span className="swatch-name">
                --{role}
                {overridden ? " *" : ""}
              </span>
              <code>
                {light} / {dark}
              </code>
            </div>
            {unlocked && (
              <div className="override-row">
                <input
                  type="color"
                  aria-label={`${role} light override`}
                  value={light}
                  onChange={(e) => onOverride(role, "light", e.target.value)}
                />
                <input
                  type="color"
                  aria-label={`${role} dark override`}
                  value={dark}
                  onChange={(e) => onOverride(role, "dark", e.target.value)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
