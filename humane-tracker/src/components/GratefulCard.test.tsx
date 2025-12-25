import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GratefulCard } from "./GratefulCard";

// Mock the audio recording repository
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		create: vi.fn().mockResolvedValue("test-id"),
	},
}));

// Mock AudioRecorderButton to avoid MediaRecorder dependencies
vi.mock("./AudioRecorderButton", () => ({
	AudioRecorderButton: ({
		onRecordingComplete,
		onRecordingStateChange,
		onError,
	}: {
		onRecordingComplete: (blob: Blob, durationMs: number) => void;
		onRecordingStateChange?: (isRecording: boolean) => void;
		onError?: (error: string) => void;
	}) => (
		<button
			type="button"
			data-testid="mock-audio-recorder"
			onClick={() => {
				onRecordingStateChange?.(true);
				// Simulate recording complete after a moment
				setTimeout(() => {
					const mockBlob = new Blob(["test"], { type: "audio/webm" });
					onRecordingComplete(mockBlob, 3000);
					onRecordingStateChange?.(false);
				}, 10);
			}}
		>
			Record
		</button>
	),
}));

describe("GratefulCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the grateful card with title and subtitle", () => {
		render(<GratefulCard userId="test-user" />);

		expect(screen.getByText("Grateful")).toBeInTheDocument();
		expect(
			screen.getByText("What are you grateful for today?"),
		).toBeInTheDocument();
	});

	it("shows Record gratitude button by default", () => {
		render(<GratefulCard userId="test-user" />);

		expect(screen.getByText("Record gratitude")).toBeInTheDocument();
	});

	it("shows textarea when Record gratitude is clicked", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));

		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();
		expect(screen.getByText("Save")).toBeInTheDocument();
	});

	it("closes textarea on cancel button click", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText("\u2715"));

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
		expect(screen.getByText("Record gratitude")).toBeInTheDocument();
	});

	it("closes textarea on Escape key", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");

		fireEvent.keyDown(textarea, { key: "Escape" });

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
	});

	it("closes without saving when Save is clicked with empty text", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		fireEvent.click(screen.getByText("Save"));

		// Should close the input form
		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
		expect(screen.getByText("Record gratitude")).toBeInTheDocument();
	});

	it("saves audio recording when recording completes", async () => {
		const { audioRecordingRepository } = await import(
			"../repositories/audioRecordingRepository"
		);

		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		fireEvent.click(screen.getByTestId("mock-audio-recorder"));

		await waitFor(() => {
			expect(audioRecordingRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "test-user",
					affirmationTitle: "Grateful",
					recordingContext: "grateful",
					transcriptionStatus: "pending",
				}),
			);
		});
	});

	it("closes input form after successful audio save", async () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByTestId("mock-audio-recorder"));

		await waitFor(() => {
			expect(
				screen.queryByPlaceholderText("I'm grateful for..."),
			).not.toBeInTheDocument();
		});
	});

	it("clears text input when cancelled", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("Record gratitude"));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");
		fireEvent.change(textarea, { target: { value: "Some gratitude text" } });

		expect(textarea).toHaveValue("Some gratitude text");

		fireEvent.click(screen.getByText("\u2715"));

		// Reopen and check text is cleared
		fireEvent.click(screen.getByText("Record gratitude"));
		expect(screen.getByPlaceholderText("I'm grateful for...")).toHaveValue("");
	});
});
