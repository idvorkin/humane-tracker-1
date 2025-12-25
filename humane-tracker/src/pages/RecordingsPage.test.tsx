import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordingsPage } from "./RecordingsPage";

// Mock URL.createObjectURL and URL.revokeObjectURL
// Use a generic blob URL format without port numbers
global.URL.createObjectURL = vi.fn(() => "blob:mock-audio");
global.URL.revokeObjectURL = vi.fn();

// Mock the audio recording repository
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		getByUserId: vi.fn(),
		delete: vi.fn(),
	},
}));

// Mock window.confirm
const originalConfirm = window.confirm;

import { audioRecordingRepository } from "../repositories/audioRecordingRepository";

const mockGetByUserId = vi.mocked(audioRecordingRepository.getByUserId);
const mockDelete = vi.mocked(audioRecordingRepository.delete);

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

function renderWithRouter() {
	return render(
		<MemoryRouter>
			<RecordingsPage userId="user-1" />
		</MemoryRouter>,
	);
}

describe("RecordingsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.confirm = vi.fn(() => true);
	});

	afterAll(() => {
		window.confirm = originalConfirm;
	});

	it("shows loading state initially", () => {
		mockGetByUserId.mockImplementation(() => new Promise(() => {})); // Never resolves
		renderWithRouter();

		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("shows error state when loading fails", async () => {
		mockGetByUserId.mockRejectedValue(new Error("Network error"));
		renderWithRouter();

		await waitFor(() => {
			expect(
				screen.getByText(/failed to load recordings/i),
			).toBeInTheDocument();
		});
	});

	it("shows empty state when no recordings", async () => {
		mockGetByUserId.mockResolvedValue([]);
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText(/no recordings yet/i)).toBeInTheDocument();
		});
	});

	it("renders recordings when data is loaded", async () => {
		mockGetByUserId.mockResolvedValue([mockRecording]);
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});
	});

	it("groups recordings by date", async () => {
		const recording1 = {
			...mockRecording,
			id: "aud-1",
			date: new Date("2024-03-15"),
		};
		const recording2 = {
			...mockRecording,
			id: "aud-2",
			date: new Date("2024-03-16"),
		};

		mockGetByUserId.mockResolvedValue([recording1, recording2]);
		renderWithRouter();

		await waitFor(() => {
			const dateHeaders = screen.getAllByRole("heading", { level: 2 });
			expect(dateHeaders.length).toBe(2);
		});
	});

	it("shows back link to home", async () => {
		mockGetByUserId.mockResolvedValue([]);
		renderWithRouter();

		await waitFor(() => {
			const backLink = screen.getByRole("link", { name: /back/i });
			expect(backLink).toBeInTheDocument();
			expect(backLink).toHaveAttribute("href", "/");
		});
	});

	it("displays recording duration in correct format", async () => {
		mockGetByUserId.mockResolvedValue([
			{ ...mockRecording, durationMs: 125000 },
		]); // 2:05
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText(/2:05/)).toBeInTheDocument();
		});
	});

	it("shows confirmation dialog before delete", async () => {
		mockGetByUserId.mockResolvedValue([mockRecording]);
		mockDelete.mockResolvedValue(undefined);
		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		expect(window.confirm).toHaveBeenCalledWith(
			"Delete this recording? This cannot be undone.",
		);
	});

	it("deletes recording when confirmed", async () => {
		mockGetByUserId.mockResolvedValue([mockRecording]);
		mockDelete.mockResolvedValue(undefined);
		window.confirm = vi.fn(() => true);

		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("aud-123");
		});

		// Recording should be removed from list
		await waitFor(() => {
			expect(screen.queryByText("Test Affirmation")).not.toBeInTheDocument();
		});
	});

	it("does not delete when confirmation is cancelled", async () => {
		mockGetByUserId.mockResolvedValue([mockRecording]);
		window.confirm = vi.fn(() => false);

		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		expect(mockDelete).not.toHaveBeenCalled();
		expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
	});

	it("shows error when delete fails", async () => {
		mockGetByUserId.mockResolvedValue([mockRecording]);
		mockDelete.mockRejectedValue(new Error("Delete failed"));
		window.confirm = vi.fn(() => true);

		renderWithRouter();

		await waitFor(() => {
			expect(screen.getByText("Test Affirmation")).toBeInTheDocument();
		});

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(
				screen.getByText(/failed to delete recording/i),
			).toBeInTheDocument();
		});
	});

	it("renders page title", async () => {
		mockGetByUserId.mockResolvedValue([]);
		renderWithRouter();

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { level: 1, name: /recordings/i }),
			).toBeInTheDocument();
		});
	});
});
