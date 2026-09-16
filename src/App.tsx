import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import {
  Apple,
  BookOpen,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Flame,
  History as HistoryIcon,
  Leaf,
  Plus,
  SlidersHorizontal,
  Sun,
  Utensils,
  Coffee,
  Moon,
  Check,
  Scale,
} from "lucide-react";
import {
  calories,
  dateKey,
  dayTotal,
  fmt,
  goalFor,
  keys,
  moveDate,
  total,
  type Entry,
  type Food,
  type State,
} from "./domain";
import { download, readState, saveState, STORAGE_KEY } from "./storage";
import { FoodList, MacroLine, Modal, NumberField, SearchBox } from "./ui";
import { FoodEditor, LogEditor, RecipeEditor } from "./editors";
import { Goals } from "./Goals";
import { History } from "./History";
type View = "Today" | "History" | "Foods" | "Recipes" | "Goals";
type Editor =
  | { type: "log"; meal: Entry["meal"]; entry?: Entry }
  | { type: "food" | "recipe"; food?: Food }
  | { type: "weight" }
  | null;
export default function App() {
  const [loaded] = useState(() => {
    try {
      return { data: readState(), error: "" };
    } catch {
      return {
        data: null,
        error:
          "Your saved data could not be read. Export the original data below before restoring a backup. Nothing has been overwritten.",
      };
    }
  });
  const [state, setState] = useState<State | null>(loaded.data);
  const [view, setView] = useState<View>("Today");
  const [date, setDate] = useState(dateKey());
  const [editor, setEditor] = useState<Editor>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    const handle = NativeApp.addListener("backButton", () => {
      const close = document.querySelector<HTMLButtonElement>(
        'dialog[open] button[aria-label="Close"]',
      );
      if (close) close.click();
      else if (view !== "Today") setView("Today");
      else void NativeApp.minimizeApp();
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [view]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          setState(readState());
          setEditor(null);
          setToast("Updated from another tab.");
        } catch {
          setStorageError(
            "Data changed in another tab but could not be read. Export a backup before reloading.",
          );
        }
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function update(next: State) {
    try {
      saveState(next);
      setState(next);
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "Unable to save. Storage may be full or unavailable. Your change was not applied. Export a backup from Goals → My data.",
      );
      return false;
    }
  }
  if (!state)
    return (
      <main className="recovery card">
        <h1>Let’s protect your data</h1>
        <p role="alert">{loaded.error}</p>
        <button
          onClick={async () => {
            try {
              await download("daily-recovery.json", {
                original: localStorage.getItem(STORAGE_KEY),
              });
            } catch {
              setStorageError(
                "Recovery backup could not be saved. Please try again.",
              );
            }
          }}
        >
          Export original data
        </button>
        {storageError && <p role="alert">{storageError}</p>}
        <p>
          To restore a backup, clear only this site’s storage after saving the
          original, then reload and import your backup in Goals.
        </p>
      </main>
    );
  const s = state;
  const goal = goalFor(s, date);
  const macros = dayTotal(s, date);
  const energy = calories(macros),
    target = calories(goal);
  const foods = s.foods.filter((f) => !f.deleted);
  const entries = s.entries.filter((e) => e.date === date);
  const recent = Array.from(
    new Set(
      [...s.entries]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((e) => e.foodId),
    ),
  );
  function saveFood(f: Food) {
    if (!f.name.trim() || !f.unit.trim()) {
      setToast("Name and unit cannot be blank.");
      return;
    }
    if (update({ ...s, foods: [...s.foods.filter((x) => x.id !== f.id), f] })) {
      setEditor(null);
      setToast(
        f.type === "recipe"
          ? "Recipe saved to your food library."
          : "Food saved.",
      );
    }
  }
  function deleteFood(f: Food) {
    const refs = s.entries.filter((e) => e.foodId === f.id).length;
    const recipes = s.foods.filter(
      (x) => !x.deleted && x.ingredients?.some((i) => i.foodId === f.id),
    ).length;
    if (
      confirm(
        `Delete “${f.name}” from the library? ${refs} logged entries and ${recipes} recipes referencing it will keep their saved nutrition.`,
      )
    ) {
      if (
        update({
          ...s,
          foods: s.foods.map((x) =>
            x.id === f.id ? { ...x, deleted: true } : x,
          ),
        })
      ) {
        setEditor(null);
        setToast("Removed from library. Historical nutrition is preserved.");
      }
    }
  }
  function switchView(v: View) {
    setView(v);
    setQuery("");
    window.scrollTo({ top: 0 });
  }
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchView("Today");
            setDate(dateKey());
          }}
        >
          <span className="brand-icon">
            <Leaf size={20} />
          </span>
          daily<span className="brand-dot">.</span>
        </a>
        <span className="local-status">
          <span />
          Saved on this device
        </span>
      </header>
      <main>
        {storageError && (
          <div role="alert" className="error">
            {storageError}
          </div>
        )}
        {view === "Today" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">ONE MEAL AT A TIME</span>
                <h1>
                  {date === dateKey() ? "Today’s balance" : "Daily balance"}
                </h1>
                <p className="muted">
                  A little clarity for your daily nutrition.
                </p>
              </div>
              <span className="sun-mark">
                <Sun size={28} />
              </span>
            </div>
            <div className="date-nav">
              <button
                className="icon-button"
                aria-label="Previous day"
                onClick={() => setDate(moveDate(date, -1))}
              >
                <ChevronLeft />
              </button>
              <label>
                <input
                  aria-label="Selected date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) setDate(e.target.value);
                  }}
                />
              </label>
              <button
                className="icon-button"
                aria-label="Next day"
                onClick={() => setDate(moveDate(date, 1))}
              >
                <ChevronRight />
              </button>
              {date !== dateKey() && (
                <button
                  className="text-button"
                  onClick={() => setDate(dateKey())}
                >
                  Today
                </button>
              )}
            </div>
            <section className="balance card">
              <div className="section-heading">
                <span className="eyebrow">DAILY OVERVIEW</span>
                <label className="preset-select">
                  <select
                    aria-label="Daily goal preset"
                    value={
                      s.presets.some((p) => p.id === goal.id) ? goal.id : ""
                    }
                    onChange={(e) => {
                      const p = s.presets.find((x) => x.id === e.target.value);
                      if (p)
                        update({
                          ...s,
                          days: { ...s.days, [date]: { goal: { ...p } } },
                        });
                    }}
                  >
                    {!s.presets.some((p) => p.id === goal.id) && (
                      <option value="">{goal.name}</option>
                    )}
                    {s.presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="energy">
                <div>
                  <span className="energy-label">
                    <Flame size={17} />
                    Calories
                  </span>
                  <div>
                    <strong>{fmt(energy)}</strong>
                    <span className="muted"> / {fmt(target)} kcal</span>
                  </div>
                  <p>
                    {energy > target
                      ? `${fmt(energy - target)} over target`
                      : `${fmt(target - energy)} kcal remaining`}
                  </p>
                </div>
                <div
                  className="energy-ring"
                  style={{
                    background: `conic-gradient(var(--green) ${Math.min(100, target ? (energy / target) * 100 : 0)}%, #e4e9d9 0)`,
                  }}
                >
                  <span>
                    {target ? Math.round((energy / target) * 100) : 0}
                    <small>%</small>
                  </span>
                </div>
              </div>
              <div className="macro-grid">
                {keys.map((k) => (
                  <div key={k} className={`macro-card ${k}`}>
                    <span className="macro-name">
                      <i />
                      {k[0].toUpperCase() + k.slice(1)}
                    </span>
                    <div className="macro-amount">
                      {fmt(macros[k])}
                      <small> / {fmt(goal[k])}g</small>
                    </div>
                    <progress
                      aria-label={`${k} progress`}
                      max={goal[k] || 1}
                      value={Math.min(macros[k], goal[k] || 1)}
                    />
                    <small className="remaining">
                      {fmt(Math.abs(goal[k] - macros[k]))}g{" "}
                      {macros[k] > goal[k] ? "over" : "left"}
                    </small>
                  </div>
                ))}
              </div>
            </section>
            {s.imports.filter((i) => i.date === date).length > 0 && (
              <section className="card imported">
                <h3>From your spreadsheet</h3>
                <p className="fine">
                  Imported totals are a baseline. New foods logged on this date
                  are added to it.
                </p>
                {s.imports
                  .filter((i) => i.date === date)
                  .map((i) => (
                    <div className="import-record" key={i.id}>
                      <span>{i.source}</span>
                      <MacroLine macros={i.macros} />
                      {i.conflict ? (
                        <button
                          className={i.selected ? "secondary" : "text-button"}
                          onClick={() => {
                            if (
                              confirm(
                                "Use this source record as the historical baseline for this date? The other records remain preserved.",
                              )
                            )
                              update({
                                ...s,
                                imports: s.imports.map((x) =>
                                  x.date === date && x.conflict
                                    ? { ...x, selected: x.id === i.id }
                                    : x,
                                ),
                                days: { ...s.days, [date]: { goal: i.goal } },
                              });
                          }}
                        >
                          {i.selected
                            ? "✓ Selected baseline"
                            : "Use this record"}
                        </button>
                      ) : (
                        <small>Included in daily total</small>
                      )}
                    </div>
                  ))}
                {s.imports.some((i) => i.date === date && i.conflict) &&
                  !s.imports.some((i) => i.date === date && i.selected) && (
                    <p className="notice">
                      This date has conflicting records. Choose one; neither is
                      included yet.
                    </p>
                  )}
              </section>
            )}
            <div className="section-heading meals-heading">
              <h2>Your meals</h2>
              <button
                className="primary small"
                onClick={() => setEditor({ type: "log", meal: "Breakfast" })}
              >
                <Plus size={18} />
                Add food
              </button>
            </div>
            <div className="meals">
              {(
                [
                  { name: "Breakfast", Icon: Coffee },
                  { name: "Lunch", Icon: Sun },
                  { name: "Dinner", Icon: Moon },
                  { name: "Snack", Icon: Apple },
                ] as const
              ).map(({ name, Icon }) => {
                const list = entries.filter((e) => e.meal === name);
                return (
                  <section className="card meal" key={name}>
                    <div className="meal-heading">
                      <span className="meal-icon">
                        <Icon size={20} />
                      </span>
                      <div>
                        <h3>{name}</h3>
                        <small>
                          {list.length
                            ? `${fmt(calories(total(list.map((e) => e.macros))))} kcal`
                            : "Nothing logged yet"}
                        </small>
                      </div>
                      <button
                        className="icon-button add-meal"
                        aria-label={`Add food to ${name}`}
                        onClick={() => setEditor({ type: "log", meal: name })}
                      >
                        <Plus size={21} />
                      </button>
                    </div>
                    {list.map((e) => (
                      <button
                        className="entry"
                        key={e.id}
                        onClick={() =>
                          setEditor({ type: "log", meal: name, entry: e })
                        }
                      >
                        <div className="between">
                          <strong>{e.name}</strong>
                          <small>
                            {fmt(e.quantity)} {e.unit === "100g" ? "g" : e.unit}
                          </small>
                        </div>
                        <MacroLine macros={e.macros} />
                      </button>
                    ))}
                  </section>
                );
              })}
            </div>
            <button
              className="weight-row"
              onClick={() => setEditor({ type: "weight" })}
            >
              <Scale size={19} />
              <span>Body weight</span>
              <strong>
                {s.weights[date] === undefined
                  ? "Add weight"
                  : `${fmt(s.weights[date])} kg`}
              </strong>
              <ChevronRight size={17} />
            </button>
            <p className="footer-note">
              <Check size={14} />
              Your entries save automatically.
            </p>
          </>
        )}
        {view === "History" && (
          <History
            state={s}
            onDay={(d) => {
              setDate(d);
              switchView("Today");
            }}
          />
        )}
        {(view === "Foods" || view === "Recipes") && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR PERSONAL LIBRARY</span>
                <h1>
                  {view === "Foods" ? "Good food, on repeat." : "Made by you."}
                </h1>
                <p className="muted">
                  {view === "Foods"
                    ? "Your everyday foods, ready when you are."
                    : "Turn your ingredients into a reusable recipe."}
                </p>
              </div>
            </div>
            <button
              className="primary library-add"
              onClick={() =>
                setEditor({ type: view === "Foods" ? "food" : "recipe" })
              }
            >
              <Plus size={19} />
              {view === "Foods" ? "New food" : "Create recipe"}
            </button>
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder={
                view === "Foods" ? "Search foods and recipes" : "Search recipes"
              }
            />
            <div className="section-heading">
              <h2>{view === "Foods" ? "All foods" : "Saved recipes"}</h2>
              <small>
                {
                  foods.filter((f) => view === "Foods" || f.type === "recipe")
                    .length
                }{" "}
                items
              </small>
            </div>
            <section className="card library">
              <FoodList
                foods={foods.filter(
                  (f) => view === "Foods" || f.type === "recipe",
                )}
                query={query}
                onSelect={(f) =>
                  setEditor({
                    type: f.type === "recipe" ? "recipe" : "food",
                    food: f,
                  })
                }
              />
            </section>
          </>
        )}
        {view === "Goals" && (
          <Goals state={s} update={update} notify={setToast} />
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {(
          [
            { v: "Today", Icon: Utensils },
            { v: "History", Icon: HistoryIcon },
            { v: "Foods", Icon: BookOpen },
            { v: "Recipes", Icon: ChefHat },
            { v: "Goals", Icon: SlidersHorizontal },
          ] as const
        ).map(({ v, Icon }) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            aria-current={view === v ? "page" : undefined}
            onClick={() => switchView(v)}
          >
            <Icon size={21} />
            <span>{v}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {editor?.type === "log" && (
        <LogEditor
          foods={foods}
          recent={recent}
          entry={editor.entry}
          date={date}
          meal={editor.meal}
          onClose={() => setEditor(null)}
          onSave={(e) => {
            if (
              update({
                ...s,
                entries: [...s.entries.filter((x) => x.id !== e.id), e],
                days: { ...s.days, [date]: { goal: { ...goal } } },
              })
            ) {
              setEditor(null);
              setToast("Food logged.");
            }
          }}
          onDelete={(id) => {
            if (update({ ...s, entries: s.entries.filter((e) => e.id !== id) }))
              setEditor(null);
          }}
        />
      )}
      {editor?.type === "food" && (
        <FoodEditor
          food={editor.food}
          onSave={saveFood}
          onDelete={deleteFood}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.type === "recipe" && (
        <RecipeEditor
          food={editor.food}
          foods={s.foods}
          onSave={saveFood}
          onDelete={deleteFood}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.type === "weight" && (
        <Modal title="Body weight" onClose={() => setEditor(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              if (
                update({
                  ...s,
                  weights: { ...s.weights, [date]: Number(d.get("weight")) },
                  days: { ...s.days, [date]: { goal: { ...goal } } },
                })
              ) {
                setEditor(null);
                setToast("Weight saved.");
              }
            }}
          >
            <p className="muted">Optional check-in for {date}.</p>
            <NumberField
              name="weight"
              label="Body weight (kg)"
              min={1}
              max={1000}
              value={s.weights[date] ?? ""}
            />
            <button className="primary full">Save weight</button>
            {s.weights[date] !== undefined && (
              <button
                type="button"
                className="danger text-button centered"
                onClick={() => {
                  if (confirm("Delete this weight entry?")) {
                    const weights = { ...s.weights };
                    delete weights[date];
                    if (update({ ...s, weights })) setEditor(null);
                  }
                }}
              >
                Delete weight
              </button>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
