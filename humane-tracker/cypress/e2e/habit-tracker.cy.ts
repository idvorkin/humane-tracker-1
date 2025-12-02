describe("Habit Tracker App", () => {
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

		cy.get(".user-menu-trigger", { timeout: 15000 }).should("be.visible");
	});

	afterEach(() => {
		// Clean up IndexedDB after each test
		cy.clearIndexedDB();
	});

	it("should load the main page with all sections", () => {
		// Check header elements
		cy.get(".week-title").should("be.visible");
		// Week title shows the current day name and date
		cy.get(".week-title .current-day").should("be.visible");

		// Check summary bar
		cy.get(".summary-bar").should("be.visible");
		cy.get(".summary-label").first().should("contain", "Due Today");

		// Check view toggle button (toggles between Expand All/Collapse All)
		cy.get(".toggle-btn").should("be.visible");

		// Check table structure
		cy.get("table").should("be.visible");
		cy.get("th.col-habit").should("contain", "Habit");

		// Check legend
		cy.get(".legend-strip").should("be.visible");
		cy.get(".legend-item").first().should("contain", "done");
	});

	it("should expand and collapse sections", () => {
		// Wait for sections to load
		cy.get(".section-header", { timeout: 5000 }).should("exist");

		// First expand all to ensure we have expanded sections
		cy.contains("button", "Expand All").click();
		cy.wait(300);

		// Now collapse all
		cy.contains("button", "Collapse All").click();
		cy.wait(300);

		// Verify all arrows are collapsed
		cy.get(".section-arrow.collapsed")
			.its("length")
			.should("be.greaterThan", 0);

		// Expand all again
		cy.contains("button", "Expand All").click();
		cy.wait(300);

		// Verify no arrows are collapsed
		cy.get(".section-arrow.collapsed").should("have.length", 0);
	});

	it("should open and close add habit modal", () => {
		// First open the user menu dropdown by clicking the avatar
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Then click "Manage Habits" in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();

		// Check settings modal is visible
		cy.get(".habit-settings-modal").should("be.visible");

		// Click + Add New Habit button
		cy.contains("button", "+ Add New Habit").click();

		// Check add form is visible
		cy.get(".new-habit-input").should("be.visible");

		// Close modal using X button
		cy.get(".habit-settings-modal .close-btn").click();
		cy.get(".habit-settings-modal").should("not.be.visible");
	});

	it("should create a new habit", () => {
		// Open user menu dropdown first
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Manage Habits in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();
		cy.get(".habit-settings-modal").should("be.visible");

		// Click Add New Habit
		cy.contains("button", "+ Add New Habit").as("addNewButton");
		cy.get("@addNewButton").click();

		// Fill in the form (use the add-new-form specific inputs)
		cy.get(".add-new-form .new-habit-input").as("nameInput");
		cy.get("@nameInput").should("be.visible");
		cy.get("@nameInput").type("Morning Meditation");
		// Category is now a text input with datalist autocomplete
		cy.get(".add-new-form .category-input").type("Inner Balance");
		cy.get(".add-new-form .target-input").clear().type("5");

		// Submit form
		cy.get(".btn-add").click();

		// Wait for form to collapse (form submission successful)
		cy.get("@addNewButton").should("be.visible", { timeout: 5000 });
		cy.get("@nameInput").should("not.be.visible", { timeout: 3000 });

		// Close modal
		cy.get(".habit-settings-modal .close-btn").click();
		cy.get(".habit-settings-modal").should("not.be.visible");
	});

	it("should expand all sections", () => {
		// Click Expand All button
		cy.contains("button", "Expand All").click();
		cy.wait(500);

		// Check that no section arrows have collapsed class
		cy.get(".section-arrow.collapsed").should("have.length", 0);
	});

	it("should collapse all sections", () => {
		// First expand all
		cy.contains("button", "Expand All").click();
		cy.wait(500);

		// Then collapse all
		cy.contains("button", "Collapse All").click();
		cy.wait(500);

		// Check that all section arrows have collapsed class
		cy.get(".section-arrow").then(($arrows) => {
			const totalCount = $arrows.length;
			if (totalCount > 0) {
				cy.get(".section-arrow.collapsed").should("have.length", totalCount);
			}
		});
	});

	it("should display correct week dates", () => {
		// Check that day headers are visible
		cy.get("th.col-day").as("dayHeaders");

		// Should have 7 days
		cy.get("@dayHeaders").should("have.length", 7);

		// Check that headers contain day abbreviations
		cy.get("@dayHeaders")
			.first()
			.invoke("text")
			.should("match", /[SMTWF]/);
	});

	it("should allow selecting a past day and highlight the entire column", () => {
		// Expand a section to see habit rows (click on the section title area, not the zoom button)
		cy.get(".section-title").first().click();
		cy.wait(200);

		// Wait for habit rows to appear after expansion
		cy.get(".section-row").first().should("be.visible");

		// Get the second day column header (a past day, not today)
		cy.get("th.col-day").eq(1).as("secondDayHeader");

		// Click on the second day to select it
		cy.get("@secondDayHeader").click();
		cy.wait(300);

		// Verify the column header has the selected class
		cy.get("@secondDayHeader").should("have.class", "col-selected");

		// Verify cells in the column also have the selected class (entire column highlighted)
		cy.get(".section-row td.cell-selected").first().should("be.visible");

		// Verify the header title updates to show the selected date
		cy.get(".week-title .current-day, .week-title .selected-day").should(
			"be.visible",
		);

		// Click the header title to return to today
		cy.get(".week-title .current-day, .week-title .selected-day")
			.first()
			.click();
		cy.wait(300);

		// Verify the column is no longer selected
		cy.get("@secondDayHeader").should("not.have.class", "col-selected");

		// Verify cells no longer have the selected class
		cy.get(".section-row td.cell-selected").should("have.length", 0);
	});

	it("should display summary statistics", () => {
		// Check all summary items are present
		cy.get('.summary-item:has-text("Due Today")').should("be.visible");
		cy.get('.summary-item:has-text("Overdue")').should("be.visible");
		cy.get('.summary-item:has-text("Done Today")').should("be.visible");
		cy.get('.summary-item:has-text("On Track")').should("be.visible");

		// Check that values are numbers
		cy.get('.summary-item:has-text("Due Today") .summary-value')
			.invoke("text")
			.should("match", /\d+/);
	});

	it("should have proper dark theme styling", () => {
		// Check background colors
		cy.get("body")
			.should("have.css", "background-color")
			.and("match", /rgb\(\d+,\s*\d+,\s*\d+\)/);

		// Check table background
		cy.get("table")
			.should("have.css", "background-color")
			.and("match", /rgb\(\d+,\s*\d+,\s*\d+\)/);
	});

	it("should be responsive to mobile view", () => {
		// Set mobile viewport
		cy.viewport(375, 667);

		// Check that main container is still visible
		cy.get(".container").should("be.visible");

		// Check that table is scrollable or responsive
		cy.get("table").should("be.visible");
	});
});

describe("Habit Tracking Functions", () => {
	beforeEach(() => {
		cy.visitE2E();
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
		cy.clearIndexedDB();
	});

	it("should track habit completion by clicking cells", () => {
		cy.get("table", { timeout: 15000 }).should("be.visible");

		// Wait for table cells to be clickable
		cy.wait(500);

		// Find a habit row cell (if habits exist)
		cy.get('td[style*="cursor: pointer"]').then(($cells) => {
			const cellCount = $cells.length;

			if (cellCount > 0) {
				// Get initial content
				const initialContent = $cells.first().text();
				cy.log(`Initial content: ${initialContent}`);

				// Click to mark as complete
				cy.wrap($cells.first()).click();
				cy.wait(1000); // Wait for update

				// Check if content changed (should show ✓ or similar)
				cy.wrap($cells.first())
					.invoke("text")
					.then((newContent) => {
						cy.log(`New content: ${newContent}`);
						// Content should change after click
						if (initialContent === "") {
							expect(newContent).to.match(/[✓½1-9]/);
						}
					});
			}
		});
	});

	it("should validate habit form inputs", () => {
		cy.get("table", { timeout: 15000 }).should("be.visible");
		cy.get(".user-menu-trigger", { timeout: 15000 }).should("be.visible");

		// Open user menu dropdown first
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Manage Habits in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();
		cy.get(".habit-settings-modal").should("be.visible");

		// Click Add New Habit
		cy.contains("button", "+ Add New Habit").click();

		// Verify form elements are visible
		cy.get(".add-new-form .new-habit-input").should("be.visible");
		cy.get(".add-new-form .target-input").as("targetInput");
		cy.get("@targetInput").should("be.visible");

		// Check target field has constraints
		cy.get("@targetInput").should("have.attr", "min", "1");
		cy.get("@targetInput").should("have.attr", "max", "7");
	});

	it("should display status indicators correctly", () => {
		cy.get("table", { timeout: 15000 }).should("be.visible");

		// Check for status icons in the legend
		cy.get(".legend-item").contains("● = done").should("be.visible");
		cy.get(".legend-item").contains("✓ = met target").should("be.visible");
		cy.get(".legend-item").contains("⏰ = due today").should("be.visible");
		cy.get(".legend-item").contains("→ = tomorrow").should("be.visible");
		cy.get(".legend-item").contains("! = overdue").should("be.visible");
		cy.get(".legend-item").contains("½ = partial").should("be.visible");
	});
});
