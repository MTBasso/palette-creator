/**
 * The mock preview (ticket 04).
 *
 * The primary surface: a palette is judged by looking at a realistic UI, not at
 * swatches. Every role in the schema is exercised here at least once -- that is
 * the point, and it is how the role list was derived in the first place.
 */

import type { Palette, Theme } from "../palette/index.ts";
import { cssVariables } from "../palette/index.ts";

const PREVIEW_CSS = `
.pv {
  background: var(--background);
  color: var(--foreground);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  display: grid;
  grid-template-columns: 208px 1fr;
  min-block-size: 660px;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  container-type: inline-size;
}
@media (max-width: 860px) {
  .pv { grid-template-columns: 1fr; }
  .pv-side { display: none; }
}
.pv-side {
  background: var(--card);
  border-right: 1px solid var(--border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pv-logo {
  display: flex; align-items: center; gap: 9px;
  padding: 6px 8px 16px; font-weight: 700; letter-spacing: -0.01em;
  color: var(--card-foreground);
}
.pv-mark {
  inline-size: 26px; block-size: 26px; border-radius: 7px;
  background: var(--primary); color: var(--primary-foreground);
  display: grid; place-items: center; font-size: 13px; font-weight: 800;
}
.pv-nav {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 7px;
  color: var(--muted-foreground); font-weight: 500;
}
.pv-nav.active { background: var(--accent); color: var(--accent-foreground); font-weight: 600; }
.pv-dot { inline-size: 7px; block-size: 7px; border-radius: 2px; background: currentColor; opacity: 0.65; }
.pv-side-foot { margin-block-start: auto; padding: 10px 8px 0; border-top: 1px solid var(--border); }

.pv-main { display: flex; flex-direction: column; min-inline-size: 0; }
.pv-top {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 18px; border-bottom: 1px solid var(--border); background: var(--card);
}
.pv-search {
  flex: 1; max-inline-size: 300px;
  background: var(--background); color: var(--foreground);
  border: 1px solid var(--input); border-radius: 8px; padding: 7px 11px; font: inherit; font-size: 13px;
}
.pv-search::placeholder { color: var(--muted-foreground); }
.pv-search:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; border-color: var(--ring); }
.pv-avatar {
  margin-inline-start: auto; inline-size: 30px; block-size: 30px; border-radius: 999px;
  background: var(--secondary); color: var(--secondary-foreground);
  display: grid; place-items: center; font-size: 12px; font-weight: 700;
}
.pv-body { padding: 20px 18px 26px; display: flex; flex-direction: column; gap: 18px; }
.pv-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.pv-h1 { margin: 0 0 3px; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
.pv-sub { margin: 0; color: var(--muted-foreground); font-size: 13px; }
.pv-actions { margin-inline-start: auto; display: flex; gap: 8px; flex-wrap: wrap; }

.btn { border: 1px solid transparent; border-radius: 8px; padding: 8px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-primary { background: var(--primary); color: var(--primary-foreground); }
.btn-secondary { background: var(--secondary); color: var(--secondary-foreground); border-color: var(--border); }
.btn-ghost { background: transparent; color: var(--foreground); border-color: var(--border); }
.btn-destructive { background: var(--destructive); color: var(--destructive-foreground); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

.pv-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); gap: 12px; }
.card { background: var(--card); color: var(--card-foreground); border: 1px solid var(--border); border-radius: 11px; padding: 14px 16px; }
.pv-stat-label { color: var(--muted-foreground); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.pv-stat-value { font-size: 25px; font-weight: 700; letter-spacing: -0.02em; margin-block: 5px 3px; }
.pv-delta { font-size: 12px; font-weight: 600; }

.pv-two { display: grid; grid-template-columns: 1.55fr 1fr; gap: 12px; }
@media (max-width: 860px) { .pv-two { grid-template-columns: 1fr; } }

.pv-chart { display: flex; align-items: flex-end; gap: 9px; block-size: 132px; margin-block-start: 14px; }
.pv-bar { flex: 1; border-radius: 5px 5px 2px 2px; min-block-size: 8px; }
.pv-legend { display: flex; gap: 12px; flex-wrap: wrap; margin-block-start: 12px; font-size: 12px; color: var(--muted-foreground); }
.pv-legend span { display: inline-flex; align-items: center; gap: 5px; }
.pv-key { inline-size: 9px; block-size: 9px; border-radius: 3px; }

table.pv-table { inline-size: 100%; border-collapse: collapse; font-size: 13px; }
.pv-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); padding: 0 0 9px; font-weight: 600; }
.pv-table td { padding: 10px 0; border-top: 1px solid var(--border); }
.pv-table tr:first-child td { border-top: 1px solid var(--border); }

.badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.badge-success { background: var(--success); color: var(--success-foreground); }
.badge-warning { background: var(--warning); color: var(--warning-foreground); }
.badge-destructive { background: var(--destructive); color: var(--destructive-foreground); }
.badge-muted { background: var(--muted); color: var(--muted-foreground); }

.pv-field { display: flex; flex-direction: column; gap: 6px; margin-block-end: 12px; }
.pv-field label { font-size: 12px; font-weight: 600; }
.pv-field input, .pv-field select {
  background: var(--background); color: var(--foreground);
  border: 1px solid var(--input); border-radius: 8px; padding: 8px 11px; font: inherit; font-size: 13px;
}
.pv-field input:focus-visible, .pv-field select:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; border-color: var(--ring); }
.pv-hint { font-size: 12px; color: var(--muted-foreground); }

.pv-notice { border-radius: 10px; padding: 11px 14px; font-size: 13px; display: flex; gap: 10px; align-items: flex-start; }
.pv-notice-warn { background: var(--muted); color: var(--foreground); border-inline-start: 3px solid var(--warning); }

.pv-popover { background: var(--popover); color: var(--popover-foreground); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; box-shadow: 0 8px 26px rgb(0 0 0 / 0.14); }

a.pv-link { color: var(--link); text-decoration: underline; text-underline-offset: 2px; font-weight: 500; }
.pv-foot { color: var(--muted-foreground); font-size: 12px; display: flex; gap: 14px; flex-wrap: wrap; padding-block-start: 4px; border-top: 1px solid var(--border); margin-block-start: 2px; padding-block: 12px 0; }
`;

const BARS = [58, 82, 44, 96, 71, 63, 88];

export function Preview({ palette, theme }: { palette: Palette; theme: Theme }): React.JSX.Element {
  const vars = cssVariables(palette, theme) as React.CSSProperties;

  return (
    <>
      <style>{PREVIEW_CSS}</style>
      <div className="pv" style={vars}>
        <aside className="pv-side">
          <div className="pv-logo">
            <span className="pv-mark">N</span>
            Northwind
          </div>
          <div className="pv-nav active">
            <span className="pv-dot" />
            Overview
          </div>
          <div className="pv-nav">
            <span className="pv-dot" />
            Deployments
          </div>
          <div className="pv-nav">
            <span className="pv-dot" />
            Analytics
          </div>
          <div className="pv-nav">
            <span className="pv-dot" />
            Members
          </div>
          <div className="pv-nav">
            <span className="pv-dot" />
            Settings
          </div>
          <div className="pv-side-foot">
            <div className="pv-hint">
              Free plan &middot; <a className="pv-link" href="#upgrade">Upgrade</a>
            </div>
          </div>
        </aside>

        <div className="pv-main">
          <div className="pv-top">
            <input className="pv-search" placeholder="Search projects, people, docs..." readOnly />
            <span className="badge badge-muted">v4.2.0</span>
            <span className="pv-avatar">MB</span>
          </div>

          <div className="pv-body">
            <div className="pv-head">
              <div>
                <h1 className="pv-h1">Overview</h1>
                <p className="pv-sub">Everything shipping across your three active projects.</p>
              </div>
              <div className="pv-actions">
                <button className="btn btn-ghost" type="button">Export</button>
                <button className="btn btn-secondary" type="button">Invite</button>
                <button className="btn btn-primary" type="button">New project</button>
              </div>
            </div>

            <div className="pv-cards">
              <div className="card">
                <div className="pv-stat-label">Requests</div>
                <div className="pv-stat-value">248k</div>
                <div className="pv-delta" style={{ color: "var(--success)" }}>+12.4% this week</div>
              </div>
              <div className="card">
                <div className="pv-stat-label">Error rate</div>
                <div className="pv-stat-value">0.42%</div>
                <div className="pv-delta" style={{ color: "var(--destructive)" }}>+0.08% this week</div>
              </div>
              <div className="card">
                <div className="pv-stat-label">p95 latency</div>
                <div className="pv-stat-value">184ms</div>
                <div className="pv-delta" style={{ color: "var(--muted-foreground)" }}>No change</div>
              </div>
            </div>

            <div className="pv-two">
              <div className="card">
                <div className="pv-stat-label">Traffic by source</div>
                <div className="pv-chart">
                  {BARS.map((h, i) => (
                    <div
                      key={i}
                      className="pv-bar"
                      style={{
                        height: `${h}%`,
                        background: `var(--chart-${(i % 5) + 1})`,
                      }}
                    />
                  ))}
                </div>
                <div className="pv-legend">
                  {["Direct", "Search", "Social", "Referral", "Email"].map((name, i) => (
                    <span key={name}>
                      <i className="pv-key" style={{ background: `var(--chart-${i + 1})` }} />
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="pv-stat-label" style={{ marginBottom: 12 }}>Quick deploy</div>
                <div className="pv-field">
                  <label htmlFor="pv-branch">Branch</label>
                  <input id="pv-branch" defaultValue="main" />
                </div>
                <div className="pv-field">
                  <label htmlFor="pv-env">Environment</label>
                  <select id="pv-env" defaultValue="prod">
                    <option value="prod">Production</option>
                    <option value="staging">Staging</option>
                  </select>
                </div>
                <p className="pv-hint" style={{ marginTop: 0, marginBottom: 12 }}>
                  Deploys run migrations automatically. <a className="pv-link" href="#docs">Read the docs</a>
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="button">Deploy</button>
                  <button className="btn btn-ghost" type="button" disabled>Rollback</button>
                </div>
              </div>
            </div>

            <div className="pv-notice pv-notice-warn">
              <strong>Heads up.</strong>
              <span>Two members have not enabled two-factor authentication.</span>
            </div>

            <div className="card">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><a className="pv-link" href="#p1">northwind-api</a></td>
                    <td>main</td>
                    <td><span className="badge badge-success">Passing</span></td>
                    <td style={{ color: "var(--muted-foreground)" }}>2 min ago</td>
                  </tr>
                  <tr>
                    <td><a className="pv-link" href="#p2">northwind-web</a></td>
                    <td>feat/checkout</td>
                    <td><span className="badge badge-warning">Building</span></td>
                    <td style={{ color: "var(--muted-foreground)" }}>14 min ago</td>
                  </tr>
                  <tr>
                    <td><a className="pv-link" href="#p3">northwind-docs</a></td>
                    <td>main</td>
                    <td><span className="badge badge-destructive">Failed</span></td>
                    <td style={{ color: "var(--muted-foreground)" }}>1 hour ago</td>
                  </tr>
                  <tr>
                    <td><a className="pv-link" href="#p4">legacy-worker</a></td>
                    <td>main</td>
                    <td><span className="badge badge-muted">Archived</span></td>
                    <td style={{ color: "var(--muted-foreground)" }}>3 months ago</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pv-popover" style={{ maxWidth: 420 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>Delete this project?</strong>
              <p className="pv-hint" style={{ margin: "0 0 12px" }}>
                This removes all deployments and cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-destructive" type="button">Delete</button>
                <button className="btn btn-ghost" type="button">Cancel</button>
              </div>
            </div>

            <div className="pv-foot">
              <span>&copy; 2026 Northwind</span>
              <a className="pv-link" href="#privacy">Privacy</a>
              <a className="pv-link" href="#terms">Terms</a>
              <a className="pv-link" href="#status">Status</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
