import { useCallback, useEffect, useRef, useState } from "react";

export type PermissionState = "prompt" | "granted" | "denied" | "unknown";

export interface UseAudioRecorderResult {
	// State
	isRecording: boolean;
	isPaused: boolean;
	durationMs: number;
	error: string | null;
	isSupported: boolean;
	permissionState: PermissionState;

	// Actions
	startRecording: () => Promise<void>;
	stopRecording: () => Promise<{ blob: Blob; durationMs: number } | null>;
	pauseRecording: () => void;
	resumeRecording: () => void;
	cancelRecording: () => void;
}

// 5 minutes max recording duration
const MAX_DURATION_MS = 5 * 60 * 1000;
const DURATION_INTERVAL_MS = 100;

/**
 * Hook for audio recording using MediaRecorder API.
 * Handles permission requests, duration tracking, and 5-minute limit.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [durationMs, setDurationMs] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [permissionState, setPermissionState] =
		useState<PermissionState>("unknown");

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);
	const startTimeRef = useRef<number>(0);
	const pausedDurationRef = useRef<number>(0);
	const intervalRef = useRef<number | null>(null);

	// Check if MediaRecorder is supported
	const isSupported =
		typeof window !== "undefined" &&
		typeof navigator !== "undefined" &&
		"mediaDevices" in navigator &&
		"getUserMedia" in navigator.mediaDevices &&
		typeof MediaRecorder !== "undefined";

	// Check permission state on mount
	useEffect(() => {
		let permissionResult: PermissionStatus | null = null;
		let handleChange: (() => void) | null = null;

		async function checkPermission() {
			if (!isSupported) {
				setPermissionState("unknown");
				return;
			}

			try {
				// navigator.permissions.query may not be available in all browsers
				if (navigator.permissions?.query) {
					permissionResult = await navigator.permissions.query({
						name: "microphone" as PermissionName,
					});
					setPermissionState(permissionResult.state as PermissionState);

					// Listen for permission changes
					handleChange = () => {
						if (permissionResult) {
							setPermissionState(permissionResult.state as PermissionState);
						}
					};
					permissionResult.addEventListener("change", handleChange);
				}
			} catch {
				// permissions.query not supported, state remains unknown until we try
				setPermissionState("unknown");
			}
		}

		checkPermission();

		// Cleanup listener on unmount
		return () => {
			if (permissionResult && handleChange) {
				permissionResult.removeEventListener("change", handleChange);
			}
		};
	}, [isSupported]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
			if (streamRef.current) {
				for (const track of streamRef.current.getTracks()) {
					track.stop();
				}
			}
		};
	}, []);

	const stopDurationTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const startDurationTimer = useCallback(() => {
		stopDurationTimer();
		intervalRef.current = window.setInterval(() => {
			const elapsed =
				Date.now() - startTimeRef.current + pausedDurationRef.current;
			setDurationMs(elapsed);

			// Auto-stop at max duration
			if (elapsed >= MAX_DURATION_MS) {
				if (mediaRecorderRef.current?.state === "recording") {
					mediaRecorderRef.current.stop();
				}
			}
		}, DURATION_INTERVAL_MS);
	}, [stopDurationTimer]);

	const cleanup = useCallback(() => {
		stopDurationTimer();
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
		}
		mediaRecorderRef.current = null;
		chunksRef.current = [];
		setIsRecording(false);
		setIsPaused(false);
	}, [stopDurationTimer]);

	const startRecording = useCallback(async () => {
		if (!isSupported) {
			setError("Audio recording is not supported on this device");
			return;
		}

		setError(null);
		chunksRef.current = [];
		pausedDurationRef.current = 0;
		setDurationMs(0);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
				},
			});
			streamRef.current = stream;
			setPermissionState("granted");

			// Determine the best supported audio format
			let mimeType = "audio/webm;codecs=opus";
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = "audio/webm";
				if (!MediaRecorder.isTypeSupported(mimeType)) {
					mimeType = "audio/mp4";
					if (!MediaRecorder.isTypeSupported(mimeType)) {
						// Fallback to default
						mimeType = "";
					}
				}
			}

			const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
			const mediaRecorder = new MediaRecorder(stream, options);
			mediaRecorderRef.current = mediaRecorder;

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onerror = () => {
				setError("Recording failed");
				cleanup();
			};

			mediaRecorder.start(1000); // Collect data every second
			startTimeRef.current = Date.now();
			setIsRecording(true);
			setIsPaused(false);
			startDurationTimer();
		} catch (err) {
			if (err instanceof Error) {
				if (
					err.name === "NotAllowedError" ||
					err.name === "PermissionDeniedError"
				) {
					setPermissionState("denied");
					setError(
						"Microphone access denied. Please enable microphone permissions in your browser settings.",
					);
				} else if (
					err.name === "NotFoundError" ||
					err.name === "DevicesNotFoundError"
				) {
					setError("No microphone found. Please connect a microphone.");
				} else {
					setError(`Failed to start recording: ${err.message}`);
				}
			} else {
				setError("Failed to start recording");
			}
			cleanup();
		}
	}, [isSupported, cleanup, startDurationTimer]);

	const stopRecording = useCallback(async (): Promise<{
		blob: Blob;
		durationMs: number;
	} | null> => {
		return new Promise((resolve) => {
			const mediaRecorder = mediaRecorderRef.current;
			if (!mediaRecorder || mediaRecorder.state === "inactive") {
				cleanup();
				resolve(null);
				return;
			}

			const finalDurationMs =
				Date.now() - startTimeRef.current + pausedDurationRef.current;

			mediaRecorder.onstop = () => {
				const mimeType = mediaRecorder.mimeType || "audio/webm";
				const blob = new Blob(chunksRef.current, { type: mimeType });
				cleanup();
				resolve({ blob, durationMs: finalDurationMs });
			};

			mediaRecorder.stop();
		});
	}, [cleanup]);

	const pauseRecording = useCallback(() => {
		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder?.state === "recording") {
			mediaRecorder.pause();
			stopDurationTimer();
			pausedDurationRef.current =
				Date.now() - startTimeRef.current + pausedDurationRef.current;
			setIsPaused(true);
		}
	}, [stopDurationTimer]);

	const resumeRecording = useCallback(() => {
		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder?.state === "paused") {
			mediaRecorder.resume();
			startTimeRef.current = Date.now();
			startDurationTimer();
			setIsPaused(false);
		}
	}, [startDurationTimer]);

	const cancelRecording = useCallback(() => {
		cleanup();
		setDurationMs(0);
		setError(null);
	}, [cleanup]);

	return {
		isRecording,
		isPaused,
		durationMs,
		error,
		isSupported,
		permissionState,
		startRecording,
		stopRecording,
		pauseRecording,
		resumeRecording,
		cancelRecording,
	};
}
