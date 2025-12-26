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

// Mock the version check hook
vi.mock("../hooks/useVersionCheck", () => ({
	useVersionCheck: () => ({
		checkForUpdate: vi.fn(),
		isChecking: false,
		lastCheckTime: new Date("2024-12-26T12:00:00Z"),
	}),
}));

// Mock the audio recording repository
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		getTotalSizeForUser: vi.fn().mockResolvedValue(1024 * 1024), // 1MB
	},
}));

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
	useObservable: () => null,
}));

// Mock db
vi.mock("../config/db", () => ({
	db: {
		cloud: {
			syncState: { subscribe: vi.fn() },
			webSocketStatus: { subscribe: vi.fn() },
			sync: vi.fn(),
		},
	},
}));

const defaultProps = {
	isLocalMode: false,
	userId: "test-user-123",
};

describe("AboutSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders build info", () => {
		render(<AboutSection {...defaultProps} />);

		expect(screen.getByText(/abc1234/)).toBeInTheDocument();
		expect(screen.getByText(/main/)).toBeInTheDocument();
	});

	it("renders current URL", () => {
		render(<AboutSection {...defaultProps} />);

		// window.location.origin in test environment
		expect(screen.getByText(/http/i)).toBeInTheDocument();
	});

	it("copies URL to clipboard when copy button is clicked", async () => {
		// Mock clipboard API
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: { writeText },
			share: undefined,
		});

		// Mock alert
		const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

		render(<AboutSection {...defaultProps} />);

		const copyButton = screen.getByTitle("Copy URL");
		fireEvent.click(copyButton);

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

		render(<AboutSection {...defaultProps} />);

		const copyButton = screen.getByTitle("Copy URL");
		fireEvent.click(copyButton);

		await waitFor(() => {
			expect(shareMock).toHaveBeenCalledWith({
				title: "Humane Tracker",
				url: window.location.origin,
			});
		});
	});

	it("renders GitHub link", () => {
		render(<AboutSection {...defaultProps} />);

		const githubLink = screen.getByTitle("View on GitHub");
		expect(githubLink).toHaveAttribute(
			"href",
			"https://github.com/test/repo/commit/abc1234",
		);
	});

	it("shows sync status in local mode", () => {
		render(<AboutSection {...defaultProps} isLocalMode={true} />);

		expect(screen.getByText("Local Only")).toBeInTheDocument();
	});

	it("shows storage size", async () => {
		render(<AboutSection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("1 MB")).toBeInTheDocument();
		});
	});
});
