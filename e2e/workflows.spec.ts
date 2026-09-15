import { test, expect } from "@playwright/test";
import { initialState, type Food } from "../src/domain";
const food: Food = {
  id: "chicken",
  name: "Chicken breast",
  unit: "100g",
  macros: { carbs: 0, protein: 25, fat: 0 },
  type: "food",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
test.beforeEach(async ({ page }) => {
  const state = initialState();
  state.foods = [
    food,
    {
      ...food,
      id: "banana",
      name: "Banana",
      unit: "each",
      macros: { carbs: 27, protein: 1.3, fat: 0.4 },
    },
  ];
  state.profile = {
    ...state.profile,
    bmr: 1600,
    weight: 80,
    currentFat: 25,
    targetFat: 20,
    cardio: 200,
    days: 40,
  };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("daily.macro.v1", JSON.stringify(s)),
    state,
  );
  await page.reload();
});
test("mobile log, edit, change meal, history, weight and persistent snapshots", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Add food to Lunch", exact: true })
    .click();
  await page.getByRole("searchbox").fill("chicken");
  await page.getByRole("button", { name: /Chicken breast/ }).click();
  await page.getByRole("spinbutton", { name: "Amount (grams)" }).fill("150");
  await expect(page.locator(".preview")).toContainText("37.5");
  await page.getByRole("button", { name: "Add to lunch" }).click();
  await expect(page.locator(".entry")).toContainText("150 g");
  await expect(page.locator(".entry")).toContainText("37.5");
  await page.getByRole("button", { name: "Foods", exact: true }).click();
  await page.getByRole("button", { name: /Chicken breast/ }).click();
  await page
    .getByRole("spinbutton", { name: "Protein (g)", exact: true })
    .fill("99");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".entry")).toContainText("37.5");
  await page.locator(".entry").click();
  await page.getByRole("spinbutton", { name: "Amount (grams)" }).fill("200");
  await page.getByLabel("Meal", { exact: true }).selectOption("Dinner");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .locator(".meal")
      .filter({
        has: page.getByRole("heading", { name: "Dinner", exact: true }),
      }),
  ).toContainText("50");
  await page.getByRole("button", { name: /Body weight/ }).click();
  await page.getByRole("spinbutton", { name: "Body weight (kg)" }).fill("80");
  await page.getByRole("button", { name: "Save weight" }).click();
  await page.reload();
  await expect(page.locator(".entry")).toContainText("200 g");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-day")).toContainText("80 kg");
  await expect(page.locator(".history-day")).toContainText("50");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});
test("create recipe, log grams, edit recipe without changing history, unit food and delete", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Recipes", exact: true }).click();
  await page.getByRole("button", { name: "Create recipe" }).click();
  await page.getByLabel("Recipe name", { exact: true }).fill("My chicken");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByRole("button", { name: /Chicken breast/ }).click();
  await page
    .getByRole("spinbutton", { name: "Grams", exact: true })
    .fill("200");
  await page
    .getByRole("spinbutton", { name: "Actual finished weight (grams)" })
    .fill("400");
  await expect(page.locator(".preview").last()).toContainText("12.5");
  await page.getByRole("button", { name: "Save to food library" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Add food to Dinner" }).click();
  await page.getByRole("searchbox").fill("my chicken");
  await page.getByRole("button", { name: /My chicken/ }).click();
  await page.getByRole("spinbutton", { name: "Amount (grams)" }).fill("150");
  await page.getByRole("button", { name: "Add to dinner" }).click();
  await expect(page.locator(".entry")).toContainText("18.8");
  await page.getByRole("button", { name: "Recipes", exact: true }).click();
  await page.getByRole("button", { name: /My chicken/ }).click();
  await page
    .getByRole("spinbutton", { name: "Actual finished weight (grams)" })
    .fill("200");
  await page.getByRole("button", { name: "Save to food library" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".entry")).toContainText("18.8");
  await page.getByRole("button", { name: "Add food to Snack" }).click();
  await page.getByRole("searchbox").fill("banana");
  await page.getByRole("button", { name: /Banana/ }).click();
  await page.getByRole("spinbutton", { name: "Quantity (each)" }).fill("2");
  await page.getByRole("button", { name: "Add to snack" }).click();
  await expect(
    page.locator(".entry").filter({ hasText: "Banana" }),
  ).toContainText("54");
  await page.locator(".entry").filter({ hasText: "Banana" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(
    page.locator(".entry").filter({ hasText: "Banana" }),
  ).toHaveCount(0);
});
test("goal calculator, daily presets and offline reload", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("button", { name: "Calculator", exact: true }).click();
  await page.getByRole("button", { name: "Calculate recommendation" }).click();
  await expect(page.locator(".recommendation")).toContainText("1,346");
  await page.getByRole("button", { name: "Use these targets" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".energy")).toContainText("1,346");
  await page.getByLabel("Daily goal preset").selectOption("high");
  await expect(page.locator(".energy")).toContainText("1,380");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Today’s balance" }),
  ).toBeVisible();
  await expect(page.locator(".energy")).toContainText("1,380");
  await context.setOffline(false);
});
test("deleting referenced source preserves logged nutrition", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Add food to Lunch" }).click();
  await page.getByRole("button", { name: /Chicken breast/ }).click();
  await page.getByRole("button", { name: "Add to lunch" }).click();
  await page.getByRole("button", { name: "Foods", exact: true }).click();
  await page.getByRole("button", { name: /Chicken breast/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete food", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Chicken breast/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".entry")).toContainText("25");
});
