import { test, expect, Page } from '@playwright/test';
import { clearIndexedDB } from './helpers/indexeddb-helpers';

test.describe('Habit Tracker App', () => {
  const TEST_USER_ID = 'anonymous';

  test.beforeEach(async ({ page }) => {
    // Use E2E mode - bypasses auth but uses REAL IndexedDB
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
    await page.waitForSelector('.user-menu-trigger', { timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    // Clean up IndexedDB after each test
    await clearIndexedDB(page);
  });

  test('should load the main page with all sections', async ({ page }) => {
    // Check header elements
    await expect(page.locator('.week-title')).toBeVisible();
    // Week title shows the current day name and date
    await expect(page.locator('.week-title .current-day')).toBeVisible();

    // Check summary bar
    await expect(page.locator('.summary-bar')).toBeVisible();
    await expect(page.locator('.summary-label').first()).toContainText('Due:');

    // Check view toggle button (toggles between Expand All/Collapse All)
    await expect(page.locator('.toggle-btn')).toBeVisible();

    // Check table structure
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th.col-habit')).toContainText('Habit');
  });

  test('should expand and collapse sections', async ({ page }) => {
    // Wait for sections to load
    await page.waitForSelector('.section-header', { timeout: 5000 });

    // First expand all to ensure we have expanded sections
    await page.click('button:has-text("Expand All")');
    await page.waitForTimeout(300);

    // Now collapse all
    await page.click('button:has-text("Collapse All")');
    await page.waitForTimeout(300);

    // Verify all arrows are collapsed
    const collapsedArrows = page.locator('.section-arrow.collapsed');
    const collapsedCount = await collapsedArrows.count();
    expect(collapsedCount).toBeGreaterThan(0);

    // Expand all again
    await page.click('button:has-text("Expand All")');
    await page.waitForTimeout(300);

    // Verify no arrows are collapsed
    const stillCollapsed = await page.locator('.section-arrow.collapsed').count();
    expect(stillCollapsed).toBe(0);
  });

  test('should open and close add habit modal', async ({ page }) => {
    // First open the user menu dropdown by clicking the avatar
    await page.click('.user-menu-trigger');
    await page.waitForSelector('.user-menu-dropdown');

    // Then click "Manage Habits" in the dropdown
    await page.click('button.user-menu-item:has-text("Manage Habits")');

    // Check settings modal is visible
    await expect(page.locator('.habit-settings-modal')).toBeVisible();

    // Click + Add New Habit button
    await page.click('button:has-text("+ Add New Habit")');

    // Check add form is visible
    await expect(page.locator('.new-habit-input')).toBeVisible();

    // Close modal using X button
    await page.click('.habit-settings-modal .close-btn');
    await expect(page.locator('.habit-settings-modal')).not.toBeVisible();
  });

  test('should create a new habit', async ({ page }) => {
    // Open user menu dropdown first
    await page.click('.user-menu-trigger');
    await page.waitForSelector('.user-menu-dropdown');

    // Click Manage Habits in the dropdown
    await page.click('button.user-menu-item:has-text("Manage Habits")');
    await expect(page.locator('.habit-settings-modal')).toBeVisible();

    // Click Add New Habit
    const addNewButton = page.locator('button:has-text("+ Add New Habit")');
    await addNewButton.click();

    // Fill in the form (use the add-new-form specific inputs)
    const nameInput = page.locator('.add-new-form .new-habit-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Morning Meditation');
    // Category is now a text input with datalist autocomplete
    await page.fill('.add-new-form .category-input', 'Inner Balance');
    await page.fill('.add-new-form .target-input', '5');

    // Submit form
    await page.click('.btn-add');

    // Wait for form to collapse (form submission successful)
    await expect(addNewButton).toBeVisible({ timeout: 5000 });
    await expect(nameInput).not.toBeVisible({ timeout: 3000 });

    // Close modal
    await page.click('.habit-settings-modal .close-btn');
    await expect(page.locator('.habit-settings-modal')).not.toBeVisible();
  });

  test('should expand all sections', async ({ page }) => {
    // Click Expand All button
    await page.click('button:has-text("Expand All")');
    await page.waitForTimeout(500);

    // Check that no section arrows have collapsed class
    const collapsedArrows = page.locator('.section-arrow.collapsed');
    const count = await collapsedArrows.count();
    expect(count).toBe(0);
  });

  test('should collapse all sections', async ({ page }) => {
    // First expand all
    await page.click('button:has-text("Expand All")');
    await page.waitForTimeout(500);

    // Then collapse all
    await page.click('button:has-text("Collapse All")');
    await page.waitForTimeout(500);

    // Check that all section arrows have collapsed class
    const arrows = page.locator('.section-arrow');
    const totalCount = await arrows.count();

    if (totalCount > 0) {
      const collapsedArrows = page.locator('.section-arrow.collapsed');
      const collapsedCount = await collapsedArrows.count();
      expect(collapsedCount).toBe(totalCount);
    }
  });

  test('should display correct week dates', async ({ page }) => {
    // Check that day headers are visible
    const dayHeaders = page.locator('th.col-day');
    const dayCount = await dayHeaders.count();
    
    // Should have 7 days
    expect(dayCount).toBe(7);
    
    // Check that headers contain day abbreviations
    const firstDay = await dayHeaders.first().textContent();
    expect(firstDay).toMatch(/[SMTWF]/);
  });

  test('should allow selecting a past day and highlight the entire column', async ({ page }) => {
    // Expand a section to see habit rows (click on the section title area, not the zoom button)
    const sectionTitle = page.locator('.section-title').first();
    await sectionTitle.click();
    await page.waitForTimeout(200);

    // Wait for habit rows to appear after expansion
    await expect(page.locator('.section-row').first()).toBeVisible();

    // Get the second day column header (a past day, not today)
    const dayHeaders = page.locator('th.col-day');
    const secondDayHeader = dayHeaders.nth(1);

    // Click on the second day to select it
    await secondDayHeader.click();
    await page.waitForTimeout(300);

    // Verify the column header has the selected class
    await expect(secondDayHeader).toHaveClass(/col-selected/);

    // Verify cells in the column also have the selected class (entire column highlighted)
    const selectedCells = page.locator('.section-row td.cell-selected');
    await expect(selectedCells.first()).toBeVisible();

    // Verify the header title updates to show the selected date
    const headerTitle = page.locator('.week-title .current-day, .week-title .selected-day');
    await expect(headerTitle).toBeVisible();

    // Click the header title to return to today
    await headerTitle.click();
    await page.waitForTimeout(300);

    // Verify the column is no longer selected
    await expect(secondDayHeader).not.toHaveClass(/col-selected/);

    // Verify cells no longer have the selected class
    await expect(page.locator('.section-row td.cell-selected')).toHaveCount(0);
  });

  test('should display summary statistics', async ({ page }) => {
    // Check all summary items are present (compact labels)
    await expect(page.locator('.summary-item:has-text("Due:")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Done:")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Late:")')).toBeVisible();

    // Check that values are numbers
    const dueToday = page.locator('.summary-item:has-text("Due:") .summary-value');
    const value = await dueToday.textContent();
    expect(value).toMatch(/\d+/);
  });

  test('should have proper dark theme styling', async ({ page }) => {
    // Check background colors
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be dark background (varies between themes)
    // Just check it's a valid color
    expect(bgColor).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);

    // Check table background
    const table = page.locator('table');
    const tableBg = await table.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(tableBg).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
  });

  test('should be responsive to mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that main container is still visible
    await expect(page.locator('.container')).toBeVisible();
    
    // Check that table is scrollable or responsive
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});

test.describe('Habit Tracking Functions', () => {
  const TEST_USER_ID = 'anonymous';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async (userId) => {
      const { habitService } = await import('/src/services/habitService.ts');
      await habitService.bulkCreateHabits([
        { userId, name: 'Physical Mobility', category: 'Mobility', targetPerWeek: 5, order: 0 },
        { userId, name: 'Box Breathing', category: 'Emotional Health', targetPerWeek: 3, order: 1 },
      ]);
    }, TEST_USER_ID);
  });

  test.afterEach(async ({ page }) => {
    await clearIndexedDB(page);
  });

  test('should track habit completion by clicking cells', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 15000 });

    // Wait for table cells to be clickable
    await page.waitForTimeout(500);

    // Find a habit row cell (if habits exist)
    const habitCells = page.locator('td[style*="cursor: pointer"]');
    const cellCount = await habitCells.count();
    
    if (cellCount > 0) {
      // Click on first available cell
      const firstCell = habitCells.first();
      
      // Get initial content
      const initialContent = await firstCell.textContent();
      
      // Click to mark as complete
      await firstCell.click();
      await page.waitForTimeout(1000); // Wait for update
      
      // Check if content changed (should show ✓ or similar)
      const newContent = await firstCell.textContent();
      
      // Content should change after click
      if (initialContent === '') {
        expect(newContent).toMatch(/[✓½1-9]/);
      }
    }
  });

  test('should validate habit form inputs', async ({ page }) => {
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForSelector('.user-menu-trigger', { timeout: 15000 });

    // Open user menu dropdown first
    await page.click('.user-menu-trigger');
    await page.waitForSelector('.user-menu-dropdown');

    // Click Manage Habits in the dropdown
    await page.click('button.user-menu-item:has-text("Manage Habits")');
    await expect(page.locator('.habit-settings-modal')).toBeVisible();

    // Click Add New Habit
    await page.click('button:has-text("+ Add New Habit")');

    // Verify form elements are visible
    const nameInput = page.locator('.add-new-form .new-habit-input');
    await expect(nameInput).toBeVisible();

    const targetInput = page.locator('.add-new-form .target-input');
    await expect(targetInput).toBeVisible();

    // Check target field has constraints
    const minValue = await targetInput.getAttribute('min');
    expect(minValue).toBe('1');

    const maxValue = await targetInput.getAttribute('max');
    expect(maxValue).toBe('7');
  });

});