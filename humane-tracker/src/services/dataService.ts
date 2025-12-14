import {
	affirmationLogRepository,
	entryRepository,
	habitRepository,
	runImportTransaction,
} from "../repositories";
import type { AffirmationLog } from "../repositories/affirmationLogRepository";
import type { Habit, HabitEntry } from "../types/habit";

export interface ExportData {
	version: 1 | 2;
	exportedAt: string;
	habits: Habit[];
	entries: HabitEntry[];
	affirmationLogs?: AffirmationLog[];
}

export async function exportAllData(): Promise<ExportData> {
	// Use repositories - they handle date conversion
	const habits = await habitRepository.getAll();
	const entries = await entryRepository.getAll();
	const affirmationLogs = await affirmationLogRepository.getAll();
	return {
		version: 2,
		exportedAt: new Date().toISOString(),
		habits,
		entries,
		affirmationLogs,
	};
}

export async function importAllData(
	data: ExportData,
	mode: "merge" | "replace",
): Promise<{
	habitsImported: number;
	entriesImported: number;
	affirmationLogsImported: number;
}> {
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

	// Handle affirmation logs (optional for backwards compatibility with v1 exports)
	const affirmationLogs: AffirmationLog[] = (data.affirmationLogs ?? []).map(
		(a) => ({
			...a,
			date: new Date(a.date),
			createdAt: new Date(a.createdAt),
		}),
	);

	// Use repository-layer transaction for atomicity.
	// If any operation fails, everything rolls back automatically.
	await runImportTransaction(habits, entries, mode, affirmationLogs);

	return {
		habitsImported: habits.length,
		entriesImported: entries.length,
		affirmationLogsImported: affirmationLogs.length,
	};
}

export function validateExportData(data: unknown): data is ExportData {
	if (!data || typeof data !== "object") return false;
	const d = data as Record<string, unknown>;
	// Support both v1 (habits/entries only) and v2 (with affirmationLogs)
	return (
		(d.version === 1 || d.version === 2) &&
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
