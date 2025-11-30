import Dexie, { type Table } from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit, HabitEntry } from "../types/habit";
import type { ExportData } from "./dataService";
import { generateExportFilename, validateExportData } from "./dataService";

// Create a test-only database without dexie-cloud addon
class TestDB extends Dexie {
	habits!: Table<Habit, string>;
	entries!: Table<HabitEntry, string>;

	constructor() {
		super("TestHumaneTrackerDB");
		this.version(1).stores({
			habits: "id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "id, habitId, userId, date, value, createdAt",
		});
	}
}

const testDb = new TestDB();

// Test versions of export/import that use testDb
async function exportAllDataTest(): Promise<ExportData> {
	const habits = await testDb.habits.toArray();
	const entries = await testDb.entries.toArray();
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		habits,
		entries,
	};
}

async function importAllDataTest(
	data: ExportData,
	mode: "merge" | "replace",
): Promise<{ habitsImported: number; entriesImported: number }> {
	if (mode === "replace") {
		await testDb.habits.clear();
		await testDb.entries.clear();
	}

	const habitsImported = data.habits.length;
	const entriesImported = data.entries.length;

	// Use bulkPut for both modes - it handles upsert correctly
	await testDb.habits.bulkPut(data.habits);
	await testDb.entries.bulkPut(data.entries);

	return { habitsImported, entriesImported };
}

// Helper to create test data
function createTestHabit(id: string, name: string): Habit {
	return {
		id,
		name,
		category: "mobility",
		targetPerWeek: 3,
		userId: "test-user",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};
}

function createTestEntry(id: string, habitId: string, date: Date): HabitEntry {
	return {
		id,
		habitId,
		userId: "test-user",
		date,
		value: 1,
		createdAt: new Date("2024-01-01"),
	};
}

describe("validateExportData", () => {
	it("returns true for valid export data", () => {
		const data: ExportData = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [],
			entries: [],
		};
		expect(validateExportData(data)).toBe(true);
	});

	it("returns true for export data with habits and entries", () => {
		const data = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [{ id: "h1", name: "Test" }],
			entries: [{ id: "e1", habitId: "h1" }],
		};
		expect(validateExportData(data)).toBe(true);
	});

	it("returns false for null", () => {
		expect(validateExportData(null)).toBe(false);
	});

	it("returns false for non-object", () => {
		expect(validateExportData("string")).toBe(false);
		expect(validateExportData(123)).toBe(false);
		expect(validateExportData(undefined)).toBe(false);
	});

	it("returns false for wrong version", () => {
		const data = {
			version: 2,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [],
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for missing version", () => {
		const data = {
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [],
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for missing exportedAt", () => {
		const data = {
			version: 1,
			habits: [],
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for non-string exportedAt", () => {
		const data = {
			version: 1,
			exportedAt: 12345,
			habits: [],
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for missing habits array", () => {
		const data = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for non-array habits", () => {
		const data = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: "not an array",
			entries: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for missing entries array", () => {
		const data = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [],
		};
		expect(validateExportData(data)).toBe(false);
	});

	it("returns false for non-array entries", () => {
		const data = {
			version: 1,
			exportedAt: "2024-01-01T00:00:00.000Z",
			habits: [],
			entries: {},
		};
		expect(validateExportData(data)).toBe(false);
	});
});

describe("exportAllData", () => {
	beforeEach(async () => {
		await testDb.habits.clear();
		await testDb.entries.clear();
	});

	it("exports empty data when database is empty", async () => {
		const result = await exportAllDataTest();

		expect(result.version).toBe(1);
		expect(result.exportedAt).toBeDefined();
		expect(result.habits).toEqual([]);
		expect(result.entries).toEqual([]);
	});

	it("exports all habits and entries", async () => {
		const habit = createTestHabit("h1", "Test Habit");
		const entry = createTestEntry("e1", "h1", new Date("2024-01-15"));

		await testDb.habits.add(habit);
		await testDb.entries.add(entry);

		const result = await exportAllDataTest();

		expect(result.habits).toHaveLength(1);
		expect(result.habits[0].id).toBe("h1");
		expect(result.habits[0].name).toBe("Test Habit");
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].id).toBe("e1");
	});

	it("exports multiple habits and entries", async () => {
		await testDb.habits.bulkAdd([
			createTestHabit("h1", "Habit 1"),
			createTestHabit("h2", "Habit 2"),
			createTestHabit("h3", "Habit 3"),
		]);
		await testDb.entries.bulkAdd([
			createTestEntry("e1", "h1", new Date("2024-01-15")),
			createTestEntry("e2", "h1", new Date("2024-01-16")),
			createTestEntry("e3", "h2", new Date("2024-01-15")),
		]);

		const result = await exportAllDataTest();

		expect(result.habits).toHaveLength(3);
		expect(result.entries).toHaveLength(3);
	});

	it("includes valid ISO date in exportedAt", async () => {
		const result = await exportAllDataTest();

		const date = new Date(result.exportedAt);
		expect(date.toString()).not.toBe("Invalid Date");
	});
});

describe("importAllData", () => {
	beforeEach(async () => {
		await testDb.habits.clear();
		await testDb.entries.clear();
	});

	describe("merge mode", () => {
		it("imports data into empty database", async () => {
			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [createTestHabit("h1", "Imported Habit")],
				entries: [createTestEntry("e1", "h1", new Date("2024-01-15"))],
			};

			const result = await importAllDataTest(data, "merge");

			expect(result.habitsImported).toBe(1);
			expect(result.entriesImported).toBe(1);

			const habits = await testDb.habits.toArray();
			const entries = await testDb.entries.toArray();
			expect(habits).toHaveLength(1);
			expect(entries).toHaveLength(1);
		});

		it("preserves existing data when merging", async () => {
			await testDb.habits.add(createTestHabit("existing", "Existing Habit"));

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [createTestHabit("new", "New Habit")],
				entries: [],
			};

			await importAllDataTest(data, "merge");

			const habits = await testDb.habits.toArray();
			expect(habits).toHaveLength(2);
			expect(habits.map((h) => h.name).sort()).toEqual([
				"Existing Habit",
				"New Habit",
			]);
		});

		it("updates existing records with same ID", async () => {
			await testDb.habits.add(createTestHabit("h1", "Original Name"));

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [createTestHabit("h1", "Updated Name")],
				entries: [],
			};

			await importAllDataTest(data, "merge");

			const habits = await testDb.habits.toArray();
			expect(habits).toHaveLength(1);
			expect(habits[0].name).toBe("Updated Name");
		});

		it("merges entries correctly", async () => {
			await testDb.entries.add(
				createTestEntry("e1", "h1", new Date("2024-01-10")),
			);

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [],
				entries: [createTestEntry("e2", "h1", new Date("2024-01-11"))],
			};

			await importAllDataTest(data, "merge");

			const entries = await testDb.entries.toArray();
			expect(entries).toHaveLength(2);
		});
	});

	describe("replace mode", () => {
		it("clears existing data before import", async () => {
			await testDb.habits.add(createTestHabit("existing", "Existing Habit"));
			await testDb.entries.add(
				createTestEntry("existing-entry", "existing", new Date()),
			);

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [createTestHabit("new", "New Habit")],
				entries: [],
			};

			await importAllDataTest(data, "replace");

			const habits = await testDb.habits.toArray();
			const entries = await testDb.entries.toArray();
			expect(habits).toHaveLength(1);
			expect(habits[0].name).toBe("New Habit");
			expect(entries).toHaveLength(0);
		});

		it("imports empty data after clearing", async () => {
			await testDb.habits.add(createTestHabit("existing", "Existing Habit"));

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [],
				entries: [],
			};

			await importAllDataTest(data, "replace");

			const habits = await testDb.habits.toArray();
			expect(habits).toHaveLength(0);
		});

		it("replaces all habits and entries", async () => {
			await testDb.habits.bulkAdd([
				createTestHabit("old1", "Old 1"),
				createTestHabit("old2", "Old 2"),
			]);
			await testDb.entries.bulkAdd([
				createTestEntry("old-e1", "old1", new Date()),
				createTestEntry("old-e2", "old2", new Date()),
			]);

			const data: ExportData = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				habits: [createTestHabit("new1", "New 1")],
				entries: [createTestEntry("new-e1", "new1", new Date())],
			};

			await importAllDataTest(data, "replace");

			const habits = await testDb.habits.toArray();
			const entries = await testDb.entries.toArray();
			expect(habits).toHaveLength(1);
			expect(habits[0].id).toBe("new1");
			expect(entries).toHaveLength(1);
			expect(entries[0].id).toBe("new-e1");
		});
	});

	describe("round-trip", () => {
		it("can export and re-import data", async () => {
			// Setup initial data
			await testDb.habits.bulkAdd([
				createTestHabit("h1", "Habit 1"),
				createTestHabit("h2", "Habit 2"),
			]);
			await testDb.entries.bulkAdd([
				createTestEntry("e1", "h1", new Date("2024-01-15")),
				createTestEntry("e2", "h2", new Date("2024-01-16")),
			]);

			// Export
			const exported = await exportAllDataTest();

			// Clear database
			await testDb.habits.clear();
			await testDb.entries.clear();

			// Verify cleared
			expect(await testDb.habits.count()).toBe(0);
			expect(await testDb.entries.count()).toBe(0);

			// Re-import
			await importAllDataTest(exported, "replace");

			// Verify restored
			const habits = await testDb.habits.toArray();
			const entries = await testDb.entries.toArray();
			expect(habits).toHaveLength(2);
			expect(entries).toHaveLength(2);
			expect(habits.map((h) => h.name).sort()).toEqual(["Habit 1", "Habit 2"]);
		});
	});
});

describe("generateExportFilename", () => {
	it("generates filename with correct format", () => {
		const date = new Date("2024-11-29T17:35:42.123Z");
		const filename = generateExportFilename(date);
		expect(filename).toBe("habit-tracker-backup-2024-11-29T17-35-42.json");
	});

	it("replaces colons and periods in timestamp", () => {
		const date = new Date("2024-01-15T08:30:15.999Z");
		const filename = generateExportFilename(date);
		expect(filename).not.toContain(":");
		// Timestamp portion should not have periods (only .json extension)
		const timestampPart = filename.replace(".json", "");
		expect(timestampPart).not.toContain(".");
		expect(filename).toMatch(
			/habit-tracker-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json/,
		);
	});

	it("uses current date when no argument provided", () => {
		const filename = generateExportFilename();
		expect(filename).toMatch(
			/^habit-tracker-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/,
		);
	});

	it("produces valid filename without special characters", () => {
		const filename = generateExportFilename(new Date());
		// Only alphanumeric, hyphens, and single period before extension
		expect(filename).toMatch(/^[a-zA-Z0-9-]+\.json$/);
	});
});
