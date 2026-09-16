import { useState } from "react";
import { Download, Upload, Check, Calculator } from "lucide-react";
import {
  calculateGoal,
  calories,
  dateKey,
  fmt,
  keys,
  stateSchema,
  type Goal,
  type Profile,
  type State,
  type Macros,
} from "./domain";
import { MacroFields, MacroLine, NumberField, macrosFrom } from "./ui";
import { download } from "./storage";
export function Goals({
  state,
  update,
  notify,
}: {
  state: State;
  update: (s: State) => boolean;
  notify: (s: string) => void;
}) {
  const [preset, setPreset] = useState(state.presets[0].id);
  const [calc, setCalc] = useState<ReturnType<typeof calculateGoal>>();
  const [error, setError] = useState("");
  const [goalPreview, setGoalPreview] = useState<{
    key: string;
    macros: Macros;
  }>();
  const [activeTab, setActiveTab] = useState<"targets" | "calculator" | "data">(
    "targets",
  );
  const selected =
    state.presets.find((p) => p.id === preset) ?? state.presets[0];
  function saveGoal(goal: Goal) {
    if (!goal.name.trim()) {
      notify("Enter a preset name.");
      return;
    }
    const today = dateKey();
    const days = { ...state.days };
    if (!days[today] || days[today].goal.id === goal.id)
      days[today] = { goal: { ...goal } };
    if (
      update({
        ...state,
        presets: state.presets.map((p) => (p.id === goal.id ? goal : p)),
        days,
      })
    )
      notify("Targets saved. Previous days keep their targets.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS</span>
          <h1>Goals & profile</h1>
          <p className="muted">A plan that fits your day.</p>
        </div>
      </div>
      <div className="segmented">
        {(["targets", "calculator", "data"] as const).map((t) => (
          <button
            key={t}
            className={activeTab === t ? "active" : ""}
            onClick={() => setActiveTab(t)}
          >
            {t === "targets"
              ? "My targets"
              : t === "calculator"
                ? "Calculator"
                : "My data"}
          </button>
        ))}
      </div>
      {activeTab === "targets" && (
        <section className="card">
          <h2>Daily presets</h2>
          <p className="muted">
            Pick a preset on Today. Changes here apply to future days and today
            if this preset is active.
          </p>
          <label className="field">
            Preset
            <select
              value={selected.id}
              onChange={(e) => setPreset(e.target.value)}
            >
              {state.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <form
            key={JSON.stringify(selected)}
            onChange={(e) =>
              setGoalPreview({
                key: JSON.stringify(selected),
                macros: macrosFrom(new FormData(e.currentTarget)),
              })
            }
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              saveGoal({
                ...selected,
                ...macrosFrom(d),
                name: String(d.get("name")).trim(),
              });
            }}
          >
            <label className="field">
              Preset name
              <input name="name" defaultValue={selected.name} required />
            </label>
            <MacroFields value={selected} />
            <p className="preview">
              Calculated calorie target{" "}
              <strong>
                {fmt(
                  calories(
                    goalPreview?.key === JSON.stringify(selected)
                      ? goalPreview.macros
                      : selected,
                  ),
                )}{" "}
                kcal
              </strong>
            </p>
            <button className="primary full">Save targets</button>
          </form>
        </section>
      )}
      {activeTab === "calculator" && (
        <section className="card">
          <h2>
            <Calculator size={20} /> Goal calculator
          </h2>
          <p className="muted">
            The fat-loss formula from your spreadsheet. Planning estimates, not
            medical advice.
          </p>
          <form
            onChange={() => {
              setCalc(undefined);
              setError("");
            }}
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const p: Profile = {
                bmr: Number(d.get("bmr")),
                weight: Number(d.get("weight")),
                currentFat: Number(d.get("currentFat")),
                targetFat: Number(d.get("targetFat")),
                days: Number(d.get("days")),
                minutes: Number(d.get("minutes")),
                cardio: Number(d.get("cardio")),
                intensity: d.get("intensity") as Profile["intensity"],
                activity: d.get("activity") as Profile["activity"],
                split: macrosFrom(d),
              };
              try {
                const result = calculateGoal(p);
                setCalc(result);
                update({ ...state, profile: p });
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <div className="two-col">
              <NumberField
                name="bmr"
                label="BMR (kcal / day)"
                value={state.profile.bmr || ""}
                min={1}
              />
              <NumberField
                name="weight"
                label="Body weight (kg)"
                value={state.profile.weight || ""}
                min={1}
              />
              <NumberField
                name="currentFat"
                label="Current body fat (%)"
                value={state.profile.currentFat || ""}
                max={99.9}
              />
              <NumberField
                name="targetFat"
                label="Target body fat (%)"
                value={state.profile.targetFat || ""}
                max={99.9}
              />
              <NumberField
                name="days"
                label="Time frame (days)"
                value={state.profile.days}
                min={1}
                step="1"
              />
              <NumberField
                name="minutes"
                label="Workout (minutes / day)"
                value={state.profile.minutes}
              />
              {(["intensity", "activity"] as const).map((k) => (
                <label className="field" key={k}>
                  {k === "intensity"
                    ? "Workout intensity"
                    : "Lifestyle activity"}
                  <select name={k} defaultValue={state.profile[k]}>
                    {["Low", "Medium", "High"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
              ))}
              <NumberField
                name="cardio"
                label="Additional cardio (kcal)"
                value={state.profile.cardio}
              />
            </div>
            <h3>Macro split</h3>
            <div className="three-col">
              {keys.map((k) => (
                <NumberField
                  key={k}
                  name={k}
                  label={`${k[0].toUpperCase() + k.slice(1)} (%)`}
                  value={state.profile.split[k]}
                  max={100}
                />
              ))}
            </div>
            <button className="primary full">Calculate recommendation</button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {calc && (
            <div className="recommendation">
              <h3>Your estimate</h3>
              <dl>
                {[
                  ["Estimated weight loss", `${fmt(calc.weightLoss)} kg`],
                  ["Workout", `${fmt(calc.workout)} kcal`],
                  ["Lifestyle activity", `${fmt(calc.lifestyle)} kcal`],
                  ["Total expenditure", `${fmt(calc.expenditure)} kcal`],
                  ["Required deficit", `${fmt(calc.deficit)} kcal`],
                  ["Daily intake", `${fmt(calc.intake)} kcal`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <MacroLine macros={calc.macros} />
              {calc.intake < state.profile.bmr && (
                <p className="notice">
                  This estimate is below your entered BMR. Review the time frame
                  and target before using it.
                </p>
              )}
              <label className="field spaced">
                Apply to preset
                <select
                  value={selected.id}
                  onChange={(e) => setPreset(e.target.value)}
                >
                  {state.presets.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary full"
                onClick={() => saveGoal({ ...selected, ...calc.macros })}
              >
                <Check size={18} />
                Use these targets
              </button>
            </div>
          )}
          <details className="spaced">
            <summary>How this is calculated</summary>
            <p className="fine">
              Weight to lose = (current body fat − target body fat) ÷ 100 ×
              weight. Deficit = weight to lose × 7,700 ÷ days. Workout = 0.081
              (high), 0.070 (medium), or 0.065 (low) × weight × minutes.
              Lifestyle = 30%, 20%, or 10% of BMR. Intake = BMR + workout +
              lifestyle + cardio − deficit. Macro allocations use 4 / 4 / 9 kcal
              per gram.
            </p>
          </details>
        </section>
      )}
      {activeTab === "data" && (
        <>
          <section className="card">
            <h2>Your data stays here</h2>
            <p className="muted">
              Saved locally on this device. Export a backup to transfer it to
              another device or restore it later. Each installation has its own
              data. No account or cloud sync.
            </p>
            <button
              className="secondary full"
              onClick={async () => {
                try {
                  if (await download(`daily-backup-${dateKey()}.json`, state))
                    notify("Backup exported.");
                } catch {
                  notify("Backup could not be saved. Please try again.");
                }
              }}
            >
              <Download size={18} />
              Export backup
            </button>
            <label className="secondary full file-button">
              <Upload size={18} />
              Import JSON backup
              <input
                aria-label="Import JSON backup"
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const data = stateSchema.parse(
                      JSON.parse(await file.text()),
                    );
                    if (
                      confirm(
                        `Import ${data.foods.length} foods and ${data.imports.length} historical records? This replaces current app data. Export a backup first.`,
                      )
                    ) {
                      if (update(data))
                        notify(
                          "Import complete. Your data is saved on this device.",
                        );
                    }
                  } catch {
                    notify(
                      "Import failed: choose a Daily JSON backup or converted migration file, not an Excel workbook.",
                    );
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <p className="fine">
              Accepts Daily .json files. Excel (.xlsx) files need the workbook
              conversion script first; the converter maps sheet names and
              columns before import.
            </p>
          </section>
          <section className="card">
            <h2>Spreadsheet import notes</h2>
            {!state.notes.length ? (
              <p className="muted">
                No spreadsheet imported yet. Use the migration file generated
                from your workbook.
              </p>
            ) : (
              <>
                <p className="muted">
                  Original source cells are preserved in your backup. Unclear
                  records are excluded from totals until resolved.
                </p>
                <ul className="notes">
                  {state.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
