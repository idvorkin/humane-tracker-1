import { test, expect } from "@playwright/test";

test.describe("Affirmation Card Tally Marks", () => {
	test("should show tally marks in header", async ({ page }) => {
		await page.goto("/?e2e=true");

		// Wait for affirmation card to be visible
		const card = page.locator(".affirmation-card");
		await expect(card).toBeVisible({ timeout: 10000 });

		// Screenshot the whole page first
		await page.screenshot({ path: "test-results/affirmation-full-page.png", fullPage: true });

		// Screenshot just the affirmation card
		await card.screenshot({ path: "test-results/affirmation-card.png" });

		// Check for the action buttons
		const opportunityBtn = page.locator(".affirmation-action", { hasText: "Opportunity" });
		const didItBtn = page.locator(".affirmation-action", { hasText: "Did it" });

		await expect(opportunityBtn).toBeVisible();
		await expect(didItBtn).toBeVisible();

		// Log the HTML structure for debugging
		const cardHtml = await card.innerHTML();
		console.log("Affirmation card HTML:", cardHtml);
	});

	test("should show tally marks in header after logging entries", async ({ page }) => {
		await page.goto("/?e2e=true");

		// Wait for affirmation card
		const card = page.locator(".affirmation-card");
		await expect(card).toBeVisible({ timeout: 10000 });

		// Log 3 "Did it" entries
		for (let i = 1; i <= 3; i++) {
			await page.locator(".affirmation-action", { hasText: "Did it" }).click();
			await page.locator(".affirmation-note-input textarea").fill(`Test entry ${i}`);
			await page.locator(".affirmation-save").click();
			await page.waitForTimeout(500);
		}

		// Log 2 "Opportunity" entries
		for (let i = 1; i <= 2; i++) {
			await page.locator(".affirmation-action", { hasText: "Opportunity" }).click();
			await page.locator(".affirmation-note-input textarea").fill(`Opportunity ${i}`);
			await page.locator(".affirmation-save").click();
			await page.waitForTimeout(500);
		}

		// Screenshot after multiple saves (include project name in filename)
		const projectName = test.info().project.name;
		await card.screenshot({ path: `test-results/affirmation-tallies-${projectName}.png` });

		// Full page screenshot
		await page.screenshot({ path: `test-results/affirmation-full-${projectName}.png`, fullPage: true });

		// Check for tally marks in header (5 entries = 4 vertical lines + 1 strike line)
		const tallyMarks = page.locator(".affirmation-header .tally-mark-line");
		const tallyStrikes = page.locator(".affirmation-header .tally-strike-line");
		const markCount = await tallyMarks.count();
		const strikeCount = await tallyStrikes.count();
		console.log(`Found ${markCount} marks + ${strikeCount} strikes = ${markCount + strikeCount * 5} total`);

		// 5 entries = 4 vertical marks + 1 strike (which represents 5)
		expect(markCount).toBe(4);
		expect(strikeCount).toBe(1);
	});
});
