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
		const habits = [
			createMockHabit({ status: "done" }),
			createMockHabit({ status: "done" }),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(2);
		expect(summary.dueToday).toBe(2); // dueToday = total
		expect(summary.todayStatus).toBe("good");
	});

	it("returns warn status when some but not all done", () => {
		const habits = [
			createMockHabit({ status: "done" }),
			createMockHabit({ status: "today" }),
			createMockHabit({ status: "met" }),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(1);
		expect(summary.dueToday).toBe(3); // dueToday = total
		expect(summary.todayStatus).toBe("warn");
	});

	it("returns bad status when none done", () => {
		const habits = [
			createMockHabit({ status: "today" }),
			createMockHabit({ status: "met" }),
		];

		const summary = getCategorySummary(habits);

		expect(summary.doneToday).toBe(0);
		expect(summary.dueToday).toBe(2); // dueToday = total
		expect(summary.todayStatus).toBe("bad");
	});

	it("calculates total status correctly", () => {
		const habits = [
			createMockHabit({ status: "met" }),
			createMockHabit({ status: "met" }),
			createMockHabit({ status: "today" }),
		];

		const summary = getCategorySummary(habits);

		expect(summary.met).toBe(2);
		expect(summary.total).toBe(3);
		expect(summary.totalStatus).toBe("warn");
	});

	it("returns good total status when all met", () => {
		const habits = [
			createMockHabit({ status: "met" }),
			createMockHabit({ status: "met" }),
		];

		const summary = getCategorySummary(habits);

		expect(summary.totalStatus).toBe("good");
	});

	it("counts done status as met for weekly total", () => {
		const habits = [
			createMockHabit({ status: "done" }), // met target AND done today
			createMockHabit({ status: "done" }), // met target AND done today
			createMockHabit({ status: "met" }), // met target but not done today
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
		const habits = [
			createMockHabit({ id: "1", name: "TGU 28KG", status: "tomorrow" }),
			createMockHabit({ id: "2", name: "TGU 32KG", status: "met" }),
			createMockHabit({ id: "3", name: "1H Swings 28KG", status: "done" }),
			createMockHabit({ id: "4", name: "1H Swings 32KG", status: "tomorrow" }),
			createMockHabit({ id: "5", name: "Pistols", status: "done" }),
			createMockHabit({ id: "6", name: "L-Sit Hangs", status: "tomorrow" }),
			createMockHabit({ id: "7", name: "Pull Ups", status: "overdue" }),
			createMockHabit({ id: "8", name: "Kettlebility", status: "tomorrow" }),
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
			createMockHabit({ status: "today" }),
			createMockHabit({ status: "overdue" }),
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
			createMockHabit({ id: "1", category: "mobility" }),
			createMockHabit({ id: "2", category: "mobility" }),
			createMockHabit({ id: "3", category: "joy" }),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		const mobility = sections.find((s) => s.category === "mobility");
		const joy = sections.find((s) => s.category === "joy");
		const connection = sections.find((s) => s.category === "connection");

		expect(mobility?.habits).toHaveLength(2);
		expect(joy?.habits).toHaveLength(1);
		expect(connection?.habits).toHaveLength(0);
	});

	it("respects collapsed state", () => {
		const habits = [createMockHabit({ category: "mobility" })];
		const collapsed = new Set(["mobility", "joy"]);

		const sections = groupHabitsByCategory(habits, collapsed);

		const mobility = sections.find((s) => s.category === "mobility");
		const joy = sections.find((s) => s.category === "joy");
		const connection = sections.find((s) => s.category === "connection");

		expect(mobility?.isCollapsed).toBe(true);
		expect(joy?.isCollapsed).toBe(true);
		expect(connection?.isCollapsed).toBe(false);
	});

	it("returns all 5 categories", () => {
		const sections = groupHabitsByCategory([], new Set());
		expect(sections).toHaveLength(5);
		expect(sections.map((s) => s.category)).toEqual([
			"mobility",
			"connection",
			"balance",
			"joy",
			"strength",
		]);
	});
});

describe("calculateSummaryStats", () => {
	it("calculates all stats correctly", () => {
		const habits = [
			createMockHabit({ status: "today" }),
			createMockHabit({ status: "today" }),
			createMockHabit({ status: "overdue" }),
			createMockHabit({ status: "done" }),
			createMockHabit({ status: "met" }),
			createMockHabit({ status: "met" }),
		];

		const stats = calculateSummaryStats(habits);

		expect(stats.dueToday).toBe(2);
		expect(stats.overdue).toBe(1);
		expect(stats.doneToday).toBe(1);
		expect(stats.onTrack).toBe(3); // done + 2 met = 3 on track
	});

	it("returns zeros for empty habits", () => {
		const stats = calculateSummaryStats([]);

		expect(stats.dueToday).toBe(0);
		expect(stats.overdue).toBe(0);
		expect(stats.doneToday).toBe(0);
		expect(stats.onTrack).toBe(0);
	});
});
