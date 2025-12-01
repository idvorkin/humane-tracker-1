import { test, expect } from "@playwright/test";

test.describe("Import/Export Functionality", () => {
	test("should export and re-import real data correctly", async ({ page }) => {
		await page.goto("/?test=true");
		await page.waitForSelector("table", { timeout: 10000 });

		// Clear any existing data first
		await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			await db.habits.clear();
			await db.entries.clear();
		});

		// Create test data - 3 habits with entries
		const testData = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const userId = "test-user-123";

			// Create 3 sample habits
			const habitIds = await Promise.all([
				db.habits.add({
					name: "Morning Meditation",
					category: "Wellness",
					userId: userId,
					createdAt: new Date(),
				}),
				db.habits.add({
					name: "Daily Exercise",
					category: "Health",
					userId: userId,
					createdAt: new Date(),
				}),
				db.habits.add({
					name: "Read 30 Minutes",
					category: "Learning",
					userId: userId,
					createdAt: new Date(),
				}),
			]);

			// Create entries for each habit (3 entries per habit)
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const twoDaysAgo = new Date(today);
			twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

			await Promise.all(
				habitIds.flatMap((habitId) => [
					db.entries.add({
						habitId: habitId,
						userId: userId,
						date: today,
						value: 1,
						createdAt: new Date(),
					}),
					db.entries.add({
						habitId: habitId,
						userId: userId,
						date: yesterday,
						value: 1,
						createdAt: new Date(),
					}),
					db.entries.add({
						habitId: habitId,
						userId: userId,
						date: twoDaysAgo,
						value: 1,
						createdAt: new Date(),
					}),
				])
			);

			const habits = await db.habits.toArray();
			const entries = await db.entries.toArray();
			return {
				habitCount: habits.length,
				entryCount: entries.length,
			};
		});

		console.log("Created test data:");
		console.log(`  - Habits: ${testData.habitCount}`);
		console.log(`  - Entries: ${testData.entryCount}`);

		// Wait for UI to update and take initial screenshot
		await page.waitForTimeout(500);
		await page.screenshot({ path: "test-results/import-export-01-initial-with-data.png", fullPage: true });

		// Get initial state
		const initialData = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const habits = await db.habits.toArray();
			const entries = await db.entries.toArray();
			return {
				habits,
				entries,
				totalHabits: habits.length,
				totalEntries: entries.length
			};
		});

		console.log("Initial database state:");
		console.log(`  - Total habits: ${initialData.totalHabits}`);
		console.log(`  - Total entries: ${initialData.totalEntries}`);

		if (initialData.habits.length > 0) {
			console.log(`  - Sample habit ID: ${initialData.habits[0].id}`);
			console.log(`  - Sample habit name: ${initialData.habits[0].name}`);
		}

		// Now test export/import cycle
		const exportedData = await page.evaluate(async () => {
			const { exportAllData } = await import("/src/services/dataService.ts");
			return await exportAllData();
		});

		console.log("\nExported data:");
		console.log(`  - Version: ${exportedData.version}`);
		console.log(`  - Habits: ${exportedData.habits.length}`);
		console.log(`  - Entries: ${exportedData.entries.length}`);

		if (exportedData.entries.length > 0) {
			console.log(`  - First entry ID: ${exportedData.entries[0].id}`);
			console.log(`  - First entry habitId: ${exportedData.entries[0].habitId}`);
		}

		// Clear database
		await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			await db.habits.clear();
			await db.entries.clear();
		});

		// Verify cleared
		const afterClear = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			return {
				habits: await db.habits.count(),
				entries: await db.entries.count()
			};
		});

		console.log("\nAfter clear:");
		console.log(`  - Habits: ${afterClear.habits}`);
		console.log(`  - Entries: ${afterClear.entries}`);

		// Wait for UI to update and take screenshot of empty state
		await page.waitForTimeout(500);
		await page.screenshot({ path: "test-results/import-export-02-after-clear.png", fullPage: true });

		expect(afterClear.habits).toBe(0);
		expect(afterClear.entries).toBe(0);

		// Re-import the exported data
		const importResult = await page.evaluate(async (data) => {
			try {
				const { importAllData } = await import("/src/services/dataService.ts");
				return await importAllData(data, "replace");
			} catch (e: any) {
				return { error: e.message };
			}
		}, exportedData);

		console.log("\nImport result:", importResult);

		// Verify import worked
		const afterImport = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const habits = await db.habits.toArray();
			const entries = await db.entries.toArray();
			return {
				habitCount: habits.length,
				entryCount: entries.length,
				sampleHabit: habits[0]?.name,
				sampleEntryId: entries[0]?.id
			};
		});

		console.log("\nAfter import:");
		console.log(`  - Habits: ${afterImport.habitCount}`);
		console.log(`  - Entries: ${afterImport.entryCount}`);
		console.log(`  - Sample habit: ${afterImport.sampleHabit}`);
		console.log(`  - Sample entry ID: ${afterImport.sampleEntryId}`);

		// Wait for UI to update and take screenshot of re-imported data
		await page.waitForTimeout(500);
		await page.screenshot({ path: "test-results/import-export-03-after-import.png", fullPage: true });

		// Verify counts match
		expect(afterImport.habitCount).toBe(exportedData.habits.length);
		expect(afterImport.entryCount).toBe(exportedData.entries.length);
	});
});
