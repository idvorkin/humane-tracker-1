/**
 * TypeScript definitions for custom Cypress commands
 */

declare global {
	namespace Cypress {
		interface Chainable {
			/**
			 * Visit the app in E2E mode (bypasses auth, uses real IndexedDB)
			 * @example cy.visitE2E()
			 */
			visitE2E(): Chainable<void>;

			/**
			 * Visit the app in test mode (used for import/export, crash tests)
			 * @example cy.visitTest()
			 */
			visitTest(): Chainable<void>;

			/**
			 * Load default habits into IndexedDB
			 * @param habits - Array of habit objects to create
			 * @example cy.loadDefaultHabits([{ name: 'Exercise', category: 'Health', targetPerWeek: 5, order: 0 }])
			 */
			loadDefaultHabits(
				habits: Array<{
					name: string;
					category: string;
					targetPerWeek: number;
					order: number;
				}>,
			): Chainable<void>;

			/**
			 * Wait for an entry to be created in IndexedDB
			 * @param options - Optional timeout and interval
			 * @example cy.waitForEntryInDB({ timeout: 5000 })
			 */
			waitForEntryInDB(options?: {
				timeout?: number;
				interval?: number;
			}): Chainable<void>;

			/**
			 * Wait for a specific number of entries in IndexedDB
			 * @param expectedCount - Number of entries to wait for
			 * @param options - Optional timeout and interval
			 * @example cy.waitForEntryCount(3, { timeout: 5000 })
			 */
			waitForEntryCount(
				expectedCount: number,
				options?: { timeout?: number; interval?: number },
			): Chainable<void>;

			/**
			 * Wait for habit data to be loaded (at least one habit exists)
			 * @param options - Optional timeout and interval
			 * @example cy.waitForHabitsLoaded({ timeout: 5000 })
			 */
			waitForHabitsLoaded(options?: {
				timeout?: number;
				interval?: number;
			}): Chainable<void>;

			/**
			 * Get entry count from IndexedDB
			 * @example cy.getDBEntryCount().should('equal', 3)
			 */
			getDBEntryCount(): Chainable<number>;

			/**
			 * Get habit count from IndexedDB
			 * @example cy.getDBHabitCount().should('equal', 5)
			 */
			getDBHabitCount(): Chainable<number>;

			/**
			 * Clear all IndexedDB data for clean test state
			 * @example cy.clearIndexedDB()
			 */
			clearIndexedDB(): Chainable<void>;

			/**
			 * Take a screenshot and write metadata
			 * @param screenshotName - Name of the screenshot
			 * @param device - Device type (desktop or mobile)
			 * @example cy.screenshotWithMetadata('habit-loaded', 'desktop')
			 */
			screenshotWithMetadata(
				screenshotName: string,
				device: string,
			): Chainable<void>;

			/**
			 * Expand all habit sections
			 * @example cy.expandAllSections()
			 */
			expandAllSections(): Chainable<void>;
		}
	}
}

export {};
