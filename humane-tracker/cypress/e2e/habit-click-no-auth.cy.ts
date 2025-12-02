describe("Habit Tracker Click Functionality (No Auth)", () => {
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
			// Click 1: ✓ or 1
			cy.get("@todayCell").click();
			cy.waitForEntryCount(initialEntryCount + 1, { timeout: 5000 });
			cy.get("@todayCell")
				.should("match", /[✓1]/)
				.invoke("text")
				.then((content) => {
					cy.log(`After 1st click: ${content}`);
				});

			// Click 2: 2
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "2")
				.invoke("text")
				.then((content) => {
					cy.log(`After 2nd click: ${content}`);
				});

			// Click 3: 3
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "3")
				.invoke("text")
				.then((content) => {
					cy.log(`After 3rd click: ${content}`);
				});

			// Click 4: 4
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "4")
				.invoke("text")
				.then((content) => {
					cy.log(`After 4th click: ${content}`);
				});

			// Click 5: 5
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "5")
				.invoke("text")
				.then((content) => {
					cy.log(`After 5th click: ${content}`);
				});

			// Click 6: ½
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "½")
				.invoke("text")
				.then((content) => {
					cy.log(`After 6th click: ${content}`);
				});

			// Click 7: empty (cycles back)
			cy.get("@todayCell").click();
			cy.get("@todayCell")
				.should("have.text", "")
				.invoke("text")
				.then((content) => {
					cy.log(`After 7th click (should be empty): ${content || "(empty)"}`);
				});
		});
	});

	it("clicking on old dates shows confirmation dialog", () => {
		// Set up dialog handler
		let dialogShown = false;
		let dialogMessage = "";
		cy.on("window:confirm", (str) => {
			dialogMessage = str;
			dialogShown = true;
			cy.log(`Dialog shown: ${dialogMessage}`);
			return false; // Dismiss the dialog
		});

		// Expand all sections
		cy.expandAllSections();

		// Find a habit row
		cy.get("tr.section-row").first().should("be.visible");

		// Click on an old date cell (3 days ago - should trigger confirmation)
		cy.get("tr.section-row").first().find("td").eq(5).click();

		// Wait for dialog
		cy.wait(500);

		// Check that dialog was shown
		cy.wrap(null).should(() => {
			expect(dialogShown).to.be.true;
			expect(dialogMessage).to.contain("Are you sure");
		});
	});

	it.skip("check console for debugging when clicking", () => {
		// Skip: Debug console messages were removed from production code
		const consoleMessages: string[] = [];
		cy.on("window:console", (msg) => {
			const text = `${msg.type}: ${msg.text}`;
			consoleMessages.push(text);
			cy.log(text);
		});

		// Expand all sections
		cy.expandAllSections();

		// Find and click a habit cell
		cy.get("tr.section-row").first().as("firstRow");
		cy.get("@firstRow").should("be.visible");

		cy.get("@firstRow").find("td.cell-today").as("todayCell");

		cy.log("Clicking cell...");
		cy.getDBEntryCount().then((initialEntryCount) => {
			cy.get("@todayCell").click();
			cy.waitForEntryCount(initialEntryCount + 1, { timeout: 5000 });

			// Check for specific debug messages
			cy.wrap(null).should(() => {
				const clickHandlerMessages = consoleMessages.filter(
					(msg) =>
						msg.includes("Handling click") ||
						msg.includes("Creating new entry") ||
						msg.includes("Updating existing entry"),
				);

				cy.log(`\nClick handler messages found: ${clickHandlerMessages.length}`);

				// Check for errors
				const errors = consoleMessages.filter((msg) => msg.startsWith("error"));
				if (errors.length > 0) {
					cy.log(`Errors found: ${errors.join(", ")}`);
				}

				// We should have at least one click handler message
				expect(clickHandlerMessages.length).to.be.greaterThan(0);
			});
		});
	});
});
