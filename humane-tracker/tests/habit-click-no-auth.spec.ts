import { test, expect } from '@playwright/test';
import { waitForEntryCount, getDBEntryCount, clearIndexedDB } from './helpers/indexeddb-helpers';

test.describe('Habit Tracker Click Functionality (No Auth)', () => {
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

    // Click 1: ✓ or 1
    await todayCell.click();
    await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });
    await expect(todayCell).toHaveText(/[✓1]/, { timeout: 5000 });
    console.log('After 1st click:', await todayCell.textContent());

    // Click 2: 2
    await todayCell.click();
    await expect(todayCell).toHaveText('2', { timeout: 5000 });
    console.log('After 2nd click:', await todayCell.textContent());

    // Click 3: 3
    await todayCell.click();
    await expect(todayCell).toHaveText('3', { timeout: 5000 });
    console.log('After 3rd click:', await todayCell.textContent());

    // Click 4: 4
    await todayCell.click();
    await expect(todayCell).toHaveText('4', { timeout: 5000 });
    console.log('After 4th click:', await todayCell.textContent());

    // Click 5: 5
    await todayCell.click();
    await expect(todayCell).toHaveText('5', { timeout: 5000 });
    console.log('After 5th click:', await todayCell.textContent());

    // Click 6: ½
    await todayCell.click();
    await expect(todayCell).toHaveText('½', { timeout: 5000 });
    console.log('After 6th click:', await todayCell.textContent());

    // Click 7: empty (cycles back)
    await todayCell.click();
    await expect(todayCell).toHaveText('', { timeout: 5000 });
    console.log('After 7th click (should be empty):', (await todayCell.textContent()) || '(empty)');
  });

  test('clicking on old dates shows confirmation dialog', async ({ page }) => {
    // Set up dialog handler
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      dialogShown = true;
      console.log('Dialog shown:', dialogMessage);
      await dialog.dismiss();
    });

    // Expand all sections
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find a habit row
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    // Click on an old date cell (3 days ago - should trigger confirmation)
    const cells = firstHabitRow.locator('td');
    const oldDateCell = cells.nth(5); // 3 days ago

    console.log('Clicking old cell...');
    await oldDateCell.click();

    // Wait for dialog
    await page.waitForTimeout(500);

    // Check that dialog was shown
    expect(dialogShown).toBe(true);
    expect(dialogMessage).toContain('Are you sure');
  });

  test.skip('check console for debugging when clicking', async ({ page }) => {
    // Skip: Debug console messages were removed from production code
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    // Expand all sections
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);

    // Find and click a habit cell
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();

    const todayCell = firstHabitRow.locator('td.cell-today');

    console.log('Clicking cell...');
    const initialEntryCount = await getDBEntryCount(page);
    await todayCell.click();
    await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

    // Check for specific debug messages
    const clickHandlerMessages = consoleMessages.filter(msg =>
      msg.includes('Handling click') ||
      msg.includes('Creating new entry') ||
      msg.includes('Updating existing entry')
    );

    console.log('\nClick handler messages found:', clickHandlerMessages.length);

    // Check for errors
    const errors = consoleMessages.filter(msg => msg.startsWith('error'));
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }

    // We should have at least one click handler message
    expect(clickHandlerMessages.length).toBeGreaterThan(0);
  });
});
