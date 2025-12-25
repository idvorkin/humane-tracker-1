import { db } from "../config/db";
import {
	type AudioRecordingRecord,
	fromDateString,
	normalizeDate,
	type RecordingContext,
	type TranscriptionStatus,
	toDateString,
	toTimestamp,
} from "./types";

export interface AudioRecording {
	id: string;
	userId: string;
	audioBlob: Blob;
	mimeType: string;
	durationMs: number;
	affirmationTitle: string;
	recordingContext: RecordingContext;
	date: Date;
	createdAt: Date;
	transcriptionStatus: TranscriptionStatus;
	transcriptionText?: string;
	transcriptionError?: string;
}

function toAudioRecording(record: AudioRecordingRecord): AudioRecording {
	return {
		id: record.id,
		userId: record.userId,
		audioBlob: record.audioBlob,
		mimeType: record.mimeType,
		durationMs: record.durationMs,
		affirmationTitle: record.affirmationTitle,
		recordingContext: record.recordingContext,
		date: fromDateString(record.date),
		createdAt: normalizeDate(record.createdAt),
		transcriptionStatus: record.transcriptionStatus,
		transcriptionText: record.transcriptionText,
		transcriptionError: record.transcriptionError,
	};
}

const VALID_RECORDING_CONTEXTS: readonly RecordingContext[] = [
	"opportunity",
	"didit",
	"grateful",
];

const VALID_TRANSCRIPTION_STATUSES: readonly TranscriptionStatus[] = [
	"pending",
	"processing",
	"completed",
	"failed",
];

/**
 * Validate audio recording input fields.
 * @throws Error if any field is invalid
 * Exported for testing purposes.
 */
export function validateAudioRecording(
	recording: Omit<AudioRecording, "id" | "createdAt">,
): void {
	if (
		!recording.userId ||
		typeof recording.userId !== "string" ||
		!recording.userId.trim()
	) {
		throw new Error("validateAudioRecording: userId cannot be empty");
	}
	if (
		!recording.affirmationTitle ||
		typeof recording.affirmationTitle !== "string" ||
		!recording.affirmationTitle.trim()
	) {
		throw new Error("validateAudioRecording: affirmationTitle cannot be empty");
	}
	if (!VALID_RECORDING_CONTEXTS.includes(recording.recordingContext)) {
		throw new Error(
			`validateAudioRecording: recordingContext must be one of ${VALID_RECORDING_CONTEXTS.join(", ")}, got "${recording.recordingContext}"`,
		);
	}
	if (!(recording.audioBlob instanceof Blob)) {
		throw new Error("validateAudioRecording: audioBlob must be a Blob");
	}
	if (recording.audioBlob.size === 0) {
		throw new Error("validateAudioRecording: audioBlob cannot be empty");
	}
	if (
		!recording.mimeType ||
		typeof recording.mimeType !== "string" ||
		!recording.mimeType.trim()
	) {
		throw new Error("validateAudioRecording: mimeType cannot be empty");
	}
	if (
		typeof recording.durationMs !== "number" ||
		recording.durationMs < 0 ||
		!Number.isFinite(recording.durationMs)
	) {
		throw new Error(
			`validateAudioRecording: durationMs must be a non-negative number, got ${recording.durationMs}`,
		);
	}
	if (!VALID_TRANSCRIPTION_STATUSES.includes(recording.transcriptionStatus)) {
		throw new Error(
			`validateAudioRecording: transcriptionStatus must be one of ${VALID_TRANSCRIPTION_STATUSES.join(", ")}, got "${recording.transcriptionStatus}"`,
		);
	}
}

export const audioRecordingRepository = {
	async create(
		recording: Omit<AudioRecording, "id" | "createdAt">,
	): Promise<string> {
		validateAudioRecording(recording);

		try {
			const now = new Date();
			const id = `aud${crypto.randomUUID().replace(/-/g, "")}`;
			const record: AudioRecordingRecord = {
				id,
				userId: recording.userId,
				audioBlob: recording.audioBlob,
				mimeType: recording.mimeType,
				durationMs: recording.durationMs,
				affirmationTitle: recording.affirmationTitle,
				recordingContext: recording.recordingContext,
				date: toDateString(recording.date),
				createdAt: toTimestamp(now),
				transcriptionStatus: recording.transcriptionStatus,
				transcriptionText: recording.transcriptionText,
				transcriptionError: recording.transcriptionError,
			};
			await db.audioRecordings.add(record);
			return id;
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to create audio recording:",
				error,
			);
			throw new Error(
				`Failed to create audio recording: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getById(id: string): Promise<AudioRecording | undefined> {
		try {
			const record = await db.audioRecordings.get(id);
			return record ? toAudioRecording(record) : undefined;
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to get audio recording by id:",
				error,
			);
			throw new Error(
				`Failed to load audio recording: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserId(userId: string): Promise<AudioRecording[]> {
		try {
			const records = await db.audioRecordings
				.where("userId")
				.equals(userId)
				.toArray();
			return records.map(toAudioRecording);
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to get audio recordings by user:",
				error,
			);
			throw new Error(
				`Failed to load audio recordings: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserIdAndDate(
		userId: string,
		date: Date,
	): Promise<AudioRecording[]> {
		try {
			const dateStr = toDateString(date);
			const records = await db.audioRecordings
				.where(["userId", "date"])
				.equals([userId, dateStr])
				.toArray();
			return records.map(toAudioRecording);
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to get audio recordings by user and date:",
				error,
			);
			throw new Error(
				`Failed to load audio recordings: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async updateTranscription(
		id: string,
		status: TranscriptionStatus,
		text?: string,
		error?: string,
	): Promise<void> {
		try {
			const updates: Partial<AudioRecordingRecord> = {
				transcriptionStatus: status,
			};
			if (text !== undefined) {
				updates.transcriptionText = text;
			}
			if (error !== undefined) {
				updates.transcriptionError = error;
			}
			const updated = await db.audioRecordings.update(id, updates);
			if (updated === 0) {
				throw new Error(`Audio recording not found: ${id}`);
			}
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to update transcription:",
				error,
			);
			throw new Error(
				`Failed to update transcription: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async delete(id: string): Promise<void> {
		try {
			await db.audioRecordings.delete(id);
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to delete audio recording:",
				error,
			);
			throw new Error(
				`Failed to delete audio recording: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getTotalSizeForUser(userId: string): Promise<number> {
		try {
			const records = await db.audioRecordings
				.where("userId")
				.equals(userId)
				.toArray();
			return records.reduce(
				(total, record) => total + record.audioBlob.size,
				0,
			);
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to get total size:",
				error,
			);
			throw new Error(
				`Failed to calculate storage size: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getAll(): Promise<AudioRecording[]> {
		try {
			const records = await db.audioRecordings.toArray();
			return records.map(toAudioRecording);
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to get all audio recordings:",
				error,
			);
			throw new Error(
				`Failed to load audio recordings: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async clear(): Promise<void> {
		try {
			const count = await db.audioRecordings.count();
			console.warn(
				`[AudioRecordingRepository] DESTRUCTIVE: Clearing ${count} audio recordings.`,
			);
			await db.audioRecordings.clear();
		} catch (error) {
			console.error(
				"[AudioRecordingRepository] Failed to clear audio recordings:",
				error,
			);
			throw new Error(
				`Failed to clear audio recordings: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
};
