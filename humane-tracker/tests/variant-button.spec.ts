import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb-helpers";

test.afterEach(async ({ page }) => {
  await clearIndexedDB(page);
});

test("variant trigger buttons appear for habits with variants", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  
  // Load habits via page.evaluate
  await page.evaluate(async () => {
    const { habitService } = await import("/src/services/habitService.ts");
    const { DEFAULT_HABITS } = await import("/src/data/defaultHabits.ts");
    const userId = "anonymous";
    
    for (const habit of DEFAULT_HABITS) {
      await habitService.createHabit({
        name: habit.name,
        category: habit.category,
        targetPerWeek: habit.targetPerWeek,
        userId,
        variants: habit.variants,
        allowCustomVariant: habit.allowCustomVariant,
      });
    }
  });
  
  // Reload to see habits
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("table");
  
  // Expand all sections
  const expandBtn = page.getByText("Expand All");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  }
  
  await page.waitForTimeout(500);
  
  // Check for variant trigger buttons
  const variantButtons = page.locator(".variant-trigger");
  const count = await variantButtons.count();
  console.log("Variant trigger buttons found:", count);
  expect(count).toBeGreaterThan(0);
  
  // Click the first variant button
  await variantButtons.first().click();
  
  // Variant picker should appear
  const variantPicker = page.locator(".variant-picker");
  await expect(variantPicker).toBeVisible({ timeout: 2000 });
  console.log("Variant picker is visible!");
  
  // Should show variant options
  const variantOptions = page.locator(".variant-option");
  const optionCount = await variantOptions.count();
  console.log("Variant options found:", optionCount);
  expect(optionCount).toBeGreaterThan(0);
});
