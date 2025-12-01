import { test, expect } from '@playwright/test';

test.describe('Habit Tracker Click Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app in test mode (no auth required)
    await page.goto('/?test=true');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Wait for habit tracker content to be visible (not just loading screen)
    await page.waitForSelector('table', { timeout: 15000 });
  });

  test('clicking on habit cells cycles through values', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table');

    // Expand all sections first to see habits
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find a habit row - use the first one with a visible clickable cell
    const firstHabitRow = page.locator('tr.section-row').first();

    // Wait for it to be visible
    await expect(firstHabitRow).toBeVisible();

    // Get the habit name for logging
    const habitName = await firstHabitRow.locator('.habit-name').textContent();
    console.log('Testing with habit:', habitName);

    // Find the cell for today (first cell with cell-today class)
    const todayCell = firstHabitRow.locator('td.cell-today');

    // Get initial content
    const initialContent = await todayCell.textContent();
    console.log('Initial cell content:', initialContent);

    // Click to add first entry (should show ✓ or 1)
    await todayCell.click();
    await page.waitForTimeout(500);

    let content = await todayCell.textContent();
    console.log('After 1st click:', content);
    expect(content).toMatch(/[✓1]/);

    // Click again (should show 2)
    await todayCell.click();
    await page.waitForTimeout(500);

    content = await todayCell.textContent();
    console.log('After 2nd click:', content);
    expect(content).toBe('2');

    // Click again (should show 3)
    await todayCell.click();
    await page.waitForTimeout(500);

    content = await todayCell.textContent();
    console.log('After 3rd click:', content);
    expect(content).toBe('3');
  });

  test('clicking on old dates shows confirmation', async ({ page }) => {
    // Set up dialog handler
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      console.log('Dialog shown:', dialogMessage);
      dialogShown = true;
      await dialog.dismiss();
    });

    // Wait for the table to load
    await page.waitForSelector('table');

    // Expand all sections first
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find a habit row
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    // Click on a cell from 3+ days ago (should trigger confirmation)
    // Get all td cells with cursor pointer style and click one that's not today
    const oldDateCells = firstHabitRow.locator('td[style*="cursor: pointer"]:not(.cell-today)');
    const cellCount = await oldDateCells.count();

    if (cellCount > 2) {
      // Click on the 3rd from last cell (should be ~3 days ago)
      await oldDateCells.nth(cellCount - 3).click();

      // Check that dialog was shown
      await page.waitForTimeout(500);
      expect(dialogShown).toBe(true);
    }
  });

  test('check console for errors when clicking', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Wait for the table to load
    await page.waitForSelector('table');

    // Expand all sections first
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find and click a habit cell
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    const todayCell = firstHabitRow.locator('td.cell-today');
    await todayCell.click();

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Log all console messages
    console.log('Console messages during click:');
    consoleMessages.forEach(msg => console.log(msg));

    // Check for errors (excluding known Dexie sync errors)
    const errors = consoleMessages.filter(msg =>
      msg.startsWith('error') && !msg.includes('404') && !msg.includes('HttpError')
    );
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }
  });
});