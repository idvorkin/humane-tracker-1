import { useCallback, useEffect } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { formatDurationMs } from "../utils/dateUtils";
import "./AudioRecorderButton.css";

interface AudioRecorderButtonProps {
	onRecordingComplete: (blob: Blob, durationMs: number) => void;
	onRecordingStateChange?: (isRecording: boolean) => void;
	onError?: (error: string) => void;
	disabled?: boolean;
	stopRecordingRef?: React.MutableRefObject<(() => Promise<void>) | null>;
	cancelRecordingRef?: React.MutableRefObject<(() => void) | null>;
}

export function AudioRecorderButton({
	onRecordingComplete,
	onRecordingStateChange,
	onError,
	disabled = false,
	stopRecordingRef,
	cancelRecordingRef,
}: AudioRecorderButtonProps) {
	const {
		isRecording,
		durationMs,
		error,
		isSupported,
		permissionState,
		startRecording,
		stopRecording,
		cancelRecording,
	} = useAudioRecorder();

	// Notify parent of recording state changes
	useEffect(() => {
		onRecordingStateChange?.(isRecording);
	}, [isRecording, onRecordingStateChange]);

	const handleStartStop = useCallback(async () => {
		if (isRecording) {
			const result = await stopRecording();
			if (result) {
				onRecordingComplete(result.blob, result.durationMs);
			}
		} else {
			await startRecording();
		}
	}, [isRecording, startRecording, stopRecording, onRecordingComplete]);

	// Expose stop function to parent via ref
	useEffect(() => {
		if (stopRecordingRef) {
			stopRecordingRef.current = isRecording
				? async () => {
						const result = await stopRecording();
						if (result) {
							onRecordingComplete(result.blob, result.durationMs);
						}
					}
				: null;
		}
	}, [isRecording, stopRecording, onRecordingComplete, stopRecordingRef]);

	// Expose cancel function to parent via ref (stops recording without saving)
	useEffect(() => {
		if (cancelRecordingRef) {
			cancelRecordingRef.current = isRecording ? cancelRecording : null;
		}
	}, [isRecording, cancelRecording, cancelRecordingRef]);

	// Report errors to parent via useEffect to avoid side effects during render
	useEffect(() => {
		if (error && onError) {
			onError(error);
		}
	}, [error, onError]);

	if (!isSupported) {
		return (
			<div className="audio-recorder-unsupported">Recording not available</div>
		);
	}

	if (permissionState === "denied" && !isRecording) {
		return (
			<button
				type="button"
				className="audio-recorder-button audio-recorder-denied"
				onClick={handleStartStop}
				disabled={disabled}
				title="Microphone access denied. Click to try again."
			>
				<span className="audio-recorder-icon">!</span>
			</button>
		);
	}

	return (
		<div className="audio-recorder-wrapper">
			<button
				type="button"
				className={`audio-recorder-button ${isRecording ? "recording" : ""}`}
				onClick={handleStartStop}
				disabled={disabled}
				title={isRecording ? "Stop and save" : "Record audio"}
			>
				<span className="audio-recorder-icon">
					{isRecording ? (
						<span className="audio-recorder-stop-icon" />
					) : (
						<svg
							viewBox="0 0 24 24"
							width="20"
							height="20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
						</svg>
					)}
				</span>
			</button>
			{isRecording && (
				<span className="audio-recorder-duration">
					{formatDurationMs(durationMs)}
				</span>
			)}
		</div>
	);
}
