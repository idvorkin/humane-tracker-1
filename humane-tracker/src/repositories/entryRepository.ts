import { liveQuery } from "dexie";
import { db } from "../config/db";
import type { HabitEntry } from "../types/habit";
import {
	type EntryRecord,
	normalizeDate,
	normalizeDateString,
	toDateString,
	toTimestamp,
} from "./types";

/**
 * Convert a database record to a domain object.
 * Handles legacy Date objects and new ISO string format.
 */
function toEntry(record: EntryRecord | HabitEntry): HabitEntry {
	return {
		id: record.id,
		habitId: record.habitId,
		userId: record.userId,
		date: normalizeDate(record.date as string | Date),
		value: record.value,
		notes: record.notes,
		createdAt: normalizeDate(record.createdAt as string | Date),
	};
}

/**
 * Convert a domain object to a database record.
 */
function toRecord(
	entry: Omit<HabitEntry, "id" | "createdAt"> & { createdAt?: Date },
): Omit<EntryRecord, "id"> {
	return {
		habitId: entry.habitId,
		userId: entry.userId,
		date: toDateString(entry.date),
		value: entry.value,
		notes: entry.notes,
		createdAt: toTimestamp(entry.createdAt ?? new Date()),
	};
}

/**
 * Repository for habit entries.
 * Handles date conversion: ISO strings in DB, Date objects in app.
 */
export const entryRepository = {
	/**
	 * Get all entries for a user.
	 */
	async getByUserId(userId: string): Promise<HabitEntry[]> {
		const records = await db.entries.where("userId").equals(userId).toArray();
		return records.map((r) => toEntry(r as unknown as EntryRecord));
	},

	/**
	 * Get all entries for a habit.
	 */
	async getByHabitId(habitId: string): Promise<HabitEntry[]> {
		const records = await db.entries
			.where("habitId")
			.equals(habitId)
			.toArray();
		return records.map((r) => toEntry(r as unknown as EntryRecord));
	},

	/**
	 * Get entries for a user within a date range.
	 * Comparison is done on YYYY-MM-DD strings for consistency.
	 */
	async getForDateRange(
		userId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		const startStr = toDateString(startDate);
		const endStr = toDateString(endDate);

		const records = await db.entries
			.where("userId")
			.equals(userId)
			.and((record) => {
				const dateStr = normalizeDateString(record.date as string | Date);
				return dateStr >= startStr && dateStr <= endStr;
			})
			.toArray();

		return records.map((r) => toEntry(r as unknown as EntryRecord));
	},

	/**
	 * Get entries for a specific habit within a date range.
	 */
	async getForHabitInRange(
		habitId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		const startStr = toDateString(startDate);
		const endStr = toDateString(endDate);

		const records = await db.entries
			.where("habitId")
			.equals(habitId)
			.and((record) => {
				const dateStr = normalizeDateString(record.date as string | Date);
				return dateStr >= startStr && dateStr <= endStr;
			})
			.toArray();

		return records.map((r) => toEntry(r as unknown as EntryRecord));
	},

	/**
	 * Add a new entry.
	 */
	async add(entry: {
		habitId: string;
		userId: string;
		date: Date;
		value: number;
		notes?: string;
	}): Promise<string> {
		const record = toRecord({
			...entry,
			createdAt: new Date(),
		});
		const id = await db.entries.add(record as unknown as HabitEntry);
		return id;
	},

	/**
	 * Update an entry's value.
	 */
	async updateValue(entryId: string, value: number): Promise<void> {
		await db.entries.update(entryId, { value });
	},

	/**
	 * Delete an entry.
	 */
	async delete(entryId: string): Promise<void> {
		await db.entries.delete(entryId);
	},

	/**
	 * Bulk insert entries.
	 */
	async bulkPut(entries: HabitEntry[]): Promise<void> {
		const records = entries.map((entry) => ({
			id: entry.id,
			...toRecord(entry),
		}));
		await db.entries.bulkPut(records as unknown as HabitEntry[]);
	},

	/**
	 * Subscribe to entries for a user within a date range.
	 * Returns an unsubscribe function.
	 */
	subscribeForDateRange(
		userId: string,
		startDate: Date,
		endDate: Date,
		callback: (entries: HabitEntry[]) => void,
	): () => void {
		const startStr = toDateString(startDate);
		const endStr = toDateString(endDate);

		const observable = liveQuery(() =>
			db.entries
				.where("userId")
				.equals(userId)
				.and((record) => {
					const dateStr = normalizeDateString(record.date as string | Date);
					return dateStr >= startStr && dateStr <= endStr;
				})
				.toArray(),
		);

		const subscription = observable.subscribe({
			next: (records) =>
				callback(records.map((r) => toEntry(r as unknown as EntryRecord))),
			error: (error) => console.error("Error in entries subscription:", error),
		});

		return () => subscription.unsubscribe();
	},

	/**
	 * Subscribe to all entries for a user.
	 */
	subscribeByUserId(
		userId: string,
		callback: (entries: HabitEntry[]) => void,
	): () => void {
		const observable = liveQuery(() =>
			db.entries.where("userId").equals(userId).toArray(),
		);

		const subscription = observable.subscribe({
			next: (records) =>
				callback(records.map((r) => toEntry(r as unknown as EntryRecord))),
			error: (error) => console.error("Error in entries subscription:", error),
		});

		return () => subscription.unsubscribe();
	},
};
