import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb-helpers";

test.describe("Tag Children Display", () => {
	const TEST_USER_ID = "anonymous";

	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");
	});

	test.afterEach(async ({ page }) => {
		await clearIndexedDB(page);
	});

	test("children with empty parentIds should only appear under tag, not at top level", async ({
		page,
	}) => {
		// Create habits directly in IndexedDB with INCONSISTENT data:
		// - Tag has childIds pointing to children
		// - But children have EMPTY parentIds (the bug scenario)
		await page.evaluate(async (userId) => {
			const { habitRepository } = await import("/src/repositories/index.ts");

			// Create child habits first (with empty parentIds - the bug!)
			await habitRepository.bulkCreate([
				{
					userId,
					name: "Loving-kindness",
					category: "Emotional Health",
					targetPerWeek: 3,
					habitType: "raw",
					parentIds: [], // Empty! This is the bug scenario
				},
				{
					userId,
					name: "Focus meditation",
					category: "Emotional Health",
					targetPerWeek: 3,
					habitType: "raw",
					parentIds: [], // Empty! This is the bug scenario
				},
			]);

			// Get the IDs of the created habits
			const allHabits = await habitRepository.getByUserId(userId);
			const lovingKindness = allHabits.find((h) => h.name === "Loving-kindness");
			const focus = allHabits.find((h) => h.name === "Focus meditation");

			// Create the tag with childIds pointing to children
			await habitRepository.create({
				userId,
				name: "Meditate",
				category: "Emotional Health",
				targetPerWeek: 5,
				habitType: "tag",
				childIds: [lovingKindness!.id, focus!.id], // Has children, but children have no parentIds
			});
		}, TEST_USER_ID);

		// Reload to pick up the new habits
		await page.reload();
		await page.waitForLoadState("networkidle");
		await page.waitForSelector("table", { timeout: 15000 });

		// Expand the Emotional Health category (click on its header)
		await page.click('.section-title:has-text("Emotional Health")');
		await page.waitForTimeout(300);

		// The Meditate tag should be visible
		const meditateRow = page.locator('tr.section-row:has-text("Meditate")');
		await expect(meditateRow).toBeVisible({ timeout: 5000 });

		// The tag should have the tag indicator emoji
		await expect(meditateRow.locator("text=🏷️")).toBeVisible();

		// BUG CHECK: Children should NOT appear at top level
		// Before fix: children appeared TWICE (at top level AND under tag)
		// After fix: children only appear under tag when expanded

		// Count ALL rows (to see if children appear at top level as duplicates)
		const allRows = await page.locator("tr.section-row").all();
		const rowTexts = await Promise.all(allRows.map((r) => r.textContent()));

		// Count occurrences of each habit name
		const lovingKindnessCount = rowTexts.filter((t) =>
			t?.includes("Loving-kindness")
		).length;
		const focusCount = rowTexts.filter((t) =>
			t?.includes("Focus meditation")
		).length;

		// The key assertion: children should appear AT MOST once (under the tag)
		// NOT twice (which would indicate the bug: top-level + under tag)
		expect(lovingKindnessCount).toBeLessThanOrEqual(1);
		expect(focusCount).toBeLessThanOrEqual(1);

		// Now expand the tag to verify children appear there
		const tagArrow = meditateRow.locator(".tag-arrow");
		await expect(tagArrow).toBeVisible();
		await tagArrow.click();
		await page.waitForTimeout(300);

		// After expanding, children should be visible (exactly 1 each)
		const lovingKindnessRow = page.locator(
			'tr.section-row:has-text("Loving-kindness")'
		);
		const focusRow = page.locator('tr.section-row:has-text("Focus meditation")');

		await expect(lovingKindnessRow).toBeVisible();
		await expect(focusRow).toBeVisible();

		// Still only 1 of each (not duplicated)
		expect(await lovingKindnessRow.count()).toBe(1);
		expect(await focusRow.count()).toBe(1);
	});
});
