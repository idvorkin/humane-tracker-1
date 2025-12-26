import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import {
	type AudioRecording,
	audioRecordingRepository,
} from "../repositories/audioRecordingRepository";
import { toDateString } from "../repositories/types";
import { formatDurationMs } from "../utils/dateUtils";
import "./RecordingsPage.css";

interface RecordingsPageProps {
	userId: string;
}

function formatDate(date: Date): string {
	return date.toLocaleDateString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Context display names and order
const CONTEXT_ORDER = ["opportunity", "didit", "grateful"] as const;
const CONTEXT_LABELS: Record<string, string> = {
	opportunity: "Opportunities",
	didit: "Did Its",
	grateful: "Gratitudes",
};

// Group recordings by date -> context
function groupByDateAndContext(
	recordings: AudioRecording[],
): Map<string, Map<string, AudioRecording[]>> {
	const groups = new Map<string, Map<string, AudioRecording[]>>();

	// Sort by createdAt descending (newest first)
	const sorted = [...recordings].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);

	for (const recording of sorted) {
		const dateKey = toDateString(recording.date);
		if (!groups.has(dateKey)) {
			groups.set(dateKey, new Map<string, AudioRecording[]>());
		}
		const dateGroup = groups.get(dateKey)!;
		const contextKey = recording.recordingContext;
		const existing = dateGroup.get(contextKey) || [];
		existing.push(recording);
		dateGroup.set(contextKey, existing);
	}

	return groups;
}

export function RecordingsPage({ userId }: RecordingsPageProps) {
	const [recordings, setRecordings] = useState<AudioRecording[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const loadRecordings = useCallback(async () => {
		try {
			setError(null);
			const data = await audioRecordingRepository.getByUserId(userId);
			setRecordings(data);
		} catch (err) {
			console.error("Failed to load recordings:", err);
			setError("Failed to load recordings");
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		loadRecordings();
	}, [loadRecordings]);

	const handleDelete = useCallback(async (id: string) => {
		// Confirm deletion since audio recordings cannot be recovered
		if (!window.confirm("Delete this recording? This cannot be undone.")) {
			return;
		}

		setDeleteError(null);
		try {
			await audioRecordingRepository.delete(id);
			setRecordings((prev) => prev.filter((r) => r.id !== id));
		} catch (err) {
			console.error("Failed to delete recording:", err);
			setDeleteError("Failed to delete recording. Please try again.");
		}
	}, []);

	const groupedRecordings = groupByDateAndContext(recordings);

	return (
		<div className="recordings-page">
			<header className="recordings-header">
				<Link to="/" className="recordings-back">
					{"\u2190"} Back
				</Link>
				<h1 className="recordings-title">Recordings</h1>
			</header>

			<main className="recordings-content">
				{loading && <div className="recordings-loading">Loading...</div>}

				{error && <div className="recordings-error">{error}</div>}

				{deleteError && (
					<div className="recordings-error">
						{deleteError}
						<button
							type="button"
							className="recordings-error-dismiss"
							onClick={() => setDeleteError(null)}
							aria-label="Dismiss error"
						>
							×
						</button>
					</div>
				)}

				{!loading && !error && recordings.length === 0 && (
					<div className="recordings-empty">
						<p>No recordings yet.</p>
						<p className="recordings-empty-hint">
							Use the microphone button when logging an affirmation to create
							recordings.
						</p>
					</div>
				)}

				{!loading &&
					!error &&
					Array.from(groupedRecordings.entries()).map(
						([dateKey, contextGroups]) => {
							// Get first recording from any context to get the date
							const firstContextRecordings = Array.from(
								contextGroups.values(),
							)[0];
							const dateForDisplay = firstContextRecordings?.[0]?.date;
							if (!dateForDisplay) return null;

							return (
								<section key={dateKey} className="recordings-date-group">
									<h2 className="recordings-date-header">
										{formatDate(dateForDisplay)}
									</h2>
									{CONTEXT_ORDER.filter((ctx) => contextGroups.has(ctx)).map(
										(contextKey) => {
											const contextRecordings = contextGroups.get(contextKey)!;
											return (
												<div
													key={contextKey}
													className="recordings-context-group"
												>
													<h3 className="recordings-context-header">
														{CONTEXT_LABELS[contextKey] || contextKey}
													</h3>
													<ul className="recordings-list">
														{contextRecordings.map((recording) => (
															<li
																key={recording.id}
																className="recordings-item"
															>
																<div className="recordings-item-row">
																	<span className="recordings-item-affirmation">
																		{recording.affirmationTitle}
																	</span>
																	<span className="recordings-item-meta">
																		{formatTime(recording.createdAt)} ·{" "}
																		{formatDurationMs(recording.durationMs)}
																	</span>
																</div>
																<AudioPlayer
																	blob={recording.audioBlob}
																	mimeType={recording.mimeType}
																	onDelete={() => handleDelete(recording.id)}
																/>
																{recording.transcriptionText && (
																	<div className="recordings-item-transcript">
																		{recording.transcriptionText}
																	</div>
																)}
															</li>
														))}
													</ul>
												</div>
											);
										},
									)}
								</section>
							);
						},
					)}
			</main>
		</div>
	);
}
