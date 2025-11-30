import { test, expect } from "@playwright/test";

test.describe("Import/Export Functionality", () => {
	test("should export and re-import real data correctly", async ({ page }) => {
		await page.goto("/?test=true");
		await page.waitForSelector("table", { timeout: 10000 });

		// Get initial state - these have valid Dexie Cloud IDs
		const initialData = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const habits = await db.habits.toArray();
			const entries = await db.entries.toArray();
			return {
				habits: habits.slice(0, 5), // Just take first 5 for testing
				entries: entries.slice(0, 5),
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

		// Skip if no entries to test with
		if (initialData.totalEntries === 0) {
			console.log("No entries in database - creating some test data first");

			// First, let's add an entry to an existing habit
			await page.evaluate(async () => {
				const { db } = await import("/src/config/db.ts");
				const habits = await db.habits.toArray();
				if (habits.length > 0) {
					// Use db.entries.add which will auto-generate a valid ID
					await db.entries.add({
						habitId: habits[0].id,
						userId: habits[0].userId,
						date: new Date(),
						value: 1,
						createdAt: new Date(),
					});
				}
			});
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

		// Verify counts match
		expect(afterImport.habitCount).toBe(exportedData.habits.length);
		expect(afterImport.entryCount).toBe(exportedData.entries.length);
	});
});
