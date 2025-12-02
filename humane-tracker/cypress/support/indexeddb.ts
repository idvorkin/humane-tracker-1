/**
 * IndexedDB Testing Helpers for Cypress
 *
 * These helpers wait for actual IndexedDB changes instead of using arbitrary timeouts.
 * Adapted from Playwright helpers to work with Cypress's retry-ability.
 */

/**
 * Wait for an entry to be created in IndexedDB
 */
export function waitForEntryInDB(
	options: {
		timeout?: number;
		interval?: number;
	} = {},
) {
	const { timeout = 10000, interval = 100 } = options;

	cy.window({ timeout }).should((win) => {
		return cy.wrap(null).then(
			{ timeout },
			async () => {
				const db = await (win as any).eval(
					`import('/src/config/db.ts').then(m => m.db)`,
				);
				const entryCount = await db.entries.count();
				if (entryCount === 0) {
					throw new Error(
						`Expected at least one entry in IndexedDB, but found 0`,
					);
				}
				return entryCount;
			},
		);
	});
}

/**
 * Wait for a specific number of entries in IndexedDB
 */
export function waitForEntryCount(
	expectedCount: number,
	options: {
		timeout?: number;
		interval?: number;
	} = {},
) {
	const { timeout = 10000, interval = 100 } = options;

	cy.window({ timeout }).then((win) => {
		cy.wrap(null, { timeout }).should(async () => {
			const db = await (win as any).eval(
				`import('/src/config/db.ts').then(m => m.db)`,
			);
			const entryCount = await db.entries.count();
			Cypress.log({
				name: "waitForEntryCount",
				message: `Current: ${entryCount}, Expected: ${expectedCount}`,
				consoleProps: () => ({
					current: entryCount,
					expected: expectedCount,
				}),
			});
			if (entryCount < expectedCount) {
				throw new Error(
					`Expected ${expectedCount} entries, got ${entryCount}`,
				);
			}
		});
	});
}

/**
 * Wait for habit data to be loaded (at least one habit exists)
 */
export function waitForHabitsLoaded(
	options: {
		timeout?: number;
		interval?: number;
	} = {},
) {
	const { timeout = 10000, interval = 100 } = options;

	cy.window({ timeout }).should((win) => {
		return cy.wrap(null).then(
			{ timeout },
			async () => {
				const db = await (win as any).eval(
					`import('/src/config/db.ts').then(m => m.db)`,
				);
				const habitCount = await db.habits.count();
				if (habitCount === 0) {
					throw new Error(
						`Expected at least one habit in IndexedDB, but found 0`,
					);
				}
				return habitCount;
			},
		);
	});
}

/**
 * Get entry count from IndexedDB
 */
export function getDBEntryCount(): Cypress.Chainable<number> {
	return cy.window().then(async (win) => {
		const db = await (win as any).eval(
			`import('/src/config/db.ts').then(m => m.db)`,
		);
		return db.entries.count();
	});
}

/**
 * Get habit count from IndexedDB
 */
export function getDBHabitCount(): Cypress.Chainable<number> {
	return cy.window().then(async (win) => {
		const db = await (win as any).eval(
			`import('/src/config/db.ts').then(m => m.db)`,
		);
		return db.habits.count();
	});
}

/**
 * Clear all IndexedDB data for clean test state
 */
export function clearIndexedDB() {
	cy.window().then(async (win) => {
		const db = await (win as any).eval(
			`import('/src/config/db.ts').then(m => m.db)`,
		);
		await db.habits.clear();
		await db.entries.clear();
		Cypress.log({
			name: "clearIndexedDB",
			message: "Cleared all data from IndexedDB",
		});
	});
}
