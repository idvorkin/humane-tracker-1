import { test, expect } from "@playwright/test";
import {
	waitForEntryCount,
	getDBEntryCount,
	clearIndexedDB,
} from "./helpers/indexeddb-helpers";

test.describe("Tag Completion (Single-Complete Model)", () => {
	const TEST_USER_ID = "anonymous";

	test.beforeEach(async ({ page }) => {
		// Real app - anonymous user mode with real IndexedDB
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Create tag and children programmatically using real IndexedDB
		await page.evaluate(async (userId) => {
			const { habitService } = await import("/src/services/habitService.ts");

			// Create children first
			const shoulderYId = await habitService.createHabit({
				userId,
				name: "Shoulder Y",
				category: "Mobility",
				targetPerWeek: 2,
				habitType: "raw",
			});
			const wallSlideId = await habitService.createHabit({
				userId,
				name: "Wall Slide",
				category: "Mobility",
				targetPerWeek: 2,
				habitType: "raw",
			});
			const shoulderWId = await habitService.createHabit({
				userId,
				name: "Shoulder W",
				category: "Mobility",
				targetPerWeek: 2,
				habitType: "raw",
			});
			const swimmersId = await habitService.createHabit({
				userId,
				name: "Swimmers",
				category: "Mobility",
				targetPerWeek: 2,
				habitType: "raw",
			});

			// Create tag with children
			const tagId = await habitService.createHabit({
				userId,
				name: "Shoulder Accessory",
				category: "Mobility",
				targetPerWeek: 3,
				habitType: "tag",
				childIds: [shoulderYId, wallSlideId, shoulderWId, swimmersId],
			});

			// Update children with parentIds
			await habitService.updateHabit(shoulderYId, { parentIds: [tagId] });
			await habitService.updateHabit(wallSlideId, { parentIds: [tagId] });
			await habitService.updateHabit(shoulderWId, { parentIds: [tagId] });
			await habitService.updateHabit(swimmersId, { parentIds: [tagId] });
		}, TEST_USER_ID);

		await page.waitForSelector("table", { timeout: 15000 });
	});

	test.afterEach(async ({ page }) => {
		await clearIndexedDB(page);
	});

	test("clicking child habit (Shoulder W) marks tag as completed", async ({
		page,
	}) => {
		// Expand all sections to see nested habits
		const expandButton = page.locator('button:has-text("Expand All")');
		await expandButton.click();

		// Wait for expansion to complete by checking button text changes
		await expect(
			page.locator('button:has-text("Collapse All")'),
		).toBeVisible();

		// Expand the tag to show its children (click the arrow)
		const tagRow = page.locator('tr.section-row:has-text("Shoulder Accessory")');
		const tagArrow = tagRow.locator(".tag-arrow");
		await tagArrow.click();

		// Wait for children to be visible (Shoulder W is a child)
		await expect(
			page.locator('tr.section-row:has-text("Shoulder W")'),
		).toBeVisible();

		// Find the Shoulder W row (child habit)
		const shoulderWRow = page.locator('tr.section-row:has-text("Shoulder W")');
		await expect(shoulderWRow).toBeVisible();

		// Tag row already located above
		await expect(tagRow).toBeVisible();

		// Get initial state
		const initialEntryCount = await getDBEntryCount(page);

		// Get today's cell for Shoulder W
		const shoulderWTodayCell = shoulderWRow.locator("td.cell-today");
		const initialChildContent = await shoulderWTodayCell.textContent();
		console.log("Initial Shoulder W cell:", initialChildContent);

		// Get today's cell for tag
		const tagTodayCell = tagRow.locator("td.cell-today");
		const initialTagContent = await tagTodayCell.textContent();
		console.log("Initial tag cell:", initialTagContent);

		// Click Shoulder W to complete it
		await shoulderWTodayCell.click();
		console.log("Clicked Shoulder W");

		// Wait for entry to be written
		await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

		// Verify Shoulder W shows completion
		await expect(shoulderWTodayCell).toHaveText(/[✓1]/, { timeout: 5000 });
		const updatedChildContent = await shoulderWTodayCell.textContent();
		console.log("Shoulder W after click:", updatedChildContent);

		// Verify tag also shows completion (this is the key test!)
		// Tag should show ✓ because a child has an entry
		await expect(tagTodayCell).toHaveText("✓", { timeout: 5000 });
		const updatedTagContent = await tagTodayCell.textContent();
		console.log("Tag after child click:", updatedTagContent);
	});

	test("tag shows completion when any child is done (humane model)", async ({
		page,
	}) => {
		// Expand all sections
		const expandButton = page.locator('button:has-text("Expand All")');
		await expandButton.click();

		// Wait for expansion to complete
		await expect(
			page.locator('button:has-text("Collapse All")'),
		).toBeVisible();

		// Find tag row and expand it to show children
		const tagRow = page.locator(
			'tr.section-row:has-text("Shoulder Accessory")',
		);
		const tagArrow = tagRow.locator(".tag-arrow");
		await tagArrow.click();

		// Wait for children to be visible
		await expect(
			page.locator('tr.section-row:has-text("Swimmers")'),
		).toBeVisible();

		// Find Swimmers row (another child)
		const swimmersRow = page.locator('tr.section-row:has-text("Swimmers")');
		await expect(swimmersRow).toBeVisible();

		const initialEntryCount = await getDBEntryCount(page);

		// Click Swimmers
		const swimmersTodayCell = swimmersRow.locator("td.cell-today");
		await swimmersTodayCell.click();

		// Wait for entry
		await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

		// Verify tag shows ✓
		const tagTodayCell = tagRow.locator("td.cell-today");
		await expect(tagTodayCell).toHaveText("✓", { timeout: 5000 });
		console.log(
			"Tag completed via Swimmers - humane model works!"
		);
	});

	test("clicking directly on tag creates entry and shows completion", async ({
		page,
	}) => {
		// Expand all sections
		const expandButton = page.locator('button:has-text("Expand All")');
		await expandButton.click();

		// Wait for expansion to complete
		await expect(
			page.locator('button:has-text("Collapse All")'),
		).toBeVisible();

		// Find tag row
		const tagRow = page.locator(
			'tr.section-row:has-text("Shoulder Accessory")'
		);
		await expect(tagRow).toBeVisible();

		const initialEntryCount = await getDBEntryCount(page);

		// Click directly on the tag cell (not a child)
		const tagTodayCell = tagRow.locator("td.cell-today");
		const initialContent = await tagTodayCell.textContent();
		console.log("Initial tag cell:", initialContent);

		await tagTodayCell.click();
		console.log("Clicked directly on tag");

		// Wait for entry to be written
		await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

		// Tag should show as completed
		await expect(tagTodayCell).toHaveText(/[✓1]/, { timeout: 5000 });
		console.log("Tag shows completion after direct click - humane!");
	});

	test("tag weekly count reflects unique days completed", async ({ page }) => {
		// Expand all sections
		const expandButton = page.locator('button:has-text("Expand All")');
		await expandButton.click();

		// Wait for expansion to complete
		await expect(
			page.locator('button:has-text("Collapse All")'),
		).toBeVisible();

		// Find tag row and check initial count
		const tagRow = page.locator(
			'tr.section-row:has-text("Shoulder Accessory")',
		);
		const totalCell = tagRow.locator("td.total");
		const initialTotal = await totalCell.textContent();
		console.log("Initial tag total:", initialTotal);

		// Should show 0/3 initially
		expect(initialTotal).toContain("0/3");

		// Expand the tag to show children
		const tagArrow = tagRow.locator(".tag-arrow");
		await tagArrow.click();

		// Wait for children to be visible
		const shoulderYRow = page.locator('tr.section-row:has-text("Shoulder Y")');
		await expect(shoulderYRow).toBeVisible();

		// Get initial entry count for waiting
		const initialEntryCount = await getDBEntryCount(page);

		// Complete a child
		const shoulderYTodayCell = shoulderYRow.locator("td.cell-today");
		await shoulderYTodayCell.click();

		// Wait for entry to be written to DB
		await waitForEntryCount(page, initialEntryCount + 1, { timeout: 5000 });

		// Check tag count updated to 1/3
		await expect(totalCell).toHaveText(/1\/3/, { timeout: 5000 });
		console.log("Tag count updated to 1/3 after one child completed");
	});
});
