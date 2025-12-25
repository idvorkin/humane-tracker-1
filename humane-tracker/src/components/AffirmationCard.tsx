import { useCallback, useRef, useState } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./AffirmationCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";

function getRandomIndex(currentIndex?: number): number {
	if (DEFAULT_AFFIRMATIONS.length <= 1) return 0;
	let newIndex: number;
	do {
		newIndex = Math.floor(Math.random() * DEFAULT_AFFIRMATIONS.length);
	} while (newIndex === currentIndex);
	return newIndex;
}

type NoteMode = null | "opportunity" | "didit";

interface AffirmationCardProps {
	userId: string;
}

export function AffirmationCard({ userId }: AffirmationCardProps) {
	const [index, setIndex] = useState(() => getRandomIndex());
	const [noteMode, setNoteMode] = useState<NoteMode>(null);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
	const affirmation = DEFAULT_AFFIRMATIONS[index];

	const handleRefresh = useCallback(() => {
		setIndex((prev) => getRandomIndex(prev));
		setNoteMode(null);
		setNoteText("");
		setSaveError(false);
	}, []);

	const handleRecordingComplete = useCallback(
		async (blob: Blob, durationMs: number) => {
			if (!noteMode) return;

			try {
				await audioRecordingRepository.create({
					userId,
					audioBlob: blob,
					mimeType: blob.type || "audio/webm",
					durationMs,
					affirmationTitle: affirmation.title,
					recordingContext: noteMode,
					date: new Date(),
					transcriptionStatus: "pending",
				});
				// Auto-close dialog after saving recording
				setNoteMode(null);
				setNoteText("");
			} catch (error) {
				console.error("Failed to save audio recording:", error);
				setSaveError(true);
			}
		},
		[noteMode, userId, affirmation.title],
	);

	const handleSaveNote = useCallback(async () => {
		setSaveError(false);

		// If recording, stop and save it
		if (isRecording && stopRecordingRef.current) {
			await stopRecordingRef.current();
			return; // handleRecordingComplete will close the dialog
		}

		// Save text note if there is one
		if (!noteText.trim() || !noteMode) {
			setNoteMode(null);
			return;
		}
		try {
			await affirmationLogRepository.create({
				userId,
				affirmationTitle: affirmation.title,
				logType: noteMode,
				note: noteText.trim(),
				date: new Date(),
			});
			setNoteMode(null);
			setNoteText("");
		} catch (error) {
			console.error("Failed to save affirmation log:", error);
			setSaveError(true);
			// Keep form open so user can retry
		}
	}, [noteMode, noteText, affirmation.title, userId, isRecording]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSaveNote();
			} else if (e.key === "Escape") {
				setNoteMode(null);
				setNoteText("");
			}
		},
		[handleSaveNote],
	);

	return (
		<div className="affirmation-card">
			<div className="affirmation-header">
				<span className="affirmation-card-title">{affirmation.title}</span>
				<button
					type="button"
					className="affirmation-refresh"
					onClick={handleRefresh}
					aria-label="Show different affirmation"
				>
					↻
				</button>
			</div>
			<div className="affirmation-subtitle-row">
				<span className="affirmation-card-subtitle">
					{affirmation.subtitle}
				</span>
			</div>

			{noteMode === null ? (
				<div className="affirmation-actions">
					<button
						type="button"
						className="affirmation-action"
						onClick={() => setNoteMode("opportunity")}
					>
						🎯 Opportunity
					</button>
					<button
						type="button"
						className="affirmation-action"
						onClick={() => setNoteMode("didit")}
					>
						✓ Did it
					</button>
				</div>
			) : (
				<div className="affirmation-note-input">
					<div
						className={`affirmation-input-row ${isRecording ? "recording-active" : ""}`}
					>
						{!isRecording && (
							<textarea
								placeholder={
									noteMode === "opportunity"
										? "How will you apply this today?"
										: "How did you apply this?"
								}
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
					<div className="affirmation-note-actions">
						<button
							type="button"
							className="affirmation-save"
							onClick={handleSaveNote}
						>
							Save
						</button>
						<button
							type="button"
							className="affirmation-cancel"
							onClick={() => {
								setNoteMode(null);
								setNoteText("");
								setSaveError(false);
							}}
						>
							{"\u2715"}
						</button>
					</div>
					{saveError && (
						<span className="affirmation-error">Failed to save</span>
					)}
				</div>
			)}
		</div>
	);
}
