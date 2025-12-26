import { describe, expect, it } from "vitest";
import type { HabitWithStatus } from "../types/habit";
import {
	calculateSummaryStats,
	getCategorySummary,
	getCellDisplay,
	getNextEntryValue,
	getStatusIcon,
	getTrailingWeekDates,
	groupHabitsByCategory,
	shouldConfirmDateModification,
} from "./useHabitTrackerVM";

// Helper to create a mock habit
function createMockHabit(
	overrides: Partial<HabitWithStatus> = {},
): HabitWithStatus {
	return {
		id: "test-id",
		name: "Test Habit",
		category: "mobility",
		targetPerWeek: 3,
		userId: "user-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		status: "today",
		currentWeekCount: 0,
		entries: [],
		...overrides,
	};
}

describe("getCategorySummary", () => {
	it("returns neutral status when no habits in category", () => {
		const habits: HabitWithStatus[] = [];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(0);
		expect(summary.dueToday).toBe(0);
		expect(summary.todayStatus).toBe("neutral");
	});

	it("returns good status when all habits done today", () => {
		const today = new Date();
		const habits = [
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e1",
						habitId: "h1",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e2",
						habitId: "h2",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(2);
		expect(summary.dueToday).toBe(2); // dueToday = total
		expect(summary.todayStatus).toBe("good");
	});

	it("returns warn status when some but not all done", () => {
		const today = new Date();
		const habits = [
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e1",
						habitId: "h1",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "today",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				entries: [],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(1);
		expect(summary.dueToday).toBe(3); // dueToday = total
		expect(summary.todayStatus).toBe("warn");
	});

	it("returns bad status when none done", () => {
		const habits = [
			createMockHabit({
				status: "today",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				entries: [],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(0);
		expect(summary.dueToday).toBe(2); // dueToday = total
		expect(summary.todayStatus).toBe("bad");
	});

	it("calculates total status correctly", () => {
		const habits = [
			createMockHabit({
				status: "met",
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "today",
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.met).toBe(2);
		expect(summary.total).toBe(3);
		expect(summary.totalStatus).toBe("warn");
	});

	it("returns good total status when all met", () => {
		const habits = [
			createMockHabit({
				status: "met",
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.totalStatus).toBe("good");
	});

	it("counts done status as met for weekly total", () => {
		const today = new Date();
		const habits = [
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e1",
						habitId: "h1",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}), // met target AND done today
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e2",
						habitId: "h2",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}), // met target AND done today
			createMockHabit({
				status: "met",
				entries: [],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}), // met target but not done today
		];

		const summary = getCategorySummary(habits);

		expect(summary.met).toBe(3); // all 3 should count as met
		expect(summary.totalStatus).toBe("good");
	});

	it("matches real scenario: strength building category", () => {
		// Real scenario from Igor's screenshot:
		// TGU 28KG: 0/2 - not met, not done today -> "today" or similar
		// TGU 32KG: 1/1 - met, not done today -> "met"
		// 1H Swings 28KG: 2/2 - met AND done today -> "done"
		// 1H Swings 32KG: 0/1 - not met -> "tomorrow" or similar
		// Pistols: 2/2 - met AND done today -> "done"
		// L-Sit Hangs: 0/2 - not met -> "tomorrow"
		// Pull Ups: 0/3 - not met -> "overdue" (needs 3, only 2 days left)
		// Kettlebility: 0/2 - not met -> "tomorrow"
		const today = new Date();
		const habits = [
			createMockHabit({
				id: "1",
				name: "TGU 28KG",
				status: "tomorrow",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 2,
			}),
			createMockHabit({
				id: "2",
				name: "TGU 32KG",
				status: "met",
				entries: [],
				currentWeekCount: 1,
				targetPerWeek: 1,
			}),
			createMockHabit({
				id: "3",
				name: "1H Swings 28KG",
				status: "done",
				entries: [
					{
						id: "e3",
						habitId: "3",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 2,
				targetPerWeek: 2,
			}),
			createMockHabit({
				id: "4",
				name: "1H Swings 32KG",
				status: "tomorrow",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 1,
			}),
			createMockHabit({
				id: "5",
				name: "Pistols",
				status: "done",
				entries: [
					{
						id: "e5",
						habitId: "5",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 2,
				targetPerWeek: 2,
			}),
			createMockHabit({
				id: "6",
				name: "L-Sit Hangs",
				status: "tomorrow",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 2,
			}),
			createMockHabit({
				id: "7",
				name: "Pull Ups",
				status: "overdue",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				id: "8",
				name: "Kettlebility",
				status: "tomorrow",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 2,
			}),
		];

		const summary = getCategorySummary(habits);

		// Expected: 2 done today (1H Swings 28KG, Pistols)
		expect(summary.doneToday).toBe(2);
		// Expected: 3 met (TGU 32KG + 1H Swings 28KG + Pistols)
		expect(summary.met).toBe(3);
		expect(summary.total).toBe(8);
		expect(summary.todayStatus).toBe("warn"); // some done, not all
		expect(summary.totalStatus).toBe("warn"); // some met, not all
	});

	it("returns bad total status when none met", () => {
		const habits = [
			createMockHabit({
				status: "today",
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "overdue",
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
		];

		const summary = getCategorySummary(habits);

		expect(summary.totalStatus).toBe("bad");
	});
});

describe("getStatusIcon", () => {
	it("returns correct icons for each status", () => {
		expect(getStatusIcon("done")).toBe("●");
		expect(getStatusIcon("met")).toBe("✓");
		expect(getStatusIcon("today")).toBe("⏰");
		expect(getStatusIcon("tomorrow")).toBe("→");
		expect(getStatusIcon("overdue")).toBe("!");
		expect(getStatusIcon("pending")).toBe("");
		expect(getStatusIcon("soon")).toBe("");
	});
});

describe("getCellDisplay", () => {
	it("returns empty for no entry", () => {
		const habit = createMockHabit({ entries: [] });
		const date = new Date("2024-01-15");

		const display = getCellDisplay(habit, date);

		expect(display.content).toBe("");
		expect(display.className).toBe("");
	});

	it("returns checkmark for value 1", () => {
		const date = new Date("2024-01-15");
		const habit = createMockHabit({
			entries: [
				{
					id: "e1",
					habitId: "test-id",
					userId: "user-1",
					date,
					value: 1,
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(habit, date);

		expect(display.content).toBe("✓");
		expect(display.className).toBe("completed");
	});

	it("returns half for value 0.5", () => {
		const date = new Date("2024-01-15");
		const habit = createMockHabit({
			entries: [
				{
					id: "e1",
					habitId: "test-id",
					userId: "user-1",
					date,
					value: 0.5,
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(habit, date);

		expect(display.content).toBe("½");
		expect(display.className).toBe("partial");
	});

	it("returns number for value > 1", () => {
		const date = new Date("2024-01-15");
		const habit = createMockHabit({
			entries: [
				{
					id: "e1",
					habitId: "test-id",
					userId: "user-1",
					date,
					value: 3,
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(habit, date);

		expect(display.content).toBe("3");
		expect(display.className).toBe("completed");
	});
});

describe("getNextEntryValue", () => {
	it("cycles through values correctly", () => {
		expect(getNextEntryValue(null)).toBe(1);
		expect(getNextEntryValue(1)).toBe(2);
		expect(getNextEntryValue(2)).toBe(3);
		expect(getNextEntryValue(3)).toBe(4);
		expect(getNextEntryValue(4)).toBe(5);
		expect(getNextEntryValue(5)).toBe(0.5);
		expect(getNextEntryValue(0.5)).toBe(null);
	});
});

describe("getTrailingWeekDates", () => {
	it("returns 7 dates", () => {
		const dates = getTrailingWeekDates();
		expect(dates).toHaveLength(7);
	});

	it("starts with today", () => {
		const dates = getTrailingWeekDates();
		const today = new Date();
		expect(dates[0].toDateString()).toBe(today.toDateString());
	});

	it("goes backwards in time", () => {
		const dates = getTrailingWeekDates();
		for (let i = 1; i < dates.length; i++) {
			expect(dates[i].getTime()).toBeLessThan(dates[i - 1].getTime());
		}
	});
});

describe("groupHabitsByCategory", () => {
	it("groups habits into correct categories", () => {
		const habits = [
			createMockHabit({ id: "1", category: "Mobility" }),
			createMockHabit({ id: "2", category: "Mobility" }),
			createMockHabit({ id: "3", category: "Smile and Wonder" }),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		const mobility = sections.find((s) => s.category === "Mobility");
		const joy = sections.find((s) => s.category === "Smile and Wonder");

		expect(mobility?.habits).toHaveLength(2);
		expect(joy?.habits).toHaveLength(1);
		// With dynamic categories, only categories with habits appear
		expect(sections).toHaveLength(2);
	});

	it("respects collapsed state", () => {
		const habits = [createMockHabit({ category: "Mobility" })];
		const collapsed = new Set(["Mobility"]);

		const sections = groupHabitsByCategory(habits, collapsed);

		const mobility = sections.find((s) => s.category === "Mobility");

		expect(mobility?.isCollapsed).toBe(true);
	});

	it("returns empty array for empty habits (dynamic categories)", () => {
		const sections = groupHabitsByCategory([], new Set());
		// With dynamic categories derived from habits, empty habits = no categories
		expect(sections).toHaveLength(0);
	});

	it("uses raw category values without migration", () => {
		// Legacy values are no longer auto-migrated at read time
		// Migration is explicit via HabitSettings migration button
		const habits = [
			createMockHabit({ id: "1", category: "mobility" }),
			createMockHabit({ id: "2", category: "joy" }),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		// Should use raw category values - no auto-migration
		const mobility = sections.find((s) => s.category === "mobility");
		const joy = sections.find((s) => s.category === "joy");

		expect(mobility?.habits).toHaveLength(1);
		expect(joy?.habits).toHaveLength(1);
	});

	it("preserves first-appearance ordering of categories", () => {
		const habits = [
			createMockHabit({ id: "1", category: "Smile and Wonder" }),
			createMockHabit({ id: "2", category: "Mobility" }),
			createMockHabit({ id: "3", category: "Smile and Wonder" }),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		// Smile and Wonder appears first in the habits list, so it should be first
		expect(sections[0].category).toBe("Smile and Wonder");
		expect(sections[1].category).toBe("Mobility");
	});
});

describe("calculateSummaryStats", () => {
	it("calculates all stats correctly", () => {
		const today = new Date();
		const habits = [
			createMockHabit({
				status: "today",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "today",
				entries: [],
				currentWeekCount: 1,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "overdue",
				entries: [],
				currentWeekCount: 0,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "done",
				entries: [
					{
						id: "e1",
						habitId: "h1",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				entries: [],
				currentWeekCount: 3,
				targetPerWeek: 3,
			}),
			createMockHabit({
				status: "met",
				entries: [],
				currentWeekCount: 2,
				targetPerWeek: 2,
			}),
		];

		const stats = calculateSummaryStats(habits);

		expect(stats.dueToday).toBe(2);
		expect(stats.overdue).toBe(1);
		expect(stats.doneToday).toBe(1); // Only 1 habit has entry today
		expect(stats.onTrack).toBe(3); // 3 habits met their weekly target (currentWeekCount >= targetPerWeek)
	});

	it("returns zeros for empty habits", () => {
		const stats = calculateSummaryStats([]);

		expect(stats.dueToday).toBe(0);
		expect(stats.overdue).toBe(0);
		expect(stats.doneToday).toBe(0);
		expect(stats.onTrack).toBe(0);
	});
});

describe("shouldConfirmDateModification", () => {
	it("returns false for today (no confirmation needed)", () => {
		const today = new Date();

		expect(shouldConfirmDateModification(today, null)).toBe(false);
	});

	it("returns true for yesterday (confirmation needed)", () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		expect(shouldConfirmDateModification(yesterday, null)).toBe(true);
	});

	it("returns true for older dates (confirmation needed)", () => {
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);

		expect(shouldConfirmDateModification(weekAgo, null)).toBe(true);
	});

	it("returns false when date matches selected date (no confirmation needed)", () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const selectedDate = new Date(yesterday);

		expect(shouldConfirmDateModification(yesterday, selectedDate)).toBe(false);
	});

	it("returns true for non-today date when different date is selected", () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const twoDaysAgo = new Date();
		twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

		// Modifying yesterday while two days ago is selected
		expect(shouldConfirmDateModification(yesterday, twoDaysAgo)).toBe(true);
	});

	it("returns false for today even when another date is selected", () => {
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		// Today should never need confirmation, regardless of selection
		expect(shouldConfirmDateModification(today, yesterday)).toBe(false);
	});
});
