/**
 * Cypress Custom Commands for Habit Tracker E2E Tests
 */

import {
	waitForEntryInDB,
	waitForEntryCount,
	waitForHabitsLoaded,
	getDBEntryCount,
	getDBHabitCount,
	clearIndexedDB,
} from "./indexeddb";

// Visit the app in E2E mode (bypasses auth, uses real IndexedDB)
Cypress.Commands.add("visitE2E", () => {
	cy.visit("/?e2e=true");
	cy.window().should("exist");
});

// Visit the app in test mode (used for import/export, crash tests)
Cypress.Commands.add("visitTest", () => {
	cy.visit("/?test=true");
	cy.window().should("exist");
});

// Load default habits into IndexedDB
Cypress.Commands.add(
	"loadDefaultHabits",
	(
		habits: Array<{
			name: string;
			category: string;
			targetPerWeek: number;
			order: number;
		}>,
	) => {
		const TEST_USER_ID = "mock-user";

		cy.window().then(async (win) => {
			const habitService = await (win as any).eval(
				`import('/src/services/habitService.ts').then(m => m.habitService)`,
			);

			const habitsWithUserId = habits.map((h) => ({
				...h,
				userId: TEST_USER_ID,
			}));

			await habitService.bulkCreateHabits(habitsWithUserId);

			Cypress.log({
				name: "loadDefaultHabits",
				message: `Loaded ${habits.length} habits`,
				consoleProps: () => ({ habits: habitsWithUserId }),
			});
		});

		// Wait for table to appear
		cy.get("table", { timeout: 15000 }).should("exist");
	},
);

// IndexedDB helper commands
Cypress.Commands.add("waitForEntryInDB", (options) => {
	waitForEntryInDB(options);
});

Cypress.Commands.add("waitForEntryCount", (expectedCount, options) => {
	waitForEntryCount(expectedCount, options);
});

Cypress.Commands.add("waitForHabitsLoaded", (options) => {
	waitForHabitsLoaded(options);
});

Cypress.Commands.add("getDBEntryCount", () => {
	return getDBEntryCount();
});

Cypress.Commands.add("getDBHabitCount", () => {
	return getDBHabitCount();
});

Cypress.Commands.add("clearIndexedDB", () => {
	clearIndexedDB();
});

// Screenshot with metadata
Cypress.Commands.add(
	"screenshotWithMetadata",
	(screenshotName: string, device: string) => {
		cy.screenshot(screenshotName);
		cy.task("writeScreenshotMetadata", { screenshotName, device });
	},
);

// Expand all habit sections
Cypress.Commands.add("expandAllSections", () => {
	cy.contains("button", "Expand All").click();
	cy.wait(500); // Give UI time to expand
});
