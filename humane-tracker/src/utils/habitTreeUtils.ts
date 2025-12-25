import { toDateString } from "../repositories/types";
import type { Habit, HabitEntry, HabitWithStatus } from "../types/habit";
import { getTagEntries } from "./tagUtils";

/**
 * A node in the habit tree for rendering.
 * Can be either a raw habit or a tag.
 */
export interface HabitTreeNode {
	habit: HabitWithStatus;
	depth: number;
	isTag: boolean;
	isExpanded: boolean;
	childNodes: HabitTreeNode[];
}

/**
 * Flattened tree node for rendering in a flat list.
 */
export interface FlatTreeNode {
	habit: HabitWithStatus;
	depth: number;
	isTag: boolean;
	isExpanded: boolean;
	hasChildren: boolean;
}

/**
 * Build a tree structure from habits.
 * Top-level = habits that are not children of any tag in the list.
 * Children are nested under their parent tags.
 *
 * IMPORTANT: We derive parenthood from BOTH parentIds AND childIds to handle
 * cases where these arrays are out of sync. A habit is considered a child if:
 * - It has parentIds pointing to a tag in the list, OR
 * - Any tag in the list has this habit in its childIds
 */
export function buildHabitTree(
	habits: HabitWithStatus[],
	expandedTags: Set<string>,
): HabitTreeNode[] {
	const habitMap = new Map<string, HabitWithStatus>();
	for (const h of habits) {
		habitMap.set(h.id, h);
	}

	// Build a set of all habit IDs that are children of any tag (from childIds)
	// This handles the case where parentIds is empty but the habit is in a tag's childIds
	const childrenOfTags = new Set<string>();
	for (const h of habits) {
		if (h.habitType === "tag" && h.childIds) {
			for (const childId of h.childIds) {
				// Only count as child if the child exists in our habit list
				if (habitMap.has(childId)) {
					childrenOfTags.add(childId);
				}
			}
		}
	}

	// Find top-level habits: not a child of any tag in this list
	const topLevel = habits.filter((h) => {
		// If any tag has this habit as a child, it's not top-level
		if (childrenOfTags.has(h.id)) {
			return false;
		}

		// Also check parentIds for habits whose parent is in the list
		if (h.parentIds && h.parentIds.length > 0) {
			const hasParentInList = h.parentIds.some((pid) => habitMap.has(pid));
			if (hasParentInList) {
				return false;
			}
		}

		return true;
	});

	// Build tree recursively
	function buildNode(habit: HabitWithStatus, depth: number): HabitTreeNode {
		const isTag = habit.habitType === "tag";
		const isExpanded = expandedTags.has(habit.id);

		// Get children if this is a tag
		const childNodes: HabitTreeNode[] = [];
		if (isTag && habit.childIds) {
			for (const childId of habit.childIds) {
				const child = habitMap.get(childId);
				if (child) {
					childNodes.push(buildNode(child, depth + 1));
				}
			}
		}

		return {
			habit,
			depth,
			isTag,
			isExpanded,
			childNodes,
		};
	}

	return topLevel.map((h) => buildNode(h, 0));
}

/**
 * Flatten a tree into a list for rendering.
 * Only includes visible nodes (children of expanded tags).
 */
export function flattenTree(nodes: HabitTreeNode[]): FlatTreeNode[] {
	const result: FlatTreeNode[] = [];

	function visit(node: HabitTreeNode) {
		result.push({
			habit: node.habit,
			depth: node.depth,
			isTag: node.isTag,
			isExpanded: node.isExpanded,
			hasChildren: node.childNodes.length > 0,
		});

		// Only visit children if this tag is expanded
		if (node.isExpanded) {
			for (const child of node.childNodes) {
				visit(child);
			}
		}
	}

	for (const node of nodes) {
		visit(node);
	}

	return result;
}

/**
 * Compute weekly count for a tag by summing descendant entries.
 * This modifies the HabitWithStatus.currentWeekCount for tags.
 */
export function computeTagCounts(
	habits: HabitWithStatus[],
	allEntries: HabitEntry[],
): HabitWithStatus[] {
	const habitMap = new Map<string, Habit>();
	for (const h of habits) {
		habitMap.set(h.id, h);
	}

	return habits.map((habit) => {
		if (habit.habitType !== "tag") {
			return habit;
		}

		// Get all entries for this tag (own + descendants)
		const tagEntries = getTagEntries(habit, habitMap, allEntries);

		// Count unique days in the current week
		const uniqueDays = new Set(
			tagEntries.map((e) => {
				const d = e.date instanceof Date ? e.date : new Date(e.date);
				return toDateString(d);
			}),
		);

		return {
			...habit,
			currentWeekCount: uniqueDays.size,
			entries: tagEntries, // Include all entries for display
		};
	});
}

/**
 * Group habits by category, preserving tree structure within each category.
 */
export interface CategoryWithTree {
	category: string;
	name: string;
	color: string;
	tree: HabitTreeNode[];
	flatList: FlatTreeNode[];
	isCollapsed: boolean;
}
