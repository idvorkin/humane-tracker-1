import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./GratefulCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";
import { TallyMarks } from "./TallyMarks";

type InputMode = "voice" | "text";

interface GratefulCardProps {
	userId: string;
}

export function GratefulCard({ userId }: GratefulCardProps) {
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [inputMode, setInputMode] = useState<InputMode>("text");
	const [autoStartRecording, setAutoStartRecording] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
	const cancelRecordingRef = useRef<(() => void) | null>(null);

	// Reset input mode when card opens (mobile = voice, desktop = text)
	useEffect(() => {
		if (isOpen) {
			setInputMode(isMobile ? "voice" : "text");
		}
	}, [isOpen, isMobile]);

	// Get today's grateful recording count (reactive)
	const todayRecordings = useLiveQuery(
		() => audioRecordingRepository.getByUserIdAndDate(userId, new Date()),
		[userId],
	);

	// Get today's grateful text notes count (reactive)
	const todayLogs = useLiveQuery(
		() => affirmationLogRepository.getByUserIdAndDate(userId, new Date()),
		[userId],
	);

	const todayGratefulCount = useMemo(() => {
		const audioCount = todayRecordings
			? todayRecordings.filter((r) => r.recordingContext === "grateful").length
			: 0;
		const textCount = todayLogs
			? todayLogs.filter((l) => l.logType === "grateful").length
			: 0;
		return audioCount + textCount;
	}, [todayRecordings, todayLogs]);

	const handleRecordingComplete = useCallback(
		async (blob: Blob, durationMs: number) => {
			try {
				await audioRecordingRepository.create({
					userId,
					audioBlob: blob,
					mimeType: blob.type || "audio/webm",
					durationMs,
					affirmationTitle: "Grateful",
					recordingContext: "grateful",
					date: new Date(),
					transcriptionStatus: "pending",
				});
				// Auto-close after saving recording
				setIsOpen(false);
				setNoteText("");
			} catch (error) {
				console.error("Failed to save audio recording:", error);
				setSaveError(true);
			}
		},
		[userId],
	);

	const handleSave = useCallback(async () => {
		setSaveError(false);

		// If recording, stop and save it
		if (isRecording && stopRecordingRef.current) {
			await stopRecordingRef.current();
			return; // handleRecordingComplete will close
		}

		// Just close if no text
		if (!noteText.trim()) {
			setIsOpen(false);
			return;
		}

		// Save text note using affirmationLogRepository with "grateful" logType
		try {
			await affirmationLogRepository.create({
				userId,
				affirmationTitle: "Grateful",
				logType: "grateful",
				note: noteText.trim(),
				date: new Date(),
			});
			setIsOpen(false);
			setNoteText("");
		} catch (error) {
			console.error("Failed to save grateful note:", error);
			setSaveError(true);
		}
	}, [noteText, isRecording, userId]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSave();
			} else if (e.key === "Escape") {
				setIsOpen(false);
				setNoteText("");
			}
		},
		[handleSave],
	);

	return (
		<div className="grateful-card">
			<div className="grateful-header">
				<span className="grateful-card-title">Grateful</span>
				<TallyMarks count={todayGratefulCount} />
				{!isOpen && (
					<button
						type="button"
						className="grateful-action grateful-action-compact"
						onClick={() => setIsOpen(true)}
					>
						🙏 Thanks
					</button>
				)}
			</div>
			<div className="grateful-subtitle-row">
				<span className="grateful-card-subtitle">
					What are you grateful for today?
				</span>
			</div>

			{isOpen && (
				<div className="grateful-input-container">
					<button
						type="button"
						className="grateful-input-dismiss"
						onClick={() => {
							if (isRecording) {
								// Cancel recording without saving
								cancelRecordingRef.current?.();
							}
							setIsOpen(false);
							setNoteText("");
							setSaveError(false);
						}}
						aria-label="Cancel"
					>
						<svg
							viewBox="0 0 24 24"
							width="18"
							height="18"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>

					{inputMode === "text" ? (
						<div className="grateful-text-input">
							<textarea
								placeholder="I'm grateful for..."
								value={noteText}
								onChange={(e) => {
									setNoteText(e.target.value);
									setSaveError(false);
								}}
								onKeyDown={handleKeyDown}
								autoFocus
								rows={1}
							/>
							<button
								type="button"
								className="grateful-send-btn"
								onClick={handleSave}
								disabled={!noteText.trim()}
								aria-label="Send"
							>
								<svg
									viewBox="0 0 24 24"
									width="20"
									height="20"
									fill="currentColor"
								>
									<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
								</svg>
							</button>
						</div>
					) : (
						<div className="grateful-voice-input">
							<AudioRecorderButton
								onRecordingComplete={handleRecordingComplete}
								onRecordingStateChange={(recording) => {
									setIsRecording(recording);
									// Reset auto-start flag once recording actually starts
									if (recording) {
										setAutoStartRecording(false);
									}
								}}
								stopRecordingRef={stopRecordingRef}
								cancelRecordingRef={cancelRecordingRef}
								autoStart={autoStartRecording}
								onError={(err) => {
									console.error("Recording error:", err);
									setSaveError(true);
								}}
							/>
						</div>
					)}

					<button
						type="button"
						className={`grateful-mode-switch ${isRecording ? "disabled" : ""}`}
						onClick={() => {
							if (isRecording) return;
							const switchingToVoice = inputMode === "text";
							setInputMode(switchingToVoice ? "voice" : "text");
							setAutoStartRecording(switchingToVoice);
						}}
						aria-label={
							inputMode === "text" ? "Switch to voice" : "Switch to text"
						}
					>
						{inputMode === "text" ? (
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								fill="currentColor"
							>
								<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
							</svg>
						) : (
							<svg
								viewBox="0 0 24 24"
								width="18"
								height="18"
								fill="currentColor"
							>
								<path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
							</svg>
						)}
					</button>

					{saveError && <span className="grateful-error">Failed to save</span>}
				</div>
			)}
		</div>
	);
}
