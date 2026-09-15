import { useState, type FormEvent } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  calories,
  editEntry,
  fmt,
  makeEntry,
  meals,
  recipeNutrition,
  scale,
  total,
  wouldCycle,
  zero,
  type Entry,
  type Food,
  type Ingredient,
} from "./domain";
import {
  FoodList,
  MacroFields,
  MacroLine,
  Modal,
  NumberField,
  SearchBox,
  macrosFrom,
} from "./ui";
export function LogEditor({
  foods,
  recent,
  entry,
  date,
  meal,
  onSave,
  onDelete,
  onClose,
}: {
  foods: Food[];
  recent: string[];
  entry?: Entry;
  date: string;
  meal: Entry["meal"];
  onSave: (e: Entry) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Food>();
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState(entry ? String(entry.quantity) : "");
  const [category, setCategory] = useState(entry?.meal ?? meal);
  const base = entry
    ? { name: entry.name, unit: entry.unit, macros: entry.baseMacros }
    : selected;
  const choose = (f: Food) => {
    setSelected(f);
    setAmount(f.unit === "100g" ? "100" : "1");
  };
  const preview =
    base && Number(amount) >= 0 && Number(amount) <= 1e9
      ? scale(base.macros, Number(amount), base.unit)
      : zero();
  return (
    <Modal title={entry ? "Edit food entry" : "Add food"} onClose={onClose}>
      {base ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(amount) > 0)
              onSave(
                entry
                  ? editEntry(entry, Number(amount), category)
                  : makeEntry(selected!, Number(amount), date, category),
              );
          }}
        >
          {!entry && (
            <button
              type="button"
              className="text-button"
              onClick={() => setSelected(undefined)}
            >
              <ArrowLeft size={16} />
              Choose another food
            </button>
          )}
          <h3 className="selected-food">{base.name}</h3>
          <p className="muted">Nutrition per {base.unit}</p>
          <MacroLine macros={base.macros} />
          <div className="two-col spaced">
            <NumberField
              label={
                base.unit === "100g"
                  ? "Amount (grams)"
                  : `Quantity (${base.unit})`
              }
              name="amount"
              value={amount}
              min={0.001}
              onChange={setAmount}
            />
            <label className="field">
              Meal
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Entry["meal"])}
              >
                {meals.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="preview">
            <span className="eyebrow">YOUR PORTION</span>
            <MacroLine macros={preview} />
          </div>
          <button className="primary full" disabled={Number(amount) <= 0}>
            {entry ? "Save changes" : `Add to ${category.toLowerCase()}`}
          </button>
          {entry && onDelete && (
            <button
              type="button"
              className="danger text-button centered"
              onClick={() => {
                if (confirm("Delete this food entry?")) onDelete(entry.id);
              }}
            >
              <Trash2 size={16} />
              Delete entry
            </button>
          )}
        </form>
      ) : (
        <>
          <SearchBox value={query} onChange={setQuery} />
          {!query && recent.length > 0 && (
            <>
              <h3 className="eyebrow spaced">RECENTLY USED</h3>
              <FoodList
                foods={recent
                  .map((id) => foods.find((f) => f.id === id))
                  .filter((f): f is Food => !!f && !f.deleted)
                  .slice(0, 5)}
                query=""
                onSelect={choose}
              />
            </>
          )}
          <h3 className="eyebrow spaced">
            {query ? "SEARCH RESULTS" : "YOUR FOOD LIBRARY"}
          </h3>
          <FoodList foods={foods} query={query} onSelect={choose} />
        </>
      )}
    </Modal>
  );
}
export function FoodEditor({
  food,
  onSave,
  onDelete,
  onClose,
}: {
  food?: Food;
  onSave: (f: Food) => void;
  onDelete?: (f: Food) => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState(food?.macros ?? zero());
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      now = new Date().toISOString();
    onSave({
      id: food?.id ?? crypto.randomUUID(),
      name: String(d.get("name")).trim(),
      unit: String(d.get("unit")).trim(),
      macros: macrosFrom(d),
      type: "food",
      createdAt: food?.createdAt ?? now,
      updatedAt: now,
      source: food?.source,
    });
  };
  return (
    <Modal title={food ? "Edit food" : "New food"} onClose={onClose}>
      <form
        onSubmit={submit}
        onChange={(e) => setPreview(macrosFrom(new FormData(e.currentTarget)))}
      >
        <label className="field">
          Food name
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={food?.name}
          />
        </label>
        <label className="field">
          Base unit
          <input
            name="unit"
            list="units"
            required
            defaultValue={food?.unit ?? "100g"}
          />
          <datalist id="units">
            {[
              "100g",
              "each",
              "serving",
              "tbsp",
              "tsp",
              "cup",
              "pack",
              "can",
            ].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
        <p className="muted">
          Enter macros for one base unit. For 100g foods, you’ll log portions in
          grams.
        </p>
        <MacroFields value={food?.macros ?? zero()} />
        <div className="preview">
          Calculated energy <strong>{fmt(calories(preview))} kcal</strong>
        </div>
        <button className="primary full">Save food</button>
        {food && onDelete && (
          <button
            type="button"
            className="danger text-button centered"
            onClick={() => onDelete(food)}
          >
            <Trash2 size={16} />
            Delete food
          </button>
        )}
      </form>
    </Modal>
  );
}
export function RecipeEditor({
  food,
  foods,
  onSave,
  onDelete,
  onClose,
}: {
  food?: Food;
  foods: Food[];
  onSave: (f: Food) => void;
  onDelete?: (f: Food) => void;
  onClose: () => void;
}) {
  const [id] = useState(food?.id ?? crypto.randomUUID());
  const [name, setName] = useState(food?.name ?? "");
  const [weight, setWeight] = useState(
    food?.finishedWeight ? String(food.finishedWeight) : "",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    food?.ingredients ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const summed = total(
    ingredients.map((i) => scale(i.macros, i.quantity, i.unit)),
  );
  const per =
    Number(weight) > 0 && ingredients.length
      ? recipeNutrition(ingredients, Number(weight))
      : null;
  function add(f: Food) {
    const next = [
      ...ingredients,
      {
        id: crypto.randomUUID(),
        foodId: f.id,
        name: f.name,
        unit: f.unit,
        macros: { ...f.macros },
        quantity: f.unit === "100g" ? 100 : 1,
      },
    ];
    if (wouldCycle(id, next, foods)) {
      setError("This ingredient would create a circular recipe.");
      return;
    }
    setIngredients(next);
    setPicking(false);
    setQuery("");
    setError("");
  }
  return (
    <Modal title={food ? "Edit recipe" : "New recipe"} onClose={onClose}>
      {picking ? (
        <>
          <button className="text-button" onClick={() => setPicking(false)}>
            <ArrowLeft size={16} />
            Back to recipe
          </button>
          <SearchBox value={query} onChange={setQuery} />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <FoodList
            foods={foods.filter((f) => f.id !== id)}
            query={query}
            onSelect={add}
          />
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (wouldCycle(id, ingredients, foods))
                throw Error("Circular recipes are not allowed.");
              const macros = recipeNutrition(ingredients, Number(weight));
              const now = new Date().toISOString();
              onSave({
                id,
                name: name.trim(),
                unit: "100g",
                type: "recipe",
                ingredients,
                finishedWeight: Number(weight),
                macros,
                createdAt: food?.createdAt ?? now,
                updatedAt: now,
                source: food?.source,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            Recipe name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="section-heading">
            <h3>Ingredients</h3>
            <button
              type="button"
              className="text-button"
              onClick={() => setPicking(true)}
            >
              <Plus size={17} />
              Add ingredient
            </button>
          </div>
          {!ingredients.length && (
            <p className="empty">Start with foods from your library.</p>
          )}
          {ingredients.map((i, index) => (
            <div className="ingredient" key={i.id}>
              <div className="between">
                <strong>{i.name}</strong>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${i.name}`}
                  onClick={() =>
                    setIngredients(ingredients.filter((_, j) => j !== index))
                  }
                >
                  <XIcon />
                </button>
              </div>
              <NumberField
                label={i.unit === "100g" ? "Grams" : `Quantity (${i.unit})`}
                name={`ingredient-${i.id}`}
                min={0.001}
                value={i.quantity || ""}
                onChange={(v) =>
                  setIngredients(
                    ingredients.map((x, j) =>
                      j === index
                        ? {
                            ...x,
                            quantity: Math.max(
                              0,
                              Math.min(1000000, Number(v) || 0),
                            ),
                          }
                        : x,
                    ),
                  )
                }
              />
              <MacroLine macros={scale(i.macros, i.quantity, i.unit)} />
            </div>
          ))}
          <div className="preview">
            <span className="eyebrow">WHOLE RECIPE</span>
            <MacroLine macros={summed} />
          </div>
          <NumberField
            label="Actual finished weight (grams)"
            name="weight"
            value={weight}
            min={0.001}
            onChange={setWeight}
          />
          <p className="muted">
            Weigh the finished dish after cooking, without the container. Water
            loss changes nutrition per 100g.
          </p>
          {per && (
            <div className="preview">
              <span className="eyebrow">PER 100g FINISHED</span>
              <MacroLine macros={per} />
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary full" disabled={!ingredients.length}>
            Save to food library
          </button>
          <p className="fine">
            Ingredient values are saved with this recipe. Existing food logs
            stay unchanged.
          </p>
          {food && onDelete && (
            <button
              type="button"
              className="danger text-button centered"
              onClick={() => onDelete(food)}
            >
              <Trash2 size={16} />
              Delete recipe
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
function XIcon() {
  return <Trash2 size={17} />;
}
