/**
 * Every guaranteed pairing, both metrics, always visible.
 *
 * Ticket 02's third point: showing APCA as the reason a value was rejected where
 * WCAG alone would have passed it is the tool's actual differentiator over every
 * WCAG-only palette generator, so it should not be hidden behind a toggle.
 */

import type { Palette, Theme } from "../palette/index.ts";
import { diagnose, bindingSummary } from "../palette/index.ts";

export function ContrastTable({ palette, theme }: { palette: Palette; theme: Theme }): React.JSX.Element {
  const rows = diagnose(palette).filter((d) => d.theme === theme);
  const binding = bindingSummary(palette)[theme];

  return (
    <>
      <p className="note" style={{ marginBottom: 12, maxWidth: 720 }}>
        Showing the <strong>{theme}</strong> theme. Both floors are hard: a pairing must clear
        APCA and WCAG. In this theme APCA is the binding constraint on{" "}
        <strong>{binding.apca}</strong> pairings and WCAG on <strong>{binding.wcag}</strong> — the
        split reverses between themes, which is why enforcing one metric alone would leave the
        other theme under-constrained.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pairing</th>
              <th>APCA Lc</th>
              <th>Floor</th>
              <th>WCAG</th>
              <th>Floor</th>
              <th>Binding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={`${d.fg}-${d.bg}-${i}`}>
                <td>{d.label}</td>
                <td className={`metric ${d.verdict.passesLc ? "ok" : "no"}`}>
                  {d.verdict.lc.toFixed(1)}
                </td>
                <td className="metric" style={{ color: "var(--chrome-muted)" }}>
                  {d.verdict.floors.lc}
                </td>
                <td className={`metric ${d.verdict.passesWcag ? "ok" : "no"}`}>
                  {d.verdict.wcag.toFixed(2)}:1
                </td>
                <td className="metric" style={{ color: "var(--chrome-muted)" }}>
                  {d.verdict.floors.wcag === 0 ? "n/a" : `${d.verdict.floors.wcag}:1`}
                </td>
                <td>
                  <span
                    className={`pill ${d.verdict.binding === "apca" ? "apca" : d.verdict.binding === "wcag" ? "wcag" : ""}`}
                  >
                    {d.verdict.binding}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
