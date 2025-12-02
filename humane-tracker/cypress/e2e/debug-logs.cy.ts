describe("Debug Logs", () => {
	it("should display debug logs dialog with sync events", () => {
		// Navigate to the app in test mode (no auth required)
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open user menu
		cy.get(".user-menu-trigger").click();

		// Wait for menu to be visible
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Settings
		cy.contains("button", "Settings").click();

		// Wait for settings dialog to appear
		cy.get(".settings-dialog", { timeout: 5000 }).should("be.visible");

		// Find and click "View Debug Logs" button
		cy.contains("button", "View Debug Logs").click();

		// Wait for debug logs dialog to appear
		cy.get(".debug-logs-dialog", { timeout: 5000 }).should("be.visible");

		// Verify dialog title
		cy.get(".debug-logs-dialog h2").should("have.text", "Debug Logs");

		// Verify info text is present
		cy.get(".debug-logs-info").should("contain", "Showing last");
		cy.get(".debug-logs-info").should("contain", "max 2000");

		// Verify action buttons exist
		cy.contains("button", "Copy All Logs").should("be.visible");
		cy.contains("button", "Clear All Logs").should("be.visible");
		cy.contains("button", "Close").should("be.visible");
	});

	it("should show sync log entries when present", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Give sync events time to occur (initial sync state events)
		cy.wait(1000);

		// Open debug logs dialog
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Check if we have logs or empty state
		cy.get("body").then(($body) => {
			const hasLogsList = $body.find(".debug-logs-list").length > 0;
			const hasEmptyState = $body.find(".debug-logs-empty").length > 0;

			// Either we have logs or we see the empty state
			expect(hasLogsList || hasEmptyState).to.be.true;

			// If we have logs, verify their structure
			if (hasLogsList) {
				cy.get(".debug-log-entry").first().then(($entry) => {
					if ($entry.length > 0) {
						// Verify log has the expected parts
						cy.wrap($entry).find(".debug-log-badge").should("be.visible");
						cy.wrap($entry).find(".debug-log-type").should("be.visible");
						cy.wrap($entry).find(".debug-log-time").should("be.visible");
						cy.wrap($entry)
							.find(".debug-log-entry-message")
							.should("be.visible");
					}
				});
			}
		});
	});

	it("should allow closing the debug logs dialog", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open debug logs dialog
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Close using the Close button
		cy.get("button.debug-logs-btn-primary")
			.contains("Close")
			.click();

		// Verify dialog is closed
		cy.get(".debug-logs-dialog").should("not.be.visible");

		// Verify we're back to the normal app (both dialogs are closed)
		cy.get(".user-menu-trigger").should("be.visible");
	});

	it("should allow closing dialog by clicking overlay", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open debug logs dialog
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Click overlay to close (click on the overlay itself, not the dialog)
		cy.get(".debug-logs-overlay").click(10, 10);

		// Verify dialog is closed
		cy.get(".debug-logs-dialog").should("not.be.visible");
	});

	it("should expand/collapse log details", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Give sync events time to occur
		cy.wait(1000);

		// Open debug logs dialog
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Check if we have any logs
		cy.get(".debug-log-entry").then(($entries) => {
			if ($entries.length > 0) {
				// Click to expand
				cy.get(".debug-log-entry")
					.first()
					.find(".debug-log-entry-header")
					.click();

				// Verify expand icon changed
				cy.get(".debug-log-entry")
					.first()
					.find(".debug-log-expand-icon")
					.should("contain", "▼");

				// Click again to collapse
				cy.get(".debug-log-entry")
					.first()
					.find(".debug-log-entry-header")
					.click();

				// Verify expand icon changed back
				cy.get(".debug-log-entry")
					.first()
					.find(".debug-log-expand-icon")
					.should("contain", "▶");
			}
		});
	});

	it("should navigate from Settings to Debug Logs", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Open user menu
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");

		// Click Settings
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");

		// Verify Settings dialog is visible
		cy.get(".settings-dialog h2").should("have.text", "Settings");

		// Open Debug Logs
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Verify Debug Logs dialog is visible
		cy.get(".debug-logs-dialog h2").should("have.text", "Debug Logs");

		// Verify Settings dialog is no longer visible (debug logs replaces it)
		cy.get(".settings-dialog").should("not.be.visible");

		// Close Debug Logs
		cy.get("button.debug-logs-btn-primary")
			.contains("Close")
			.click();

		// Verify debug logs dialog is closed
		cy.get(".debug-logs-dialog").should("not.be.visible");

		// Verify we're back to the normal app
		cy.get(".user-menu-trigger").should("be.visible");
	});

	it("should download logs as JSON file", () => {
		// Navigate to the app in test mode
		cy.visitTest();

		// Wait for the app to load
		cy.get(".user-menu-trigger", { timeout: 10000 }).should("be.visible");

		// Give sync events time to occur (so we have some logs)
		// In test mode without cloud sync, there may not be any logs
		cy.wait(1000);

		// Open debug logs dialog
		cy.get(".user-menu-trigger").click();
		cy.get(".user-menu-dropdown").should("be.visible");
		cy.contains("button", "Settings").click();
		cy.get(".settings-dialog").should("be.visible");
		cy.contains("button", "View Debug Logs").click();
		cy.get(".debug-logs-dialog").should("be.visible");

		// Check if we have any logs
		cy.get("body").then(($body) => {
			const hasLogs = $body.find(".debug-logs-list").is(":visible");

			if (!hasLogs) {
				// No logs in test mode - just verify button exists but is disabled
				cy.contains("button", "Download Logs").should("be.visible");
				cy.contains("button", "Download Logs").should("be.disabled");
				return;
			}

			// We have logs - verify Download Logs button is enabled
			cy.contains("button", "Download Logs").as("downloadButton");
			cy.get("@downloadButton").should("be.visible");
			cy.get("@downloadButton").should("not.be.disabled");

			// Click download button
			cy.get("@downloadButton").click();

			// Verify success message appears
			cy.get("@downloadButton").should("contain", "✓ Downloaded!");

			// Wait for success message to disappear (2 second timeout)
			cy.wait(2500);
			cy.get("@downloadButton").should("contain", "Download Logs");
		});
	});
});
