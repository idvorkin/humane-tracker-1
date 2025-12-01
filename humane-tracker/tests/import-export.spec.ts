import { test, expect } from "@playwright/test";

test.describe("Import/Export Functionality", () => {
	test("should export and re-import real data correctly", async ({ page }) => {
		await page.goto("/?test=true");
		await page.waitForSelector("table", { timeout: 10000 });

		// Clear database and create test data
		await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			await db.habits.clear();
			await db.entries.clear();

			// Create 3 test habits
			const habitIds = await Promise.all([
				db.habits.add({
					name: "Morning Meditation",
					category: "Wellness",
					userId: "test-user",
					order: 0,
					createdAt: new Date(),
					archived: false,
				}),
				db.habits.add({
					name: "Daily Exercise",
					category: "Health",
					userId: "test-user",
					order: 1,
					createdAt: new Date(),
					archived: false,
				}),
				db.habits.add({
					name: "Read 30 Minutes",
					category: "Learning",
					userId: "test-user",
					order: 2,
					createdAt: new Date(),
					archived: false,
				}),
			]);

			// Create entries for each habit (today, yesterday, 2 days ago)
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			const twoDaysAgo = new Date(now);
			twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

			for (const habitId of habitIds) {
				await db.entries.add({
					habitId,
					userId: "test-user",
					date: now,
					value: 1,
					createdAt: now,
				});
				await db.entries.add({
					habitId,
					userId: "test-user",
					date: yesterday,
					value: 1,
					createdAt: yesterday,
				});
				await db.entries.add({
					habitId,
					userId: "test-user",
					date: twoDaysAgo,
					value: 1,
					createdAt: twoDaysAgo,
				});
			}
		});

		// Reload page to show the new data
		await page.reload();
		await page.waitForSelector("table", { timeout: 10000 });

		// Take screenshot of initial state with data
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
		console.log(`  - Total entries: ${initialData.totalEntries}`)

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

		// Reload to show empty state
		await page.reload();
		await page.waitForSelector("body", { timeout: 10000 });

		// Take screenshot of empty state
		await page.screenshot({ path: "test-results/import-export-02-after-clear.png", fullPage: true });

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

		// Reload to show imported data
		await page.reload();
		await page.waitForSelector("table", { timeout: 10000 });

		// Take screenshot of imported data
		await page.screenshot({ path: "test-results/import-export-03-after-import.png", fullPage: true });

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

		// Verify counts match
		expect(afterImport.habitCount).toBe(exportedData.habits.length);
		expect(afterImport.entryCount).toBe(exportedData.entries.length);
	});
});
