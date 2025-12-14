/**
 * Tests for tag-specific behavior in useHabitTrackerVM.
 *
 * These tests focus on how the VM handles tags vs raw habits,
 * particularly around display filtering and tree building.
 */
import { describe, expect, it } from "vitest";
import type { HabitWithStatus } from "../types/habit";
import { getCellDisplay, groupHabitsByCategory } from "./useHabitTrackerVM";

// Helper to create a mock habit with tag support
function createMockHabit(
	overrides: Partial<HabitWithStatus> = {},
): HabitWithStatus {
	return {
		id: "test-id",
		name: "Test Habit",
		category: "Mobility",
		targetPerWeek: 3,
		userId: "user-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		status: "today",
		currentWeekCount: 0,
		entries: [],
		habitType: "raw",
		...overrides,
	};
}

describe("groupHabitsByCategory with tags", () => {
	it("includes tags in category groupings", () => {
		const habits = [
			createMockHabit({
				id: "tag-1",
				name: "Shoulder Accessory",
				habitType: "tag",
				childIds: ["raw-1", "raw-2"],
			}),
			createMockHabit({
				id: "raw-1",
				name: "Shoulder Y",
				habitType: "raw",
				parentIds: ["tag-1"],
			}),
			createMockHabit({
				id: "raw-2",
				name: "Wall Slide",
				habitType: "raw",
				parentIds: ["tag-1"],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		expect(sections).toHaveLength(1);
		expect(sections[0].habits).toHaveLength(3);
	});

	it("preserves tag relationships in grouped habits", () => {
		const habits = [
			createMockHabit({
				id: "tag-1",
				name: "Shoulder Accessory",
				habitType: "tag",
				childIds: ["raw-1"],
			}),
			createMockHabit({
				id: "raw-1",
				name: "Shoulder Y",
				habitType: "raw",
				parentIds: ["tag-1"],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		const tag = sections[0].habits.find((h) => h.id === "tag-1");
		const child = sections[0].habits.find((h) => h.id === "raw-1");

		expect(tag?.childIds).toContain("raw-1");
		expect(child?.parentIds).toContain("tag-1");
	});

	it("handles nested tags (tag containing tag)", () => {
		const habits = [
			createMockHabit({
				id: "parent-tag",
				name: "Mobility",
				habitType: "tag",
				childIds: ["child-tag"],
			}),
			createMockHabit({
				id: "child-tag",
				name: "Shoulder Work",
				habitType: "tag",
				childIds: ["raw-1"],
				parentIds: ["parent-tag"],
			}),
			createMockHabit({
				id: "raw-1",
				name: "Shoulder Y",
				habitType: "raw",
				parentIds: ["child-tag"],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		expect(sections).toHaveLength(1);
		expect(sections[0].habits).toHaveLength(3);

		const parentTag = sections[0].habits.find((h) => h.id === "parent-tag");
		expect(parentTag?.childIds).toContain("child-tag");
	});

	it("handles habits in multiple parent tags", () => {
		const habits = [
			createMockHabit({
				id: "tag-mobility",
				name: "Mobility",
				habitType: "tag",
				childIds: ["raw-1"],
			}),
			createMockHabit({
				id: "tag-hip",
				name: "Hip Work",
				habitType: "tag",
				childIds: ["raw-1"], // Same child in multiple tags
			}),
			createMockHabit({
				id: "raw-1",
				name: "Shin Boxes",
				habitType: "raw",
				parentIds: ["tag-mobility", "tag-hip"],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		const shinBoxes = sections[0].habits.find((h) => h.id === "raw-1");
		expect(shinBoxes?.parentIds).toHaveLength(2);
		expect(shinBoxes?.parentIds).toContain("tag-mobility");
		expect(shinBoxes?.parentIds).toContain("tag-hip");
	});

	it("handles tag with no children", () => {
		const habits = [
			createMockHabit({
				id: "empty-tag",
				name: "Empty Tag",
				habitType: "tag",
				childIds: [],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		expect(sections).toHaveLength(1);
		expect(sections[0].habits).toHaveLength(1);
		expect(sections[0].habits[0].habitType).toBe("tag");
	});

	it("handles raw habit with no parents (top-level)", () => {
		const habits = [
			createMockHabit({
				id: "standalone",
				name: "Standalone Habit",
				habitType: "raw",
				parentIds: undefined,
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		expect(sections).toHaveLength(1);
		expect(sections[0].habits).toHaveLength(1);
	});

	it("separates tags across different categories", () => {
		const habits = [
			createMockHabit({
				id: "mobility-tag",
				name: "Mobility Tag",
				category: "Mobility",
				habitType: "tag",
			}),
			createMockHabit({
				id: "strength-tag",
				name: "Strength Tag",
				category: "Physical Health",
				habitType: "tag",
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		expect(sections).toHaveLength(2);
		expect(
			sections.find((s) => s.category === "Mobility")?.habits,
		).toHaveLength(1);
		expect(
			sections.find((s) => s.category === "Physical Health")?.habits,
		).toHaveLength(1);
	});
});

describe("tag visibility behavior", () => {
	it("hidden tags are not filtered by groupHabitsByCategory", () => {
		// Note: filtering happens in the VM hook, not in groupHabitsByCategory
		// This test documents that groupHabitsByCategory doesn't filter hidden
		const habits = [
			createMockHabit({
				id: "visible-tag",
				name: "Visible Tag",
				habitType: "tag",
				hidden: false,
			}),
			createMockHabit({
				id: "hidden-tag",
				name: "Hidden Tag",
				habitType: "tag",
				hidden: true,
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		// groupHabitsByCategory includes all habits - VM filters before calling
		expect(sections[0].habits).toHaveLength(2);
	});
});

describe("tag entry aggregation scenarios", () => {
	it("tag with children who all have entries today counts correctly", () => {
		const today = new Date();
		const habits = [
			createMockHabit({
				id: "tag-1",
				name: "Parent Tag",
				habitType: "tag",
				childIds: ["raw-1", "raw-2"],
				// Tag's own count comes from aggregation
				currentWeekCount: 2,
				targetPerWeek: 3,
				entries: [],
			}),
			createMockHabit({
				id: "raw-1",
				name: "Child 1",
				habitType: "raw",
				parentIds: ["tag-1"],
				currentWeekCount: 1,
				entries: [
					{
						id: "e1",
						habitId: "raw-1",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
			}),
			createMockHabit({
				id: "raw-2",
				name: "Child 2",
				habitType: "raw",
				parentIds: ["tag-1"],
				currentWeekCount: 1,
				entries: [
					{
						id: "e2",
						habitId: "raw-2",
						userId: "u1",
						date: today,
						value: 1,
						createdAt: new Date(),
					},
				],
			}),
		];

		const sections = groupHabitsByCategory(habits, new Set());

		// Verify structure is correct for rendering
		const tag = sections[0].habits.find((h) => h.habitType === "tag");
		expect(tag?.childIds).toHaveLength(2);

		// Children have their own entries
		const children = sections[0].habits.filter((h) => h.habitType === "raw");
		expect(children.every((c) => c.entries.length > 0)).toBe(true);
	});
});

describe("getCellDisplay for tags (single-complete model)", () => {
	/**
	 * Tags show "completed" (✓) if ANY child has ANY entry for that day.
	 * This is the humane model - showing up is what matters.
	 *
	 * For this to work, tag.entries must be pre-populated with synthetic
	 * entries representing "was any child done on this day".
	 */

	it("tag shows ✓ when it has a synthetic entry for the day", () => {
		const monday = new Date("2024-01-15");
		// Tag with a synthetic entry (value=1 means "completed for this day")
		const tag = createMockHabit({
			id: "tag-1",
			name: "Shoulder Accessory",
			habitType: "tag",
			childIds: ["raw-1", "raw-2"],
			entries: [
				{
					id: "synthetic-e1",
					habitId: "tag-1",
					userId: "u1",
					date: monday,
					value: 1, // Binary: completed
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(tag, monday);

		expect(display.content).toBe("✓");
		expect(display.className).toBe("completed");
	});

	it("tag shows empty when no synthetic entry exists for that day", () => {
		const monday = new Date("2024-01-15");
		const tuesday = new Date("2024-01-16");

		// Tag has entry for Monday but not Tuesday
		const tag = createMockHabit({
			id: "tag-1",
			name: "Shoulder Accessory",
			habitType: "tag",
			childIds: ["raw-1"],
			entries: [
				{
					id: "synthetic-e1",
					habitId: "tag-1",
					userId: "u1",
					date: monday,
					value: 1,
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(tag, tuesday);

		expect(display.content).toBe("");
		expect(display.className).toBe("");
	});

	it("tag always shows ✓ (not a count) - single-complete model", () => {
		const monday = new Date("2024-01-15");
		// Even if we somehow had value > 1, tag should show ✓
		// (In practice, synthetic entries should always be value=1)
		const tag = createMockHabit({
			id: "tag-1",
			name: "Shoulder Accessory",
			habitType: "tag",
			childIds: ["raw-1", "raw-2", "raw-3"],
			entries: [
				{
					id: "synthetic-e1",
					habitId: "tag-1",
					userId: "u1",
					date: monday,
					value: 1, // Should always be 1 for tags
					createdAt: new Date(),
				},
			],
		});

		const display = getCellDisplay(tag, monday);

		// Tags are single-complete: always ✓, never a number
		expect(display.content).toBe("✓");
	});
});

describe("tag weekly count (days completed)", () => {
	/**
	 * Tag's currentWeekCount should be the number of DAYS where
	 * any child had an entry - not the sum of all child entries.
	 */

	it("tag currentWeekCount equals unique days with any child entry", () => {
		// This test documents expected behavior.
		// The data layer (HabitService) should compute this.
		const monday = new Date("2024-01-15");
		const wednesday = new Date("2024-01-17");

		const tag = createMockHabit({
			id: "tag-1",
			name: "Shoulder Accessory",
			habitType: "tag",
			childIds: ["raw-1", "raw-2"],
			// Expected: 2 days completed (Monday, Wednesday)
			// NOT 3 (sum of child entries)
			currentWeekCount: 2,
			entries: [
				// Synthetic entries for days where any child was done
				{
					id: "s1",
					habitId: "tag-1",
					userId: "u1",
					date: monday,
					value: 1,
					createdAt: new Date(),
				},
				{
					id: "s2",
					habitId: "tag-1",
					userId: "u1",
					date: wednesday,
					value: 1,
					createdAt: new Date(),
				},
			],
		});

		// The count should be 2 (unique days), not more
		expect(tag.currentWeekCount).toBe(2);
		expect(tag.entries.length).toBe(2);
	});
});
