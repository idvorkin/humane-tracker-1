import { beforeEach, describe, expect, it, vi } from "vitest";
import { runImportTransaction } from "./transactions";
import type { Habit, HabitEntry } from "../types/habit";
import type { AffirmationLog } from "./affirmationLogRepository";

// Mock dependencies
vi.mock("../config/db", () => ({
	db: {
		habits: {},
		entries: {},
		affirmationLogs: {},
		transaction: vi.fn(),
	},
}));

vi.mock("./habitRepository", () => ({
	habitRepository: {
		clear: vi.fn(),
		bulkPut: vi.fn(),
	},
}));

vi.mock("./entryRepository", () => ({
	entryRepository: {
		clear: vi.fn(),
		bulkPut: vi.fn(),
	},
}));

vi.mock("./affirmationLogRepository", () => ({
	affirmationLogRepository: {
		clear: vi.fn(),
		bulkPut: vi.fn(),
	},
}));

// Import mocked modules
import { db } from "../config/db";
import { habitRepository } from "./habitRepository";
import { entryRepository } from "./entryRepository";
import { affirmationLogRepository } from "./affirmationLogRepository";

// Helper to create mock data
function createMockHabit(id: string, name: string): Habit {
	return {
		id,
		name,
		category: "health",
		targetPerWeek: 3,
		userId: "user123",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

function createMockEntry(id: string, habitId: string): HabitEntry {
	return {
		id,
		habitId,
		userId: "user123",
		date: new Date(),
		value: 1,
		createdAt: new Date(),
	};
}

function createMockAffirmationLog(id: string, title: string): AffirmationLog {
	return {
		id,
		userId: "user123",
		affirmationTitle: title,
		logType: "didit",
		note: "Test note",
		date: new Date(),
		createdAt: new Date(),
	};
}

describe("runImportTransaction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock: execute transaction callback immediately
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(db.transaction).mockImplementation((async (...args: any[]) => {
			const callback = args[args.length - 1];
			if (typeof callback === "function") {
				await callback();
			}
		}) as typeof db.transaction);
	});

	describe("replace mode", () => {
		it("clears all tables before inserting data", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "replace");

			expect(habitRepository.clear).toHaveBeenCalled();
			expect(entryRepository.clear).toHaveBeenCalled();
			expect(affirmationLogRepository.clear).toHaveBeenCalled();
		});

		it("clears tables before bulkPut operations", async () => {
			const callOrder: string[] = [];

			vi.mocked(habitRepository.clear).mockImplementation(async () => {
				callOrder.push("habit-clear");
			});
			vi.mocked(entryRepository.clear).mockImplementation(async () => {
				callOrder.push("entry-clear");
			});
			vi.mocked(affirmationLogRepository.clear).mockImplementation(async () => {
				callOrder.push("affirmation-clear");
			});
			vi.mocked(habitRepository.bulkPut).mockImplementation(async () => {
				callOrder.push("habit-bulkPut");
			});
			vi.mocked(entryRepository.bulkPut).mockImplementation(async () => {
				callOrder.push("entry-bulkPut");
			});

			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "replace");

			// Verify clear operations happen before bulkPut
			expect(callOrder.indexOf("habit-clear")).toBeLessThan(
				callOrder.indexOf("habit-bulkPut"),
			);
			expect(callOrder.indexOf("entry-clear")).toBeLessThan(
				callOrder.indexOf("entry-bulkPut"),
			);
		});

		it("inserts habits and entries after clearing", async () => {
			const habits = [
				createMockHabit("h1", "Exercise"),
				createMockHabit("h2", "Read"),
			];
			const entries = [
				createMockEntry("e1", "h1"),
				createMockEntry("e2", "h2"),
			];

			await runImportTransaction(habits, entries, "replace");

			expect(habitRepository.bulkPut).toHaveBeenCalledWith(habits);
			expect(entryRepository.bulkPut).toHaveBeenCalledWith(entries);
		});

		it("inserts affirmation logs when provided", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];
			const logs = [createMockAffirmationLog("a1", "Be kind")];

			await runImportTransaction(habits, entries, "replace", logs);

			expect(affirmationLogRepository.bulkPut).toHaveBeenCalledWith(logs);
		});

		it("does not call affirmation bulkPut when logs array is empty", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "replace", []);

			expect(affirmationLogRepository.clear).toHaveBeenCalled();
			expect(affirmationLogRepository.bulkPut).not.toHaveBeenCalled();
		});
	});

	describe("merge mode", () => {
		it("does NOT clear tables in merge mode", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "merge");

			expect(habitRepository.clear).not.toHaveBeenCalled();
			expect(entryRepository.clear).not.toHaveBeenCalled();
			expect(affirmationLogRepository.clear).not.toHaveBeenCalled();
		});

		it("inserts data without clearing in merge mode", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "merge");

			expect(habitRepository.bulkPut).toHaveBeenCalledWith(habits);
			expect(entryRepository.bulkPut).toHaveBeenCalledWith(entries);
		});

		it("inserts affirmation logs in merge mode when provided", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];
			const logs = [createMockAffirmationLog("a1", "Be kind")];

			await runImportTransaction(habits, entries, "merge", logs);

			expect(affirmationLogRepository.bulkPut).toHaveBeenCalledWith(logs);
		});
	});

	describe("transaction behavior", () => {
		it("wraps all operations in a database transaction", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "merge");

			expect(db.transaction).toHaveBeenCalledWith(
				"rw",
				db.habits,
				db.entries,
				db.affirmationLogs,
				expect.any(Function),
			);
		});

		it("propagates errors from transaction callback", async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.mocked(db.transaction).mockImplementation((async (...args: any[]) => {
				const callback = args[args.length - 1];
				if (typeof callback === "function") {
					await callback();
				}
			}) as typeof db.transaction);
			vi.mocked(habitRepository.bulkPut).mockRejectedValue(
				new Error("BulkPut failed"),
			);

			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await expect(
				runImportTransaction(habits, entries, "merge"),
			).rejects.toThrow("BulkPut failed");
		});

		it("propagates transaction-level errors", async () => {
			vi.mocked(db.transaction).mockRejectedValue(
				new Error("Transaction failed"),
			);

			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await expect(
				runImportTransaction(habits, entries, "merge"),
			).rejects.toThrow("Transaction failed");
		});

		it("does not call bulkPut if clear fails in replace mode", async () => {
			vi.mocked(habitRepository.clear).mockRejectedValue(
				new Error("Clear failed"),
			);

			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await expect(
				runImportTransaction(habits, entries, "replace"),
			).rejects.toThrow("Clear failed");

			// Since clear throws, bulkPut should not be called
			// (transaction stops at first error)
			expect(habitRepository.bulkPut).not.toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		beforeEach(() => {
			// Reset mocks specifically for edge cases since earlier tests may have set rejections
			vi.mocked(habitRepository.bulkPut).mockResolvedValue(undefined);
			vi.mocked(entryRepository.bulkPut).mockResolvedValue(undefined);
			vi.mocked(affirmationLogRepository.bulkPut).mockResolvedValue(undefined);
		});

		it("handles empty habits array", async () => {
			const habits: Habit[] = [];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "merge");

			expect(habitRepository.bulkPut).toHaveBeenCalledWith([]);
		});

		it("handles empty entries array", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries: HabitEntry[] = [];

			await runImportTransaction(habits, entries, "merge");

			expect(entryRepository.bulkPut).toHaveBeenCalledWith([]);
		});

		it("handles undefined affirmation logs", async () => {
			const habits = [createMockHabit("h1", "Exercise")];
			const entries = [createMockEntry("e1", "h1")];

			await runImportTransaction(habits, entries, "merge", undefined);

			expect(affirmationLogRepository.bulkPut).not.toHaveBeenCalled();
		});

		it("handles large data sets", async () => {
			const habits = Array.from({ length: 100 }, (_, i) =>
				createMockHabit(`h${i}`, `Habit ${i}`),
			);
			const entries = Array.from({ length: 1000 }, (_, i) =>
				createMockEntry(`e${i}`, `h${i % 100}`),
			);

			await runImportTransaction(habits, entries, "merge");

			expect(habitRepository.bulkPut).toHaveBeenCalledWith(habits);
			expect(entryRepository.bulkPut).toHaveBeenCalledWith(entries);
		});
	});
});
