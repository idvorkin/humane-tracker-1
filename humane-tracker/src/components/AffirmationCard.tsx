import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import "./AffirmationCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";
import { TallyMarks } from "./TallyMarks";

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
	const [showSelector, setShowSelector] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
	const affirmation = DEFAULT_AFFIRMATIONS[index];

	// Get today's affirmation log counts (reactive)
	const todayLogs = useLiveQuery(
		() => affirmationLogRepository.getByUserIdAndDate(userId, new Date()),
		[userId],
	);

	// Count per affirmation for the selector
	const countsPerAffirmation = useMemo(() => {
		if (!todayLogs) return new Map<string, number>();
		const counts = new Map<string, number>();
		for (const log of todayLogs) {
			counts.set(
				log.affirmationTitle,
				(counts.get(log.affirmationTitle) || 0) + 1,
			);
		}
		return counts;
	}, [todayLogs]);

	const todayCounts = useMemo(() => {
		if (!todayLogs) return { opportunity: 0, didit: 0 };
		// Filter by current affirmation title
		const forThisAffirmation = todayLogs.filter(
			(l) => l.affirmationTitle === affirmation.title,
		);
		return {
			opportunity: forThisAffirmation.filter((l) => l.logType === "opportunity")
				.length,
			didit: forThisAffirmation.filter((l) => l.logType === "didit").length,
		};
	}, [todayLogs, affirmation.title]);

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
				<button
					type="button"
					className="affirmation-refresh"
					onClick={handleRefresh}
					aria-label="Show different affirmation"
				>
					↻
				</button>
			</div>

			{showSelector && (
				<div className="affirmation-selector">
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
