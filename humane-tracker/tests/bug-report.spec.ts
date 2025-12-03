import { expect, test } from "@playwright/test";

test.describe("Bug Report", () => {
	test("should include device details in bug report when metadata is enabled", async ({
		page,
	}) => {
		// Navigate to the app in test mode (no auth required)
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Intercept window.open to capture the URL
		let bugReportUrl = "";
		await page.exposeFunction("captureWindowOpen", (url: string) => {
			bugReportUrl = url;
		});

		await page.evaluate(() => {
			// Override window.open to capture the URL
			const originalOpen = window.open;
			window.open = function (url: string | URL | undefined, ...args) {
				if (url) {
					(window as Window & { captureWindowOpen: (url: string) => void })
						.captureWindowOpen(url.toString());
				}
				// Don't actually open the window in test
				return null;
			};
		});

		// Open user menu
		await page.click(".user-menu-trigger");

		// Wait for menu to be visible
		await page.waitForSelector(".user-menu-dropdown");

		// Click "Report Bug"
		await page.click('button:has-text("Report Bug")');

		// Wait for bug report dialog to appear
		await page.waitForSelector(".bug-report-dialog", { timeout: 5000 });

		// Verify dialog is visible
		await expect(page.locator(".bug-report-dialog h2")).toHaveText(
			"Report a Bug",
		);

		// Fill in the form
		await page.fill("#bug-title", "Test Bug Report");
		await page.fill("#bug-description", "This is a test bug description");

		// Verify "Include device info" checkbox is checked by default
		const checkbox = page.locator('input[type="checkbox"]');
		await expect(checkbox).toBeChecked();

		// Click the submit button
		await page.click('button:has-text("Open in GitHub")');

		// Wait a bit for window.open to be called
		await page.waitForTimeout(500);

		// Verify the URL contains expected parts
		expect(bugReportUrl).toContain("github.com");
		expect(bugReportUrl).toContain("/issues/new");
		expect(bugReportUrl).toContain("title=Test+Bug+Report");

		// Decode the URL to check the body content
		const urlObj = new URL(bugReportUrl);
		const body = urlObj.searchParams.get("body") || "";

		// Verify the body contains the description
		expect(body).toContain("This is a test bug description");

		// Verify the body contains device detail sections
		expect(body).toContain("## Environment");
		expect(body).toContain("## Device Info");

		// Verify all recommended device fields are present
		expect(body).toContain("**Screen:**");
		expect(body).toContain("**Device Memory:**");
		expect(body).toContain("**CPU Cores:**");
		expect(body).toContain("**Online Status:**");
		expect(body).toContain("**Connection Type:**");
		expect(body).toContain("**Display Mode:**");
		expect(body).toContain("**Touch Device:**");
		expect(body).toContain("**Mobile:**");
		expect(body).toContain("**Platform:**");
		expect(body).toContain("**User Agent:**");
		expect(body).toContain("**Language:**");
	});

	test("should not include device details when metadata checkbox is unchecked", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Intercept window.open to capture the URL
		let bugReportUrl = "";
		await page.exposeFunction("captureWindowOpen", (url: string) => {
			bugReportUrl = url;
		});

		await page.evaluate(() => {
			const originalOpen = window.open;
			window.open = function (url: string | URL | undefined, ...args) {
				if (url) {
					(window as Window & { captureWindowOpen: (url: string) => void })
						.captureWindowOpen(url.toString());
				}
				return null;
			};
		});

		// Open user menu
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");

		// Click "Report Bug"
		await page.click('button:has-text("Report Bug")');

		// Wait for bug report dialog
		await page.waitForSelector(".bug-report-dialog");

		// Fill in the form
		await page.fill("#bug-title", "Simple Bug Report");
		await page.fill("#bug-description", "Bug without metadata");

		// Click the label to uncheck the checkbox (avoid SVG overlay issue)
		const label = page.locator(".bug-report-checkbox");
		await label.click();

		// Verify checkbox is unchecked
		const checkbox = page.locator('input[type="checkbox"]');
		await expect(checkbox).not.toBeChecked();

		// Click the submit button
		await page.click('button:has-text("Open in GitHub")');

		// Wait for window.open to be called
		await page.waitForTimeout(500);

		// Decode the URL
		const urlObj = new URL(bugReportUrl);
		const body = urlObj.searchParams.get("body") || "";

		// Verify the body contains the description
		expect(body).toContain("Bug without metadata");

		// Verify the body does NOT contain device info sections
		expect(body).not.toContain("## Environment");
		expect(body).not.toContain("## Device Info");
		expect(body).not.toContain("**Device Memory:**");
		expect(body).not.toContain("**CPU Cores:**");
	});

	test("should open bug report dialog with keyboard shortcut", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Press Ctrl+I (or Cmd+I on Mac)
		// Playwright automatically handles platform differences
		await page.keyboard.press("Control+KeyI");

		// Wait for bug report dialog to appear
		await page.waitForSelector(".bug-report-dialog", { timeout: 5000 });

		// Verify dialog is visible
		await expect(page.locator(".bug-report-dialog h2")).toHaveText(
			"Report a Bug",
		);
	});

	test("should close bug report dialog when Cancel is clicked", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open bug report dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Report Bug")');
		await page.waitForSelector(".bug-report-dialog");

		// Click Cancel button
		await page.click('button:has-text("Cancel")');

		// Verify dialog is closed
		await expect(page.locator(".bug-report-dialog")).not.toBeVisible();

		// Verify we're back to the normal app
		await expect(page.locator(".user-menu-trigger")).toBeVisible();
	});

	test("should close bug report dialog when X button is clicked", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open bug report dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Report Bug")');
		await page.waitForSelector(".bug-report-dialog");

		// Click X close button
		await page.click(".bug-report-close");

		// Verify dialog is closed
		await expect(page.locator(".bug-report-dialog")).not.toBeVisible();
	});

	test("should close bug report dialog when clicking overlay", async ({
		page,
	}) => {
		// Navigate to the app in test mode
		await page.goto("/?test=true");

		// Wait for the app to load
		await page.waitForSelector(".user-menu-trigger", { timeout: 10000 });

		// Open bug report dialog
		await page.click(".user-menu-trigger");
		await page.waitForSelector(".user-menu-dropdown");
		await page.click('button:has-text("Report Bug")');
		await page.waitForSelector(".bug-report-dialog");

		// Click overlay (outside the dialog)
		await page
			.locator(".bug-report-overlay")
			.click({ position: { x: 10, y: 10 } });

		// Verify dialog is closed
		await expect(page.locator(".bug-report-dialog")).not.toBeVisible();
	});
});
