// Helper: Load default habits into the database
function loadDefaultHabits() {
	cy.window().then(async (win) => {
		await (win as any).eval(`
			(async () => {
				const { habitService } = await import('/src/services/habitService.ts');
				const { DEFAULT_HABITS } = await import('/src/data/defaultHabits.ts');
				const userId = 'mock-user';

				// Clear existing habits for this user
				const existingHabits = await habitService.getHabits(userId);
				for (const habit of existingHabits) {
					await habitService.deleteHabit(habit.id);
				}

				// Add all default habits using habitService
				for (const habit of DEFAULT_HABITS) {
					await habitService.createHabit({
						name: habit.name,
						category: habit.category,
						targetPerWeek: habit.targetPerWeek,
						userId,
					});
				}
			})()
		`);
	});
}

// Helper: Get habit count from database
function getHabitCount(): Cypress.Chainable<number> {
	return cy.window().then(async (win) => {
		return await (win as any).eval(`
			(async () => {
				const { habitService } = await import('/src/services/habitService.ts');
				const userId = 'mock-user';
				const habits = await habitService.getHabits(userId);
				return habits.length;
			})()
		`);
	});
}

describe("Load Default Habits - Desktop", () => {
	beforeEach(() => {
		// Go to the app in E2E mode (no auth required, uses real IndexedDB)
		cy.visitE2E();
		cy.get("table", { timeout: 15000 }).should("be.visible");
	});

	afterEach(() => {
		// Clean up IndexedDB after each test
		cy.clearIndexedDB();
	});

	it("should load default habits and display them correctly", () => {
		// Load default habits
		loadDefaultHabits();

		// Reload to see the loaded habits
		cy.reload();
		cy.get("table", { timeout: 15000 }).should("be.visible");
		cy.wait(1000);

		// Verify category sections appear
		cy.get(".section-header").should("have.length.greaterThan", 0);

		// Expand all sections
		cy.expandAllSections();

		// Verify habit rows are visible
		cy.get(".section-row").should("have.length.greaterThan", 0);

		// Verify we have habits loaded (default set has 28 habits)
		getHabitCount().should("be.greaterThan", 20);
	});

	it("should display expected habit categories", () => {
		// Check if habits already exist, load if needed
		getHabitCount().then((count) => {
			if (count === 0) {
				loadDefaultHabits();
				cy.reload();
				cy.get("table", { timeout: 15000 }).should("be.visible");
			}
		});

		cy.wait(1000);

		// Expand all sections to see categories
		cy.expandAllSections();

		// Expected categories from default habits
		const expectedCategories = [
			"Mobility",
			"Relationships",
			"Emotional Health",
			"Smile and Wonder",
			"Physical Health",
		];

		// Verify each category is visible
		for (const category of expectedCategories) {
			cy.get(`.section-header:contains("${category}")`).should("be.visible");
		}
	});

	it("should support zoom functionality", () => {
		// Ensure habits are loaded
		getHabitCount().then((count) => {
			if (count === 0) {
				loadDefaultHabits();
				cy.reload();
				cy.get("table", { timeout: 15000 }).should("be.visible");
			}
		});

		cy.wait(1000);
		cy.expandAllSections();

		// Find and click first zoom button
		cy.get("button.zoom-btn").first().click();
		cy.wait(500);

		// Verify we're in zoom mode by checking for "Back" button
		cy.get("button.zoom-back-btn").should("be.visible");

		// Zoom out by clicking the Back button
		cy.get("button.zoom-back-btn").click();
		cy.wait(500);

		// Verify we're back to full view
		cy.contains("button", "Collapse All").should("be.visible");
	});

	it("should navigate through settings screens", () => {
		// Ensure habits are loaded
		getHabitCount().then((count) => {
			if (count === 0) {
				loadDefaultHabits();
				cy.reload();
				cy.get("table", { timeout: 15000 }).should("be.visible");
			}
		});

		cy.wait(1000);

		// Open user menu
		cy.get(".user-menu-trigger").should("be.visible").click();
		cy.wait(500);

		// Click Manage Habits
		cy.contains("button.user-menu-item", "Manage Habits").click();
		cy.wait(500);

		// Wait for settings modal to appear
		cy.get(".habit-settings-modal").should("be.visible");

		// Wait a bit for settings content to load
		cy.wait(500);

		// Click "Add New Habit" button to show the form
		cy.contains("button", "+ Add New Habit").then(($button) => {
			if ($button.is(":visible")) {
				cy.wrap($button).click();
				cy.wait(500);

				// Cancel/close the add form
				cy.get('button:contains("Cancel"), button:contains("Close")')
					.first()
					.then(($cancel) => {
						if ($cancel.is(":visible")) {
							cy.wrap($cancel).click();
							cy.wait(200);
						}
					});
			}
		});

		// Close settings modal
		cy.get(".habit-settings-modal")
			.find('button:contains("Close"), button[aria-label="Close"]')
			.first()
			.then(($close) => {
				if ($close.is(":visible")) {
					cy.wrap($close).click();
				} else {
					// Try pressing Escape
					cy.get("body").type("{esc}");
				}
			});

		cy.wait(500);
	});
});

describe("Load Default Habits - Mobile", () => {
	beforeEach(() => {
		// Set mobile viewport
		cy.viewport(390, 844);

		// Go to the app in E2E mode
		cy.visitE2E();
		cy.get("table", { timeout: 15000 }).should("be.visible");
	});

	afterEach(() => {
		// Clean up IndexedDB after each test
		cy.clearIndexedDB();
	});

	it("should load default habits on mobile", () => {
		// Load default habits
		loadDefaultHabits();

		// Reload to see the loaded habits
		cy.reload();
		cy.get("table", { timeout: 15000 }).should("be.visible");
		cy.wait(1000);

		// Verify category sections appear
		cy.get(".section-header").should("have.length.greaterThan", 0);

		// Expand all sections
		cy.expandAllSections();

		// Verify habit rows are visible
		cy.get(".section-row").should("have.length.greaterThan", 0);

		// Verify we have habits loaded
		getHabitCount().should("be.greaterThan", 20);
	});
});
