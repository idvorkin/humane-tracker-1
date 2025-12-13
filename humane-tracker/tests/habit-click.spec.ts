import { test, expect } from '@playwright/test';
import { waitForEntryCount, getDBEntryCount, clearIndexedDB } from './helpers/indexeddb-helpers';

test.describe('Habit Tracker Click Functionality', () => {
  const TEST_USER_ID = 'anonymous';

  test.beforeEach(async ({ page }) => {
    // Real app - anonymous user mode with real IndexedDB
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Load default habits programmatically using real IndexedDB
    await page.evaluate(async (userId) => {
      const { habitService } = await import('/src/services/habitService.ts');

      // Create default habits
      await habitService.bulkCreateHabits([
        {
          userId,
          name: 'Physical Mobility',
          category: 'Mobility',
          targetPerWeek: 5,
          order: 0,
        },
        {
          userId,
          name: 'Box Breathing',
          category: 'Emotional Health',
          targetPerWeek: 3,
          order: 1,
        },
      ]);
    }, TEST_USER_ID);

    await page.waitForSelector('table', { timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    // Clean up IndexedDB after each test
    await clearIndexedDB(page);
  });

  test('clicking on habit cells cycles through values', async ({ page }) => {
    // Expand all sections first
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    const habitName = await firstHabitRow.locator('.habit-name').textContent();
    console.log('Testing with habit:', habitName);

    const todayCell = firstHabitRow.locator('td.cell-today');
    const initialContent = await todayCell.textContent();
    console.log('Initial cell content:', initialContent);

    // Get initial DB state
    const initialEntryCount = await getDBEntryCount(page);

    // Click 1: Should show ✓ or 1
    await todayCell.click();
    await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });
    await expect(todayCell).toHaveText(/[✓1]/, { timeout: 5000 });
    const content1 = await todayCell.textContent();
    console.log('After 1st click:', content1);

    // Click 2: Should show 2
    await todayCell.click();
    await expect(todayCell).toHaveText('2', { timeout: 5000 });
    const content2 = await todayCell.textContent();
    console.log('After 2nd click:', content2);

    // Click 3: Should show 3
    await todayCell.click();
    await expect(todayCell).toHaveText('3', { timeout: 5000 });
    const content3 = await todayCell.textContent();
    console.log('After 3rd click:', content3);
  });

  test('clicking on old dates shows confirmation', async ({ page }) => {
    // Set up dialog handler BEFORE clicking
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      console.log('Dialog shown:', dialog.message());
      dialogShown = true;
      await dialog.accept();
    });

    // Expand all sections first
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    // Click on a cell that's several days old (5th cell = 3 days ago)
    const cells = firstHabitRow.locator('td.cell');
    const oldCell = cells.nth(5); // 3 days ago

    // Click on the old cell
    await oldCell.click();
    await page.waitForTimeout(1000);

    expect(dialogShown).toBe(true);
  });

  test('check console for errors when clicking', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Expand all sections
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    const todayCell = firstHabitRow.locator('td.cell-today');

    // Get initial DB state
    const initialEntryCount = await getDBEntryCount(page);

    // Click and wait for update
    await todayCell.click();
    await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

    console.log('Console messages during click:');
    page.on('console', (msg) => {
      console.log(msg.type(), msg.text());
    });

    // Check for errors
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }
  });

  test('clicking habit updates day view and week summary statistics', async ({ page }) => {
    // Expand all sections first
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Get initial state
    const doneToday = page.locator('.summary-item:has-text("Done Today") .summary-value');
    const initialDoneText = await doneToday.textContent();
    const initialDoneCount = parseInt(initialDoneText || '0', 10);
    console.log('Initial Done Today count:', initialDoneCount);

    // Get initial entry count from IndexedDB
    const initialEntryCount = await getDBEntryCount(page);
    console.log('Initial entry count in DB:', initialEntryCount);

    // Find first habit and today's cell
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    const habitName = await firstHabitRow.locator('.habit-name').textContent();
    console.log('Testing with habit:', habitName);

    const todayCell = firstHabitRow.locator('td.cell-today');
    const initialCellContent = await todayCell.textContent();
    console.log('Initial cell content:', initialCellContent);

    // Click to mark as complete
    await todayCell.click();
    console.log('Clicked on today cell');

    // Wait for IndexedDB to actually have the entry
    await waitForEntryCount(page, initialEntryCount + 1, {
      timeout: 5000,
      polling: 100
    });
    console.log('IndexedDB confirmed entry was written');

    // Wait for DOM to reflect the change
    await expect(todayCell).toHaveText(/[✓1]/, { timeout: 5000 });
    const updatedCellContent = await todayCell.textContent();
    console.log('Cell content after click:', updatedCellContent);

    // Verify week summary updated
    if (initialCellContent === '' || initialCellContent === '0') {
      const expectedCount = initialDoneCount + 1;
      await expect(doneToday).toHaveText(expectedCount.toString(), { timeout: 5000 });
      console.log('Week summary updated. New Done Today count:', expectedCount);
    } else {
      console.log('Cell already had content');
    }

    // Verify final state in IndexedDB
    const finalEntryCount = await getDBEntryCount(page);
    expect(finalEntryCount).toBe(initialEntryCount + 1);
    console.log('Final entry count in DB:', finalEntryCount);
  });
});
