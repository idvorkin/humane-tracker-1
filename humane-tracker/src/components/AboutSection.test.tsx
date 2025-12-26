import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AboutSection } from "./AboutSection";

// Mock the githubService
vi.mock("../services/githubService", () => ({
	getBuildInfo: () => ({
		sha: "abc1234def5678",
		branch: "main",
		timestamp: "2024-12-26T12:00:00Z",
		commitUrl: "https://github.com/test/repo/commit/abc1234",
	}),
	getGitHubLinks: () => ({
		repo: "https://github.com/test/repo",
	}),
}));

describe("AboutSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders build info", () => {
		render(<AboutSection />);

		expect(screen.getByText("abc1234")).toBeInTheDocument();
		expect(screen.getByText("main")).toBeInTheDocument();
	});

	it("renders current URL", () => {
		render(<AboutSection />);

		// window.location.origin in test environment
		const urlButton = screen.getByRole("button", { name: /http/i });
		expect(urlButton).toBeInTheDocument();
	});

	it("copies URL to clipboard when share is not available", async () => {
		// Mock clipboard API
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: { writeText },
			share: undefined,
		});

		// Mock alert
		const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

		render(<AboutSection />);

		const urlButton = screen.getByRole("button", { name: /http/i });
		fireEvent.click(urlButton);

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith(window.location.origin);
		});

		expect(alertMock).toHaveBeenCalledWith("URL copied to clipboard!");

		alertMock.mockRestore();
	});

	it("uses Web Share API when available", async () => {
		// Mock share API
		const shareMock = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			share: shareMock,
		});

		render(<AboutSection />);

		const urlButton = screen.getByRole("button", { name: /http/i });
		fireEvent.click(urlButton);

		await waitFor(() => {
			expect(shareMock).toHaveBeenCalledWith({
				title: "Humane Tracker",
				url: window.location.origin,
			});
		});
	});

	it("renders GitHub link", () => {
		render(<AboutSection />);

		const githubLink = screen.getByRole("link", { name: /github/i });
		expect(githubLink).toHaveAttribute(
			"href",
			"https://github.com/test/repo",
		);
	});
});
