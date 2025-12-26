import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioRecorderButton } from "./AudioRecorderButton";

// Mock the useAudioRecorder hook
vi.mock("../hooks/useAudioRecorder", () => ({
	useAudioRecorder: vi.fn(),
}));

import { useAudioRecorder } from "../hooks/useAudioRecorder";

const mockUseAudioRecorder = vi.mocked(useAudioRecorder);

describe("AudioRecorderButton", () => {
	const mockOnRecordingComplete = vi.fn();
	const mockOnRecordingStateChange = vi.fn();
	const mockOnError = vi.fn();

	const defaultHookState = {
		isRecording: false,
		isPaused: false,
		durationMs: 0,
		error: null,
		isSupported: true,
		permissionState: "prompt" as const,
		startRecording: vi.fn(),
		stopRecording: vi.fn(),
		pauseRecording: vi.fn(),
		resumeRecording: vi.fn(),
		cancelRecording: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAudioRecorder.mockReturnValue(defaultHookState);
	});

	it("renders mic button when not recording", () => {
		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		const button = screen.getByRole("button", { name: /record audio/i });
		expect(button).toBeInTheDocument();
	});

	it("shows unsupported message when audio recording is not supported", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isSupported: false,
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		expect(screen.getByText(/recording not available/i)).toBeInTheDocument();
	});

	it("shows denied button when permission is denied", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			permissionState: "denied",
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		// The denied button has a title explaining the denied state
		const button = screen.getByTitle(/microphone access denied/i);
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("audio-recorder-denied");
	});

	it("starts recording when mic button is clicked", async () => {
		const startRecording = vi.fn();
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			startRecording,
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		const button = screen.getByRole("button", { name: /record audio/i });
		fireEvent.click(button);

		expect(startRecording).toHaveBeenCalled();
	});

	it("shows recording controls when recording", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isRecording: true,
			durationMs: 5000,
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		// Check for timer display
		expect(screen.getByText("0:05")).toBeInTheDocument();

		// Check for stop button
		expect(screen.getByTitle("Stop and save")).toBeInTheDocument();
	});

	it("calls stopRecording and onRecordingComplete when stop is clicked", async () => {
		const mockBlob = new Blob(["test"], { type: "audio/webm" });
		const stopRecording = vi
			.fn()
			.mockResolvedValue({ blob: mockBlob, durationMs: 5000 });

		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isRecording: true,
			stopRecording,
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		const stopButton = screen.getByTitle("Stop and save");
		fireEvent.click(stopButton);

		await waitFor(() => {
			expect(stopRecording).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(mockOnRecordingComplete).toHaveBeenCalledWith(mockBlob, 5000);
		});
	});

	it("calls onRecordingStateChange when recording state changes", () => {
		const { rerender } = render(
			<AudioRecorderButton
				onRecordingComplete={mockOnRecordingComplete}
				onRecordingStateChange={mockOnRecordingStateChange}
			/>,
		);

		// Initial state is not recording
		expect(mockOnRecordingStateChange).toHaveBeenCalledWith(false);

		// Simulate recording starting
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isRecording: true,
		});

		rerender(
			<AudioRecorderButton
				onRecordingComplete={mockOnRecordingComplete}
				onRecordingStateChange={mockOnRecordingStateChange}
			/>,
		);

		expect(mockOnRecordingStateChange).toHaveBeenCalledWith(true);
	});

	it("calls onError when error occurs", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			error: "Microphone access denied",
		});

		render(
			<AudioRecorderButton
				onRecordingComplete={mockOnRecordingComplete}
				onError={mockOnError}
			/>,
		);

		expect(mockOnError).toHaveBeenCalledWith("Microphone access denied");
	});

	it("disables button when disabled prop is true", () => {
		render(
			<AudioRecorderButton
				onRecordingComplete={mockOnRecordingComplete}
				disabled={true}
			/>,
		);

		const button = screen.getByRole("button", { name: /record audio/i });
		expect(button).toBeDisabled();
	});

	it("formats duration correctly in recording state", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isRecording: true,
			durationMs: 125000, // 2 minutes 5 seconds
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		expect(screen.getByText("2:05")).toBeInTheDocument();
	});

	it("shows recording state when actively recording", () => {
		mockUseAudioRecorder.mockReturnValue({
			...defaultHookState,
			isRecording: true,
		});

		render(
			<AudioRecorderButton onRecordingComplete={mockOnRecordingComplete} />,
		);

		const recordingButton = document.querySelector(
			".audio-recorder-button.recording",
		);
		expect(recordingButton).toBeInTheDocument();
	});
});
