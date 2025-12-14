import { test, expect } from "@playwright/test";

test.describe("Login Flow - Cancel Dialog", () => {
	// Skip: Dexie Cloud login dialog doesn't appear reliably in test environment
	test.skip("shows warning and login button after canceling Dexie login", async ({
		page,
	}) => {
		// Navigate WITHOUT e2e mode to trigger real Dexie Cloud login dialog
		await page.goto("/");

		// Wait for Dexie Cloud login dialog
		const cancelButton = page.locator('button:has-text("Cancel")');
		await cancelButton.waitFor({ timeout: 10000 });

		// Cancel the login
		await cancelButton.click();

		// Should see warning banner
		const warning = page.locator(".anonymous-warning");
		await expect(warning).toBeVisible({ timeout: 5000 });
		await expect(warning).toContainText("not being saved");

		// Should see user menu (guest menu with Sign In option)
		const userMenuTrigger = page.locator(".user-menu-trigger");
		await expect(userMenuTrigger).toBeVisible();

		// Open user menu and verify Sign In option exists
		await userMenuTrigger.click();
		await page.waitForSelector(".user-menu-dropdown");

		// Check for Sign In button in the user menu dropdown
		const signInButton = page.locator('.user-menu-dropdown button:has-text("Sign In")');
		await expect(signInButton).toBeVisible();
	});
});
