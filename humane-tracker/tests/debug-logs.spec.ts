import { expect, test } from "@playwright/test";

test.describe("Debug Logs", () => {
	test("should display debug logs dialog with sync events", async ({
		page,
	}) => {
		// Navigate to the app in test mode (no auth required)
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open user menu
		await page.click(".user-menu-trigger");

		// Wait for menu to be visible
		await page.waitForSelector(".user-menu-dropdown");

		// Click Settings
		await page.click('button:has-text("Settings")');

		// Wait for settings dialog to appear
		await page.waitForSelector(".settings-dialog", { timeout: 5000 });

		// Find and click "View Debug Logs" button
		await page.click('button:has-text("View Debug Logs")');

		// Wait for debug logs dialog to appear
		await page.waitForSelector(".debug-logs-dialog", { timeout: 5000 });

		// Verify dialog title
		await expect(page.locator(".debug-logs-dialog h2")).toHaveText(
			"Debug Logs",
		);

		// Verify info text is present
		await expect(page.locator(".debug-logs-info")).toContainText(
			"Showing last",
		);
		await expect(page.locator(".debug-logs-info")).toContainText(
			"max 2000",
		);

		// Verify action buttons exist
		await expect(
			page.locator('button:has-text("Copy All Logs")'),
		).toBeVisible();
		await expect(
			page.locator('button:has-text("Clear All Logs")'),
		).toBeVisible();
		await expect(page.locator('button:has-text("Close")')).toBeVisible();
	});

	test("should show sync log entries when present", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur (initial sync state events)
		await page.waitForTimeout(1000);

		// Open debug logs dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Check if we have any log entries (there should be initial sync events)
		const logsCount = await page.locator(".debug-logs-info").textContent();

		// In test mode with no Dexie Cloud, we might not have logs
		// But we should at least see the logs container
		const hasLogsList = await page.locator(".debug-logs-list").isVisible();
		const hasEmptyState = await page.locator(".debug-logs-empty").isVisible();

		// Either we have logs or we see the empty state
		expect(hasLogsList || hasEmptyState).toBe(true);

		// If we have logs, verify their structure
		if (hasLogsList) {
			// Verify log entry structure exists
			const firstLog = page.locator(".debug-log-entry").first();
			if ((await firstLog.count()) > 0) {
				// Verify log has the expected parts
				await expect(firstLog.locator(".debug-log-badge")).toBeVisible();
				await expect(firstLog.locator(".debug-log-type")).toBeVisible();
				await expect(firstLog.locator(".debug-log-time")).toBeVisible();
				await expect(firstLog.locator(".debug-log-entry-message")).toBeVisible();
			}
		}
	});

	test("should allow closing the debug logs dialog", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open debug logs dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Close using the Close button
		await page.click('button.debug-logs-btn-primary:has-text("Close")');

		// Verify dialog is closed
		await expect(page.locator(".debug-logs-dialog")).not.toBeVisible();

		// Verify we're back to the normal app (both dialogs are closed)
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});

	test("should allow closing dialog by clicking overlay", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open debug logs dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Click overlay to close (click on the overlay itself, not the dialog)
		await page.locator(".debug-logs-overlay").click({ position: { x: 10, y: 10 } });

		// Verify dialog is closed
		await expect(page.locator(".debug-logs-dialog")).not.toBeVisible();
	});

	test("should expand/collapse log details", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur
		await page.waitForTimeout(1000);

		// Open debug logs dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Check if we have any logs
		const hasLogs = await page.locator(".debug-log-entry").count();

		if (hasLogs > 0) {
			const firstLog = page.locator(".debug-log-entry").first();

			// Click to expand
			await firstLog.locator(".debug-log-entry-header").click();

			// Verify expand icon changed
			const expandIcon = firstLog.locator(".debug-log-expand-icon");
			await expect(expandIcon).toContainText("▼");

			// Click again to collapse
			await firstLog.locator(".debug-log-entry-header").click();

			// Verify expand icon changed back
			await expect(expandIcon).toContainText("▶");
		}
	});

	test("should navigate from Settings to Debug Logs", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open user menu
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");

		// Click Settings
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");

		// Verify Settings dialog is visible
		await expect(page.locator(".settings-dialog h2")).toHaveText("Settings");

		// Open Debug Logs
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Verify Debug Logs dialog is visible
		await expect(page.locator(".debug-logs-dialog h2")).toHaveText(
			"Debug Logs",
		);

		// Verify Settings dialog is no longer visible (debug logs replaces it)
		await expect(page.locator(".settings-dialog")).not.toBeVisible();

		// Close Debug Logs
		await page.click('button.debug-logs-btn-primary:has-text("Close")');

		// Verify debug logs dialog is closed
		await expect(page.locator(".debug-logs-dialog")).not.toBeVisible();

		// Verify we're back to the normal app
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});

	test("should download logs as JSON file", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur (so we have some logs)
		// In test mode without cloud sync, there may not be any logs
		await page.waitForTimeout(1000);

		// Open debug logs dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Settings")');
		await page.waitForSelector(".settings-dialog");
		await page.click('button:has-text("View Debug Logs")');
		await page.waitForSelector(".debug-logs-dialog");

		// Check if we have any logs
		const hasLogs = await page.locator(".debug-logs-list").isVisible();

		if (!hasLogs) {
			// No logs in test mode - just verify button exists but is disabled
			const downloadButton = page.locator('button:has-text("Download Logs")');
			await expect(downloadButton).toBeVisible();
			await expect(downloadButton).toBeDisabled();
			return;
		}

		// We have logs - verify Download Logs button is enabled
		const downloadButton = page.locator('button:has-text("Download Logs")');
		await expect(downloadButton).toBeVisible();
		await expect(downloadButton).toBeEnabled();

		// Start waiting for download before clicking
		const downloadPromise = page.waitForEvent("download");

		// Click download button
		await downloadButton.click();

		// Wait for the download
		const download = await downloadPromise;

		// Verify the filename format (sync-logs-YYYY-MM-DDTHH-MM-SS.json)
		const filename = download.suggestedFilename();
		expect(filename).toMatch(/^sync-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.json$/);

		// Verify success message appears
		await expect(downloadButton).toContainText("✓ Downloaded!");

		// Wait for success message to disappear (2 second timeout)
		await page.waitForTimeout(2500);
		await expect(downloadButton).toContainText("Download Logs");
	});
});
