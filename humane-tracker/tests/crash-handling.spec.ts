import { expect, test } from "@playwright/test";

// Helper function to trigger crash via Settings > Developer Tools
async function triggerCrashFromSettings(page: import("@playwright/test").Page) {
	// Open user menu
	await page.click(".user-menu-trigger");
	await page.waitForSelector(".user-menu-dropdown");

	// Click Settings
	await page.click('button:has-text("Settings")');
	await page.waitForSelector(".settings-dialog", { timeout: 5000 });

	// Click the "Trigger Crash" button in Developer Tools section
	// The button has class settings-action-danger and contains "Trigger Crash"
	await page.click('button.settings-action-danger:has-text("Trigger Crash")');
}

test.describe("Crash Handling", () => {
	test("should show crash fallback screen when error occurs", async ({
		page,
	}) => {
		// Navigate to the app in test mode (no auth required)
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Trigger crash via Settings > Developer Tools
		await triggerCrashFromSettings(page);

		// Wait for crash fallback to appear
		await page.waitForSelector(".crash-fallback", { timeout: 5000 });

		// Verify crash fallback elements
		await expect(page.locator(".crash-fallback-title")).toHaveText(
			"Something went wrong",
		);

		await expect(page.locator(".crash-fallback-message")).toContainText(
			"Test crash - triggered manually from dev menu",
		);

		// Verify action buttons exist
		await expect(
			page.locator('button:has-text("Reload App")'),
		).toBeVisible();

		await expect(
			page.locator('a:has-text("Report on GitHub")'),
		).toBeVisible();

		// Verify build info is displayed
		await expect(page.locator(".crash-fallback-build")).toBeVisible();

		// Verify technical details are expandable
		await expect(page.locator(".crash-fallback-details")).toBeVisible();

		// Expand technical details
		await page.click(".crash-fallback-details summary");

		// Verify stack trace is visible
		await expect(page.locator(".crash-fallback-stack")).toBeVisible();

		// Verify stack trace contains error message
		const stackTrace = await page.locator(".crash-fallback-stack").textContent();
		expect(stackTrace).toContain("Test crash - triggered manually");
	});

	test("should have working Report on GitHub button", async ({ page }) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Trigger crash via Settings > Developer Tools
		await triggerCrashFromSettings(page);

		// Wait for crash fallback
		await page.waitForSelector(".crash-fallback");

		// Get the GitHub report link
		const reportLink = page.locator('a:has-text("Report on GitHub")');
		const href = await reportLink.getAttribute("href");

		// Verify the URL contains expected parts (URL encoded)
		expect(href).toContain("github.com");
		expect(href).toContain("/issues/new");
		expect(href).toContain("title=Crash");
		expect(href).toContain("Test+crash");
		expect(href).toContain("labels=bug%2Ccrash%2Cfrom-app");
	});

	test("should reload app when Reload button is clicked", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Trigger crash via Settings > Developer Tools
		await triggerCrashFromSettings(page);

		// Wait for crash fallback
		await page.waitForSelector(".crash-fallback");

		// Set up listener for navigation
		const navigationPromise = page.waitForNavigation();

		// Click Reload button
		await page.click('button:has-text("Reload App")');

		// Wait for navigation to complete
		await navigationPromise;

		// Verify we're back to the normal app (crash screen is gone)
		await expect(page.locator(".crash-fallback")).not.toBeVisible();

		// Verify normal app UI is back
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});
});
