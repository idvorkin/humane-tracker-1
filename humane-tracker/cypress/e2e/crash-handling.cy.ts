describe("Crash Handling", () => {
	it("should show crash fallback screen when error occurs", () => {
		// Navigate to the app in test mode (no auth required)
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open user menu
		cy.get(".user-menu-trigger").click();

		// Wait for menu to be visible
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click the "Trigger Crash (Dev)" button
		cy.contains("button", "Trigger Crash (Dev)").click();

		// Wait for crash fallback to appear
		cy.get(".crash-fallback", { timeout: 5000 }).should("be.visible");

		// Verify crash fallback elements
		cy.get(".crash-fallback-title").should(
			"have.text",
			"Something went wrong",
		);

		cy.get(".crash-fallback-message").should(
			"contain",
			"Test crash - triggered manually from dev menu",
		);

		// Verify action buttons exist
		cy.contains("button", "Reload App").should("be.visible");
		cy.contains("a", "Report on GitHub").should("be.visible");

		// Verify build info is displayed
		cy.get(".crash-fallback-build").should("be.visible");

		// Verify technical details are expandable
		cy.get(".crash-fallback-details").should("be.visible");

		// Expand technical details
		cy.get(".crash-fallback-details summary").click();

		// Verify stack trace is visible
		cy.get(".crash-fallback-stack").should("be.visible");

		// Verify stack trace contains error message
		cy.get(".crash-fallback-stack")
			.invoke("text")
			.should("contain", "Test crash - triggered manually");
	});

	it("should have working Report on GitHub button", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open user menu and trigger crash
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Trigger Crash (Dev)").click();

		// Wait for crash fallback
		cy.get(".crash-fallback").should("be.visible");

		// Get the GitHub report link
		cy.contains("a", "Report on GitHub")
			.should("have.attr", "href")
			.and("contain", "github.com")
			.and("contain", "/issues/new")
			.and("contain", "title=Crash")
			.and("contain", "Test+crash")
			.and("contain", "labels=bug%2Ccrash%2Cfrom-app");
	});

	it("should reload app when Reload button is clicked", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open user menu and trigger crash
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Trigger Crash (Dev)").click();

		// Wait for crash fallback
		cy.get(".crash-fallback").should("be.visible");

		// Click Reload button
		cy.contains("button", "Reload App").click();

		// Verify we're back to the normal app (crash screen is gone)
		cy.get(".crash-fallback").should("not.be.visible");

		// Verify normal app UI is back
		cy.get(".user-menu-trigger").should("be.visible");
	});
});
