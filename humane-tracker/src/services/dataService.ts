import {
	affirmationLogRepository,
	entryRepository,
	habitRepository,
	runImportTransaction,
} from "../repositories";
import type { AffirmationLog } from "../repositories/affirmationLogRepository";
import { normalizeDate } from "../repositories/types";
import type { Habit, HabitEntry } from "../types/habit";
import { repairTagRelationships } from "../utils/tagUtils";

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
	// Use normalizeDate for proper validation (throws on invalid dates)
	const rawHabits: Habit[] = data.habits.map((h) => ({
		...h,
		createdAt: normalizeDate(h.createdAt as unknown as string),
		updatedAt: normalizeDate(h.updatedAt as unknown as string),
	}));

	// Repair any inconsistencies between childIds and parentIds
	// This ensures imported data has bidirectionally consistent tag relationships
	const repairResult = repairTagRelationships(rawHabits);
	const habits = repairResult.habits;
	if (repairResult.parentIdsFixed > 0 || repairResult.childIdsFixed > 0) {
		console.log(
			`[Import] Repaired tag relationships: ${repairResult.parentIdsFixed} parentIds, ${repairResult.childIdsFixed} childIds`,
		);
	}

	const entries: HabitEntry[] = data.entries.map((e) => ({
		...e,
		date: normalizeDate(e.date as unknown as string),
		createdAt: normalizeDate(e.createdAt as unknown as string),
	}));

	// Handle affirmation logs (optional for backwards compatibility with v1 exports)
	const affirmationLogs: AffirmationLog[] = (data.affirmationLogs ?? []).map(
		(a) => ({
			...a,
			date: normalizeDate(a.date as unknown as string),
			createdAt: normalizeDate(a.createdAt as unknown as string),
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
	if (
		(d.version !== 1 && d.version !== 2) ||
		typeof d.exportedAt !== "string" ||
		!Array.isArray(d.habits) ||
		!Array.isArray(d.entries)
	) {
		return false;
	}

	// Validate each habit has required fields
	for (const h of d.habits) {
		if (!h || typeof h !== "object") return false;
		const habit = h as Record<string, unknown>;
		if (
			typeof habit.id !== "string" ||
			typeof habit.name !== "string" ||
			typeof habit.category !== "string" ||
			typeof habit.userId !== "string"
		) {
			return false;
		}
	}

	// Validate each entry has required fields
	for (const e of d.entries) {
		if (!e || typeof e !== "object") return false;
		const entry = e as Record<string, unknown>;
		if (
			typeof entry.id !== "string" ||
			typeof entry.habitId !== "string" ||
			typeof entry.userId !== "string"
		) {
			return false;
		}
	}

	return true;
}

/**
 * Generate a filename for habit tracker backup exports.
 * Format: habit-tracker-backup-YYYY-MM-DDTHH-MM-SS.json
 */
export function generateExportFilename(date: Date = new Date()): string {
	const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
	return `habit-tracker-backup-${timestamp}.json`;
}
