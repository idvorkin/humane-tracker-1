import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GratefulCard } from "./GratefulCard";

// Mock the audio recording repository
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		create: vi.fn().mockResolvedValue("test-id"),
		getByUserIdAndDate: vi.fn().mockResolvedValue([]),
	},
}));

// Mock the affirmation log repository
vi.mock("../repositories/affirmationLogRepository", () => ({
	affirmationLogRepository: {
		create: vi.fn().mockResolvedValue("test-id"),
		getByUserIdAndDate: vi.fn().mockResolvedValue([]),
	},
}));

// Track props passed to AudioRecorderButton for testing
let capturedAutoStart: boolean | undefined;
let capturedOnRecordingStateChange:
	| ((isRecording: boolean) => void)
	| undefined;

// Mock AudioRecorderButton to avoid MediaRecorder dependencies
vi.mock("./AudioRecorderButton", () => ({
	AudioRecorderButton: ({
		onRecordingComplete,
		onRecordingStateChange,
		autoStart,
	}: {
		onRecordingComplete: (blob: Blob, durationMs: number) => void;
		onRecordingStateChange?: (isRecording: boolean) => void;
		onError?: (error: string) => void;
		autoStart?: boolean;
	}) => {
		capturedAutoStart = autoStart;
		capturedOnRecordingStateChange = onRecordingStateChange;
		return (
			<button
				type="button"
				data-testid="mock-audio-recorder"
				data-autostart={autoStart}
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
		);
	},
}));

describe("GratefulCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedAutoStart = undefined;
		capturedOnRecordingStateChange = undefined;
	});

	it("renders the grateful card with title and subtitle", () => {
		render(<GratefulCard userId="test-user" />);

		expect(screen.getByText("Grateful")).toBeInTheDocument();
		expect(
			screen.getByText("What are you grateful for today?"),
		).toBeInTheDocument();
	});

	it("shows 🙏 Thanks button by default", () => {
		render(<GratefulCard userId="test-user" />);

		expect(screen.getByText("🙏 Thanks")).toBeInTheDocument();
	});

	it("shows textarea when 🙏 Thanks is clicked", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));

		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Send")).toBeInTheDocument();
	});

	it("closes textarea on cancel button click", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Cancel"));

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
		expect(screen.getByText("🙏 Thanks")).toBeInTheDocument();
	});

	it("closes textarea on Escape key", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");

		fireEvent.keyDown(textarea, { key: "Escape" });

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
	});

	it("does not submit when Send is clicked with empty text", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		const sendBtn = screen.getByLabelText("Send");

		// Send button should be disabled when text is empty
		expect(sendBtn).toBeDisabled();
	});

	it("saves audio recording when recording completes", async () => {
		const { audioRecordingRepository } = await import(
			"../repositories/audioRecordingRepository"
		);

		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		// Switch to voice mode (desktop defaults to text mode)
		fireEvent.click(screen.getByLabelText("Switch to voice"));
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

		fireEvent.click(screen.getByText("🙏 Thanks"));
		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();

		// Switch to voice mode (desktop defaults to text mode)
		fireEvent.click(screen.getByLabelText("Switch to voice"));
		fireEvent.click(screen.getByTestId("mock-audio-recorder"));

		await waitFor(() => {
			expect(
				screen.queryByPlaceholderText("I'm grateful for..."),
			).not.toBeInTheDocument();
		});
	});

	it("clears text input when cancelled", () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");
		fireEvent.change(textarea, { target: { value: "Some gratitude text" } });

		expect(textarea).toHaveValue("Some gratitude text");

		fireEvent.click(screen.getByLabelText("Cancel"));

		// Reopen and check text is cleared
		fireEvent.click(screen.getByText("🙏 Thanks"));
		expect(screen.getByPlaceholderText("I'm grateful for...")).toHaveValue("");
	});

	it("saves text note when Send is clicked with text", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		fireEvent.change(screen.getByPlaceholderText("I'm grateful for..."), {
			target: { value: "My health and family" },
		});
		fireEvent.click(screen.getByLabelText("Send"));

		await waitFor(() => {
			expect(affirmationLogRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "test-user",
					affirmationTitle: "Grateful",
					logType: "grateful",
					note: "My health and family",
				}),
			);
		});
	});

	it("closes input form after successful text save", async () => {
		render(<GratefulCard userId="test-user" />);

		fireEvent.click(screen.getByText("🙏 Thanks"));
		fireEvent.change(screen.getByPlaceholderText("I'm grateful for..."), {
			target: { value: "Something I'm grateful for" },
		});
		fireEvent.click(screen.getByLabelText("Send"));

		await waitFor(() => {
			expect(
				screen.queryByPlaceholderText("I'm grateful for..."),
			).not.toBeInTheDocument();
		});
	});

	it("passes autoStart=true when switching from text to voice mode", () => {
		render(<GratefulCard userId="test-user" />);

		// Open input form (text mode by default on desktop)
		fireEvent.click(screen.getByText("🙏 Thanks"));

		// Click the mic icon to switch to voice mode
		const modeSwitch = screen.getByLabelText("Switch to voice");
		fireEvent.click(modeSwitch);

		// Verify AudioRecorderButton is rendered with autoStart=true
		expect(screen.getByTestId("mock-audio-recorder")).toBeInTheDocument();
		expect(capturedAutoStart).toBe(true);
	});

	it("resets autoStart after recording starts", () => {
		render(<GratefulCard userId="test-user" />);

		// Open input form
		fireEvent.click(screen.getByText("🙏 Thanks"));

		// Switch to voice mode (triggers autoStart)
		fireEvent.click(screen.getByLabelText("Switch to voice"));
		expect(capturedAutoStart).toBe(true);

		// Simulate recording starting (which should reset autoStart)
		act(() => {
			capturedOnRecordingStateChange?.(true);
		});

		// autoStart should now be false
		expect(capturedAutoStart).toBe(false);
	});
});
