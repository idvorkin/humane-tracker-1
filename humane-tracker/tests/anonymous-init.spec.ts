import { test, expect } from "@playwright/test";

test("anonymous user can load default habits via UI", async ({ page }) => {
  // Go to the app in e2e mode (bypasses auth, uses anonymous)
  await page.goto("/?e2e=true");
  
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
    
    // Click the initialize button
    const initBtn = page.locator(".btn-initialize");
    await initBtn.click();
    
    // Wait for completion or error
    await page.waitForTimeout(5000);
    
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
