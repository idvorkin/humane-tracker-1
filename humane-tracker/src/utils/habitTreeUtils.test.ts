import { describe, expect, it } from "vitest";
import type { HabitWithStatus } from "../types/habit";
import { buildHabitTree, flattenTree } from "./habitTreeUtils";

// Helper to create a minimal HabitWithStatus
function createHabit(
	id: string,
	name: string,
	habitType: "raw" | "tag" = "raw",
	childIds?: string[],
	parentIds?: string[],
): HabitWithStatus {
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
		status: "pending",
		currentWeekCount: 0,
		entries: [],
	};
}

describe("buildHabitTree", () => {
	it("returns flat list for habits with no parent-child relationships", () => {
		const habits = [
			createHabit("A", "Habit A"),
			createHabit("B", "Habit B"),
			createHabit("C", "Habit C"),
		];

		const tree = buildHabitTree(habits, new Set());

		expect(tree).toHaveLength(3);
		expect(tree.every((n) => n.depth === 0)).toBe(true);
		expect(tree.every((n) => n.childNodes.length === 0)).toBe(true);
	});

	it("nests children under parent tags", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A", "B"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw", undefined, ["tag1"]),
		];

		const tree = buildHabitTree(habits, new Set());

		// Only tag1 at top level
		expect(tree).toHaveLength(1);
		expect(tree[0].habit.id).toBe("tag1");
		expect(tree[0].depth).toBe(0);
		expect(tree[0].isTag).toBe(true);

		// Children nested
		expect(tree[0].childNodes).toHaveLength(2);
		expect(tree[0].childNodes[0].depth).toBe(1);
		expect(tree[0].childNodes[1].depth).toBe(1);
	});

	it("handles deeply nested tags", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["tag2"]),
			createHabit("tag2", "Tag 2", "tag", ["A"], ["tag1"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag2"]),
		];

		const tree = buildHabitTree(habits, new Set());

		expect(tree).toHaveLength(1);
		expect(tree[0].habit.id).toBe("tag1");

		// tag2 is child of tag1
		expect(tree[0].childNodes).toHaveLength(1);
		expect(tree[0].childNodes[0].habit.id).toBe("tag2");
		expect(tree[0].childNodes[0].depth).toBe(1);

		// A is child of tag2
		expect(tree[0].childNodes[0].childNodes).toHaveLength(1);
		expect(tree[0].childNodes[0].childNodes[0].habit.id).toBe("A");
		expect(tree[0].childNodes[0].childNodes[0].depth).toBe(2);
	});

	it("marks expanded tags correctly", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
		];

		const expandedTags = new Set(["tag1"]);
		const tree = buildHabitTree(habits, expandedTags);

		expect(tree[0].isExpanded).toBe(true);
	});

	it("marks collapsed tags correctly", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
		];

		const tree = buildHabitTree(habits, new Set());

		expect(tree[0].isExpanded).toBe(false);
	});

	it("handles inconsistent childIds/parentIds - child with empty parentIds", () => {
		// BUG FIX: When a tag has childIds but the child has empty parentIds,
		// the child should NOT appear at top-level. It should only appear under the tag.
		const habits = [
			createHabit("meditate", "Meditate", "tag", ["lk", "focus"]),
			createHabit("lk", "Loving-kindness", "raw", undefined, []), // Empty parentIds!
			createHabit("focus", "Focus meditation", "raw", undefined, []), // Empty parentIds!
		];

		const tree = buildHabitTree(habits, new Set());

		// Only the tag should be at top-level
		expect(tree).toHaveLength(1);
		expect(tree[0].habit.id).toBe("meditate");

		// Children should be nested under the tag (not at top-level)
		expect(tree[0].childNodes).toHaveLength(2);
		expect(tree[0].childNodes.map((n) => n.habit.id)).toEqual(["lk", "focus"]);
	});

	it("handles inconsistent childIds/parentIds - only uses childIds from visible tags", () => {
		// If a child references a parent that doesn't exist in the habit list,
		// it should appear at top-level (orphaned)
		const habits = [
			createHabit("A", "Orphan", "raw", undefined, ["non-existent-tag"]),
			createHabit("B", "Standalone", "raw"),
		];

		const tree = buildHabitTree(habits, new Set());

		// Both should be at top-level since the parent tag isn't in the list
		expect(tree).toHaveLength(2);
		expect(tree.map((n) => n.habit.id)).toEqual(["A", "B"]);
	});
});

describe("flattenTree", () => {
	it("returns all nodes when all tags are expanded", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A", "B"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw", undefined, ["tag1"]),
		];

		const expandedTags = new Set(["tag1"]);
		const tree = buildHabitTree(habits, expandedTags);
		const flat = flattenTree(tree);

		expect(flat).toHaveLength(3);
		expect(flat[0].habit.id).toBe("tag1");
		expect(flat[0].depth).toBe(0);
		expect(flat[1].habit.id).toBe("A");
		expect(flat[1].depth).toBe(1);
		expect(flat[2].habit.id).toBe("B");
		expect(flat[2].depth).toBe(1);
	});

	it("hides children when tag is collapsed", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A", "B"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw", undefined, ["tag1"]),
		];

		// Not expanded
		const tree = buildHabitTree(habits, new Set());
		const flat = flattenTree(tree);

		// Only tag1 visible
		expect(flat).toHaveLength(1);
		expect(flat[0].habit.id).toBe("tag1");
		expect(flat[0].hasChildren).toBe(true);
	});

	it("handles mixed expanded and collapsed tags", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["tag2", "A"]),
			createHabit("tag2", "Tag 2", "tag", ["B"], ["tag1"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw", undefined, ["tag2"]),
		];

		// Only tag1 expanded, tag2 collapsed
		const expandedTags = new Set(["tag1"]);
		const tree = buildHabitTree(habits, expandedTags);
		const flat = flattenTree(tree);

		// tag1, tag2, A visible (B hidden under collapsed tag2)
		expect(flat).toHaveLength(3);
		expect(flat.map((n) => n.habit.id)).toEqual(["tag1", "tag2", "A"]);
	});

	it("sets hasChildren correctly", () => {
		const habits = [
			createHabit("tag1", "Tag 1", "tag", ["A"]),
			createHabit("A", "Habit A", "raw", undefined, ["tag1"]),
			createHabit("B", "Habit B", "raw"),
		];

		const expandedTags = new Set(["tag1"]);
		const tree = buildHabitTree(habits, expandedTags);
		const flat = flattenTree(tree);

		const tag1Node = flat.find((n) => n.habit.id === "tag1");
		const aNode = flat.find((n) => n.habit.id === "A");
		const bNode = flat.find((n) => n.habit.id === "B");

		expect(tag1Node?.hasChildren).toBe(true);
		expect(aNode?.hasChildren).toBe(false);
		expect(bNode?.hasChildren).toBe(false);
	});

	it("orders parent before children when children have no parentIds", () => {
		// BUG FIX: This tests the exact scenario from production data where
		// children (Box Breathing, Cult Meditate) have no parentIds but are
		// referenced in parent tag's childIds. The flattened order must be:
		// parent tag first, then children below.
		const habits = [
			createHabit("750words", "750 words", "raw"),
			createHabit("box-breathing", "Box Breathing", "raw", undefined, []), // No parentIds!
			createHabit("cult-meditate", "Cult Meditate", "raw", undefined, []), // No parentIds!
			createHabit("meditate", "Meditate", "tag", ["box-breathing", "cult-meditate"]),
			createHabit("read-devotional", "Read devotional", "raw"),
		];

		const expandedTags = new Set(["meditate"]);
		const tree = buildHabitTree(habits, expandedTags);
		const flat = flattenTree(tree);

		// Verify order: standalone habits, then tag, then children, then more standalone
		const ids = flat.map((n) => n.habit.id);
		expect(ids).toEqual([
			"750words",
			"meditate", // Parent tag comes before its children
			"box-breathing", // Child 1 (after parent)
			"cult-meditate", // Child 2 (after parent)
			"read-devotional",
		]);

		// Verify depths
		expect(flat.find((n) => n.habit.id === "meditate")?.depth).toBe(0);
		expect(flat.find((n) => n.habit.id === "box-breathing")?.depth).toBe(1);
		expect(flat.find((n) => n.habit.id === "cult-meditate")?.depth).toBe(1);
	});

	it("hides children with no parentIds when tag is collapsed", () => {
		// Same scenario but with collapsed tag - children should not appear
		const habits = [
			createHabit("750words", "750 words", "raw"),
			createHabit("box-breathing", "Box Breathing", "raw", undefined, []),
			createHabit("cult-meditate", "Cult Meditate", "raw", undefined, []),
			createHabit("meditate", "Meditate", "tag", ["box-breathing", "cult-meditate"]),
			createHabit("read-devotional", "Read devotional", "raw"),
		];

		// Tag NOT expanded
		const tree = buildHabitTree(habits, new Set());
		const flat = flattenTree(tree);

		// Only 3 items: the two standalone habits and the collapsed tag
		const ids = flat.map((n) => n.habit.id);
		expect(ids).toEqual(["750words", "meditate", "read-devotional"]);
		expect(ids).not.toContain("box-breathing");
		expect(ids).not.toContain("cult-meditate");
	});
});
