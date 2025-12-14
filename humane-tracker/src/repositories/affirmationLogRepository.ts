import { db } from "../config/db";
import {
	type AffirmationLogRecord,
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
		date: new Date(record.date),
		createdAt: new Date(record.createdAt),
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

export const affirmationLogRepository = {
	async create(
		log: Omit<AffirmationLog, "id" | "createdAt">,
	): Promise<string> {
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
	},

	async getAll(): Promise<AffirmationLog[]> {
		const records = await db.affirmationLogs.toArray();
		return records.map(toAffirmationLog);
	},

	async clear(): Promise<void> {
		const count = await db.affirmationLogs.count();
		console.warn(
			`[AffirmationLogRepository] DESTRUCTIVE: Clearing ${count} affirmation logs. This should only happen during import replace mode.`,
		);
		await db.affirmationLogs.clear();
	},

	async bulkPut(logs: AffirmationLog[]): Promise<void> {
		const records = logs.map(toRecord);
		await db.affirmationLogs.bulkPut(records);
	},

	async getByUserIdAndDate(
		userId: string,
		date: Date,
	): Promise<AffirmationLog[]> {
		const dateStr = toDateString(date);
		const records = await db.affirmationLogs
			.where(["userId", "date"])
			.equals([userId, dateStr])
			.toArray();
		return records.map(toAffirmationLog);
	},

	async getByUserId(userId: string): Promise<AffirmationLog[]> {
		const records = await db.affirmationLogs
			.where("userId")
			.equals(userId)
			.toArray();
		return records.map(toAffirmationLog);
	},
};
