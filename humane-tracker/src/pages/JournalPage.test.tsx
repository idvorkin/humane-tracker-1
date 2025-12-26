import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalPage } from "./JournalPage";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-audio");
global.URL.revokeObjectURL = vi.fn();

// Mock the repositories
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		getByUserId: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("../repositories/affirmationLogRepository", () => ({
	affirmationLogRepository: {
		getByUserId: vi.fn(),
		delete: vi.fn(),
	},
}));

// Mock window.confirm
const originalConfirm = window.confirm;

import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";

const mockGetRecordings = vi.mocked(audioRecordingRepository.getByUserId);
const mockDeleteRecording = vi.mocked(audioRecordingRepository.delete);
const mockGetLogs = vi.mocked(affirmationLogRepository.getByUserId);
const mockDeleteLog = vi.mocked(affirmationLogRepository.delete);

const mockRecording = {
	id: "aud-123",
	userId: "user-1",
	audioBlob: new Blob(["test"], { type: "audio/webm" }),
	mimeType: "audio/webm",
	durationMs: 5000,
	affirmationTitle: "Test Affirmation",
	recordingContext: "opportunity" as const,
	date: new Date("2024-03-15"),
	createdAt: new Date("2024-03-15T10:30:00"),
	transcriptionStatus: "pending" as const,
};

const mockLog = {
	id: "aff-456",
	userId: "user-1",
	affirmationTitle: "Test Affirmation",
	logType: "opportunity" as const,
	note: "This is my test note",
	date: new Date("2024-03-15"),
	createdAt: new Date("2024-03-15T11:00:00"),
};

function renderWithRouter() {
	return render(
		<MemoryRouter>
			<JournalPage userId="user-1" />
		</MemoryRouter>,
	);
}

describe("JournalPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.confirm = vi.fn(() => true);
		mockGetRecordings.mockResolvedValue([]);
		mockGetLogs.mockResolvedValue([]);
	});

	afterAll(() => {
		window.confirm = originalConfirm;
	});

	it("shows loading state initially", () => {
		mockGetRecordings.mockImplementation(() => new Promise(() => {}));
		mockGetLogs.mockImplementation(() => new Promise(() => {}));
		renderWithRouter();

		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("shows error state when loading fails", async () => {
		mockGetRecordings.mockRejectedValue(new Error("Network error"));
		renderWithRouter();

		await waitFor(() => {
			expect(
				screen.getByText(/failed to load journal entries/i),
			).toBeInTheDocument();
		});
	});

	it("shows empty state when no entries", async () => {
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText(/no journal entries yet/i)).toBeInTheDocument();
		});
	});

	it("renders voice recordings", async () => {
		mockGetRecordings.mockResolvedValue([mockRecording]);
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});
	});

	it("renders text notes", async () => {
		mockGetLogs.mockResolvedValue([mockLog]);
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("This is my test note")).toBeInTheDocument();
		});
	});

	it("renders both voice and text entries together", async () => {
		mockGetRecordings.mockResolvedValue([mockRecording]);
		mockGetLogs.mockResolvedValue([mockLog]);
		renderWithRouter();

		await waitFor(() => {
			// Both should appear under the same affirmation title
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
			expect(screen.getByText("This is my test note")).toBeInTheDocument();
		});
	});

	it("shows back link to home", async () => {
		renderWithRouter();

		await waitFor(() => {
			const backLink = screen.getByRole("link", { name: /back/i });
			expect(backLink).toBeInTheDocument();
			expect(backLink).toHaveAttribute("href", "/");
		});
	});

	it("shows page title as Journal", async () => {
		renderWithRouter();

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { level: 1, name: /journal/i }),
			).toBeInTheDocument();
		});
	});

	it("deletes voice recording when confirmed", async () => {
		mockGetRecordings.mockResolvedValue([mockRecording]);
		mockDeleteRecording.mockResolvedValue(undefined);

		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(mockDeleteRecording).toHaveBeenCalledWith("aud-123");
		});
	});

	it("deletes text note when confirmed", async () => {
		mockGetLogs.mockResolvedValue([mockLog]);
		mockDeleteLog.mockResolvedValue(undefined);

		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("This is my test note")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", { name: /delete note/i });
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(mockDeleteLog).toHaveBeenCalledWith("aff-456");
		});
	});
});
