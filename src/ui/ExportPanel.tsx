/**
 * The four export targets (ticket 03), defaulting to shadcn-compatible globals.css.
 */

import { useState } from "react";
import type { ExportFormat, Palette } from "../palette/index.ts";
import { EXPORT_TARGETS, exportPalette } from "../palette/index.ts";

export function ExportPanel({ palette }: { palette: Palette }): React.JSX.Element {
  const [format, setFormat] = useState<ExportFormat>("globals");
  const [copied, setCopied] = useState(false);

  const target = EXPORT_TARGETS.find((t) => t.id === format)!;
  const code = exportPalette(palette, format);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="export-head">
        <div className="export-tabs">
          {EXPORT_TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === format}
              onClick={() => setFormat(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="copy-btn" type="button" onClick={copy}>
          {copied ? "Copied" : `Copy ${target.filename}`}
        </button>
      </div>
      <p className="note" style={{ marginBottom: 12, maxWidth: 760 }}>
        {target.description}
      </p>
      <pre className="code">{code}</pre>
    </>
  );
}
