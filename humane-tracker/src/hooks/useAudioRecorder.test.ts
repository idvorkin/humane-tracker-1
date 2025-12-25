import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecorder } from "./useAudioRecorder";

// Mock MediaRecorder
class MockMediaRecorder {
	state: "inactive" | "recording" | "paused" = "inactive";
	mimeType = "audio/webm;codecs=opus";
	ondataavailable: ((event: { data: Blob }) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: (() => void) | null = null;

	static isTypeSupported(mimeType: string): boolean {
		return mimeType.startsWith("audio/webm");
	}

	start(_timeslice?: number): void {
		this.state = "recording";
	}

	stop(): void {
		this.state = "inactive";
		// Simulate data available
		if (this.ondataavailable) {
			this.ondataavailable({
				data: new Blob(["test audio data"], { type: this.mimeType }),
			});
		}
		// Call onstop synchronously for tests
		if (this.onstop) {
			this.onstop();
		}
	}

	pause(): void {
		this.state = "paused";
	}

	resume(): void {
		this.state = "recording";
	}
}

// Mock MediaStream
class MockMediaStream {
	private tracks: { stop: () => void }[] = [{ stop: vi.fn() }];

	getTracks() {
		return this.tracks;
	}
}

// Setup mocks before tests
function setupMocks() {
	Object.defineProperty(global, "navigator", {
		value: {
			mediaDevices: {
				getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
			},
			permissions: {
				query: vi.fn().mockResolvedValue({
					state: "prompt",
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				}),
			},
		},
		configurable: true,
		writable: true,
	});

	Object.defineProperty(global, "MediaRecorder", {
		value: MockMediaRecorder,
		configurable: true,
		writable: true,
	});
}

describe("useAudioRecorder", () => {
	beforeEach(() => {
		setupMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("initializes with correct default state", () => {
		const { result } = renderHook(() => useAudioRecorder());

		expect(result.current.isRecording).toBe(false);
		expect(result.current.isPaused).toBe(false);
		expect(result.current.durationMs).toBe(0);
		expect(result.current.error).toBeNull();
		expect(result.current.isSupported).toBe(true);
	});

	it("starts recording successfully", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(true);
		expect(result.current.isPaused).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("tracks duration while recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.durationMs).toBe(0);

		// Advance time by 500ms
		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		// Duration should have increased (with some tolerance for timing)
		expect(result.current.durationMs).toBeGreaterThan(0);
	});

	it("stops recording and returns blob", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			vi.advanceTimersByTime(1000);
		});

		let recordingResult: { blob: Blob; durationMs: number } | null | undefined;
		await act(async () => {
			recordingResult = await result.current.stopRecording();
			// Process the setTimeout in MockMediaRecorder.stop()
			vi.runAllTimers();
		});

		expect(recordingResult).toBeDefined();
		expect(recordingResult).not.toBeNull();
		// Use type assertion since we verified it's not null above
		const result2 = recordingResult as { blob: Blob; durationMs: number };
		expect(result2.blob).toBeInstanceOf(Blob);
		expect(result2.durationMs).toBeGreaterThan(0);
		expect(result.current.isRecording).toBe(false);
	});

	it("pauses and resumes recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isPaused).toBe(false);

		act(() => {
			result.current.pauseRecording();
		});

		expect(result.current.isPaused).toBe(true);
		expect(result.current.isRecording).toBe(true);

		act(() => {
			result.current.resumeRecording();
		});

		expect(result.current.isPaused).toBe(false);
		expect(result.current.isRecording).toBe(true);
	});

	it("cancels recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(true);

		act(() => {
			result.current.cancelRecording();
		});

		expect(result.current.isRecording).toBe(false);
		expect(result.current.durationMs).toBe(0);
		expect(result.current.error).toBeNull();
	});

	it("handles permission denied error", async () => {
		const permissionError = new Error("Permission denied");
		permissionError.name = "NotAllowedError";

		(
			navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(permissionError);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(false);
		expect(result.current.error).toContain("Microphone access denied");
		expect(result.current.permissionState).toBe("denied");
	});

	it("handles no microphone found error", async () => {
		const notFoundError = new Error("No device found");
		notFoundError.name = "NotFoundError";

		(
			navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce(notFoundError);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(false);
		expect(result.current.error).toContain("No microphone found");
	});

	it("returns null when stopping without active recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		let recordingResult: { blob: Blob; durationMs: number } | null = null;
		await act(async () => {
			recordingResult = await result.current.stopRecording();
		});

		expect(recordingResult).toBeNull();
	});

	describe("unsupported environments", () => {
		it("reports unsupported when MediaRecorder is not available", () => {
			// Remove MediaRecorder before rendering
			Object.defineProperty(global, "MediaRecorder", {
				value: undefined,
				configurable: true,
				writable: true,
			});

			const { result } = renderHook(() => useAudioRecorder());

			expect(result.current.isSupported).toBe(false);

			// Restore for other tests
			setupMocks();
		});

		it("sets error when starting on unsupported device", async () => {
			// Remove MediaRecorder before rendering
			Object.defineProperty(global, "MediaRecorder", {
				value: undefined,
				configurable: true,
				writable: true,
			});

			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			expect(result.current.error).toContain("not supported");

			// Restore for other tests
			setupMocks();
		});
	});
});
