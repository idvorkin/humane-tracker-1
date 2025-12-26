import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { useIsMobile } from "../hooks/useIsMobile";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./AffirmationCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";
import { TallyMarks } from "./TallyMarks";

type InputMode = "voice" | "text";

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
	const isMobile = useIsMobile();
	const [index, setIndex] = useState(() => getRandomIndex());
	const [noteMode, setNoteMode] = useState<NoteMode>(null);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [showSelector, setShowSelector] = useState(false);
	const [inputMode, setInputMode] = useState<InputMode>("text");
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
	const cancelRecordingRef = useRef<(() => void) | null>(null);
	const affirmation = DEFAULT_AFFIRMATIONS[index];

	// Reset input mode when noteMode opens (mobile = voice, desktop = text)
	useEffect(() => {
		if (noteMode !== null) {
			setInputMode(isMobile ? "voice" : "text");
		}
	}, [noteMode, isMobile]);

	// Get today's affirmation log counts (reactive)
	const todayLogs = useLiveQuery(
		() => affirmationLogRepository.getByUserIdAndDate(userId, new Date()),
		[userId],
	);

	// Get today's audio recordings (reactive)
	const todayRecordings = useLiveQuery(
		() => audioRecordingRepository.getByUserIdAndDate(userId, new Date()),
		[userId],
	);

	// Count per affirmation for the selector (includes both text logs and audio recordings)
	const countsPerAffirmation = useMemo(() => {
		const counts = new Map<string, number>();
		// Count text logs
		if (todayLogs) {
			for (const log of todayLogs) {
				counts.set(
					log.affirmationTitle,
					(counts.get(log.affirmationTitle) || 0) + 1,
				);
			}
		}
		// Count audio recordings (filter out "grateful" context)
		if (todayRecordings) {
			for (const rec of todayRecordings) {
				if (rec.recordingContext !== "grateful") {
					counts.set(
						rec.affirmationTitle,
						(counts.get(rec.affirmationTitle) || 0) + 1,
					);
				}
			}
		}
		return counts;
	}, [todayLogs, todayRecordings]);

	const todayCounts = useMemo(() => {
		// Count text logs for this affirmation
		const textLogs =
			todayLogs?.filter((l) => l.affirmationTitle === affirmation.title) || [];
		// Count audio recordings for this affirmation (filter out "grateful")
		const audioRecs =
			todayRecordings?.filter(
				(r) =>
					r.affirmationTitle === affirmation.title &&
					r.recordingContext !== "grateful",
			) || [];

		const opportunityText = textLogs.filter(
			(l) => l.logType === "opportunity",
		).length;
		const diditText = textLogs.filter((l) => l.logType === "didit").length;
		const opportunityAudio = audioRecs.filter(
			(r) => r.recordingContext === "opportunity",
		).length;
		const diditAudio = audioRecs.filter(
			(r) => r.recordingContext === "didit",
		).length;

		return {
			opportunity: opportunityText + opportunityAudio,
			didit: diditText + diditAudio,
		};
	}, [todayLogs, todayRecordings, affirmation.title]);

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
				<button
					type="button"
					className="affirmation-card-title affirmation-title-btn"
					onClick={() => setShowSelector(!showSelector)}
				>
					{affirmation.title} ▾
				</button>
				<TallyMarks count={todayCounts.opportunity + todayCounts.didit} />
				{noteMode === null && (
					<div className="affirmation-header-actions">
						<button
							type="button"
							className="affirmation-action affirmation-action-compact"
							onClick={() => setNoteMode("opportunity")}
						>
							🎯 Opp
						</button>
						<button
							type="button"
							className="affirmation-action affirmation-action-compact"
							onClick={() => setNoteMode("didit")}
						>
							✓ Did
						</button>
					</div>
				)}
			</div>

			{showSelector && (
				<div className="affirmation-selector">
					<button
						type="button"
						className="affirmation-selector-item affirmation-selector-random"
						onClick={() => {
							handleRefresh();
							setShowSelector(false);
						}}
					>
						<span className="affirmation-selector-title">↻ Random</span>
					</button>
					{DEFAULT_AFFIRMATIONS.map((aff, i) => {
						const count = countsPerAffirmation.get(aff.title) || 0;
						return (
							<button
								key={aff.title}
								type="button"
								className={`affirmation-selector-item ${i === index ? "selected" : ""}`}
								onClick={() => {
									setIndex(i);
									setShowSelector(false);
								}}
							>
								<span className="affirmation-selector-title">{aff.title}</span>
								<TallyMarks count={count} />
							</button>
						);
					})}
				</div>
			)}

			<div className="affirmation-subtitle-row">
				<span className="affirmation-card-subtitle">
					{affirmation.subtitle}
				</span>
			</div>

			{noteMode !== null && (
				<div className="affirmation-input-container">
					<button
						type="button"
						className="affirmation-input-dismiss"
						onClick={() => {
							if (isRecording) {
								// Cancel recording without saving
								cancelRecordingRef.current?.();
							}
							setNoteMode(null);
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
						<div className="affirmation-text-input">
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
								rows={1}
							/>
							<button
								type="button"
								className="affirmation-send-btn"
								onClick={handleSaveNote}
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
						<div className="affirmation-voice-input">
							<AudioRecorderButton
								onRecordingComplete={handleRecordingComplete}
								onRecordingStateChange={setIsRecording}
								stopRecordingRef={stopRecordingRef}
								cancelRecordingRef={cancelRecordingRef}
								onError={(err) => {
									console.error("Recording error:", err);
									setSaveError(true);
								}}
							/>
						</div>
					)}

					<button
						type="button"
						className={`affirmation-mode-switch ${isRecording ? "disabled" : ""}`}
						onClick={() =>
							!isRecording &&
							setInputMode(inputMode === "text" ? "voice" : "text")
						}
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

					{saveError && (
						<span className="affirmation-error">Failed to save</span>
					)}
				</div>
			)}
		</div>
	);
}
