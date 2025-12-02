describe("Habit Tracker Click Functionality", () => {
	beforeEach(() => {
		// Use E2E mode - bypasses auth but uses REAL IndexedDB
		cy.visitE2E();

		// Load default habits programmatically using real IndexedDB
		cy.loadDefaultHabits([
			{
				name: "Physical Mobility",
				category: "Mobility",
				targetPerWeek: 5,
				order: 0,
			},
			{
				name: "Box Breathing",
				category: "Emotional Health",
				targetPerWeek: 3,
				order: 1,
			},
		]);
	});

	afterEach(() => {
		// Clean up IndexedDB after each test
		cy.clearIndexedDB();
	});

	it("clicking on habit cells cycles through values", () => {
		// Expand all sections first
		cy.expandAllSections();

		cy.get("tr.section-row").first().as("firstRow");
		cy.get("@firstRow").should("be.visible");

		cy.get("@firstRow")
			.find(".habit-name")
			.invoke("text")
			.then((habitName) => {
				cy.log(`Testing with habit: ${habitName}`);
			});

		cy.get("@firstRow").find("td.cell-today").as("todayCell");
		cy.get("@todayCell")
			.invoke("text")
			.then((initialContent) => {
				cy.log(`Initial cell content: ${initialContent}`);
			});

		// Get initial DB state
		cy.getDBEntryCount().then((initialEntryCount) => {
			// Click 1: Should show ✓ or 1
			cy.get("@todayCell").click();
			cy.waitForEntryCount(initialEntryCount + 1, { timeout: 5000 });
			cy.get("@todayCell")
				.should("match", /[✓1]/)
				.invoke("text")
				.then((content1) => {
					cy.log(`After 1st click: ${content1}`);
				});

			// Click 2: Should show 2
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "2")
				.invoke("text")
				.then((content2) => {
					cy.log(`After 2nd click: ${content2}`);
				});

			// Click 3: Should show 3
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "3")
				.invoke("text")
				.then((content3) => {
					cy.log(`After 3rd click: ${content3}`);
				});
		});
	});

	it("clicking on old dates shows confirmation", () => {
		// Set up dialog handler BEFORE clicking
		let dialogShown = false;
		cy.on("window:confirm", (str) => {
			cy.log(`Dialog shown: ${str}`);
			dialogShown = true;
			return true; // Accept the dialog
		});

		// Expand all sections first
		cy.expandAllSections();

		cy.get("tr.section-row").first().should("be.visible");

		// Click on a cell that's several days old (5th cell = 3 days ago)
		cy.get("tr.section-row").first().find("td.cell").eq(5).click();
		cy.wait(1000);

		cy.wrap(null).should(() => {
			expect(dialogShown).to.be.true;
		});
	});

	it("check console for errors when clicking", () => {
		const errors: string[] = [];

		// Listen for console errors
		cy.on("window:error", (error) => {
			errors.push(error.message);
		});

		// Expand all sections
		cy.expandAllSections();

		cy.get("tr.section-row").first().as("firstRow");
		cy.get("@firstRow").should("be.visible");

		cy.get("@firstRow").find("td.cell-today").as("todayCell");

		// Get initial DB state
		cy.getDBEntryCount().then((initialEntryCount) => {
			// Click and wait for update
			cy.get("@todayCell").click();
			cy.waitForEntryCount(initialEntryCount + 1, { timeout: 5000 });

			// Check for errors
			cy.wrap(errors).should("have.length", 0);
			cy.wrap(null).then(() => {
				if (errors.length > 0) {
					cy.log(`Errors found: ${errors.join(", ")}`);
				}
			});
		});
	});

	it("clicking habit updates day view and week summary statistics", () => {
		// Expand all sections first
		cy.expandAllSections();

		// Get initial state
		cy.get('.summary-item:has-text("Done Today") .summary-value')
			.invoke("text")
			.then((initialDoneText) => {
				const initialDoneCount = parseInt(initialDoneText || "0", 10);
				cy.log(`Initial Done Today count: ${initialDoneCount}`);

				// Get initial entry count from IndexedDB
				cy.getDBEntryCount().then((initialEntryCount) => {
					cy.log(`Initial entry count in DB: ${initialEntryCount}`);

					// Find first habit and today's cell
					cy.get("tr.section-row").first().as("firstRow");
					cy.get("@firstRow").should("be.visible");

					cy.get("@firstRow")
						.find(".habit-name")
						.invoke("text")
						.then((habitName) => {
							cy.log(`Testing with habit: ${habitName}`);
						});

					cy.get("@firstRow").find("td.cell-today").as("todayCell");
					cy.get("@todayCell")
						.invoke("text")
						.then((initialCellContent) => {
							cy.log(`Initial cell content: ${initialCellContent}`);

							// Click to mark as complete
							cy.get("@todayCell").click();
							cy.log("Clicked on today cell");

							// Wait for IndexedDB to actually have the entry
							cy.waitForEntryCount(initialEntryCount + 1, {
								timeout: 5000,
								interval: 100,
							});
							cy.log("IndexedDB confirmed entry was written");

							// Wait for DOM to reflect the change
							cy.get("@todayCell").should("match", /[✓1]/);
							cy.get("@todayCell")
								.invoke("text")
								.then((updatedCellContent) => {
									cy.log(`Cell content after click: ${updatedCellContent}`);
								});

							// Verify week summary updated
							if (initialCellContent === "" || initialCellContent === "0") {
								const expectedCount = initialDoneCount + 1;
								cy.get('.summary-item:has-text("Done Today") .summary-value')
									.should("have.text", expectedCount.toString())
									.then(() => {
										cy.log(
											`Week summary updated. New Done Today count: ${expectedCount}`,
										);
									});
							} else {
								cy.log("Cell already had content");
							}

							// Verify final state in IndexedDB
							cy.getDBEntryCount().should("equal", initialEntryCount + 1);
							cy.getDBEntryCount().then((finalCount) => {
								cy.log(`Final entry count in DB: ${finalCount}`);
							});
						});
				});
			});
	});
});
