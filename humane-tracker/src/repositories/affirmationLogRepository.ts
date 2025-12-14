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

export const affirmationLogRepository = {
	async create(
		log: Omit<AffirmationLog, "id" | "createdAt">,
	): Promise<string> {
		const now = new Date();
		const id = `afl${crypto.randomUUID().replace(/-/g, "")}`;
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
