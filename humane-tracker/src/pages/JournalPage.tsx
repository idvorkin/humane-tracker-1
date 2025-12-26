import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import {
	type AffirmationLog,
	affirmationLogRepository,
} from "../repositories/affirmationLogRepository";
import {
	type AudioRecording,
	audioRecordingRepository,
} from "../repositories/audioRecordingRepository";
import { toDateString } from "../repositories/types";
import { formatDurationMs } from "../utils/dateUtils";
import "./JournalPage.css";

interface JournalPageProps {
	userId: string;
}

// Unified journal entry type
type JournalEntry =
	| { type: "voice"; data: AudioRecording }
	| { type: "text"; data: AffirmationLog };

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
		hour: "numeric",
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

// Nested grouping: date -> context -> affirmationTitle -> entries
type TitleGroup = Map<string, JournalEntry[]>;
type ContextGroup = Map<string, TitleGroup>;
type DateGroup = Map<string, ContextGroup>;

function getEntryContext(entry: JournalEntry): string {
	return entry.type === "voice"
		? entry.data.recordingContext
		: entry.data.logType;
}

function getEntryTitle(entry: JournalEntry): string {
	return entry.data.affirmationTitle;
}

function getEntryDate(entry: JournalEntry): Date {
	return entry.data.date;
}

function getEntryCreatedAt(entry: JournalEntry): Date {
	return entry.data.createdAt;
}

function groupEntries(entries: JournalEntry[]): DateGroup {
	const groups: DateGroup = new Map();

	// Sort by createdAt descending (newest first)
	const sorted = [...entries].sort(
		(a, b) => getEntryCreatedAt(b).getTime() - getEntryCreatedAt(a).getTime(),
	);

	for (const entry of sorted) {
		const dateKey = toDateString(getEntryDate(entry));
		if (!groups.has(dateKey)) {
			groups.set(dateKey, new Map());
		}
		const contextGroups = groups.get(dateKey)!;

		const contextKey = getEntryContext(entry);
		if (!contextGroups.has(contextKey)) {
			contextGroups.set(contextKey, new Map());
		}
		const titleGroups = contextGroups.get(contextKey)!;

		const titleKey = getEntryTitle(entry);
		const existing = titleGroups.get(titleKey) || [];
		existing.push(entry);
		titleGroups.set(titleKey, existing);
	}

	return groups;
}

export function JournalPage({ userId }: JournalPageProps) {
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	// Collapse state for each level - stores collapsed keys
	const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
	const [collapsedContexts, setCollapsedContexts] = useState<Set<string>>(
		new Set(),
	);
	const [collapsedTitles, setCollapsedTitles] = useState<Set<string>>(
		new Set(),
	);

	const toggleDate = (dateKey: string) => {
		setCollapsedDates((prev) => {
			const next = new Set(prev);
			if (next.has(dateKey)) {
				next.delete(dateKey);
			} else {
				next.add(dateKey);
			}
			return next;
		});
	};

	const toggleContext = (key: string) => {
		setCollapsedContexts((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const toggleTitle = (key: string) => {
		setCollapsedTitles((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const loadEntries = useCallback(async () => {
		try {
			setError(null);
			// Load both recordings and text logs in parallel
			const [recordings, logs] = await Promise.all([
				audioRecordingRepository.getByUserId(userId),
				affirmationLogRepository.getByUserId(userId),
			]);

			// Convert to unified JournalEntry type
			const voiceEntries: JournalEntry[] = recordings.map((r) => ({
				type: "voice" as const,
				data: r,
			}));
			const textEntries: JournalEntry[] = logs.map((l) => ({
				type: "text" as const,
				data: l,
			}));

			setEntries([...voiceEntries, ...textEntries]);
		} catch (err) {
			console.error("Failed to load journal entries:", err);
			setError("Failed to load journal entries");
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		loadEntries();
	}, [loadEntries]);

	const handleDeleteRecording = useCallback(async (id: string) => {
		if (!window.confirm("Delete this recording? This cannot be undone.")) {
			return;
		}

		setDeleteError(null);
		try {
			await audioRecordingRepository.delete(id);
			setEntries((prev) =>
				prev.filter((e) => !(e.type === "voice" && e.data.id === id)),
			);
		} catch (err) {
			console.error("Failed to delete recording:", err);
			setDeleteError("Failed to delete recording. Please try again.");
		}
	}, []);

	const handleDeleteNote = useCallback(async (id: string) => {
		if (!window.confirm("Delete this note? This cannot be undone.")) {
			return;
		}

		setDeleteError(null);
		try {
			await affirmationLogRepository.delete(id);
			setEntries((prev) =>
				prev.filter((e) => !(e.type === "text" && e.data.id === id)),
			);
		} catch (err) {
			console.error("Failed to delete note:", err);
			setDeleteError("Failed to delete note. Please try again.");
		}
	}, []);

	const groupedEntries = groupEntries(entries);

	return (
		<div className="journal-page">
			<header className="journal-header">
				<Link to="/" className="journal-back">
					{"\u2190"} Back
				</Link>
				<h1 className="journal-title">Journal</h1>
			</header>

			<main className="journal-content">
				{loading && <div className="journal-loading">Loading...</div>}

				{error && <div className="journal-error">{error}</div>}

				{deleteError && (
					<div className="journal-error">
						{deleteError}
						<button
							type="button"
							className="journal-error-dismiss"
							onClick={() => setDeleteError(null)}
							aria-label="Dismiss error"
						>
							×
						</button>
					</div>
				)}

				{!loading && !error && entries.length === 0 && (
					<div className="journal-empty">
						<p>No journal entries yet.</p>
						<p className="journal-empty-hint">
							Use the affirmation or grateful cards to record your thoughts.
						</p>
					</div>
				)}

				{!loading &&
					!error &&
					Array.from(groupedEntries.entries()).map(
						([dateKey, contextGroups]) => {
							// Get first entry from any context to get the date
							const firstTitleGroup = Array.from(
								Array.from(contextGroups.values())[0]?.values() || [],
							)[0];
							const dateForDisplay = firstTitleGroup?.[0]
								? getEntryDate(firstTitleGroup[0])
								: null;
							if (!dateForDisplay) return null;

							const isDateCollapsed = collapsedDates.has(dateKey);

							return (
								<section key={dateKey} className="journal-date-group">
									<button
										type="button"
										className="journal-date-header journal-collapse-btn"
										onClick={() => toggleDate(dateKey)}
									>
										<span
											className={`journal-collapse-icon ${isDateCollapsed ? "collapsed" : ""}`}
										>
											▼
										</span>
										{formatDate(dateForDisplay)}
									</button>
									{!isDateCollapsed &&
										CONTEXT_ORDER.filter((ctx) => contextGroups.has(ctx)).map(
											(contextKey) => {
												const contextCollapseKey = `${dateKey}-${contextKey}`;
												const isContextCollapsed =
													collapsedContexts.has(contextCollapseKey);
												const titleGroups = contextGroups.get(contextKey)!;
												return (
													<div
														key={contextKey}
														className="journal-context-group"
													>
														<button
															type="button"
															className="journal-context-header journal-collapse-btn"
															onClick={() => toggleContext(contextCollapseKey)}
														>
															<span
																className={`journal-collapse-icon ${isContextCollapsed ? "collapsed" : ""}`}
															>
																▼
															</span>
															{CONTEXT_LABELS[contextKey] || contextKey}
														</button>
														{!isContextCollapsed && (
															<ul className="journal-list">
																{Array.from(titleGroups.entries()).map(
																	([title, titleEntries]) => {
																		const titleCollapseKey = `${dateKey}-${contextKey}-${title}`;
																		const isTitleCollapsed =
																			collapsedTitles.has(titleCollapseKey);
																		return (
																			<li key={title} className="journal-item">
																				<button
																					type="button"
																					className="journal-item-title journal-collapse-btn"
																					onClick={() =>
																						toggleTitle(titleCollapseKey)
																					}
																				>
																					<span
																						className={`journal-collapse-icon ${isTitleCollapsed ? "collapsed" : ""}`}
																					>
																						▼
																					</span>
																					{title}
																					<span className="journal-item-count">
																						({titleEntries.length})
																					</span>
																				</button>
																				{!isTitleCollapsed && (
																					<div className="journal-item-entries">
																						{/* Voice recordings grouped on one line */}
																						{titleEntries.some(
																							(e) => e.type === "voice",
																						) && (
																							<div className="journal-voice-row">
																								{titleEntries
																									.filter(
																										(e) => e.type === "voice",
																									)
																									.map((entry) => (
																										<div
																											key={entry.data.id}
																											className="journal-entry journal-entry-voice"
																										>
																											<AudioPlayer
																												blob={
																													(
																														entry.data as AudioRecording
																													).audioBlob
																												}
																												mimeType={
																													(
																														entry.data as AudioRecording
																													).mimeType
																												}
																												onDelete={() =>
																													handleDeleteRecording(
																														entry.data.id,
																													)
																												}
																												compact
																												compactLabel={formatDurationMs(
																													(
																														entry.data as AudioRecording
																													).durationMs,
																												)}
																											/>
																										</div>
																									))}
																							</div>
																						)}
																						{/* Text notes below */}
																						{titleEntries
																							.filter((e) => e.type === "text")
																							.map((entry) => (
																								<div
																									key={entry.data.id}
																									className="journal-entry journal-entry-text"
																								>
																									<span className="journal-note-icon">
																										📝
																									</span>
																									<span className="journal-note-content">
																										{
																											(
																												entry.data as AffirmationLog
																											).note
																										}
																									</span>
																									<span className="journal-note-time">
																										{formatTime(
																											entry.data.createdAt,
																										)}
																									</span>
																									<button
																										type="button"
																										className="journal-note-delete"
																										onClick={() =>
																											handleDeleteNote(
																												entry.data.id,
																											)
																										}
																										aria-label="Delete note"
																									>
																										×
																									</button>
																								</div>
																							))}
																					</div>
																				)}
																			</li>
																		);
																	},
																)}
															</ul>
														)}
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
