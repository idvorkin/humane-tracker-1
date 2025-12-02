describe("Import/Export Functionality", () => {
	it("should export and re-import real data correctly", () => {
		cy.visitTest();
		cy.get("table", { timeout: 10000 }).should("be.visible");

		// Get initial state - these have valid Dexie Cloud IDs
		cy.window().then(async (win) => {
			const initialData = await (win as any).eval(`
				(async () => {
					const { db } = await import('/src/config/db.ts');
					const habits = await db.habits.toArray();
					const entries = await db.entries.toArray();
					return {
						habits: habits.slice(0, 5),
						entries: entries.slice(0, 5),
						totalHabits: habits.length,
						totalEntries: entries.length
					};
				})()
			`);

			cy.log(`Initial database state:`);
			cy.log(`  - Total habits: ${initialData.totalHabits}`);
			cy.log(`  - Total entries: ${initialData.totalEntries}`);

			if (initialData.habits.length > 0) {
				cy.log(`  - Sample habit ID: ${initialData.habits[0].id}`);
				cy.log(`  - Sample habit name: ${initialData.habits[0].name}`);
			}

			// Skip if no entries to test with
			if (initialData.totalEntries === 0) {
				cy.log("No entries in database - creating some test data first");

				// First, let's add an entry to an existing habit
				cy.window().then(async (w) => {
					await (w as any).eval(`
						(async () => {
							const { db } = await import('/src/config/db.ts');
							const habits = await db.habits.toArray();
							if (habits.length > 0) {
								await db.entries.add({
									habitId: habits[0].id,
									userId: habits[0].userId,
									date: new Date(),
									value: 1,
									createdAt: new Date(),
								});
							}
						})()
					`);
				});
			}

			// Now test export/import cycle
			cy.window().then(async (w) => {
				const exportedData = await (w as any).eval(`
					(async () => {
						const { exportAllData } = await import('/src/services/dataService.ts');
						return await exportAllData();
					})()
				`);

				cy.log("\nExported data:");
				cy.log(`  - Version: ${exportedData.version}`);
				cy.log(`  - Habits: ${exportedData.habits.length}`);
				cy.log(`  - Entries: ${exportedData.entries.length}`);

				if (exportedData.entries.length > 0) {
					cy.log(`  - First entry ID: ${exportedData.entries[0].id}`);
					cy.log(`  - First entry habitId: ${exportedData.entries[0].habitId}`);
				}

				// Clear database
				cy.window().then(async (ww) => {
					await (ww as any).eval(`
						(async () => {
							const { db } = await import('/src/config/db.ts');
							await db.habits.clear();
							await db.entries.clear();
						})()
					`);
				});

				// Verify cleared
				cy.window().then(async (ww) => {
					const afterClear = await (ww as any).eval(`
						(async () => {
							const { db } = await import('/src/config/db.ts');
							return {
								habits: await db.habits.count(),
								entries: await db.entries.count()
							};
						})()
					`);

					cy.log("\nAfter clear:");
					cy.log(`  - Habits: ${afterClear.habits}`);
					cy.log(`  - Entries: ${afterClear.entries}`);

					expect(afterClear.habits).to.equal(0);
					expect(afterClear.entries).to.equal(0);
				});

				// Re-import the exported data
				cy.window().then(async (ww) => {
					const importResult = await (ww as any).eval(`
						(async () => {
							try {
								const { importAllData } = await import('/src/services/dataService.ts');
								return await importAllData(${JSON.stringify(exportedData)}, 'replace');
							} catch (e) {
								return { error: e.message };
							}
						})()
					`);

					cy.log("\nImport result:", importResult);
				});

				// Verify import worked
				cy.window().then(async (ww) => {
					const afterImport = await (ww as any).eval(`
						(async () => {
							const { db } = await import('/src/config/db.ts');
							const habits = await db.habits.toArray();
							const entries = await db.entries.toArray();
							return {
								habitCount: habits.length,
								entryCount: entries.length,
								sampleHabit: habits[0]?.name,
								sampleEntryId: entries[0]?.id
							};
						})()
					`);

					cy.log("\nAfter import:");
					cy.log(`  - Habits: ${afterImport.habitCount}`);
					cy.log(`  - Entries: ${afterImport.entryCount}`);
					cy.log(`  - Sample habit: ${afterImport.sampleHabit}`);
					cy.log(`  - Sample entry ID: ${afterImport.sampleEntryId}`);

					// Verify counts match
					expect(afterImport.habitCount).to.equal(exportedData.habits.length);
					expect(afterImport.entryCount).to.equal(exportedData.entries.length);
				});
			});
		});
	});
});
