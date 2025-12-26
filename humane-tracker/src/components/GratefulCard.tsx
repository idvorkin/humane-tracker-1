import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./GratefulCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";
import { TallyMarks } from "./TallyMarks";

interface GratefulCardProps {
	userId: string;
}

export function GratefulCard({ userId }: GratefulCardProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

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
