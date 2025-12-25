import { liveQuery } from "dexie";
import { db } from "../config/db";
import type { HabitEntry } from "../types/habit";
import {
	type EntryRecord,
	normalizeDate,
	normalizeDateString,
	toDateString,
	toTimestamp,
	validateEntryValue,
} from "./types";

/**
 * Convert a database record to a domain object.
 * During migration period, date fields may be Date objects or ISO strings.
 * Exported for testing.
 */
export function toEntry(record: EntryRecord): HabitEntry {
	return {
		id: record.id,
		habitId: record.habitId,
		userId: record.userId,
		date: normalizeDate(record.date as string | Date),
		value: record.value,
		notes: record.notes,
		createdAt: normalizeDate(record.createdAt as string | Date),
		// Structured data fields
		sets: record.sets,
		parsed: record.parsed,
	};
}

/**
 * Convert a domain object to a database record.
 * Exported for testing.
 */
export function toRecord(
	entry: Omit<HabitEntry, "id" | "createdAt"> & { createdAt?: Date },
): Omit<EntryRecord, "id"> {
	return {
		habitId: entry.habitId,
		userId: entry.userId,
		date: toDateString(entry.date),
		value: entry.value,
		notes: entry.notes,
		createdAt: toTimestamp(entry.createdAt ?? new Date()),
		// Structured data fields
		sets: entry.sets,
		parsed: entry.parsed,
	};
}

/**
 * Repository for habit entries.
 * Handles date conversion: ISO strings in DB, Date objects in app.
 */
export const entryRepository = {
	async getAll(): Promise<HabitEntry[]> {
		try {
			const records = await db.entries.toArray();
			return records.map(toEntry);
		} catch (error) {
			console.error("[EntryRepository] Failed to get all entries:", error);
			throw new Error(
				`Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async clear(): Promise<void> {
		try {
			const count = await db.entries.count();
			console.warn(
				`[EntryRepository] DESTRUCTIVE: Clearing ${count} entries. This should only happen during import replace mode.`,
			);
			await db.entries.clear();
			console.log(`[EntryRepository] Successfully cleared ${count} entries`);
		} catch (error) {
			console.error("[EntryRepository] Failed to clear entries:", error);
			throw new Error(
				`Failed to clear entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserId(userId: string): Promise<HabitEntry[]> {
		try {
			const records = await db.entries.where("userId").equals(userId).toArray();
			return records.map(toEntry);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to get entries for user ${userId}:`,
				error,
			);
			throw new Error(
				`Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async countByUserId(userId: string): Promise<number> {
		try {
			return await db.entries.where("userId").equals(userId).count();
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to count entries for user ${userId}:`,
				error,
			);
			throw new Error(
				`Failed to count entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async deleteByUserId(userId: string): Promise<number> {
		try {
			// Use transaction to ensure atomic delete and accurate count
			const count = await db.transaction("rw", db.entries, async () => {
				return await db.entries.where("userId").equals(userId).delete();
			});
			console.log(
				`[EntryRepository] Deleted ${count} entries for user ${userId}`,
			);
			return count;
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to delete entries for user ${userId}:`,
				error,
			);
			throw new Error(
				`Failed to delete entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByHabitId(habitId: string): Promise<HabitEntry[]> {
		try {
			const records = await db.entries
				.where("habitId")
				.equals(habitId)
				.toArray();
			return records.map(toEntry);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to get entries for habit ${habitId}:`,
				error,
			);
			throw new Error(
				`Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getForDateRange(
		userId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		try {
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

			return records.map(toEntry);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to get entries for user ${userId} in date range:`,
				{ startDate, endDate, error },
			);
			throw new Error(
				`Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getForHabitInRange(
		habitId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		try {
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

			return records.map(toEntry);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to get entries for habit ${habitId} in date range:`,
				{ startDate, endDate, error },
			);
			throw new Error(
				`Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async add(entry: {
		habitId: string;
		userId: string;
		date: Date;
		value: number;
		notes?: string;
		sets?: HabitEntry["sets"];
		parsed?: boolean;
	}): Promise<string> {
		// Validate entry value before storing
		validateEntryValue(entry.value);

		try {
			const record = toRecord({
				...entry,
				createdAt: new Date(),
			});
			// Generate our own ID to avoid Dexie Cloud ID generation issues when offline
			// Dexie Cloud @id requires table prefix (ent for entries)
			const id = `ent${crypto.randomUUID().replace(/-/g, "")}`;
			const recordWithId = { ...record, id } as EntryRecord;
			await db.entries.add(recordWithId);
			return id;
		} catch (error) {
			console.error("[EntryRepository] Failed to add entry:", {
				habitId: entry.habitId,
				date: entry.date.toISOString(),
				value: entry.value,
				error,
			});
			throw new Error(
				`Failed to save entry for ${entry.date.toDateString()}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async updateValue(entryId: string, value: number): Promise<void> {
		// Validate entry value before updating
		validateEntryValue(value);

		try {
			const updatedCount = await db.entries.update(entryId, { value });
			if (updatedCount === 0) {
				throw new Error(`Entry not found: ${entryId}`);
			}
		} catch (error) {
			console.error(`[EntryRepository] Failed to update entry ${entryId}:`, {
				value,
				error,
			});
			throw new Error(
				`Failed to update entry: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async delete(entryId: string): Promise<void> {
		try {
			const existing = await db.entries.get(entryId);
			if (!existing) {
				throw new Error(`Entry not found: ${entryId}`);
			}
			await db.entries.delete(entryId);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to delete entry ${entryId}:`,
				error,
			);
			throw new Error(
				`Failed to delete entry: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async bulkPut(entries: HabitEntry[]): Promise<void> {
		try {
			const records: EntryRecord[] = entries.map((entry) => ({
				id: entry.id,
				...toRecord(entry),
			}));
			await db.entries.bulkPut(records);
		} catch (error) {
			console.error(
				`[EntryRepository] Failed to bulk insert ${entries.length} entries:`,
				error,
			);
			throw new Error(
				`Failed to import entries: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	subscribeForDateRange(
		userId: string,
		startDate: Date,
		endDate: Date,
		callback: (entries: HabitEntry[]) => void,
		onError?: (error: unknown) => void,
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
			next: (records) => callback(records.map(toEntry)),
			error: (error) => {
				console.error(
					"[EntryRepository] Error in entries subscription:",
					error,
				);

				// Notify UI layer if error handler provided
				if (onError) {
					onError(error);
				}

				// Return empty array as fallback
				callback([]);
			},
		});

		return () => subscription.unsubscribe();
	},

	subscribeByUserId(
		userId: string,
		callback: (entries: HabitEntry[]) => void,
		onError?: (error: unknown) => void,
	): () => void {
		const observable = liveQuery(() =>
			db.entries.where("userId").equals(userId).toArray(),
		);

		const subscription = observable.subscribe({
			next: (records) => callback(records.map(toEntry)),
			error: (error) => {
				console.error(
					"[EntryRepository] Error in entries subscription:",
					error,
				);

				// Notify UI layer if error handler provided
				if (onError) {
					onError(error);
				}

				// Return empty array as fallback
				callback([]);
			},
		});

		return () => subscription.unsubscribe();
	},
};
