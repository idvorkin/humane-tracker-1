import { useCallback, useRef, useState } from "react";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./GratefulCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";

interface GratefulCardProps {
	userId: string;
}

export function GratefulCard({ userId }: GratefulCardProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

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

		// For text notes, save as audio recording with empty blob
		// (or we could use affirmationLogRepository - keeping it simple here)
		try {
			// Close without saving text for now - focus on audio
			setIsOpen(false);
			setNoteText("");
		} catch (error) {
			console.error("Failed to save grateful note:", error);
			setSaveError(true);
		}
	}, [noteText, isRecording]);

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
			</div>
			<div className="grateful-subtitle-row">
				<span className="grateful-card-subtitle">
					What are you grateful for today?
				</span>
			</div>

			{!isOpen ? (
				<div className="grateful-actions">
					<button
						type="button"
						className="grateful-action"
						onClick={() => setIsOpen(true)}
					>
						Record gratitude
					</button>
				</div>
			) : (
				<div className="grateful-note-input">
					<div
						className={`grateful-input-row ${isRecording ? "recording-active" : ""}`}
					>
						{!isRecording && (
							<textarea
								placeholder="I'm grateful for..."
								value={noteText}
								onChange={(e) => {
									setNoteText(e.target.value);
									setSaveError(false);
								}}
								onKeyDown={handleKeyDown}
								autoFocus
							/>
						)}
						<AudioRecorderButton
							onRecordingComplete={handleRecordingComplete}
							onRecordingStateChange={setIsRecording}
							stopRecordingRef={stopRecordingRef}
							onError={(err) => {
								console.error("Recording error:", err);
								setSaveError(true);
							}}
						/>
					</div>
					<div className="grateful-note-actions">
						<button
							type="button"
							className="grateful-save"
							onClick={handleSave}
						>
							Save
						</button>
						<button
							type="button"
							className="grateful-cancel"
							onClick={() => {
								setIsOpen(false);
								setNoteText("");
								setSaveError(false);
							}}
						>
							{"\u2715"}
						</button>
					</div>
					{saveError && <span className="grateful-error">Failed to save</span>}
				</div>
			)}
		</div>
	);
}
