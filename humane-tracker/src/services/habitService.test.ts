import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import type { Habit, HabitEntry } from "../types/habit";
import {
	calculateHabitStatus,
	computeTagStatus,
	validateCategory,
	validateHabitName,
	validateTargetPerWeek,
} from "./habitService";

// Helper to create dates relative to a base date
function daysAgo(days: number, baseDate: Date = new Date()): Date {
	return addDays(baseDate, -days);
}

// Helper to create a mock habit
function createHabit(targetPerWeek: number, name = "Test Habit") {
	return { name, targetPerWeek };
}

// Helper to create a mock entry
function createEntry(date: Date, value = 1) {
	return { date, value };
}

describe("calculateHabitStatus", () => {
	// Use a fixed date for consistent testing
	const today = new Date("2024-11-29T12:00:00");

	describe("target met scenarios", () => {
		it("returns 'done' when target met AND done today", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(today, 1), // today
				createEntry(daysAgo(1, today), 1), // yesterday
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done");
		});

		it("returns 'met' when target met but NOT done today", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(daysAgo(1, today), 1), // yesterday
				createEntry(daysAgo(2, today), 1), // 2 days ago
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("met");
		});

		it("returns 'done' when target exceeded AND done today", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(today, 1),
				createEntry(daysAgo(1, today), 1),
				createEntry(daysAgo(2, today), 1), // exceeded target
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done");
		});
	});

	describe("target not met scenarios", () => {
		it("returns 'today' when no entries at all", () => {
			const habit = createHabit(2);
			const entries: { date: Date; value: number }[] = [];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("today");
		});

		it("returns 'tomorrow' when some progress but not done today", () => {
			const habit = createHabit(3);
			const entries = [
				createEntry(daysAgo(1, today), 1), // 1 of 3, not done today
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("tomorrow");
		});

		it("returns 'pending' when done today but target not met yet", () => {
			const habit = createHabit(3);
			const entries = [
				createEntry(today, 1), // done today, 1 of 3
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("pending");
		});
	});

	describe("trailing 7-day window", () => {
		it("counts entries from trailing 7 days only", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(daysAgo(1, today), 1), // yesterday - counts
				createEntry(daysAgo(6, today), 1), // 6 days ago - counts (edge of window)
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("met"); // 2 entries in window
		});

		it("ignores entries older than 7 days", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(daysAgo(1, today), 1), // yesterday - counts
				createEntry(daysAgo(7, today), 1), // 7 days ago - outside window
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("tomorrow"); // only 1 entry counts
		});

		it("includes today in the 7-day window", () => {
			const habit = createHabit(1);
			const entries = [createEntry(today, 1)];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done"); // today counts
		});
	});

	describe("counts unique days not total entries", () => {
		it("counts each day only once regardless of entry value", () => {
			const habit = createHabit(2);
			const entries = [
				createEntry(today, 5), // high value, but still just 1 day
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("pending"); // only 1 day, need 2
		});

		it("counts multiple entries on same day as one day", () => {
			const habit = createHabit(2);
			// Two entries on today (shouldn't happen but test the logic)
			const entries = [createEntry(today, 1), createEntry(today, 1)];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("pending"); // still just 1 day
		});
	});

	describe("handles date as string (from IndexedDB)", () => {
		it("works when date is ISO string instead of Date object", () => {
			const habit = createHabit(2);
			const entries = [
				{ date: today.toISOString() as unknown as Date, value: 1 },
				{ date: daysAgo(1, today).toISOString() as unknown as Date, value: 1 },
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done");
		});
	});

	describe("real scenario: strength building habits", () => {
		it("matches expected behavior for TGU 32KG", () => {
			// Target: 1/week, entry 6 days ago (within window)
			const habit = createHabit(1, "TGU 32KG");
			const entries = [createEntry(daysAgo(6, today), 1)];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("met");
		});

		it("matches expected behavior for 1H Swings 28KG", () => {
			// Target: 2/week, entries today (5 reps) and yesterday
			const habit = createHabit(2, "1H Swings - 28 KG");
			const entries = [
				createEntry(today, 5),
				createEntry(daysAgo(1, today), 1),
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done");
		});

		it("matches expected behavior for Pistols", () => {
			// Target: 2/week, entries today and 2 days ago
			const habit = createHabit(2, "Pistols");
			const entries = [
				createEntry(today, 1),
				createEntry(daysAgo(2, today), 5),
			];

			const status = calculateHabitStatus(habit, entries, today);

			expect(status).toBe("done");
		});
	});
});

describe("validateCategory", () => {
	it("returns trimmed category for valid input", () => {
		expect(validateCategory("Mobility")).toBe("Mobility");
		expect(validateCategory("  Mobility  ")).toBe("Mobility");
	});

	it("throws for empty string", () => {
		expect(() => validateCategory("")).toThrow("Category cannot be empty");
	});

	it("throws for whitespace-only string", () => {
		expect(() => validateCategory("   ")).toThrow("Category cannot be empty");
		expect(() => validateCategory("\t")).toThrow("Category cannot be empty");
	});
});

describe("validateHabitName", () => {
	it("returns trimmed name for valid input", () => {
		expect(validateHabitName("Morning Walk")).toBe("Morning Walk");
		expect(validateHabitName("  Morning Walk  ")).toBe("Morning Walk");
	});

	it("throws for empty string", () => {
		expect(() => validateHabitName("")).toThrow("Habit name cannot be empty");
	});

	it("throws for whitespace-only string", () => {
		expect(() => validateHabitName("   ")).toThrow(
			"Habit name cannot be empty",
		);
	});
});

describe("validateTargetPerWeek", () => {
	it("returns value within bounds", () => {
		expect(validateTargetPerWeek(1)).toBe(1);
		expect(validateTargetPerWeek(3)).toBe(3);
		expect(validateTargetPerWeek(7)).toBe(7);
	});

	it("clamps values below minimum to 1", () => {
		expect(validateTargetPerWeek(0)).toBe(1);
		expect(validateTargetPerWeek(-5)).toBe(1);
	});

	it("clamps values above maximum to 7", () => {
		expect(validateTargetPerWeek(8)).toBe(7);
		expect(validateTargetPerWeek(100)).toBe(7);
	});

	it("returns default for NaN", () => {
		expect(validateTargetPerWeek(NaN)).toBe(3);
	});

	it("returns default for non-number input", () => {
		expect(validateTargetPerWeek("five" as unknown as number)).toBe(3);
	});
});

// Helpers for tag tests
function createFullHabit(overrides: Partial<Habit> = {}): Habit {
	return {
		id: "test-id",
		name: "Test Habit",
		category: "Mobility",
		targetPerWeek: 3,
		userId: "user-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		habitType: "raw",
		...overrides,
	};
}

function createFullEntry(overrides: Partial<HabitEntry> = {}): HabitEntry {
	return {
		id: "entry-id",
		habitId: "test-id",
		userId: "user-1",
		date: new Date(),
		value: 1,
		createdAt: new Date(),
		...overrides,
	};
}

describe("computeTagStatus (single-complete model)", () => {
	/**
	 * Tags are virtual habits - they aggregate children's entries.
	 * This function computes synthetic entries and counts for a tag
	 * based on its children's entries.
	 *
	 * Key principle: A tag is "completed" for a day if ANY child
	 * has ANY entry for that day. This is humane - showing up matters.
	 */

	const today = new Date("2024-01-15T12:00:00");

	it("returns synthetic entries for each day any child has an entry", () => {
		// Use dates in the past relative to "today" (Jan 17)
		const monday = new Date("2024-01-15");
		const wednesday = new Date("2024-01-17");

		const tag = createFullHabit({
			id: "tag-1",
			name: "Shoulder Accessory",
			habitType: "tag",
			childIds: ["raw-1", "raw-2"],
		});

		const allHabits: Habit[] = [
			tag,
			createFullHabit({
				id: "raw-1",
				name: "Shoulder Y",
				habitType: "raw",
				parentIds: ["tag-1"],
			}),
			createFullHabit({
				id: "raw-2",
				name: "Wall Slide",
				habitType: "raw",
				parentIds: ["tag-1"],
			}),
		];

		const allEntries: HabitEntry[] = [
			createFullEntry({ id: "e1", habitId: "raw-1", date: monday }),
			createFullEntry({ id: "e2", habitId: "raw-2", date: wednesday }),
		];

		// Use Wednesday as "today" so both dates are in the trailing window
		const result = computeTagStatus(tag, allHabits, allEntries, wednesday);

		// Should have 2 synthetic entries (one per unique day)
		expect(result.entries).toHaveLength(2);
		expect(result.currentWeekCount).toBe(2);
	});

	it("creates one synthetic entry per day even if multiple children done", () => {
		const monday = new Date("2024-01-15");

		const tag = createFullHabit({
			id: "tag-1",
			habitType: "tag",
			childIds: ["raw-1", "raw-2"],
		});

		const allHabits: Habit[] = [
			tag,
			createFullHabit({ id: "raw-1", habitType: "raw", parentIds: ["tag-1"] }),
			createFullHabit({ id: "raw-2", habitType: "raw", parentIds: ["tag-1"] }),
		];

		// Both children done on Monday
		const allEntries: HabitEntry[] = [
			createFullEntry({ id: "e1", habitId: "raw-1", date: monday }),
			createFullEntry({ id: "e2", habitId: "raw-2", date: monday }),
		];

		const result = computeTagStatus(tag, allHabits, allEntries, today);

		// Single-complete: only 1 entry for Monday, not 2
		expect(result.entries).toHaveLength(1);
		expect(result.currentWeekCount).toBe(1);
	});

	it("synthetic entries always have value=1 (binary completion)", () => {
		const monday = new Date("2024-01-15");

		const tag = createFullHabit({
			id: "tag-1",
			habitType: "tag",
			childIds: ["raw-1"],
		});

		const allHabits: Habit[] = [
			tag,
			createFullHabit({ id: "raw-1", habitType: "raw", parentIds: ["tag-1"] }),
		];

		// Child has entry with value=5
		const allEntries: HabitEntry[] = [
			createFullEntry({ id: "e1", habitId: "raw-1", date: monday, value: 5 }),
		];

		const result = computeTagStatus(tag, allHabits, allEntries, today);

		// Tag entry should be value=1 (completed), not 5
		expect(result.entries[0].value).toBe(1);
	});

	it("returns empty entries array when no children have entries", () => {
		const tag = createFullHabit({
			id: "tag-1",
			habitType: "tag",
			childIds: ["raw-1"],
		});

		const allHabits: Habit[] = [
			tag,
			createFullHabit({ id: "raw-1", habitType: "raw", parentIds: ["tag-1"] }),
		];

		const allEntries: HabitEntry[] = []; // No entries

		const result = computeTagStatus(tag, allHabits, allEntries, today);

		expect(result.entries).toHaveLength(0);
		expect(result.currentWeekCount).toBe(0);
	});

	it("includes entries from nested tags (grandchildren)", () => {
		const monday = new Date("2024-01-15");

		// Parent tag -> Child tag -> Raw habit
		const parentTag = createFullHabit({
			id: "parent-tag",
			habitType: "tag",
			childIds: ["child-tag"],
		});

		const childTag = createFullHabit({
			id: "child-tag",
			habitType: "tag",
			childIds: ["raw-1"],
			parentIds: ["parent-tag"],
		});

		const rawHabit = createFullHabit({
			id: "raw-1",
			habitType: "raw",
			parentIds: ["child-tag"],
		});

		const allHabits: Habit[] = [parentTag, childTag, rawHabit];

		const allEntries: HabitEntry[] = [
			createFullEntry({ id: "e1", habitId: "raw-1", date: monday }),
		];

		const result = computeTagStatus(parentTag, allHabits, allEntries, today);

		// Parent tag should see the grandchild's entry
		expect(result.entries).toHaveLength(1);
		expect(result.currentWeekCount).toBe(1);
	});

	it("calculates correct status based on target and entries", () => {
		const monday = new Date("2024-01-15");
		const tuesday = new Date("2024-01-16");
		const wednesday = new Date("2024-01-17");

		const tag = createFullHabit({
			id: "tag-1",
			habitType: "tag",
			childIds: ["raw-1"],
			targetPerWeek: 3, // Need 3 days
		});

		const allHabits: Habit[] = [
			tag,
			createFullHabit({ id: "raw-1", habitType: "raw", parentIds: ["tag-1"] }),
		];

		// 3 days of entries - should meet target
		const allEntries: HabitEntry[] = [
			createFullEntry({ id: "e1", habitId: "raw-1", date: monday }),
			createFullEntry({ id: "e2", habitId: "raw-1", date: tuesday }),
			createFullEntry({
				id: "e3",
				habitId: "raw-1",
				date: wednesday, // This is "today" in our test
			}),
		];

		const result = computeTagStatus(tag, allHabits, allEntries, wednesday);

		expect(result.currentWeekCount).toBe(3);
		expect(result.status).toBe("done"); // Met target AND done today
	});
});
