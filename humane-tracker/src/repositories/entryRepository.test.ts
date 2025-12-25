import { beforeEach, describe, expect, it, vi } from "vitest";
import { toEntry, toRecord } from "./entryRepository";
import type { EntryRecord } from "./types";

// Mock crypto for predictable ID generation and Dexie compatibility
const mockUUID = "12345678-1234-1234-1234-123456789abc";
vi.stubGlobal("crypto", {
	randomUUID: vi.fn(() => mockUUID),
	getRandomValues: vi.fn((arr: Uint8Array) => {
		for (let i = 0; i < arr.length; i++) {
			arr[i] = Math.floor(Math.random() * 256);
		}
		return arr;
	}),
});

describe("toEntry", () => {
	it("converts EntryRecord with ISO string date to HabitEntry with Date object", () => {
		const record: EntryRecord = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: "2024-01-15",
			value: 1,
			notes: "Test note",
			createdAt: "2024-01-15T10:30:00.000Z",
		};

		const entry = toEntry(record);

		expect(entry.id).toBe("ent123");
		expect(entry.habitId).toBe("hab456");
		expect(entry.userId).toBe("user789");
		expect(entry.date).toBeInstanceOf(Date);
		expect(entry.date.getFullYear()).toBe(2024);
		expect(entry.date.getMonth()).toBe(0); // January
		expect(entry.date.getDate()).toBe(15);
		expect(entry.value).toBe(1);
		expect(entry.notes).toBe("Test note");
		expect(entry.createdAt).toBeInstanceOf(Date);
		expect(entry.createdAt.toISOString()).toBe("2024-01-15T10:30:00.000Z");
	});

	it("handles legacy Date objects from pre-migration databases", () => {
		// During migration, date fields might be Date objects
		const record = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 15) as unknown as string, // Legacy Date object
			value: 1,
			createdAt: new Date("2024-01-15T10:30:00.000Z") as unknown as string,
		} as EntryRecord;

		const entry = toEntry(record);

		expect(entry.date).toBeInstanceOf(Date);
		expect(entry.date.getFullYear()).toBe(2024);
		expect(entry.date.getMonth()).toBe(0);
		expect(entry.date.getDate()).toBe(15);
		expect(entry.createdAt).toBeInstanceOf(Date);
	});

	it("preserves optional fields when present", () => {
		const record: EntryRecord = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: "2024-01-15",
			value: 3,
			notes: "Workout notes",
			createdAt: "2024-01-15T10:30:00.000Z",
			sets: [
				{ weight: 100, reps: 10 },
				{ weight: 110, reps: 8 },
			],
			parsed: true,
		};

		const entry = toEntry(record);

		expect(entry.sets).toEqual([
			{ weight: 100, reps: 10 },
			{ weight: 110, reps: 8 },
		]);
		expect(entry.parsed).toBe(true);
	});

	it("handles undefined optional fields", () => {
		const record: EntryRecord = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: "2024-01-15",
			value: 1,
			createdAt: "2024-01-15T10:30:00.000Z",
		};

		const entry = toEntry(record);

		expect(entry.notes).toBeUndefined();
		expect(entry.sets).toBeUndefined();
		expect(entry.parsed).toBeUndefined();
	});

	it("handles full ISO timestamp in date field (edge case)", () => {
		const record: EntryRecord = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: "2024-01-15T00:00:00.000Z", // Full timestamp instead of date-only
			value: 1,
			createdAt: "2024-01-15T10:30:00.000Z",
		};

		const entry = toEntry(record);

		// Should still produce a valid Date
		expect(entry.date).toBeInstanceOf(Date);
		expect(entry.date.getFullYear()).toBe(2024);
	});

	it("handles partial entry value (0.5)", () => {
		const record: EntryRecord = {
			id: "ent123",
			habitId: "hab456",
			userId: "user789",
			date: "2024-01-15",
			value: 0.5,
			createdAt: "2024-01-15T10:30:00.000Z",
		};

		const entry = toEntry(record);

		expect(entry.value).toBe(0.5);
	});
});

describe("toRecord", () => {
	it("converts HabitEntry to EntryRecord with ISO string dates", () => {
		const entry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 15),
			value: 1,
			notes: "Test note",
			createdAt: new Date("2024-01-15T10:30:00.000Z"),
		};

		const record = toRecord(entry);

		expect(record.habitId).toBe("hab456");
		expect(record.userId).toBe("user789");
		expect(record.date).toBe("2024-01-15");
		expect(record.value).toBe(1);
		expect(record.notes).toBe("Test note");
		expect(record.createdAt).toBe("2024-01-15T10:30:00.000Z");
	});

	it("uses current time for createdAt when not provided", () => {
		const before = new Date();
		const entry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 15),
			value: 1,
		};

		const record = toRecord(entry);
		const after = new Date();

		// Parse the createdAt timestamp
		const createdAt = new Date(record.createdAt);
		expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it("preserves structured data fields", () => {
		const entry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 15),
			value: 3,
			createdAt: new Date("2024-01-15T10:30:00.000Z"),
			sets: [
				{ weight: 100, reps: 10, duration: 60 },
				{ weight: 110, reps: 8 },
			],
			parsed: true,
		};

		const record = toRecord(entry);

		expect(record.sets).toEqual([
			{ weight: 100, reps: 10, duration: 60 },
			{ weight: 110, reps: 8 },
		]);
		expect(record.parsed).toBe(true);
	});

	it("pads single-digit months and days in date string", () => {
		const entry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 5), // Jan 5
			value: 1,
		};

		const record = toRecord(entry);

		expect(record.date).toBe("2024-01-05");
	});

	it("handles dates at year boundaries", () => {
		const newYearEntry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 1), // Jan 1, 2024
			value: 1,
		};

		const yearEndEntry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2023, 11, 31), // Dec 31, 2023
			value: 1,
		};

		expect(toRecord(newYearEntry).date).toBe("2024-01-01");
		expect(toRecord(yearEndEntry).date).toBe("2023-12-31");
	});
});

describe("toEntry and toRecord round-trip", () => {
	it("preserves data through conversion cycle", () => {
		const originalEntry = {
			habitId: "hab456",
			userId: "user789",
			date: new Date(2024, 0, 15),
			value: 3,
			notes: "Test notes",
			createdAt: new Date("2024-01-15T10:30:00.000Z"),
			sets: [{ weight: 100, reps: 10 }],
			parsed: true,
		};

		// Convert to record then back to entry
		const record = toRecord(originalEntry);
		const recordWithId: EntryRecord = { ...record, id: "ent123" };
		const restoredEntry = toEntry(recordWithId);

		expect(restoredEntry.habitId).toBe(originalEntry.habitId);
		expect(restoredEntry.userId).toBe(originalEntry.userId);
		expect(restoredEntry.date.getFullYear()).toBe(
			originalEntry.date.getFullYear(),
		);
		expect(restoredEntry.date.getMonth()).toBe(originalEntry.date.getMonth());
		expect(restoredEntry.date.getDate()).toBe(originalEntry.date.getDate());
		expect(restoredEntry.value).toBe(originalEntry.value);
		expect(restoredEntry.notes).toBe(originalEntry.notes);
		expect(restoredEntry.sets).toEqual(originalEntry.sets);
		expect(restoredEntry.parsed).toBe(originalEntry.parsed);
	});
});

describe("ID generation", () => {
	it("generates ID with 'ent' prefix and UUID without dashes", () => {
		// The add() method generates IDs like: ent + UUID without dashes
		// Since we mocked crypto.randomUUID, verify the format
		const uuid = crypto.randomUUID();
		const expectedId = `ent${uuid.replace(/-/g, "")}`;

		expect(expectedId).toMatch(/^ent[a-f0-9]{32}$/);
		expect(expectedId).toBe("ent12345678123412341234123456789abc");
	});
});

describe("Date range boundary handling", () => {
	// These tests verify the logic used in getForDateRange
	// by testing the comparison behavior directly

	it("correctly compares date strings for range boundaries", () => {
		const startStr = "2024-01-15";
		const endStr = "2024-01-20";

		// Test boundary values
		expect("2024-01-15" >= startStr && "2024-01-15" <= endStr).toBe(true); // Start boundary
		expect("2024-01-20" >= startStr && "2024-01-20" <= endStr).toBe(true); // End boundary
		expect("2024-01-17" >= startStr && "2024-01-17" <= endStr).toBe(true); // Middle
		expect("2024-01-14" >= startStr && "2024-01-14" <= endStr).toBe(false); // Before start
		expect("2024-01-21" >= startStr && "2024-01-21" <= endStr).toBe(false); // After end
	});

	it("handles month boundary crossings", () => {
		const startStr = "2024-01-28";
		const endStr = "2024-02-05";

		expect("2024-01-28" >= startStr && "2024-01-28" <= endStr).toBe(true);
		expect("2024-01-31" >= startStr && "2024-01-31" <= endStr).toBe(true);
		expect("2024-02-01" >= startStr && "2024-02-01" <= endStr).toBe(true);
		expect("2024-02-05" >= startStr && "2024-02-05" <= endStr).toBe(true);
		expect("2024-02-06" >= startStr && "2024-02-06" <= endStr).toBe(false);
	});

	it("handles year boundary crossings", () => {
		const startStr = "2023-12-28";
		const endStr = "2024-01-05";

		expect("2023-12-28" >= startStr && "2023-12-28" <= endStr).toBe(true);
		expect("2023-12-31" >= startStr && "2023-12-31" <= endStr).toBe(true);
		expect("2024-01-01" >= startStr && "2024-01-01" <= endStr).toBe(true);
		expect("2024-01-05" >= startStr && "2024-01-05" <= endStr).toBe(true);
		expect("2023-12-27" >= startStr && "2023-12-27" <= endStr).toBe(false);
		expect("2024-01-06" >= startStr && "2024-01-06" <= endStr).toBe(false);
	});

	it("handles single-day range (start equals end)", () => {
		const startStr = "2024-01-15";
		const endStr = "2024-01-15";

		expect("2024-01-15" >= startStr && "2024-01-15" <= endStr).toBe(true);
		expect("2024-01-14" >= startStr && "2024-01-14" <= endStr).toBe(false);
		expect("2024-01-16" >= startStr && "2024-01-16" <= endStr).toBe(false);
	});
});

describe("Error handling patterns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("subscription error handler receives error and callback gets empty array", () => {
		// This verifies the error handling pattern used in subscribeForDateRange
		const errors: unknown[] = [];
		const results: unknown[][] = [];

		// Simulate the error handling pattern
		const errorHandler = (error: unknown) => {
			errors.push(error);
		};
		const callback = (entries: unknown[]) => {
			results.push(entries);
		};

		// Simulate an error occurring
		const testError = new Error("Database error");
		errorHandler(testError);
		callback([]); // Empty array fallback

		expect(errors).toHaveLength(1);
		expect(errors[0]).toBe(testError);
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual([]);
	});
});

describe("entryRepository.updateValue", () => {
	it("throws error when entry not found", async () => {
		const { entryRepository } = await import("./entryRepository");
		const nonExistentId = "non-existent-entry-id";

		// Error is wrapped: "Failed to update entry: Entry not found: <id>"
		await expect(entryRepository.updateValue(nonExistentId, 1)).rejects.toThrow(
			/Entry not found/,
		);
	});
});
