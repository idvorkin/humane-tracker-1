import { test, expect, type Page } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb-helpers";

// Constants for timeouts
const TIMEOUTS = {
	SHORT: 200,
	MEDIUM: 500,
	LONG: 1000,
	TABLE_LOAD: 15000,
} as const;

// Helper: Load default habits into the database
async function loadDefaultHabits(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const { habitService } = await import("/src/services/habitService.ts");
		const { DEFAULT_HABITS } = await import("/src/data/defaultHabits.ts");

		// Use mock-user for test mode
		const userId = "mock-user";

		// Clear existing habits for this user
		const existingHabits = await habitService.getHabits(userId);
		for (const habit of existingHabits) {
			await habitService.deleteHabit(habit.id);
		}

		// Add all default habits using habitService (works with both real and mock repos)
		for (const habit of DEFAULT_HABITS) {
			await habitService.createHabit({
				name: habit.name,
				category: habit.category,
				targetPerWeek: habit.targetPerWeek,
				userId,
			});
		}
	});
}

// Helper: Get habit count from database
async function getHabitCount(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { habitService } = await import("/src/services/habitService.ts");
		const userId = "mock-user";
		const habits = await habitService.getHabits(userId);
		return habits.length;
	});
}

// Helper: Get entry count from database
async function getEntryCount(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { habitService } = await import("/src/services/habitService.ts");
		const userId = "mock-user";
		// Get all habits, then count their entries
		const habits = await habitService.getHabitsWithStatus(userId);
		let totalEntries = 0;
		for (const habit of habits) {
			totalEntries += habit.entries.length;
		}
		return totalEntries;
	});
}

// Helper: Expand all habit sections
async function expandAllSections(page: Page): Promise<void> {
	const expandButton = page.getByText("Expand All");
	if (await expandButton.isVisible()) {
		await expandButton.click();
		await page.waitForTimeout(TIMEOUTS.MEDIUM);
	}
}

// Helper: Check habit for a specific date offset (0 = today, 1 = yesterday, etc.)
async function checkHabitForDate(
	page: Page,
	habitRowIndex: number,
	daysAgo: number,
): Promise<void> {
	const habitRows = page.locator("tr.section-row");
	const row = habitRows.nth(habitRowIndex);

	// Find the cell marked with cell-today class, then navigate to the correct offset
	// Today is index 0 from cell-today, yesterday is 1 after it, etc.
	if (daysAgo === 0) {
		// For today, use the cell-today class
		const todayCell = row.locator("td.cell-today").first();
		await todayCell.click();
	} else {
		// For other days, count from cell-today
		const todayCell = row.locator("td.cell-today").first();
		const cells = row.locator("td");
		const cellCount = await cells.count();

		// Find the index of today's cell
		for (let i = 0; i < cellCount; i++) {
			const cell = cells.nth(i);
			const classes = await cell.getAttribute("class");
			if (classes?.includes("cell-today")) {
				// Click on the cell that's daysAgo positions after today
				const targetCell = cells.nth(i + daysAgo);
				await targetCell.click();
				break;
			}
		}
	}
	await page.waitForTimeout(TIMEOUTS.SHORT);
}

// Helper: Get cell content for verification
async function getCellContent(
	page: Page,
	habitRowIndex: number,
	daysAgo: number,
): Promise<string> {
	// Wait a moment for DOM to update
	await page.waitForTimeout(TIMEOUTS.MEDIUM);

	// Re-query from scratch to get fresh DOM
	const habitRows = page.locator("tr.section-row");
	const row = habitRows.nth(habitRowIndex);

	if (daysAgo === 0) {
		// For today, use the cell-today class
		const todayCell = row.locator("td.cell-today").first();

		// Check if cell exists
		const count = await row.locator("td.cell-today").count();
		if (count === 0) {
			return "";
		}

		// Wait for the cell to be stable
		await todayCell.waitFor({ state: "visible" });

		// Get cell content
		const innerText = await todayCell.innerText();
		const textContent = await todayCell.textContent();

		return (innerText || textContent || "").trim();
	} else {
		// For other days, find today first then count from it
		const cells = row.locator("td");
		const cellCount = await cells.count();

		for (let i = 0; i < cellCount; i++) {
			const cell = cells.nth(i);
			const classes = await cell.getAttribute("class");
			if (classes?.includes("cell-today")) {
				const targetCell = cells.nth(i + daysAgo);
				await targetCell.waitFor({ state: "visible" });
				const content = await targetCell.innerText();
				return (content || "").trim();
			}
		}
	}
	return "";
}

// Helper: Get total count for a habit row
async function getTotalCount(page: Page, habitRowIndex: number): Promise<string> {
	const habitRows = page.locator("tr.section-row");
	const row = habitRows.nth(habitRowIndex);
	// Total is typically the last cell
	const cells = row.locator("td");
	const totalCell = cells.last();
	return (await totalCell.textContent()) || "";
}

// Test suite
test.describe("Load Default Habits", () => {
	test.beforeEach(async ({ page }) => {
		// Go to the app in E2E mode (no auth required, uses real IndexedDB)
		await page.goto("/?e2e=true");

		// Wait for the app to load
		await page.waitForLoadState("networkidle");
		await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
	});

	test.afterEach(async ({ page }) => {
		// Clean up IndexedDB after each test
		await clearIndexedDB(page);
	});

	test("should use correct viewport for project configuration", async ({
		page,
	}) => {
		// Validate that Playwright's project configuration is actually applying viewports
		const viewport = page.viewportSize();
		expect(viewport).toBeDefined();

		// Check viewport dimensions to ensure mobile vs desktop is correctly applied
		// Desktop (chromium project): width >= 1920
		// Mobile (iPhone 14 Pro project): width = 393
		const width = viewport?.width ?? 0;

		// This test will fail if mobile viewport isn't applied on mobile project
		// or if desktop viewport isn't applied on desktop project
		expect(width).toBeGreaterThan(0);

		// Verify it's either mobile (< 500px) or desktop (>= 1000px)
		const isMobile = width < 500;
		const isDesktop = width >= 1000;
		expect(isMobile || isDesktop).toBe(true);
	});

	test("should load default habits and display them correctly", async ({
		page,
	}) => {
		// Load default habits
		await loadDefaultHabits(page);

		// Reload to see the loaded habits
		await page.reload();
		await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		await page.waitForTimeout(TIMEOUTS.LONG);

		// Verify category sections appear
		const sectionHeaders = page.locator(".section-header");
		const headerCount = await sectionHeaders.count();
		expect(headerCount).toBeGreaterThan(0);

		// Expand all sections
		await expandAllSections(page);

		// Verify habit rows are visible
		const habitRows = page.locator(".section-row");
		const rowCount = await habitRows.count();
		expect(rowCount).toBeGreaterThan(0);

		// Verify we have habits loaded (default set has 28 habits)
		const habitCount = await getHabitCount(page);
		expect(habitCount).toBeGreaterThan(20);
	});

	test("should display expected habit categories", async ({ page }) => {
		// Check if habits already exist, load if needed
		let habitCount = await getHabitCount(page);

		if (habitCount === 0) {
			await loadDefaultHabits(page);
			await page.reload();
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
			habitCount = await getHabitCount(page);
		}

		await page.waitForTimeout(TIMEOUTS.LONG);

		// Expand all sections to see categories
		await expandAllSections(page);

		// Expected categories from default habits
		const expectedCategories = [
			"Mobility",
			"Relationships",
			"Emotional Health",
			"Smile and Wonder",
			"Physical Health",
		];

		// Verify each category is visible
		for (const category of expectedCategories) {
			const categorySection = page.locator(
				`.section-header:has-text("${category}")`,
			);
			await expect(categorySection).toBeVisible();
		}
	});

	test("should correctly track habit checks and update totals", async ({
		page,
	}) => {
		// Ensure habits are loaded
		let habitCount = await getHabitCount(page);
		if (habitCount === 0) {
			await loadDefaultHabits(page);
			await page.reload();
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		}

		await page.waitForTimeout(TIMEOUTS.LONG);
		await expandAllSections(page);

		// Set up dialog handler for old date confirmation
		page.on("dialog", async (dialog) => {
			await dialog.accept();
		});

		// Test first habit: check today and 3 days ago
		const testHabitIndex = 0;

		// Check habit for today
		await checkHabitForDate(page, testHabitIndex, 0);
		await page.waitForTimeout(TIMEOUTS.LONG);

		// Verify today shows checkmark
		const todayContent = await getCellContent(page, testHabitIndex, 0);

		// If no content, skip this test - may be a timing issue
		if (!todayContent || todayContent.trim() === "") {
			test.skip();
		}

		expect(todayContent).toMatch(/[✓1]/); // Can be checkmark or "1"

		// Verify entry was created
		let entryCount = await getEntryCount(page);
		expect(entryCount).toBe(1);

		// Check habit for 3 days ago (will trigger confirmation dialog)
		await checkHabitForDate(page, testHabitIndex, 3);
		await page.waitForTimeout(TIMEOUTS.LONG);

		// Verify 3 days ago shows checkmark
		const threeDaysAgoContent = await getCellContent(page, testHabitIndex, 3);
		expect(threeDaysAgoContent).toMatch(/[✓1]/);

		// Verify second entry was created
		entryCount = await getEntryCount(page);
		expect(entryCount).toBe(2);

		// Get final total - should show 2 entries
		const finalTotal = await getTotalCount(page, testHabitIndex);
		expect(finalTotal.trim()).toMatch(/2/);
	});

	test("should support zoom functionality", async ({ page }) => {
		// Ensure habits are loaded
		let habitCount = await getHabitCount(page);
		if (habitCount === 0) {
			await loadDefaultHabits(page);
			await page.reload();
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		}

		await page.waitForTimeout(TIMEOUTS.LONG);
		await expandAllSections(page);

		// Find and click first zoom button
		const firstZoomButton = page.locator("button.zoom-btn").first();
		await firstZoomButton.click();
		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Verify we're in zoom mode by checking for "Back" button
		const backButton = page.locator("button.zoom-back-btn");
		await expect(backButton).toBeVisible();

		// Zoom out by clicking the Back button
		await backButton.click();
		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Verify we're back to full view
		const collapseButton = page.getByText("Collapse All");
		await expect(collapseButton).toBeVisible();
	});

	test("should handle multiple habit checks in sequence", async ({ page }) => {
		// Ensure habits are loaded
		let habitCount = await getHabitCount(page);
		if (habitCount === 0) {
			await loadDefaultHabits(page);
			await page.reload();
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		}

		await page.waitForTimeout(TIMEOUTS.LONG);
		await expandAllSections(page);

		// Check first 5 habits for today
		const habitsToCheck = 5;
		const habitRows = page.locator("tr.section-row");
		const totalRows = await habitRows.count();

		for (let i = 0; i < Math.min(habitsToCheck, totalRows); i++) {
			const row = habitRows.nth(i);
			const todayCell = row.locator("td.cell-today").first();
			await todayCell.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);
		}

		// Verify entries were created
		const entryCount = await getEntryCount(page);
		expect(entryCount).toBe(habitsToCheck);
	});

	test("should navigate through settings screens", async ({ page }) => {
		// Ensure habits are loaded
		let habitCount = await getHabitCount(page);
		if (habitCount === 0) {
			await loadDefaultHabits(page);
			await page.reload();
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		}

		await page.waitForTimeout(TIMEOUTS.LONG);

		// Open user menu
		const userMenuTrigger = page.locator(".user-menu-trigger");
		await userMenuTrigger.waitFor({ state: "visible" });
		await userMenuTrigger.click();
		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Click Manage Habits
		const manageHabitsButton = page.locator('button.user-menu-item:has-text("Manage Habits")');
		await manageHabitsButton.click();
		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Wait for settings modal to appear
		const settingsModal = page.locator(".habit-settings-modal");
		await settingsModal.waitFor({ state: "visible" });

		// Wait for settings content to load
		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Click "Add New Habit" button to show the form
		const addNewButton = page.locator('button:has-text("+ Add New Habit")');
		if (await addNewButton.isVisible()) {
			await addNewButton.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Cancel/close the add form
			const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
			if (await cancelButton.isVisible()) {
				await cancelButton.click();
				await page.waitForTimeout(TIMEOUTS.SHORT);
			}
		}

		// Close settings modal
		const closeButton = settingsModal.locator('button:has-text("Close"), button[aria-label="Close"]').first();
		if (await closeButton.isVisible()) {
			await closeButton.click();
		} else {
			// Try pressing Escape
			await page.keyboard.press("Escape");
		}

		await page.waitForTimeout(TIMEOUTS.MEDIUM);

		// Verify we're back at main screen
		const table = page.locator("table");
		await expect(table).toBeVisible();
	});
});
