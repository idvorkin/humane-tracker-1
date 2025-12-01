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

		// Screenshot: Initial state with data
		await page.screenshot({
			path: 'test-results/import-export-01-initial-state.png',
			fullPage: true
		});

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

		// Screenshot: After clearing database
		await page.screenshot({
			path: 'test-results/import-export-02-after-clear.png',
			fullPage: true
		});

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

		// Reload page to see imported data
		await page.reload();
		await page.waitForSelector("table", { timeout: 10000 });

		// Screenshot: After importing data back
		await page.screenshot({
			path: 'test-results/import-export-03-after-import.png',
			fullPage: true
		});

		// Verify counts match
		expect(afterImport.habitCount).toBe(exportedData.habits.length);
		expect(afterImport.entryCount).toBe(exportedData.entries.length);
	});

	test("should import habits from JSON file and display them", async ({ page }) => {
		await page.goto("/?test=true");
		await page.waitForSelector("table", { timeout: 10000 });

		// Create sample habits data to import
		const sampleData = {
			version: 1,
			exportedAt: new Date().toISOString(),
			habits: [
				{
					id: "test-habit-1",
					name: "Morning Meditation",
					userId: "test-user",
					category: "Wellness",
					type: "binary",
					order: 1,
					createdAt: new Date().toISOString(),
					owner: "test-user"
				},
				{
					id: "test-habit-2",
					name: "Daily Exercise",
					userId: "test-user",
					category: "Health",
					type: "binary",
					order: 2,
					createdAt: new Date().toISOString(),
					owner: "test-user"
				},
				{
					id: "test-habit-3",
					name: "Read 30 Minutes",
					userId: "test-user",
					category: "Learning",
					type: "binary",
					order: 3,
					createdAt: new Date().toISOString(),
					owner: "test-user"
				}
			],
			entries: []
		};

		// Clear existing data first
		await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			await db.habits.clear();
			await db.entries.clear();
		});

		// Screenshot: Empty state
		await page.reload();
		await page.waitForSelector("table", { timeout: 10000 });
		await page.screenshot({
			path: 'test-results/habit-import-01-empty-state.png',
			fullPage: true
		});

		// Import the sample habits
		const importResult = await page.evaluate(async (data) => {
			try {
				const { importAllData } = await import("/src/services/dataService.ts");
				return await importAllData(data, "replace");
			} catch (e: any) {
				return { error: e.message };
			}
		}, sampleData);

		console.log("Import result:", importResult);

		// Reload to show imported habits
		await page.reload();
		await page.waitForSelector("table", { timeout: 10000 });

		// Wait a bit for habits to render
		await page.waitForTimeout(1000);

		// Screenshot: After importing habits
		await page.screenshot({
			path: 'test-results/habit-import-02-imported-habits.png',
			fullPage: true
		});

		// Verify habits were imported
		const importedHabits = await page.evaluate(async () => {
			const { db } = await import("/src/config/db.ts");
			const habits = await db.habits.toArray();
			return habits.map(h => ({ id: h.id, name: h.name, category: h.category }));
		});

		console.log("Imported habits:", importedHabits);

		expect(importedHabits.length).toBe(3);
		expect(importedHabits[0].name).toBe("Morning Meditation");
		expect(importedHabits[1].name).toBe("Daily Exercise");
		expect(importedHabits[2].name).toBe("Read 30 Minutes");

		// Verify habits are visible in the UI
		await expect(page.locator('text=Morning Meditation')).toBeVisible();
		await expect(page.locator('text=Daily Exercise')).toBeVisible();
		await expect(page.locator('text=Read 30 Minutes')).toBeVisible();
	});
});
