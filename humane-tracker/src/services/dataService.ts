import { db } from "../config/db";
import type { Habit, HabitEntry } from "../types/habit";

export interface ExportData {
	version: 1;
	exportedAt: string;
	habits: Habit[];
	entries: HabitEntry[];
}

export async function exportAllData(): Promise<ExportData> {
	const habits = await db.habits.toArray();
	const entries = await db.entries.toArray();
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
		await db.habits.clear();
		await db.entries.clear();
	}

	// Convert date strings back to Date objects (JSON parse loses Date type)
	const habits = data.habits.map((h) => ({
		...h,
		createdAt: new Date(h.createdAt),
		updatedAt: new Date(h.updatedAt),
	}));

	const entries = data.entries.map((e) => ({
		...e,
		date: new Date(e.date),
		createdAt: new Date(e.createdAt),
	}));

	// Use bulkPut for both modes - it handles upsert correctly
	await db.habits.bulkPut(habits);
	await db.entries.bulkPut(entries);

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
