import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  calories,
  dayTotal,
  fmt,
  goalFor,
  keys,
  status,
  type State,
} from "./domain";
import { MacroLine } from "./ui";
export function History({
  state,
  onDay,
}: {
  state: State;
  onDay: (date: string) => void;
}) {
  const [month, setMonth] = useState("");
  const dates = Array.from(
    new Set([
      ...state.entries.map((e) => e.date),
      ...state.imports.map((i) => i.date),
      ...Object.keys(state.weights),
      ...Object.keys(state.days),
    ]),
  )
    .sort()
    .reverse();
  const shown = dates.filter((d) => !month || d.startsWith(month));
  const pending = (d: string) =>
    state.imports.some((i) => i.date === d && i.conflict) &&
    !state.imports.some((i) => i.date === d && i.conflict && i.selected);
  const chart = shown
    .filter((d) => !pending(d))
    .slice(0, 14)
    .reverse();
  const max = Math.max(
    1,
    ...chart.flatMap((d) => keys.map((k) => dayTotal(state, d)[k])),
  );
  const points = (k: (typeof keys)[number]) =>
    chart
      .map(
        (d, i) =>
          `${30 + (i * 280) / Math.max(1, chart.length - 1)},${140 - (dayTotal(state, d)[k] / max) * 110}`,
      )
      .join(" ");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h1>Your history</h1>
          <p className="muted">Small days, a clearer picture.</p>
        </div>
      </div>
      <label className="field">
        Filter by month
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </label>
      {month && (
        <button className="text-button" onClick={() => setMonth("")}>
          Show all dates
        </button>
      )}
      {chart.length > 0 && (
        <section className="card trend">
          <div className="section-heading">
            <h2>Macro intake</h2>
            <small>Latest {chart.length} recorded days</small>
          </div>
          <div className="chart-legend">
            {keys.map((k) => (
              <span key={k} className={k}>
                <i />
                {k}
              </span>
            ))}
          </div>
          <svg
            viewBox="0 0 340 180"
            role="img"
            aria-label="Macro intake in grams over recorded days. Exact values appear in the history list below."
          >
            <text x="0" y="21">
              {fmt(max)}g
            </text>
            <text x="12" y="145">
              0
            </text>
            {[30, 85, 140].map((y) => (
              <line key={y} x1="30" x2="320" y1={y} y2={y} stroke="#e5e8df" />
            ))}
            {keys.map((k) => (
              <g key={k} className={k}>
                <polyline
                  points={points(k)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                {chart.map((d, i) => (
                  <circle
                    key={d}
                    cx={30 + (i * 280) / Math.max(1, chart.length - 1)}
                    cy={140 - (dayTotal(state, d)[k] / max) * 110}
                    r="3"
                    fill="currentColor"
                  />
                ))}
              </g>
            ))}
            <text x="30" y="169">
              {chart[0].slice(5)}
            </text>
            <text x="275" y="169">
              {chart.at(-1)!.slice(5)}
            </text>
          </svg>
          <p className="fine">
            Recorded days only; gaps are not zero intake. Near target means
            within 10%.
          </p>
        </section>
      )}
      <div className="section-heading">
        <h2>Daily journal</h2>
        <span className="muted">{shown.length} days</span>
      </div>
      {!shown.length && (
        <div className="card empty">
          Your logged days will appear here. Start with a meal on Today.
        </div>
      )}
      {shown.map((d) => {
        const m = dayTotal(state, d),
          g = goalFor(state, d);
        const unresolved =
          state.imports.some((i) => i.date === d && i.conflict) &&
          !state.imports.some((i) => i.date === d && i.conflict && i.selected);
        return (
          <button className="card history-day" key={d} onClick={() => onDay(d)}>
            <div className="between">
              <strong>
                {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
              <ChevronRight size={18} />
            </div>
            <div className="between">
              <span className="muted">{g.name}</span>
              <strong>
                {unresolved ? "Pending review" : fmt(calories(m))}{" "}
                {!unresolved && <small>kcal</small>}
              </strong>
            </div>
            {!unresolved && <MacroLine macros={m} />}
            <div className="history-comparison">
              {!unresolved &&
                keys.map((k) => (
                  <span key={k}>
                    {k[0].toUpperCase()}: {fmt(m[k])} / {fmt(g[k])}g{" "}
                    <b className={`status ${status(m[k], g[k]).toLowerCase()}`}>
                      {status(m[k], g[k])}
                    </b>
                  </span>
                ))}
            </div>
            {state.weights[d] !== undefined && (
              <p className="fine">Weight {fmt(state.weights[d])} kg</p>
            )}
            {unresolved && (
              <p className="notice">
                Conflicting source records · tap to review
              </p>
            )}
          </button>
        );
      })}
    </>
  );
}
