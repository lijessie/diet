import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, Search } from "lucide-react";
import {
  calories,
  fmt,
  keys,
  type Macros,
  type Food,
  searchFoods,
} from "./domain";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <header className="sheet-head">
          <h2 id={headingId}>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function MacroLine({ macros }: { macros: Macros }) {
  return (
    <div className="macro-line">
      {keys.map((k) => (
        <span key={k} className={k}>
          <i />
          {fmt(macros[k])}
          <small>{k === "carbs" ? "C" : k === "protein" ? "P" : "F"}</small>
        </span>
      ))}
      <span className="kcal">
        {fmt(calories(macros))} <small>kcal</small>
      </span>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search foods and recipes",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={19} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function FoodList({
  foods,
  query,
  onSelect,
}: {
  foods: Food[];
  query: string;
  onSelect: (f: Food) => void;
}) {
  const filtered = searchFoods(foods, query);
  return (
    <div className="food-list">
      {filtered.map((f) => (
        <button className="food-row" key={f.id} onClick={() => onSelect(f)}>
          <span>
            <strong>{f.name}</strong>
            <small>
              {f.type === "recipe" ? "Recipe · " : ""}per {f.unit}
              {f.source ? ` · ${f.source}` : ""}
            </small>
            <MacroLine macros={f.macros} />
          </span>
          <span className="row-arrow">+</span>
        </button>
      ))}
      {!filtered.length && (
        <p className="empty">
          No matching foods. Add one in Foods to get started.
        </p>
      )}
    </div>
  );
}
export function NumberField({
  label,
  name,
  value,
  min = 0,
  max = 1000000,
  step = "any",
  onChange,
  required = true,
}: {
  label: string;
  name: string;
  value?: number | string;
  min?: number;
  max?: number;
  step?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        required={required}
        {...(onChange
          ? {
              value,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value),
            }
          : { defaultValue: value })}
      />
    </label>
  );
}
export function MacroFields({ value }: { value: Macros }) {
  return (
    <div className="three-col">
      {keys.map((k) => (
        <NumberField
          key={k}
          name={k}
          label={`${k[0].toUpperCase() + k.slice(1)} (g)`}
          value={value[k]}
        />
      ))}
    </div>
  );
}
export function macrosFrom(form: FormData): Macros {
  return Object.fromEntries(
    keys.map((k) => [k, Number(form.get(k))]),
  ) as Macros;
}
