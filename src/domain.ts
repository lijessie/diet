import Decimal from "decimal.js";
import { z } from "zod";
Decimal.set({ precision: 32 });
const n = z.number().finite().nonnegative().max(1e9);
export const macrosSchema = z.object({ carbs: n, protein: n, fat: n });
export type Macros = z.infer<typeof macrosSchema>;
export const keys = ["carbs", "protein", "fat"] as const;
export const meals = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const stamp = { createdAt: z.string(), updatedAt: z.string() };
const baseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  unit: z.string().min(1),
  macros: macrosSchema,
  source: z.string().optional(),
});
export const ingredientSchema = baseSchema.extend({
  foodId: z.string(),
  quantity: n,
});
export type Ingredient = z.infer<typeof ingredientSchema>;
export const foodSchema = baseSchema.extend({
  ...stamp,
  type: z.enum(["food", "recipe"]),
  finishedWeight: n.optional(),
  ingredients: z.array(ingredientSchema).optional(),
  deleted: z.boolean().optional(),
});
export type Food = z.infer<typeof foodSchema>;
const goalSchema = macrosSchema.extend({
  id: z.string(),
  name: z.string().min(1),
});
export type Goal = z.infer<typeof goalSchema>;
const entrySchema = baseSchema.extend({
  ...stamp,
  foodId: z.string(),
  date: z.string(),
  meal: z.enum(meals),
  quantity: n,
  baseMacros: macrosSchema,
  calories: n,
});
export type Entry = z.infer<typeof entrySchema>;
const level = z.enum(["Low", "Medium", "High"]);
export const profileSchema = z.object({
  bmr: n,
  weight: n,
  currentFat: n,
  targetFat: n,
  days: n,
  intensity: level,
  minutes: n,
  activity: level,
  cardio: n,
  split: macrosSchema,
});
export type Profile = z.infer<typeof profileSchema>;
export const importedSchema = z.object({
  id: z.string(),
  date: z.string(),
  macros: macrosSchema,
  goal: goalSchema,
  source: z.string(),
  conflict: z.boolean().optional(),
  selected: z.boolean().optional(),
});
export type Imported = z.infer<typeof importedSchema>;
export const stateSchema = z.object({
  version: z.literal(1),
  foods: z.array(foodSchema),
  entries: z.array(entrySchema),
  presets: z.array(goalSchema).min(3),
  days: z.record(z.object({ goal: goalSchema })),
  weights: z.record(n),
  profile: profileSchema,
  imports: z.array(importedSchema),
  notes: z.array(z.string()),
  raw: z.unknown().optional(),
});
export type State = z.infer<typeof stateSchema>;
export const zero = (): Macros => ({ carbs: 0, protein: 0, fat: 0 });
const number = (v: Decimal) => v.toDecimalPlaces(12).toNumber();
export function calories(m: Macros) {
  return number(
    new Decimal(m.carbs)
      .times(4)
      .plus(new Decimal(m.protein).times(4))
      .plus(new Decimal(m.fat).times(9)),
  );
}
export function scale(m: Macros, quantity: number, unit: string): Macros {
  macrosSchema.parse(m);
  n.parse(quantity);
  const factor = new Decimal(quantity).div(unit === "100g" ? 100 : 1);
  return Object.fromEntries(
    keys.map((k) => [k, number(new Decimal(m[k]).times(factor))]),
  ) as Macros;
}
export function total(items: Macros[]): Macros {
  return Object.fromEntries(
    keys.map((k) => [
      k,
      number(items.reduce((s, m) => s.plus(m[k]), new Decimal(0))),
    ]),
  ) as Macros;
}
export function recipeNutrition(ingredients: Ingredient[], weight: number) {
  if (!Number.isFinite(weight) || weight <= 0)
    throw Error("Enter the actual finished weight, greater than zero.");
  if (!ingredients.length) throw Error("Add at least one ingredient.");
  const sum = total(
    ingredients.map((i) => scale(i.macros, i.quantity, i.unit)),
  );
  return Object.fromEntries(
    keys.map((k) => [k, number(new Decimal(sum[k]).div(weight).times(100))]),
  ) as Macros;
}
export function wouldCycle(
  id: string,
  ingredients: Ingredient[],
  foods: Food[],
): boolean {
  const visit = (foodId: string, seen: Set<string>): boolean =>
    foodId === id ||
    (!seen.has(foodId) &&
      !!foods
        .find((f) => f.id === foodId)
        ?.ingredients?.some((i) =>
          visit(i.foodId, new Set([...seen, foodId])),
        ));
  return ingredients.some((i) => visit(i.foodId, new Set()));
}
export function calculateGoal(p: Profile) {
  profileSchema.parse(p);
  if (p.days <= 0 || p.weight <= 0 || p.bmr <= 0)
    throw Error("BMR, weight and time frame must be greater than zero.");
  if (p.currentFat >= 100 || p.targetFat >= 100 || p.targetFat > p.currentFat)
    throw Error(
      "For this fat-loss calculator, target body fat must be no higher than current body fat, and both below 100%.",
    );
  if (
    Math.abs(total([p.split]).carbs + p.split.protein + p.split.fat - 100) >
    1e-8
  )
    throw Error("Macro split must add up to 100%.");
  const weightLoss = new Decimal(p.currentFat)
    .minus(p.targetFat)
    .div(100)
    .times(p.weight);
  const deficit = weightLoss.times(7700).div(p.days);
  const workout = new Decimal(
    { High: 0.081, Medium: 0.07, Low: 0.065 }[p.intensity],
  )
    .times(p.weight)
    .times(p.minutes);
  const lifestyle = new Decimal(
    { High: 0.3, Medium: 0.2, Low: 0.1 }[p.activity],
  ).times(p.bmr);
  const expenditure = new Decimal(p.bmr)
    .plus(workout)
    .plus(lifestyle)
    .plus(p.cardio);
  const intake = expenditure.minus(deficit);
  if (intake.lte(0))
    throw Error(
      "These inputs produce a non-positive intake. Adjust the time frame or target before applying.",
    );
  const macros = Object.fromEntries(
    keys.map((k) => [
      k,
      number(
        intake
          .times(p.split[k])
          .div(100)
          .div(k === "fat" ? 9 : 4),
      ),
    ]),
  ) as Macros;
  return {
    weightLoss: number(weightLoss),
    deficit: number(deficit),
    workout: number(workout),
    lifestyle: number(lifestyle),
    expenditure: number(expenditure),
    intake: number(intake),
    macros,
  };
}
export function makeEntry(
  food: Food,
  quantity: number,
  date: string,
  meal: Entry["meal"],
): Entry {
  if (quantity <= 0) throw Error("Enter an amount greater than zero.");
  const macros = scale(food.macros, quantity, food.unit);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    foodId: food.id,
    name: food.name,
    unit: food.unit,
    baseMacros: { ...food.macros },
    macros,
    quantity,
    date,
    meal,
    calories: calories(macros),
    createdAt: now,
    updatedAt: now,
  };
}
export function editEntry(
  e: Entry,
  quantity: number,
  meal: Entry["meal"],
): Entry {
  if (quantity <= 0) throw Error("Enter an amount greater than zero.");
  const macros = scale(e.baseMacros, quantity, e.unit);
  return {
    ...e,
    quantity,
    meal,
    macros,
    calories: calories(macros),
    updatedAt: new Date().toISOString(),
  };
}
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function moveDate(date: string, by: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + by);
  return dateKey(d);
}
export function goalFor(s: State, date: string): Goal {
  return s.days[date]?.goal ?? s.presets[0];
}
export function dayTotal(s: State, date: string) {
  return total([
    ...s.entries.filter((e) => e.date === date).map((e) => e.macros),
    ...s.imports
      .filter((i) => i.date === date && (!i.conflict || i.selected))
      .map((i) => i.macros),
  ]);
}
export function status(value: number, target: number) {
  return value < target * 0.9
    ? "Under"
    : value > target * 1.1
      ? "Over"
      : "Near";
}
export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
export function searchFoods(foods: Food[], query: string) {
  const norm = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  const q = norm(query);
  return foods.filter((f) => !f.deleted && norm(f.name).includes(q));
}
export function initialState(): State {
  return {
    version: 1,
    foods: [],
    entries: [],
    presets: [
      { id: "standard", name: "Standard", carbs: 100, protein: 100, fat: 30 },
      {
        id: "high",
        name: "High-carb / Cheat Day",
        carbs: 200,
        protein: 100,
        fat: 20,
      },
      { id: "custom", name: "Custom", carbs: 100, protein: 100, fat: 30 },
    ],
    days: {},
    weights: {},
    profile: {
      bmr: 0,
      weight: 0,
      currentFat: 0,
      targetFat: 0,
      days: 35,
      intensity: "Low",
      minutes: 30,
      activity: "Low",
      cardio: 0,
      split: { carbs: 40, protein: 40, fat: 20 },
    },
    imports: [],
    notes: [],
  };
}
