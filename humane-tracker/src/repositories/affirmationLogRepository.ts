import { db } from "../config/db";
import {
	type AffirmationLogRecord,
	fromDateString,
	normalizeDate,
	toDateString,
	toTimestamp,
} from "./types";

export interface AffirmationLog {
	id: string;
	userId: string;
	affirmationTitle: string;
	logType: "opportunity" | "didit";
	note: string;
	date: Date;
	createdAt: Date;
}

function toAffirmationLog(record: AffirmationLogRecord): AffirmationLog {
	return {
		id: record.id,
		userId: record.userId,
		affirmationTitle: record.affirmationTitle,
		logType: record.logType,
		note: record.note,
		date: fromDateString(record.date),
		createdAt: normalizeDate(record.createdAt),
	};
}

function toRecord(log: AffirmationLog): AffirmationLogRecord {
	return {
		id: log.id,
		userId: log.userId,
		affirmationTitle: log.affirmationTitle,
		logType: log.logType,
		note: log.note,
		date: toDateString(log.date),
		createdAt: toTimestamp(log.createdAt),
	};
}

const VALID_LOG_TYPES: readonly ("opportunity" | "didit")[] = [
	"opportunity",
	"didit",
];

/**
 * Validate affirmation log input fields.
 * @throws Error if any field is invalid
 * Exported for testing purposes.
 */
export function validateAffirmationLog(
	log: Omit<AffirmationLog, "id" | "createdAt">,
): void {
	if (!log.userId || typeof log.userId !== "string" || !log.userId.trim()) {
		throw new Error("validateAffirmationLog: userId cannot be empty");
	}
	if (
		!log.affirmationTitle ||
		typeof log.affirmationTitle !== "string" ||
		!log.affirmationTitle.trim()
	) {
		throw new Error("validateAffirmationLog: affirmationTitle cannot be empty");
	}
	if (!VALID_LOG_TYPES.includes(log.logType)) {
		throw new Error(
			`validateAffirmationLog: logType must be "opportunity" or "didit", got "${log.logType}"`,
		);
	}
}

export const affirmationLogRepository = {
	async create(log: Omit<AffirmationLog, "id" | "createdAt">): Promise<string> {
		// Validate input before creating
		validateAffirmationLog(log);

		try {
			const now = new Date();
			const id = `aff${crypto.randomUUID().replace(/-/g, "")}`;
			const record: AffirmationLogRecord = {
				id,
				userId: log.userId,
				affirmationTitle: log.affirmationTitle,
				logType: log.logType,
				note: log.note,
				date: toDateString(log.date),
				createdAt: toTimestamp(now),
			};
			await db.affirmationLogs.add(record);
			return id;
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to create affirmation log:",
				error,
			);
			throw new Error(
				`Failed to create affirmation log: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getAll(): Promise<AffirmationLog[]> {
		try {
			const records = await db.affirmationLogs.toArray();
			return records.map(toAffirmationLog);
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to get all affirmation logs:",
				error,
			);
			throw new Error(
				`Failed to load affirmation logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async clear(): Promise<void> {
		try {
			const count = await db.affirmationLogs.count();
			console.warn(
				`[AffirmationLogRepository] DESTRUCTIVE: Clearing ${count} affirmation logs. This should only happen during import replace mode.`,
			);
			await db.affirmationLogs.clear();
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to clear affirmation logs:",
				error,
			);
			throw new Error(
				`Failed to clear affirmation logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async bulkPut(logs: AffirmationLog[]): Promise<void> {
		try {
			const records = logs.map(toRecord);
			await db.affirmationLogs.bulkPut(records);
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to bulk put affirmation logs:",
				error,
			);
			throw new Error(
				`Failed to save affirmation logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserIdAndDate(
		userId: string,
		date: Date,
	): Promise<AffirmationLog[]> {
		try {
			const dateStr = toDateString(date);
			const records = await db.affirmationLogs
				.where(["userId", "date"])
				.equals([userId, dateStr])
				.toArray();
			return records.map(toAffirmationLog);
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to get affirmation logs by user and date:",
				error,
			);
			throw new Error(
				`Failed to load affirmation logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserId(userId: string): Promise<AffirmationLog[]> {
		try {
			const records = await db.affirmationLogs
				.where("userId")
				.equals(userId)
				.toArray();
			return records.map(toAffirmationLog);
		} catch (error) {
			console.error(
				"[AffirmationLogRepository] Failed to get affirmation logs by user:",
				error,
			);
			throw new Error(
				`Failed to load affirmation logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
};
