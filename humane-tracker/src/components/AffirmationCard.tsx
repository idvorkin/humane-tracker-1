import { useCallback, useState } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import "./AffirmationCard.css";

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
	const affirmation = DEFAULT_AFFIRMATIONS[index];

	const handleRefresh = useCallback(() => {
		setIndex((prev) => getRandomIndex(prev));
		setNoteMode(null);
		setNoteText("");
		setSaveError(false);
	}, []);

	const handleSaveNote = useCallback(async () => {
		if (!noteText.trim() || !noteMode) {
			setNoteMode(null);
			return;
		}
		setSaveError(false);
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
	}, [noteMode, noteText, affirmation.title, userId]);

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
				<span className="affirmation-card-subtitle">{affirmation.subtitle}</span>
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
						✕
					</button>
					{saveError && (
						<span className="affirmation-error">Failed to save</span>
					)}
				</div>
			)}
		</div>
	);
}
