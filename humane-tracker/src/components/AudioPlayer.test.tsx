import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "./AudioPlayer";

// Mock URL.createObjectURL and URL.revokeObjectURL
// Use a generic blob URL format without port numbers
const mockUrl = "blob:mock-audio-url";
global.URL.createObjectURL = vi.fn(() => mockUrl);
global.URL.revokeObjectURL = vi.fn();

describe("AudioPlayer", () => {
	const mockBlob = new Blob(["test audio data"], { type: "audio/webm" });
	const mockOnDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders play button", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		const playButton = screen.getByRole("button", { name: /play/i });
		expect(playButton).toBeInTheDocument();
	});

	it("renders progress slider", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		const slider = screen.getByRole("slider", { name: /seek/i });
		expect(slider).toBeInTheDocument();
	});

	it("renders time display showing 0:00 / 0:00 initially", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		expect(screen.getByText("0:00 / 0:00")).toBeInTheDocument();
	});

	it("renders delete button when onDelete is provided", () => {
		render(
			<AudioPlayer
				blob={mockBlob}
				mimeType="audio/webm"
				onDelete={mockOnDelete}
			/>,
		);

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		expect(deleteButton).toBeInTheDocument();
	});

	it("does not render delete button when onDelete is not provided", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		const deleteButton = screen.queryByRole("button", {
			name: /delete recording/i,
		});
		expect(deleteButton).not.toBeInTheDocument();
	});

	it("calls onDelete when delete button is clicked", () => {
		render(
			<AudioPlayer
				blob={mockBlob}
				mimeType="audio/webm"
				onDelete={mockOnDelete}
			/>,
		);

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		expect(mockOnDelete).toHaveBeenCalled();
	});

	it("creates object URL from blob on mount", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
	});

	it("revokes object URL on unmount", () => {
		const { unmount } = render(
			<AudioPlayer blob={mockBlob} mimeType="audio/webm" />,
		);

		unmount();

		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
	});

	it("toggles between play and pause icons when clicked", async () => {
		// Mock audio element methods
		const mockPlay = vi.fn().mockResolvedValue(undefined);
		const mockPause = vi.fn();

		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				const element = originalCreateElement(tagName);
				if (tagName === "audio") {
					Object.defineProperty(element, "play", {
						value: mockPlay,
						writable: true,
					});
					Object.defineProperty(element, "pause", {
						value: mockPause,
						writable: true,
					});
				}
				return element;
			},
		);

		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		const playButton = screen.getByRole("button", { name: /play/i });

		// Initially shows play icon
		expect(playButton.textContent).toContain("\u25B6");

		fireEvent.click(playButton);

		// After click, shows pause icon
		await waitFor(() => {
			expect(playButton.textContent).toContain("\u275A\u275A");
		});

		vi.restoreAllMocks();
	});

	it("shows error state when audio fails to load", async () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		// Find the audio element and trigger error
		const audio = document.querySelector("audio");
		if (audio) {
			fireEvent.error(audio);
		}

		await waitFor(() => {
			expect(screen.getByText(/failed to load audio/i)).toBeInTheDocument();
		});
	});

	it("has correct initial progress value", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />);

		const slider = screen.getByRole("slider", { name: /seek/i });
		expect(slider).toHaveValue("0");
	});
});
