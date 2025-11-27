import { test, expect, Page } from '@playwright/test';

test.describe('Habit Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app in test mode (no auth required)
    await page.goto('/?test=true');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Wait for habit tracker content to be visible (not just loading screen)
    await page.waitForSelector('table', { timeout: 15000 });
  });

  test('should load the main page with all sections', async ({ page }) => {
    // Check header elements
    await expect(page.locator('.week-title')).toBeVisible();
    await expect(page.locator('.week-title')).toContainText('Last 7 Days');

    // Check summary bar
    await expect(page.locator('.summary-bar')).toBeVisible();
    await expect(page.locator('.summary-label').first()).toContainText('Due Today');

    // Check view toggle buttons
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible();
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();
    await expect(page.locator('button:has-text("Manage Habits")')).toBeVisible();

    // Check table structure
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th.col-habit')).toContainText('Habit');

    // Check legend
    await expect(page.locator('.legend-strip')).toBeVisible();
    await expect(page.locator('.legend-item').first()).toContainText('done');
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
    // Click Manage Habits button
    await page.click('button:has-text("Manage Habits")');

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
    // Open Manage Habits modal
    await page.click('button:has-text("Manage Habits")');
    await expect(page.locator('.habit-settings-modal')).toBeVisible();

    // Click Add New Habit
    const addNewButton = page.locator('button:has-text("+ Add New Habit")');
    await addNewButton.click();

    // Fill in the form (use the add-new-form specific inputs)
    const nameInput = page.locator('.add-new-form .new-habit-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Morning Meditation');
    await page.selectOption('.add-new-form .category-select', 'balance');
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

  test('should display summary statistics', async ({ page }) => {
    // Check all summary items are present
    await expect(page.locator('.summary-item:has-text("Due Today")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Overdue")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Done Today")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("On Track")')).toBeVisible();
    
    // Check that values are numbers
    const dueToday = page.locator('.summary-item:has-text("Due Today") .summary-value');
    const value = await dueToday.textContent();
    expect(value).toMatch(/\d+/);
  });

  test('should have proper dark theme styling', async ({ page }) => {
    // Check background colors
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be dark background
    expect(bgColor).toMatch(/rgb\(26, 26, 26\)/); // #1a1a1a
    
    // Check table background
    const table = page.locator('table');
    const tableBg = await table.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(tableBg).toMatch(/rgb\(36, 36, 36\)/); // #242424
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
  test('should track habit completion by clicking cells', async ({ page }) => {
    await page.goto('/?test=true');
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
    await page.goto('/?test=true');
    await page.waitForSelector('table', { timeout: 15000 });

    // Open Manage Habits modal
    await page.click('button:has-text("Manage Habits")');
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

  test('should display status indicators correctly', async ({ page }) => {
    await page.goto('/?test=true');
    await page.waitForSelector('table', { timeout: 15000 });

    // Check for status icons in the legend
    const legendItems = page.locator('.legend-item');
    
    await expect(legendItems.filter({ hasText: '● = done' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '✓ = met target' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '⏰ = due today' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '→ = tomorrow' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '! = overdue' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '½ = partial' })).toBeVisible();
  });
});