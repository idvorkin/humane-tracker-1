import { describe, expect, it } from "vitest";
import type { Habit, HabitEntry } from "../types/habit";
import {
	getDescendantRawHabits,
	getTagEntries,
	getTagWeeklyCount,
	isTagCompletedForDay,
	repairTagRelationships,
	wouldCreateCycle,
} from "./tagUtils";

// Helper to create a minimal habit
function createHabit(
	id: string,
	name: string,
	habitType: "raw" | "tag" = "raw",
	childIds?: string[],
	parentIds?: string[],
): Habit {
	return {
		id,
		name,
		category: "Test",
		targetPerWeek: 3,
		userId: "test-user",
		createdAt: new Date(),
		updatedAt: new Date(),
		habitType,
		childIds,
		parentIds,
	};
}

// Helper to create a minimal entry
function createEntry(id: string, habitId: string, date: Date): HabitEntry {
	return {
		id,
		habitId,
		userId: "test-user",
		date,
		value: 1,
		createdAt: new Date(),
	};
}

describe("wouldCreateCycle", () => {
	it("returns true for self-reference", () => {
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Habit A", "tag"));

		expect(wouldCreateCycle("A", "A", habits)).toBe(true);
	});

	it("returns false for simple parent-child with no existing relationships", () => {
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Tag A", "tag"));
		habits.set("B", createHabit("B", "Habit B", "raw"));

		// Adding A -> B should not create a cycle
		expect(wouldCreateCycle("A", "B", habits)).toBe(false);
	});

	it("detects direct cycle: A -> B, adding B -> A", () => {
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Tag A", "tag", ["B"]));
		habits.set("B", createHabit("B", "Tag B", "tag"));

		// A already contains B, adding B -> A would create a cycle
		expect(wouldCreateCycle("B", "A", habits)).toBe(true);
	});

	it("detects indirect cycle: A -> B -> C, adding C -> A", () => {
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Tag A", "tag", ["B"]));
		habits.set("B", createHabit("B", "Tag B", "tag", ["C"]));
		habits.set("C", createHabit("C", "Tag C", "tag"));

		// A -> B -> C, adding C -> A would create a cycle
		expect(wouldCreateCycle("C", "A", habits)).toBe(true);
	});

	it("returns false when no cycle would be created in complex graph", () => {
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Tag A", "tag", ["B", "C"]));
		habits.set("B", createHabit("B", "Tag B", "tag", ["D"]));
		habits.set("C", createHabit("C", "Habit C", "raw"));
		habits.set("D", createHabit("D", "Habit D", "raw"));
		habits.set("E", createHabit("E", "Tag E", "tag"));

		// Adding E -> D should not create a cycle (E is not in the A->B->D path)
		expect(wouldCreateCycle("E", "D", habits)).toBe(false);
	});

	it("handles diamond structure without false positives", () => {
		// A -> B, A -> C, B -> D, C -> D (diamond, not a cycle)
		const habits = new Map<string, Habit>();
		habits.set("A", createHabit("A", "Tag A", "tag", ["B", "C"]));
		habits.set("B", createHabit("B", "Tag B", "tag", ["D"]));
		habits.set("C", createHabit("C", "Tag C", "tag", ["D"]));
		habits.set("D", createHabit("D", "Habit D", "raw"));

		// Adding another edge that doesn't create cycle
		expect(wouldCreateCycle("A", "D", habits)).toBe(false);
	});
});

describe("getDescendantRawHabits", () => {
	it("returns empty array for tag with no children", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag");
		habits.set("A", tag);

		const descendants = getDescendantRawHabits(tag, habits);
		expect(descendants).toEqual([]);
	});

	it("returns direct raw habit children", () => {
		const habits = new Map<string, Habit>();
		const rawB = createHabit("B", "Habit B", "raw");
		const rawC = createHabit("C", "Habit C", "raw");
		const tag = createHabit("A", "Tag A", "tag", ["B", "C"]);

		habits.set("A", tag);
		habits.set("B", rawB);
		habits.set("C", rawC);

		const descendants = getDescendantRawHabits(tag, habits);
		expect(descendants).toHaveLength(2);
		expect(descendants.map((h) => h.id).sort()).toEqual(["B", "C"]);
	});

	it("returns raw habits from nested tags", () => {
		const habits = new Map<string, Habit>();
		const rawC = createHabit("C", "Habit C", "raw");
		const rawD = createHabit("D", "Habit D", "raw");
		const tagB = createHabit("B", "Tag B", "tag", ["C", "D"]);
		const tagA = createHabit("A", "Tag A", "tag", ["B"]);

		habits.set("A", tagA);
		habits.set("B", tagB);
		habits.set("C", rawC);
		habits.set("D", rawD);

		const descendants = getDescendantRawHabits(tagA, habits);
		expect(descendants).toHaveLength(2);
		expect(descendants.map((h) => h.id).sort()).toEqual(["C", "D"]);
	});

	it("deduplicates raw habits appearing in multiple paths", () => {
		// A -> B -> D, A -> C -> D (D appears twice in the DAG)
		const habits = new Map<string, Habit>();
		const rawD = createHabit("D", "Habit D", "raw");
		const tagB = createHabit("B", "Tag B", "tag", ["D"]);
		const tagC = createHabit("C", "Tag C", "tag", ["D"]);
		const tagA = createHabit("A", "Tag A", "tag", ["B", "C"]);

		habits.set("A", tagA);
		habits.set("B", tagB);
		habits.set("C", tagC);
		habits.set("D", rawD);

		const descendants = getDescendantRawHabits(tagA, habits);
		expect(descendants).toHaveLength(1);
		expect(descendants[0].id).toBe("D");
	});

	it("treats habits without habitType as raw (default)", () => {
		const habits = new Map<string, Habit>();
		const rawB: Habit = {
			id: "B",
			name: "Habit B",
			category: "Test",
			targetPerWeek: 3,
			userId: "test-user",
			createdAt: new Date(),
			updatedAt: new Date(),
			// habitType not set - should default to raw
		};
		const tag = createHabit("A", "Tag A", "tag", ["B"]);

		habits.set("A", tag);
		habits.set("B", rawB);

		const descendants = getDescendantRawHabits(tag, habits);
		expect(descendants).toHaveLength(1);
		expect(descendants[0].id).toBe("B");
	});
});

describe("getTagEntries", () => {
	it("returns empty array when no entries", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const entries = getTagEntries(tag, habits, []);
		expect(entries).toEqual([]);
	});

	it("returns tag's own entries", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag");
		habits.set("A", tag);

		const tagEntry = createEntry("e1", "A", new Date());
		const entries = getTagEntries(tag, habits, [tagEntry]);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe("e1");
	});

	it("returns descendant raw habit entries", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const childEntry = createEntry("e1", "B", new Date());
		const entries = getTagEntries(tag, habits, [childEntry]);

		expect(entries).toHaveLength(1);
		expect(entries[0].habitId).toBe("B");
	});

	it("returns both tag's own entries and descendant entries", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const tagEntry = createEntry("e1", "A", new Date());
		const childEntry = createEntry("e2", "B", new Date());
		const entries = getTagEntries(tag, habits, [tagEntry, childEntry]);

		expect(entries).toHaveLength(2);
		expect(entries.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
	});

	it("excludes entries for unrelated habits", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		const rawC = createHabit("C", "Habit C", "raw"); // Not in tag
		habits.set("A", tag);
		habits.set("B", rawB);
		habits.set("C", rawC);

		const childEntry = createEntry("e1", "B", new Date());
		const unrelatedEntry = createEntry("e2", "C", new Date());
		const entries = getTagEntries(tag, habits, [childEntry, unrelatedEntry]);

		expect(entries).toHaveLength(1);
		expect(entries[0].habitId).toBe("B");
	});
});

describe("getTagWeeklyCount", () => {
	it("returns 0 when no entries", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const count = getTagWeeklyCount(tag, habits, []);
		expect(count).toBe(0);
	});

	it("counts unique days", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const day1 = new Date(2024, 0, 1); // Jan 1
		const day2 = new Date(2024, 0, 2); // Jan 2

		const entries = [
			createEntry("e1", "B", day1),
			createEntry("e2", "B", day1), // Same day
			createEntry("e3", "B", day2),
		];

		const count = getTagWeeklyCount(tag, habits, entries);
		expect(count).toBe(2); // 2 unique days
	});

	it("includes tag's own entry days", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const day1 = new Date(2024, 0, 1);
		const day2 = new Date(2024, 0, 2);

		const entries = [
			createEntry("e1", "A", day1), // Tag's own entry
			createEntry("e2", "B", day2), // Child's entry
		];

		const count = getTagWeeklyCount(tag, habits, entries);
		expect(count).toBe(2);
	});

	it("filters by date range", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const day1 = new Date(2024, 0, 1);
		const day2 = new Date(2024, 0, 5);
		const day3 = new Date(2024, 0, 10);

		const entries = [
			createEntry("e1", "B", day1),
			createEntry("e2", "B", day2),
			createEntry("e3", "B", day3),
		];

		// Filter to Jan 3-8
		const startDate = new Date(2024, 0, 3);
		const endDate = new Date(2024, 0, 8);

		const count = getTagWeeklyCount(tag, habits, entries, startDate, endDate);
		expect(count).toBe(1); // Only day2 (Jan 5) is in range
	});

	it("weekly count equals sum of daily completions (conceptual consistency)", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B", "C"]);
		const rawB = createHabit("B", "Habit B", "raw");
		const rawC = createHabit("C", "Habit C", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);
		habits.set("C", rawC);

		// Week of entries - some days have entries, some don't
		const mon = new Date(2024, 0, 1);
		const tue = new Date(2024, 0, 2);
		const wed = new Date(2024, 0, 3);
		const thu = new Date(2024, 0, 4);
		const fri = new Date(2024, 0, 5);
		const sat = new Date(2024, 0, 6);
		const sun = new Date(2024, 0, 7);

		const entries = [
			createEntry("e1", "B", mon), // Mon: B done
			createEntry("e2", "C", mon), // Mon: C also done (still just 1 completion)
			// Tue: nothing
			createEntry("e3", "B", wed), // Wed: B done
			// Thu: nothing
			createEntry("e4", "C", fri), // Fri: C done
			// Sat: nothing
			createEntry("e5", "B", sun), // Sun: B done
		];

		// Count daily completions manually
		const weekDays = [mon, tue, wed, thu, fri, sat, sun];
		const dailyCompletions = weekDays.filter((day) =>
			isTagCompletedForDay(tag, habits, entries, day),
		);

		// Weekly count should equal the number of days with completions
		const weeklyCount = getTagWeeklyCount(tag, habits, entries, mon, sun);
		expect(weeklyCount).toBe(dailyCompletions.length);
		expect(weeklyCount).toBe(4); // Mon, Wed, Fri, Sun
	});
});

describe("isTagCompletedForDay", () => {
	it("returns false when no entries exist", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const monday = new Date(2024, 0, 1);
		expect(isTagCompletedForDay(tag, habits, [], monday)).toBe(false);
	});

	it("returns true when any child has an entry for that day", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B", "C"]);
		const rawB = createHabit("B", "Habit B", "raw");
		const rawC = createHabit("C", "Habit C", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);
		habits.set("C", rawC);

		const monday = new Date(2024, 0, 1);
		const entries = [createEntry("e1", "B", monday)]; // Only B done

		expect(isTagCompletedForDay(tag, habits, entries, monday)).toBe(true);
	});

	it("returns true regardless of entry value (humane: showing up is what matters)", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const monday = new Date(2024, 0, 1);
		// Entry with value=5 (multi-complete child)
		const entry: HabitEntry = {
			id: "e1",
			habitId: "B",
			userId: "test-user",
			date: monday,
			value: 5,
			createdAt: new Date(),
		};

		// Tag is just "completed" - doesn't matter that value is 5
		expect(isTagCompletedForDay(tag, habits, [entry], monday)).toBe(true);
	});

	it("returns false when entries exist but not for the requested day", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		const monday = new Date(2024, 0, 1);
		const tuesday = new Date(2024, 0, 2);
		const entries = [createEntry("e1", "B", tuesday)]; // Entry on Tuesday

		expect(isTagCompletedForDay(tag, habits, entries, monday)).toBe(false);
	});

	it("considers tag completed if ANY descendant has entry (nested tags)", () => {
		const habits = new Map<string, Habit>();
		const rawC = createHabit("C", "Habit C", "raw");
		const tagB = createHabit("B", "Tag B", "tag", ["C"]);
		const tagA = createHabit("A", "Tag A", "tag", ["B"]); // A -> B -> C
		habits.set("A", tagA);
		habits.set("B", tagB);
		habits.set("C", rawC);

		const monday = new Date(2024, 0, 1);
		const entries = [createEntry("e1", "C", monday)]; // Only C done

		// Both tags should be completed
		expect(isTagCompletedForDay(tagA, habits, entries, monday)).toBe(true);
		expect(isTagCompletedForDay(tagB, habits, entries, monday)).toBe(true);
	});

	it("ignores time component when comparing dates", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B"]);
		const rawB = createHabit("B", "Habit B", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);

		// Entry at 9:30 AM
		const mondayMorning = new Date(2024, 0, 1, 9, 30);
		const entries = [createEntry("e1", "B", mondayMorning)];

		// Check at 11:59 PM same day - should still be completed
		const mondayNight = new Date(2024, 0, 1, 23, 59);
		expect(isTagCompletedForDay(tag, habits, entries, mondayNight)).toBe(true);
	});

	it("multiple children done on same day still just means 'completed' (not counted)", () => {
		const habits = new Map<string, Habit>();
		const tag = createHabit("A", "Tag A", "tag", ["B", "C", "D"]);
		const rawB = createHabit("B", "Habit B", "raw");
		const rawC = createHabit("C", "Habit C", "raw");
		const rawD = createHabit("D", "Habit D", "raw");
		habits.set("A", tag);
		habits.set("B", rawB);
		habits.set("C", rawC);
		habits.set("D", rawD);

		const monday = new Date(2024, 0, 1);
		const entries = [
			createEntry("e1", "B", monday),
			createEntry("e2", "C", monday),
			createEntry("e3", "D", monday),
		];

		// Function returns boolean - completed or not
		// Multiple children done doesn't change the result
		expect(isTagCompletedForDay(tag, habits, entries, monday)).toBe(true);
	});
});

describe("repairTagRelationships", () => {
	it("returns unchanged habits when already consistent", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A", "B"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw", undefined, ["tag1"]),
		];

		const result = repairTagRelationships(habits);

		expect(result.parentIdsFixed).toBe(0);
		expect(result.childIdsFixed).toBe(0);
		expect(result.habits).toHaveLength(3);
	});

	it("fixes missing parentIds when tag has childIds", () => {
		// Tag has childIds but children have empty parentIds
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A", "B"]),
			createHabit("A", "Habit A", "raw", undefined, []), // Missing parentId
			createHabit("B", "Habit B", "raw"), // Missing parentIds entirely
		];

		const result = repairTagRelationships(habits);

		expect(result.parentIdsFixed).toBe(2);
		expect(result.childIdsFixed).toBe(0);

		const habitA = result.habits.find((h) => h.id === "A");
		const habitB = result.habits.find((h) => h.id === "B");

		expect(habitA?.parentIds).toContain("tag1");
		expect(habitB?.parentIds).toContain("tag1");
	});

	it("fixes missing childIds when habit has parentIds", () => {
		// Habit has parentIds but tag has empty childIds
		const habits = [
			createHabit("tag1", "Tag 1", "tag", []), // Missing childId
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
		];

		const result = repairTagRelationships(habits);

		expect(result.parentIdsFixed).toBe(0);
		expect(result.childIdsFixed).toBe(1);

		const tag = result.habits.find((h) => h.id === "tag1");
		expect(tag?.childIds).toContain("A");
	});

	it("handles bidirectional repair", () => {
		// Mixed inconsistencies
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A"]), // Has A, missing B
			createHabit("A", "Habit A", "raw", undefined, []), // Missing parentId
			createHabit("B", "Habit B", "raw", undefined, ["tag1"]), // Has parentId but not in tag's childIds
		];

		const result = repairTagRelationships(habits);

		expect(result.parentIdsFixed).toBe(1); // A got tag1 added
		expect(result.childIdsFixed).toBe(1); // tag1 got B added

		const tag = result.habits.find((h) => h.id === "tag1");
		const habitA = result.habits.find((h) => h.id === "A");
		const habitB = result.habits.find((h) => h.id === "B");

		expect(tag?.childIds).toContain("A");
		expect(tag?.childIds).toContain("B");
		expect(habitA?.parentIds).toContain("tag1");
		expect(habitB?.parentIds).toContain("tag1");
	});

	it("preserves existing relationships while adding missing ones", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A"]),
			createHabit("tag2", "Tag 2", "tag", ["A"]), // A is in both tags
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]), // Only has tag1, missing tag2
		];

		const result = repairTagRelationships(habits);

		expect(result.parentIdsFixed).toBe(1);

		const habitA = result.habits.find((h) => h.id === "A");
		expect(habitA?.parentIds).toContain("tag1");
		expect(habitA?.parentIds).toContain("tag2");
		expect(habitA?.parentIds).toHaveLength(2);
	});

	it("handles empty habits array", () => {
		const result = repairTagRelationships([]);

		expect(result.parentIdsFixed).toBe(0);
		expect(result.childIdsFixed).toBe(0);
		expect(result.habits).toEqual([]);
	});
});
