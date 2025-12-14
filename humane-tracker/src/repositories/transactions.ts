import { db } from "../config/db";
import type { Habit, HabitEntry } from "../types/habit";
import type { AffirmationLog } from "./affirmationLogRepository";
import { affirmationLogRepository } from "./affirmationLogRepository";
import { entryRepository } from "./entryRepository";
import { habitRepository } from "./habitRepository";

/**
 * Run an import operation atomically across habits, entries, and affirmation logs tables.
 * If any operation fails, all changes are rolled back.
 *
 * This function exists to keep db.transaction() usage confined to the repository layer.
 */
export async function runImportTransaction(
	habits: Habit[],
	entries: HabitEntry[],
	mode: "merge" | "replace",
	affirmationLogs?: AffirmationLog[],
): Promise<void> {
	await db.transaction(
		"rw",
		db.habits,
		db.entries,
		db.affirmationLogs,
		async () => {
			if (mode === "replace") {
				await habitRepository.clear();
				await entryRepository.clear();
				await affirmationLogRepository.clear();
			}

			await habitRepository.bulkPut(habits);
			await entryRepository.bulkPut(entries);
			if (affirmationLogs && affirmationLogs.length > 0) {
				await affirmationLogRepository.bulkPut(affirmationLogs);
			}
		},
	);
}
