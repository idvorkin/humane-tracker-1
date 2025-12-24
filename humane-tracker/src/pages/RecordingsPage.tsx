import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AudioPlayer } from "../components/AudioPlayer";
import {
	type AudioRecording,
	audioRecordingRepository,
} from "../repositories/audioRecordingRepository";
import { toDateString } from "../repositories/types";
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

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Group recordings by date
function groupByDate(
	recordings: AudioRecording[],
): Map<string, AudioRecording[]> {
	const groups = new Map<string, AudioRecording[]>();

	// Sort by createdAt descending (newest first)
	const sorted = [...recordings].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);

	for (const recording of sorted) {
		const dateKey = toDateString(recording.date);
		const existing = groups.get(dateKey) || [];
		existing.push(recording);
		groups.set(dateKey, existing);
	}

	return groups;
}

export function RecordingsPage({ userId }: RecordingsPageProps) {
	const [recordings, setRecordings] = useState<AudioRecording[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
		try {
			await audioRecordingRepository.delete(id);
			setRecordings((prev) => prev.filter((r) => r.id !== id));
		} catch (err) {
			console.error("Failed to delete recording:", err);
		}
	}, []);

	const groupedRecordings = groupByDate(recordings);

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
						([dateKey, dateRecordings]) => (
							<section key={dateKey} className="recordings-date-group">
								<h2 className="recordings-date-header">
									{formatDate(dateRecordings[0].date)}
								</h2>
								<ul className="recordings-list">
									{dateRecordings.map((recording) => (
										<li key={recording.id} className="recordings-item">
											<div className="recordings-item-row">
												<span className="recordings-item-affirmation">
													{recording.affirmationTitle}
												</span>
												<span className="recordings-item-meta">
													{formatTime(recording.createdAt)} ·{" "}
													{formatDuration(recording.durationMs)}
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
							</section>
						),
					)}
			</main>
		</div>
	);
}
