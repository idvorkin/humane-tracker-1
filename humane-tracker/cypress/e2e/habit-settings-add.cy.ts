describe("Habit Settings - Add New Habit", () => {
	beforeEach(() => {
		// Go to the app in test mode (no auth required)
		cy.visitTest();

		// Wait for habit tracker content to be visible (not just loading screen)
		cy.get("table", { timeout: 15000 }).should("be.visible");

		// Wait for user menu to be available
		cy.get(".user-menu-trigger", { timeout: 15000 }).should("be.visible");
	});

	it("should open habit settings and add a new habit", () => {
		// Open user menu dropdown first
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Manage Habits in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();

		// Wait for the settings modal to open
		cy.get(".habit-settings-modal").should("be.visible");

		// Click Add New Habit button
		cy.contains("button", "+ Add New Habit").as("addNewButton");
		cy.get("@addNewButton").should("be.visible");
		cy.get("@addNewButton").click();

		// Fill in the new habit form (use specific .add-new-form selectors)
		cy.get(".add-new-form .new-habit-input").as("nameInput");
		cy.get("@nameInput").should("be.visible");
		cy.get("@nameInput").type("Test Habit");

		// Category is now a text input with datalist
		cy.get(".add-new-form .category-input").type("Strength Building");

		// Select tracking type
		cy.get(".add-new-form .type-select").select("binary");

		// Set target days per week
		cy.get(".add-new-form .target-input").clear().type("4");

		// Click Add button
		cy.get(".btn-add").click();

		// Wait for the form to process - the Add New Habit button should reappear
		cy.get("@addNewButton").should("be.visible", { timeout: 5000 });

		// Verify the form was submitted by checking name input is cleared or hidden
		// The form collapses after successful submission
		cy.get("@nameInput").should("not.be.visible", { timeout: 3000 });
	});

	it("should show all tracking type options", () => {
		// Open user menu dropdown first
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Manage Habits in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();

		// Wait for the settings modal
		cy.get(".habit-settings-modal").should("be.visible");

		// Click Add New Habit button
		cy.contains("button", "+ Add New Habit").click();

		// Check tracking type options
		cy.get(".add-new-form .type-select").as("trackingTypeSelect");
		cy.get("@trackingTypeSelect").should("be.visible");

		// Get all options
		cy.get("@trackingTypeSelect")
			.find("option")
			.then(($options) => {
				const optionsText = [...$options].map((o) => o.textContent);

				// Should have Binary, Sets, and Hybrid options
				expect(optionsText).to.include("✓ Binary");
				expect(optionsText).to.include("123 Sets");
				expect(optionsText).to.include("✓/123 Hybrid");
			});
	});

	it("should cancel adding a new habit", () => {
		// Open user menu dropdown first
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Manage Habits in the dropdown
		cy.contains("button.user-menu-item", "Manage Habits").click();

		// Wait for the settings modal
		cy.get(".habit-settings-modal").should("be.visible");

		// Click Add New Habit button
		cy.contains("button", "+ Add New Habit").as("addNewButton");
		cy.get("@addNewButton").click();

		// Fill in the name
		cy.get(".new-habit-input").type("Test Habit");

		// Click Cancel button
		cy.get(".btn-cancel-add").click();

		// Form should disappear and Add New Habit button should reappear
		cy.get(".new-habit-input").should("not.be.visible");
		cy.get("@addNewButton").should("be.visible");
	});
});
