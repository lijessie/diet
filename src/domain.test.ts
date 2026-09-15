import { describe, it, expect } from "vitest";
import {
  calculateGoal,
  calories,
  dayTotal,
  editEntry,
  goalFor,
  initialState,
  makeEntry,
  recipeNutrition,
  scale,
  searchFoods,
  stateSchema,
  total,
  wouldCycle,
  type Food,
  type Ingredient,
} from "./domain";
const chicken: Food = {
  id: "chicken",
  name: "Chicken breast",
  unit: "100g",
  macros: { carbs: 0, protein: 25, fat: 0 },
  type: "food",
  createdAt: "",
  updatedAt: "",
};
const ingredient: Ingredient = {
  id: "i",
  foodId: "chicken",
  name: "Chicken",
  unit: "100g",
  quantity: 100,
  macros: chicken.macros,
};
describe("nutrition calculations", () => {
  it("scales grams", () =>
    expect(scale(chicken.macros, 150, "100g").protein).toBe(37.5));
  it("scales unit foods", () =>
    expect(scale({ carbs: 27, protein: 0, fat: 0 }, 2, "each").carbs).toBe(54));
  it("uses actual finished recipe weight", () =>
    expect(
      recipeNutrition(
        [{ ...ingredient, macros: { carbs: 40, protein: 80, fat: 20 } }],
        800,
      ),
    ).toEqual({ carbs: 5, protein: 10, fat: 2.5 }));
  it("calculates energy using 4/4/9", () =>
    expect(calories({ carbs: 100, protein: 100, fat: 30 })).toBe(1070));
  it("adds decimal values without binary accumulation", () =>
    expect(
      total(
        Array.from({ length: 1000 }, () => ({
          carbs: 0.1,
          protein: 0.2,
          fat: 0.3,
        })),
      ),
    ).toEqual({ carbs: 100, protein: 200, fat: 300 }));
  it("rejects invalid weights and macro values", () => {
    expect(() => recipeNutrition([ingredient], 0)).toThrow();
    expect(() => scale(chicken.macros, -1, "100g")).toThrow();
    expect(() => recipeNutrition([], 100)).toThrow();
  });
  it("keeps historic snapshots stable even when editing quantity after source mutation", () => {
    const food = structuredClone(chicken);
    const log = makeEntry(food, 150, "2026-09-14", "Lunch");
    food.macros.protein = 99;
    expect(log.macros.protein).toBe(37.5);
    expect(editEntry(log, 200, "Dinner").macros.protein).toBe(50);
    expect(log.macros.protein).toBe(37.5);
  });
  it("detects nested cycles but permits acyclic nesting", () => {
    const a = {
      ...chicken,
      id: "a",
      type: "recipe" as const,
      ingredients: [{ ...ingredient, foodId: "b" }],
    };
    expect(
      wouldCycle("b", [{ ...ingredient, foodId: "a" }], [a, chicken]),
    ).toBe(true);
    expect(
      wouldCycle("c", [{ ...ingredient, foodId: "a" }], [a, chicken]),
    ).toBe(false);
  });
  it("matches spreadsheet formulas with synthetic inputs", () => {
    const p = {
      bmr: 1600,
      weight: 80,
      currentFat: 25,
      targetFat: 20,
      days: 40,
      intensity: "Low" as const,
      minutes: 30,
      activity: "Low" as const,
      cardio: 200,
      split: { carbs: 40, protein: 40, fat: 20 },
    };
    const r = calculateGoal(p);
    expect(r.weightLoss).toBe(4);
    expect(r.deficit).toBe(770);
    expect(r.workout).toBe(156);
    expect(r.lifestyle).toBe(160);
    expect(r.expenditure).toBe(2116);
    expect(r.intake).toBe(1346);
    expect(r.macros.carbs).toBe(134.6);
    expect(r.macros.fat).toBeCloseTo(29.911111111111, 10);
    expect(() => calculateGoal({ ...p, days: 0 })).toThrow();
    expect(() =>
      calculateGoal({ ...p, split: { carbs: 40, protein: 40, fat: 30 } }),
    ).toThrow();
  });
  it("handles all intensity and lifestyle coefficients", () => {
    for (const [intensity, coef] of [
      ["High", 0.081],
      ["Medium", 0.07],
      ["Low", 0.065],
    ] as const) {
      const r = calculateGoal({
        ...initialState().profile,
        bmr: 1700,
        weight: 80,
        currentFat: 20,
        targetFat: 20,
        days: 30,
        intensity,
        minutes: 60,
        activity: intensity,
      });
      expect(r.workout).toBeCloseTo(coef * 80 * 60);
      expect(r.lifestyle).toBeCloseTo(
        1700 * { High: 0.3, Medium: 0.2, Low: 0.1 }[intensity],
      );
    }
  });
  it("retains per-day targets after presets change", () => {
    const s = initialState();
    s.days["2025-01-01"] = { goal: { ...s.presets[0] } };
    s.presets[0].carbs = 200;
    expect(goalFor(s, "2025-01-01").carbs).toBe(100);
  });
  it("excludes unresolved imports and does not double count a chosen source", () => {
    const s = initialState();
    s.imports = [1, 2].map((i) => ({
      id: String(i),
      date: "2025-01-01",
      macros: { carbs: 100 * i, protein: 0, fat: 0 },
      goal: s.presets[0],
      source: "test",
      conflict: true,
    }));
    expect(dayTotal(s, "2025-01-01").carbs).toBe(0);
    s.imports[1].selected = true;
    expect(dayTotal(s, "2025-01-01").carbs).toBe(200);
  });
  it("search ignores case, accents, punctuation and spaces", () =>
    expect(
      searchFoods([{ ...chicken, name: "Crème - Chicken" }], "cremechicken"),
    ).toHaveLength(1));
  it("rejects malformed backups", () =>
    expect(
      stateSchema.safeParse({ ...initialState(), foods: [{}] }).success,
    ).toBe(false));
});
