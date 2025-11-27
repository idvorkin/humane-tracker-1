import { test, expect } from '@playwright/test';

test.describe('Habit Settings - Add New Habit', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app in test mode (no auth required)
    await page.goto('http://localhost:3001?test=true');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Wait for habit tracker content to be visible (not just loading screen)
    await page.waitForSelector('table', { timeout: 15000 });
  });

  test('should open habit settings and add a new habit', async ({ page }) => {
    // Click the Manage Habits button
    const manageButton = page.locator('button:has-text("Manage Habits")');
    await expect(manageButton).toBeVisible();
    await manageButton.click();

    // Wait for the settings modal to open
    await page.waitForSelector('.habit-settings-modal');

    // Click Add New Habit button
    const addNewButton = page.locator('button:has-text("+ Add New Habit")');
    await expect(addNewButton).toBeVisible();
    await addNewButton.click();

    // Fill in the new habit form (use specific .add-new-form selectors)
    const nameInput = page.locator('.add-new-form .new-habit-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Habit');

    // Select category
    const categorySelect = page.locator('.add-new-form .category-select');
    await categorySelect.selectOption('strength');

    // Select tracking type
    const trackingTypeSelect = page.locator('.add-new-form .type-select');
    await trackingTypeSelect.selectOption('binary');

    // Set target days per week
    const targetInput = page.locator('.add-new-form .target-input');
    await targetInput.fill('4');

    // Click Add button
    const addButton = page.locator('.btn-add');
    await addButton.click();

    // Wait for the form to process - the Add New Habit button should reappear
    await expect(addNewButton).toBeVisible({ timeout: 5000 });

    // Verify the form was submitted by checking name input is cleared or hidden
    // The form collapses after successful submission
    await expect(nameInput).not.toBeVisible({ timeout: 3000 });
  });

  test('should show all tracking type options', async ({ page }) => {
    // Click the Manage Habits button
    const manageButton = page.locator('button:has-text("Manage Habits")');
    await manageButton.click();
    
    // Wait for the settings modal
    await page.waitForSelector('.habit-settings-modal');
    
    // Click Add New Habit button
    const addNewButton = page.locator('button:has-text("+ Add New Habit")');
    await addNewButton.click();
    
    // Check tracking type options
    const trackingTypeSelect = page.locator('.add-new-form .type-select');
    await expect(trackingTypeSelect).toBeVisible();
    
    // Get all options
    const options = await trackingTypeSelect.locator('option').allTextContents();
    
    // Should have Binary, Sets, and Hybrid options
    expect(options).toContain('✓ Binary');
    expect(options).toContain('123 Sets');
    expect(options).toContain('✓/123 Hybrid');
  });

  test('should cancel adding a new habit', async ({ page }) => {
    // Click the Manage Habits button
    const manageButton = page.locator('button:has-text("Manage Habits")');
    await manageButton.click();
    
    // Wait for the settings modal
    await page.waitForSelector('.habit-settings-modal');
    
    // Click Add New Habit button
    const addNewButton = page.locator('button:has-text("+ Add New Habit")');
    await addNewButton.click();
    
    // Fill in the name
    const nameInput = page.locator('.new-habit-input');
    await nameInput.fill('Test Habit');
    
    // Click Cancel button
    const cancelButton = page.locator('.btn-cancel-add');
    await cancelButton.click();
    
    // Form should disappear and Add New Habit button should reappear
    await expect(nameInput).not.toBeVisible();
    await expect(addNewButton).toBeVisible();
  });
});