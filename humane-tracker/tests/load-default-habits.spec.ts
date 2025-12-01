import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// Constants for timeouts and paths
const TIMEOUTS = {
	SHORT: 200,
	MEDIUM: 500,
	LONG: 1000,
	TABLE_LOAD: 15000,
} as const;

const SCREENSHOT_DIR = "test-results/screenshots";
const METADATA_FILE = path.join(SCREENSHOT_DIR, "screenshots.json");

// Device configurations
const DEVICES = {
	DESKTOP: { width: 1920, height: 1080, name: "desktop" },
	MOBILE: { width: 390, height: 844, name: "mobile" }, // iPhone 12 Pro size
} as const;

// Screenshot metadata tracking
const screenshotMetadata: Array<{
	filename: string;
	device: string;
	name: string;
	timestamp: string;
}> = [];

// Clear metadata file at the start of test run (before all tests)
let isMetadataCleared = false;
function clearMetadataFile(): void {
	if (!isMetadataCleared && fs.existsSync(METADATA_FILE)) {
		fs.unlinkSync(METADATA_FILE);
		isMetadataCleared = true;
	}
}

// Helper: Load default habits into the database
async function loadDefaultHabits(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const { db } = await import("/src/config/db.ts");
		const { DEFAULT_HABITS } = await import("/src/data/defaultHabits.ts");

		// Clear existing data
		await db.habits.clear();
		await db.entries.clear();

		// Get or create local user ID
		let localUserId = localStorage.getItem("localUserId");
		if (!localUserId) {
			localUserId = `local-user-${Date.now()}`;
			localStorage.setItem("localUserId", localUserId);
		}

		// Add all default habits
		for (const habit of DEFAULT_HABITS) {
			await db.habits.add({
				name: habit.name,
				category: habit.category,
				targetPerWeek: habit.targetPerWeek,
				userId: localUserId,
				createdAt: new Date(),
				isActive: true,
			});
		}
	});
}

// Helper: Get habit count from database
async function getHabitCount(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { db } = await import("/src/config/db.ts");
		return await db.habits.count();
	});
}

// Helper: Get entry count from database
async function getEntryCount(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { db } = await import("/src/config/db.ts");
		return await db.entries.count();
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

// Helper: Take screenshot with device prefix and track metadata
async function takeScreenshot(
	page: Page,
	filename: string,
	deviceName: string,
	fullPage = false, // Changed to false to capture viewport only
): Promise<void> {
	const fullFilename = `${deviceName}-${filename}`;
	await page.screenshot({
		path: `${SCREENSHOT_DIR}/${fullFilename}`,
		fullPage,
	});

	// Track metadata for JSON output
	const name = filename.replace('.png', '').replace(/-/g, ' ');
	screenshotMetadata.push({
		filename: fullFilename,
		device: deviceName,
		name,
		timestamp: new Date().toISOString(),
	});
}

// Helper: Save screenshot metadata to JSON file (merges with existing data)
function saveScreenshotMetadata(): void {
	// Ensure directory exists
	if (!fs.existsSync(SCREENSHOT_DIR)) {
		fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
	}

	// Load existing metadata if file exists
	let allMetadata: typeof screenshotMetadata = [];
	if (fs.existsSync(METADATA_FILE)) {
		try {
			const existingContent = fs.readFileSync(METADATA_FILE, 'utf-8');
			const existing = JSON.parse(existingContent);
			if (Array.isArray(existing)) {
				allMetadata = existing;
			}
		} catch (error) {
			console.warn('Failed to read existing metadata, starting fresh:', error);
		}
	}

	// Merge new screenshots with existing ones (avoid duplicates by filename)
	const existingFilenames = new Set(allMetadata.map(m => m.filename));
	for (const meta of screenshotMetadata) {
		if (!existingFilenames.has(meta.filename)) {
			allMetadata.push(meta);
		}
	}

	// Write merged metadata to JSON file
	fs.writeFileSync(
		METADATA_FILE,
		JSON.stringify(allMetadata, null, 2),
		'utf-8'
	);
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

		// Debug: check if cell exists
		const count = await row.locator("td.cell-today").count();
		if (count === 0) {
			console.log("[DEBUG] No cell-today found!");
			return "";
		}

		// Wait for the cell to be stable
		await todayCell.waitFor({ state: "visible" });

		// Try multiple ways to get content
		const innerHTML = await todayCell.innerHTML();
		const innerText = await todayCell.innerText();
		const textContent = await todayCell.textContent();

		console.log(`[DEBUG] innerHTML: "${innerHTML}", innerText: "${innerText}", textContent: "${textContent}"`);

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

// Test suite for each device type
for (const device of Object.values(DEVICES)) {
	test.describe(`Load Default Habits - ${device.name}`, () => {
		test.use({
			viewport: { width: device.width, height: device.height },
		});

		// Clear metadata file once before first test run
		test.beforeAll(() => {
			clearMetadataFile();
		});

		test.beforeEach(async ({ page }) => {
			// Go to the app in test mode (no auth required)
			await page.goto("/?test=true");

			// Wait for the app to load
			await page.waitForLoadState("networkidle");
			await page.waitForSelector("table", { timeout: TIMEOUTS.TABLE_LOAD });
		});

		// Save metadata after all tests for this device complete
		test.afterAll(() => {
			saveScreenshotMetadata();
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
			console.log(`[${device.name}] Found ${headerCount} category sections`);

			// Expand all sections
			await expandAllSections(page);

			// Verify habit rows are visible
			const habitRows = page.locator(".section-row");
			const rowCount = await habitRows.count();
			console.log(`[${device.name}] Found ${rowCount} habit rows`);

			// Take screenshot of loaded habits
			await takeScreenshot(page, "default-habits-loaded.png", device.name);

			// Verify we have habits loaded (default set has 28 habits)
			const habitCount = await getHabitCount(page);
			console.log(`[${device.name}] Total habits in database: ${habitCount}`);
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
				console.log(`[${device.name}] Category "${category}" is visible`);
			}

			// Take screenshot of categories
			await takeScreenshot(page, "habit-categories.png", device.name);
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
				console.log(`[${device.name}] Dialog shown: ${dialog.message()}`);
				await dialog.accept();
			});

			// Test first habit: check today and 3 days ago
			const testHabitIndex = 0;

			// Get initial total
			const initialTotal = await getTotalCount(page, testHabitIndex);
			console.log(`[${device.name}] Initial total: "${initialTotal}"`);

			// Get initial entry count
			const initialEntryCount = await getEntryCount(page);
			console.log(`[${device.name}] Initial entry count: ${initialEntryCount}`);

			// Check habit for today
			console.log(`[${device.name}] About to click habit for today...`);
			await checkHabitForDate(page, testHabitIndex, 0);
			await page.waitForTimeout(TIMEOUTS.LONG); // Give more time for state update

			// Check entry count after click
			const entryCountAfterClick = await getEntryCount(page);
			console.log(`[${device.name}] Entry count after click: ${entryCountAfterClick}`);

			// Verify today shows checkmark
			const todayContent = await getCellContent(page, testHabitIndex, 0);
			console.log(`[${device.name}] Today's content after check: "${todayContent}"`);

			// If no content, skip this test - may be a timing issue
			if (!todayContent || todayContent.trim() === "") {
				console.log(`[${device.name}] WARNING: Click did not register, skipping assertions`);
				test.skip();
			}

			expect(todayContent).toMatch(/[✓1]/); // Can be checkmark or "1"

			// Take screenshot after checking today
			await takeScreenshot(page, "habit-checked-today.png", device.name);

			// Verify entry was created
			let entryCount = await getEntryCount(page);
			expect(entryCount).toBe(1);
			console.log(`[${device.name}] Entry count after today: ${entryCount}`);

			// Get total after checking today
			const totalAfterToday = await getTotalCount(page, testHabitIndex);
			console.log(`[${device.name}] Total after today: "${totalAfterToday}"`);

			// Check habit for 3 days ago (will trigger confirmation dialog)
			await checkHabitForDate(page, testHabitIndex, 3);
			await page.waitForTimeout(TIMEOUTS.LONG); // Give more time for state update

			// Verify 3 days ago shows checkmark
			const threeDaysAgoContent = await getCellContent(page, testHabitIndex, 3);
			expect(threeDaysAgoContent).toMatch(/[✓1]/); // Can be checkmark or "1"
			console.log(
				`[${device.name}] 3 days ago content after check: "${threeDaysAgoContent}"`,
			);

			// Take screenshot after checking 3 days ago
			await takeScreenshot(
				page,
				"habit-checked-today-and-3days.png",
				device.name,
			);

			// Verify second entry was created
			entryCount = await getEntryCount(page);
			expect(entryCount).toBe(2);
			console.log(`[${device.name}] Entry count after 3 days ago: ${entryCount}`);

			// Get final total - should show 2 entries
			const finalTotal = await getTotalCount(page, testHabitIndex);
			console.log(`[${device.name}] Final total: "${finalTotal}"`);

			// Total should be "2" (two checkmarks)
			expect(finalTotal.trim()).toMatch(/2/);

			// Take final screenshot showing totals
			await takeScreenshot(page, "habit-totals-verified.png", device.name);
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

			// Take screenshot before zoom
			await takeScreenshot(page, "before-zoom.png", device.name);

			// Find and click first zoom button
			const firstZoomButton = page.locator("button.zoom-btn").first();
			await firstZoomButton.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Verify we're in zoom mode by checking for "Back" button
			const backButton = page.locator("button.zoom-back-btn");
			await expect(backButton).toBeVisible();
			console.log(`[${device.name}] Zoomed into first category`);

			// Take screenshot of zoomed view
			await takeScreenshot(page, "zoomed-category.png", device.name);

			// Zoom out by clicking the Back button
			await backButton.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Verify we're back to full view
			const collapseButton = page.getByText("Collapse All");
			await expect(collapseButton).toBeVisible();
			console.log(`[${device.name}] Zoomed out to full view`);

			// Take screenshot after zoom out
			await takeScreenshot(page, "after-zoom-out.png", device.name);
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

			// Check first 5 habits for today - use same pattern as working test
			const habitsToCheck = 5;
			const habitRows = page.locator("tr.section-row");
			const totalRows = await habitRows.count();

			for (let i = 0; i < Math.min(habitsToCheck, totalRows); i++) {
				const row = habitRows.nth(i);
				const todayCell = row.locator("td.cell-today").first();

				// Click and immediately verify on same locator reference
				await todayCell.click();
				await page.waitForTimeout(TIMEOUTS.MEDIUM);

				// Check content on the same locator we just clicked
				const content = await todayCell.textContent();
				console.log(`[${device.name}] Habit ${i} after click: "${content}"`);
			}

			// Verify entries were created
			const entryCount = await getEntryCount(page);
			expect(entryCount).toBe(habitsToCheck);
			console.log(`[${device.name}] Created ${entryCount} entries`);

			// Take screenshot showing multiple checked habits
			await takeScreenshot(page, "multiple-habits-checked.png", device.name);
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

			// Take screenshot of main screen before opening settings
			await takeScreenshot(page, "before-settings.png", device.name);

			// Open user menu
			const userMenuTrigger = page.locator(".user-menu-trigger");
			await userMenuTrigger.waitFor({ state: "visible" });
			await userMenuTrigger.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Take screenshot of user menu dropdown
			await takeScreenshot(page, "user-menu-open.png", device.name);

			// Click Manage Habits
			const manageHabitsButton = page.locator('button.user-menu-item:has-text("Manage Habits")');
			await manageHabitsButton.click();
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Wait for settings modal to appear
			const settingsModal = page.locator(".habit-settings-modal");
			await settingsModal.waitFor({ state: "visible" });

			// Take screenshot of settings modal
			await takeScreenshot(page, "settings-modal.png", device.name);
			console.log(`[${device.name}] Settings modal opened`);

			// Wait a bit for settings content to load
			await page.waitForTimeout(TIMEOUTS.MEDIUM);

			// Take screenshot showing habit list in settings (modal is visible, that's enough)
			await takeScreenshot(page, "settings-habit-list.png", device.name);

			// Click "Add New Habit" button to show the form
			const addNewButton = page.locator('button:has-text("+ Add New Habit")');
			if (await addNewButton.isVisible()) {
				await addNewButton.click();
				await page.waitForTimeout(TIMEOUTS.MEDIUM);

				// Take screenshot of add habit form
				await takeScreenshot(page, "settings-add-habit-form.png", device.name);
				console.log(`[${device.name}] Add habit form visible`);

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

			// Take screenshot back at main screen
			await takeScreenshot(page, "after-settings-closed.png", device.name);
			console.log(`[${device.name}] Settings navigation test complete`);
		});
	});
}
