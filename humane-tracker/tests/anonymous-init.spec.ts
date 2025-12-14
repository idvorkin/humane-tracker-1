import { test, expect } from "@playwright/test";

test("anonymous user can load default habits via UI", async ({ page }) => {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Go to the app without e2e mode - real anonymous flow
  await page.goto("/");

  // Wait for the app to load
  await page.waitForSelector(".container", { timeout: 10000 });

  console.log("Page loaded, looking for menu...");

  // Open user menu
  const menuTrigger = page.locator(".user-menu-trigger");
  await menuTrigger.click();

  // Look for "Load Default Habits" option
  const loadDefaultsBtn = page.locator('text=Load Default Habits');
  const isVisible = await loadDefaultsBtn.isVisible().catch(() => false);
  console.log("Load Default Habits visible:", isVisible);

  if (isVisible) {
    await loadDefaultsBtn.click();

    // Wait for the initialize dialog
    const initDialog = page.locator(".initialize-habits");
    await initDialog.waitFor({ timeout: 5000 });
    console.log("Dialog appeared");

    // Click the initialize button using text selector for reliability
    const initBtn = page.getByRole('button', { name: 'Initialize Default Habits' });
    await initBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log("Initialize button visible, clicking...");
    await initBtn.click();

    // Wait for dialog to disappear (indicates completion or skip)
    try {
      await initDialog.waitFor({ state: 'hidden', timeout: 15000 });
      console.log("Dialog closed - initialization completed or skipped");
    } catch {
      // Dialog still visible - check for errors
      console.log("Dialog still visible after timeout");
      console.log("Console errors:", consoleErrors);

      // Take extra screenshot for debugging
      await page.screenshot({ path: 'test-results/debug-dialog-still-visible.png' });
      throw new Error("Initialization dialog did not close - possible failure");
    }

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log("Console errors found:", consoleErrors);
    }

    // Check if habits were loaded - look for section headers
    const sectionHeaders = page.locator(".section-header");
    const count = await sectionHeaders.count();
    console.log("Section headers found:", count);

    expect(count).toBeGreaterThan(0);
  } else {
    // Maybe habits already exist, check for section headers
    const sectionHeaders = page.locator(".section-header");
    const count = await sectionHeaders.count();
    console.log("Section headers already present:", count);
    expect(count).toBeGreaterThan(0);
  }
});
