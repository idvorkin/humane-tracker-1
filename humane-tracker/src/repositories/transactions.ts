import { db } from "../config/db";
import type { Habit, HabitEntry } from "../types/habit";
import { entryRepository } from "./entryRepository";
import { habitRepository } from "./habitRepository";

/**
 * Run an import operation atomically across habits and entries tables.
 * If any operation fails, all changes are rolled back.
 *
 * This function exists to keep db.transaction() usage confined to the repository layer.
 */
export async function runImportTransaction(
	habits: Habit[],
	entries: HabitEntry[],
	mode: "merge" | "replace",
): Promise<void> {
	await db.transaction("rw", db.habits, db.entries, async () => {
		if (mode === "replace") {
			await habitRepository.clear();
			await entryRepository.clear();
		}

		await habitRepository.bulkPut(habits);
		await entryRepository.bulkPut(entries);
	});
}
