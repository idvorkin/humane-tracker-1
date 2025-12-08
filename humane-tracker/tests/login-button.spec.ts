import { test, expect } from "@playwright/test";

test.describe("Login Button", () => {
	test("shows login button when logged out", async ({ page }) => {
		// Use e2e-login mode to test logged-out state
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		// Login button should be visible
		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toHaveText("Sign In");
	});

	test("clicking login button logs to console (placeholder)", async ({
		page,
	}) => {
		// Capture console messages
		const consoleMessages: string[] = [];
		page.on("console", (msg) => {
			consoleMessages.push(msg.text());
		});

		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();

		// Click login button
		await loginButton.click();

		// Verify console message (placeholder behavior)
		expect(consoleMessages).toContain(
			"Login clicked - not implemented yet",
		);
	});

	test("login button has correct styling", async ({ page }) => {
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();

		// Check button has expected styles
		await expect(loginButton).toHaveCSS("cursor", "pointer");
	});
});
