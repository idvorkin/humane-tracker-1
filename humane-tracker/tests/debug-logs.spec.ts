import { expect, test } from "@playwright/test";

// Helper function to open Settings and expand Logs section
async function openLogsSection(page: import("@playwright/test").Page) {
	// Open user menu
	await page.click(".user-menu-trigger");
	await page.waitForSelector(".user-menu-dropdown");

	// Click Settings
	await page.click('button:has-text("Settings")');
	await page.waitForSelector(".settings-dialog", { timeout: 5000 });

	// Find and click the "Logs" expando header in the Cloud Sync section
	// The button text includes the count like "Logs (5)"
	await page.click('button.sync-expando-header:has-text("Logs")');

	// Wait for the expando content to be visible
	await page.waitForSelector(".sync-log-actions", { timeout: 2000 });
}

test.describe("Debug Logs", () => {
	test("should display logs section in Settings with sync events", async ({
		page,
	}) => {
		// Navigate to the app in test mode (no auth required)
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Verify action buttons exist in the logs section
		await expect(page.locator('button:has-text("Download")')).toBeVisible();
		await expect(page.locator('button:has-text("Copy")')).toBeVisible();
		await expect(page.locator('button:has-text("Clear")')).toBeVisible();
	});

	test("should show sync log entries when present", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur (initial sync state events)
		await page.waitForTimeout(1000);

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Check if we have any log entries or empty state
		const hasLogsList = await page.locator(".sync-log-list").isVisible();
		const hasEmptyState = await page.locator(".sync-log-empty").isVisible();

		// Either we have logs or we see the empty state
		expect(hasLogsList || hasEmptyState).toBe(true);

		// If we have logs, verify their structure
		if (hasLogsList) {
			// Verify log entry structure exists
			const firstLog = page.locator(".sync-log-entry").first();
			if ((await firstLog.count()) > 0) {
				// Verify log has the expected parts
				await expect(firstLog.locator(".sync-log-badge")).toBeVisible();
				await expect(firstLog.locator(".sync-log-message")).toBeVisible();
				await expect(firstLog.locator(".sync-log-time")).toBeVisible();
			}
		}
	});

	test("should allow closing the Settings dialog", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Close using the Done button
		await page.click('button.settings-done-button:has-text("Done")');

		// Verify dialog is closed
		await expect(page.locator(".settings-dialog")).not.toBeVisible();

		// Verify we're back to the normal app
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});

	test("should allow closing dialog by clicking overlay", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Click overlay to close (click on the overlay itself, not the dialog)
		await page.locator(".settings-dialog-overlay").click({ position: { x: 10, y: 10 } });

		// Verify dialog is closed
		await expect(page.locator(".settings-dialog")).not.toBeVisible();
	});

	test("should expand/collapse log details", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur
		await page.waitForTimeout(1000);

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Check if we have any logs
		const hasLogs = await page.locator(".sync-log-entry").count();

		if (hasLogs > 0) {
			const firstLog = page.locator(".sync-log-entry").first();

			// Click to expand (clicking the header expands details)
			await firstLog.locator(".sync-log-entry-header").click();

			// If log has data, details should be visible
			// Note: Not all logs have data, so this is conditional
			const hasDetails = await firstLog.locator(".sync-log-details").isVisible();

			// Click again to collapse
			await firstLog.locator(".sync-log-entry-header").click();

			// Verify details are collapsed (if they were shown)
			if (hasDetails) {
				await expect(firstLog.locator(".sync-log-details")).not.toBeVisible();
			}
		}
	});

	test("should navigate from Settings to Logs section", async ({ page }) => {
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

		// Verify Cloud Sync section exists
		await expect(page.locator('text="Cloud Sync"')).toBeVisible();

		// Click Logs expando to expand
		await page.click('button.sync-expando-header:has-text("Logs")');

		// Verify logs section is expanded (action buttons visible)
		await expect(page.locator(".sync-log-actions")).toBeVisible();

		// Close Settings
		await page.click('button.settings-done-button:has-text("Done")');

		// Verify dialog is closed
		await expect(page.locator(".settings-dialog")).not.toBeVisible();

		// Verify we're back to the normal app
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});

	test("should download logs as JSON file", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Give sync events time to occur (so we have some logs)
		await page.waitForTimeout(1000);

		// Open Settings and expand Logs section
		await openLogsSection(page);

		// Check if we have any logs
		const hasLogs = await page.locator(".sync-log-list").isVisible();

		if (!hasLogs) {
			// No logs in test mode - verify Download button is disabled
			const downloadButton = page.locator('.sync-log-actions button:has-text("Download")');
			await expect(downloadButton).toBeVisible();
			await expect(downloadButton).toBeDisabled();
			return;
		}

		// We have logs - verify Download button is enabled
		const downloadButton = page.locator('.sync-log-actions button:has-text("Download")');
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
	});
});
