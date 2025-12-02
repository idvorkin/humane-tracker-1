/**
 * Cypress E2E Support File
 *
 * This file is loaded automatically before every test.
 * Load custom commands and setup here.
 */

// Import custom commands
import "./commands";
import "./types";

// Handle uncaught exceptions (e.g., for crash testing)
Cypress.on("uncaught:exception", (err, runnable) => {
	// Return false to prevent Cypress from failing the test
	// Tests can explicitly check for errors using cy.on('window:error')
	return false;
});
