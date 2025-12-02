import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "./Login";

// Mock the db module
vi.mock("../config/db", () => ({
	db: {
		cloud: {
			login: vi.fn(),
		},
	},
}));

// Import the mocked db to access the mock function
import { db } from "../config/db";

describe("Login Component", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
		// Mock window.alert
		vi.spyOn(window, "alert").mockImplementation(() => {});
	});

	it("renders the login page with correct title", () => {
		render(<Login />);
		const title = screen.getByRole("heading", { name: /humane tracker/i });
		expect(title).toBeTruthy();
	});

	it("displays the tagline", () => {
		render(<Login />);
		const tagline = screen.getByText(
			/track your wellness habits and build healthy routines/i,
		);
		expect(tagline).toBeTruthy();
	});

	it("displays all feature items", () => {
		render(<Login />);

		// Check for all 5 features
		expect(
			screen.getByText(/track 27\+ habits across 5 categories/i),
		).toBeTruthy();
		expect(
			screen.getByText(/set weekly targets and monitor progress/i),
		).toBeTruthy();
		expect(screen.getByText(/sync across all your devices/i)).toBeTruthy();
		expect(screen.getByText(/your data is private and secure/i)).toBeTruthy();
		expect(screen.getByText(/works offline with automatic sync/i)).toBeTruthy();
	});

	it("displays the sign in button", () => {
		render(<Login />);
		const signInButton = screen.getByRole("button", { name: /sign in/i });
		expect(signInButton).toBeTruthy();
	});

	it("displays the privacy note", () => {
		render(<Login />);
		const privacyNote = screen.getByText(/we only store your email and name/i);
		expect(privacyNote).toBeTruthy();
	});

	it("calls db.cloud.login when sign in button is clicked", async () => {
		vi.mocked(db.cloud.login).mockResolvedValue(undefined);
		render(<Login />);

		const signInButton = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(signInButton);

		await waitFor(() => {
			expect(db.cloud.login).toHaveBeenCalledTimes(1);
		});
	});

	it("shows alert when login fails", async () => {
		const errorMessage = "Authentication failed";
		vi.mocked(db.cloud.login).mockRejectedValue(new Error(errorMessage));

		render(<Login />);

		const signInButton = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(signInButton);

		await waitFor(() => {
			expect(window.alert).toHaveBeenCalledWith(
				"Failed to sign in. Please try again.",
			);
		});
	});

	it("logs error to console when login fails", async () => {
		const errorMessage = "Network error";
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		vi.mocked(db.cloud.login).mockRejectedValue(new Error(errorMessage));

		render(<Login />);

		const signInButton = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(signInButton);

		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error signing in:",
				expect.any(Error),
			);
		});

		consoleErrorSpy.mockRestore();
	});

	it("has correct CSS classes for styling", () => {
		const { container } = render(<Login />);

		// Check main container class
		const loginContainer = container.querySelector(".login-container");
		expect(loginContainer).toBeTruthy();

		// Check card class
		const loginCard = container.querySelector(".login-card");
		expect(loginCard).toBeTruthy();

		// Check header class
		const loginHeader = container.querySelector(".login-header");
		expect(loginHeader).toBeTruthy();

		// Check features class
		const loginFeatures = container.querySelector(".login-features");
		expect(loginFeatures).toBeTruthy();

		// Check sign in button class
		const signInButton = container.querySelector(".google-signin-btn");
		expect(signInButton).toBeTruthy();

		// Check privacy note class
		const privacyNote = container.querySelector(".privacy-note");
		expect(privacyNote).toBeTruthy();
	});
});
