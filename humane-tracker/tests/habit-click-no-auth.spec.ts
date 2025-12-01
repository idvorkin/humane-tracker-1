import { test, expect } from '@playwright/test';

test.describe('Habit Tracker Click Functionality (No Auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app in test mode (no auth required)
    await page.goto('/?test=true');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Wait for habit tracker to be visible
    await page.waitForSelector('.container', { timeout: 10000 });
  });

  test('clicking on habit cells cycles through values', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Expand all sections first to see habits
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);
    
    // Find a habit row - let's use the first one we can find
    const firstHabitRow = page.locator('tr.section-row').first();
    
    // Wait for it to be visible
    await expect(firstHabitRow).toBeVisible();
    
    // Get the habit name for logging
    const habitName = await firstHabitRow.locator('.habit-name').textContent();
    console.log('Testing with habit:', habitName);
    
    // Find the cell for today (leftmost day cell after habit and status)
    // The layout is: Habit | Status | Today | Yesterday | ... | 6DaysAgo | Total
    // So today is the 3rd cell (index 2)
    const cells = firstHabitRow.locator('td');
    const todayCell = cells.nth(2); // Third cell (after Habit and Status)
    
    // Get initial content
    const initialContent = await todayCell.textContent();
    console.log('Initial cell content:', initialContent);
    
    // Click to add first entry (should show ✓)
    await todayCell.click();
    await page.waitForTimeout(500); // Wait for state update
    
    let content = await todayCell.textContent();
    console.log('After 1st click:', content);
    expect(content).toMatch(/[✓]/);
    
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
    
    // Click again (should show 4)
    await todayCell.click();
    await page.waitForTimeout(500);
    
    content = await todayCell.textContent();
    console.log('After 4th click:', content);
    expect(content).toBe('4');
    
    // Click again (should show 5)
    await todayCell.click();
    await page.waitForTimeout(500);
    
    content = await todayCell.textContent();
    console.log('After 5th click:', content);
    expect(content).toBe('5');
    
    // Click again (should show ½)
    await todayCell.click();
    await page.waitForTimeout(500);
    
    content = await todayCell.textContent();
    console.log('After 6th click:', content);
    expect(content).toBe('½');
    
    // Click again (should be empty)
    await todayCell.click();
    await page.waitForTimeout(500);
    
    content = await todayCell.textContent();
    console.log('After 7th click (should be empty):', content || '(empty)');
    expect(content?.trim()).toBe('');
  });

  test('clicking on old dates shows confirmation dialog', async ({ page }) => {
    // Set up dialog handler
    let dialogShown = false;
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      dialogShown = true;
      console.log('Dialog shown:', dialogMessage);
      await dialog.dismiss(); // Dismiss the dialog
    });
    
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Expand all sections
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);
    
    // Find a habit row
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();
    
    // Click on an old date cell (3 days ago - should trigger confirmation)
    // Layout is: Habit | Status | Today | Yesterday | 2DaysAgo | 3DaysAgo | ...
    const cells = firstHabitRow.locator('td');
    const oldDateCell = cells.nth(5); // 3 days ago (6th cell)
    
    console.log('Clicking cell...');
    await oldDateCell.click();
    
    // Wait a bit for dialog
    await page.waitForTimeout(500);
    
    // Check that dialog was shown
    expect(dialogShown).toBe(true);
    expect(dialogMessage).toContain('Are you sure');
  });

  test.skip('check console for debugging when clicking', async ({ page }) => {
    // Skip: Debug console messages were removed from production code
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      // Print immediately for debugging
      console.log(text);
    });
    
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Expand all sections
    const expandButton = page.locator('button:has-text("Expand All")');
    await expandButton.click();
    await page.waitForTimeout(500);
    
    // Find and click a habit cell
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();
    
    const cells = firstHabitRow.locator('td');
    const cellCount = await cells.count();
    const todayCell = cells.nth(cellCount - 2);
    
    console.log('Clicking cell...');
    await todayCell.click();
    
    // Wait a bit for any async operations
    await page.waitForTimeout(1000);
    
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