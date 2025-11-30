import type { Habit, HabitEntry } from "../types/habit";
import { habitRepository, entryRepository } from "../repositories";

export interface ExportData {
	version: 1;
	exportedAt: string;
	habits: Habit[];
	entries: HabitEntry[];
}

export async function exportAllData(): Promise<ExportData> {
	// Use repositories - they handle date conversion
	const habits = await habitRepository.getAll();
	const entries = await entryRepository.getAll();
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		habits,
		entries,
	};
}

export async function importAllData(
	data: ExportData,
	mode: "merge" | "replace",
): Promise<{ habitsImported: number; entriesImported: number }> {
	if (mode === "replace") {
		await habitRepository.clear();
		await entryRepository.clear();
	}

	// Convert date strings back to Date objects for domain types
	// The repository will convert them back to ISO strings for storage
	const habits: Habit[] = data.habits.map((h) => ({
		...h,
		createdAt: new Date(h.createdAt),
		updatedAt: new Date(h.updatedAt),
	}));

	const entries: HabitEntry[] = data.entries.map((e) => ({
		...e,
		date: new Date(e.date),
		createdAt: new Date(e.createdAt),
	}));

	// Use repositories for storage - they handle date conversion
	await habitRepository.bulkPut(habits);
	await entryRepository.bulkPut(entries);

	return { habitsImported: habits.length, entriesImported: entries.length };
}

export function validateExportData(data: unknown): data is ExportData {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	return (
		d.version === 1 &&
		typeof d.exportedAt === "string" &&
		Array.isArray(d.habits) &&
		Array.isArray(d.entries)
	);
}

/**
 * Generate a filename for habit tracker backup exports.
 * Format: habit-tracker-backup-YYYY-MM-DDTHH-MM-SS.json
 */
export function generateExportFilename(date: Date = new Date()): string {
	const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
	return `habit-tracker-backup-${timestamp}.json`;
}
