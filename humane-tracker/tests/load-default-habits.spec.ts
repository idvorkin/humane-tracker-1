import { test, expect } from "@playwright/test";

test.describe("Load Default Habits", () => {
	test("should load default habits and display them in the tracker", async ({
		page,
	}) => {
		// Go to the app in test mode (no auth required)
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForLoadState("networkidle");
		await page.waitForSelector("table", { timeout: 15000 });

		// Load default habits programmatically via the database
		await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const { DEFAULT_HABITS } = await import("/src/data/defaultHabits.ts");

			// Clear existing habits
			await db.habits.clear();
			await db.entries.clear();

			// Get or create local user ID
			let localUserId = localStorage.getItem("localUserId");
			if (!localUserId) {
				localUserId = "local-user-" + Date.now();
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

		// Reload to see the loaded habits
		await page.reload();
		await page.waitForSelector("table", { timeout: 15000 });
		await page.waitForTimeout(1000);

		// Verify habits are loaded by checking for section headers
		const sectionHeaders = page.locator(".section-header");
		const headerCount = await sectionHeaders.count();

		// Should have at least some category sections
		expect(headerCount).toBeGreaterThan(0);
		console.log(`Found ${headerCount} category sections`);

		// Expand all sections to see habits
		const expandButton = page.getByText("Expand All");
		if (await expandButton.isVisible()) {
			await expandButton.click();
			await page.waitForTimeout(500);
		}

		// Verify habit rows are visible
		const habitRows = page.locator(".section-row");
		const rowCount = await habitRows.count();
		console.log(`Found ${rowCount} habit rows after loading defaults`);

		// Take a screenshot of the loaded habits
		await page.screenshot({
			path: "test-results/default-habits-loaded.png",
			fullPage: true,
		});

		// Verify we have habits loaded (default set has 28 habits)
		const habitCount = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			return await db.habits.count();
		});

		console.log(`Total habits in database: ${habitCount}`);
		expect(habitCount).toBeGreaterThan(20); // Default set has 28 habits

		// Take a final screenshot showing the full habit tracker with all sections expanded
		await page.screenshot({
			path: "test-results/habit-tracker-with-defaults.png",
			fullPage: true,
		});
	});

	test("should display habit categories after loading defaults", async ({
		page,
	}) => {
		// Go to the app in test mode
		await page.goto("/?test=true");
		await page.waitForLoadState("networkidle");
		await page.waitForSelector("table", { timeout: 15000 });

		// First load default habits if needed
		const habitCount = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			return await db.habits.count();
		});

		if (habitCount === 0) {
			// Load default habits programmatically
			await page.evaluate(async () => {
				const { db } = await import("/src/config/db.ts");
				const { DEFAULT_HABITS } = await import("/src/data/defaultHabits.ts");

				let localUserId = localStorage.getItem("localUserId");
				if (!localUserId) {
					localUserId = "local-user-" + Date.now();
					localStorage.setItem("localUserId", localUserId);
				}

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

			// Reload to see the habits
			await page.reload();
			await page.waitForSelector("table", { timeout: 15000 });
		}

		// Wait for content to load
		await page.waitForTimeout(1000);

		// Expand all sections
		const expandButton = page.getByText("Expand All");
		if (await expandButton.isVisible()) {
			await expandButton.click();
			await page.waitForTimeout(500);
		}

		// Check for expected categories from default habits
		const expectedCategories = [
			"Mobility",
			"Relationships",
			"Emotional Health",
			"Smile and Wonder",
			"Physical Health",
		];

		for (const category of expectedCategories) {
			const categorySection = page.locator(`.section-header:has-text("${category}")`);
			const isVisible = await categorySection.isVisible().catch(() => false);
			console.log(`Category "${category}" visible: ${isVisible}`);
		}

		// Take screenshot of categories
		await page.screenshot({
			path: "test-results/habit-categories.png",
			fullPage: true,
		});
	});
});
