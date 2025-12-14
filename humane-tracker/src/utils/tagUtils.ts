import { toDateString } from "../repositories/types";
import type { Habit, HabitEntry } from "../types/habit";

/**
 * Repair result indicating what was fixed.
 */
export interface RepairResult {
	/** Number of habits that had their parentIds updated */
	parentIdsFixed: number;
	/** Number of tags that had their childIds updated */
	childIdsFixed: number;
	/** The repaired habits (may be mutated or new objects) */
	habits: Habit[];
}

/**
 * Ensure childIds and parentIds are bidirectionally consistent.
 *
 * This repairs two types of inconsistencies:
 * 1. A tag has childIds but the children don't have the tag in their parentIds
 * 2. A habit has parentIds but the parent tags don't have it in their childIds
 *
 * @param habits - Array of habits to repair
 * @returns RepairResult with fixed habits and counts of what was repaired
 */
export function repairTagRelationships(habits: Habit[]): RepairResult {
	const habitMap = new Map<string, Habit>();
	for (const h of habits) {
		habitMap.set(h.id, h);
	}

	let parentIdsFixed = 0;
	let childIdsFixed = 0;

	// Build what parentIds SHOULD be based on all tags' childIds
	const derivedParentIds = new Map<string, Set<string>>();
	for (const h of habits) {
		if (h.habitType === "tag" && h.childIds) {
			for (const childId of h.childIds) {
				if (!derivedParentIds.has(childId)) {
					derivedParentIds.set(childId, new Set());
				}
				derivedParentIds.get(childId)!.add(h.id);
			}
		}
	}

	// Build what childIds SHOULD be based on all habits' parentIds
	const derivedChildIds = new Map<string, Set<string>>();
	for (const h of habits) {
		if (h.parentIds) {
			for (const parentId of h.parentIds) {
				if (!derivedChildIds.has(parentId)) {
					derivedChildIds.set(parentId, new Set());
				}
				derivedChildIds.get(parentId)!.add(h.id);
			}
		}
	}

	// Repair each habit
	const repairedHabits = habits.map((h) => {
		let needsUpdate = false;
		let newParentIds = h.parentIds ? [...h.parentIds] : [];
		let newChildIds = h.childIds ? [...h.childIds] : [];

		// Fix parentIds: merge in any parents derived from childIds
		const shouldHaveParents = derivedParentIds.get(h.id);
		if (shouldHaveParents) {
			for (const parentId of shouldHaveParents) {
				if (!newParentIds.includes(parentId)) {
					newParentIds.push(parentId);
					needsUpdate = true;
					parentIdsFixed++;
				}
			}
		}

		// Fix childIds (only for tags): merge in any children derived from parentIds
		if (h.habitType === "tag") {
			const shouldHaveChildren = derivedChildIds.get(h.id);
			if (shouldHaveChildren) {
				for (const childId of shouldHaveChildren) {
					if (!newChildIds.includes(childId)) {
						newChildIds.push(childId);
						needsUpdate = true;
						childIdsFixed++;
					}
				}
			}
		}

		if (needsUpdate) {
			return {
				...h,
				parentIds: newParentIds.length > 0 ? newParentIds : undefined,
				childIds:
					h.habitType === "tag" && newChildIds.length > 0
						? newChildIds
						: h.childIds,
			};
		}
		return h;
	});

	return {
		parentIdsFixed,
		childIdsFixed,
		habits: repairedHabits,
	};
}

/**
 * Check if adding a parent-child relationship would create a cycle.
 * Uses DFS to check if childId is an ancestor of parentId.
 *
 * @param parentId - The tag that would become the parent
 * @param childId - The habit/tag that would become the child
 * @param allHabits - Map of all habits by ID
 * @returns true if adding this edge would create a cycle
 */
export function wouldCreateCycle(
	parentId: string,
	childId: string,
	allHabits: Map<string, Habit>,
): boolean {
	// Self-reference is always a cycle
	if (parentId === childId) {
		return true;
	}

	// DFS: check if parentId is reachable from childId's descendants
	// If so, adding childId as a child of parentId would create: parentId -> childId -> ... -> parentId
	const visited = new Set<string>();

	function hasPathTo(fromId: string, targetId: string): boolean {
		if (fromId === targetId) {
			return true;
		}
		if (visited.has(fromId)) {
			return false;
		}
		visited.add(fromId);

		const habit = allHabits.get(fromId);
		if (!habit || !habit.childIds) {
			return false;
		}

		for (const childId of habit.childIds) {
			if (hasPathTo(childId, targetId)) {
				return true;
			}
		}
		return false;
	}

	// Check if parentId is reachable from childId
	// If childId -> ... -> parentId exists, then adding parentId -> childId creates a cycle
	return hasPathTo(childId, parentId);
}

/**
 * Get all descendant raw habits for a tag (recursive).
 * Returns unique habits (deduped by ID).
 *
 * @param tag - The tag habit to get descendants for
 * @param allHabits - Map of all habits by ID
 * @returns Array of raw habits that are descendants of this tag
 */
export function getDescendantRawHabits(
	tag: Habit,
	allHabits: Map<string, Habit>,
): Habit[] {
	const results = new Map<string, Habit>();
	const visited = new Set<string>();

	function collectDescendants(habitId: string): void {
		if (visited.has(habitId)) {
			return;
		}
		visited.add(habitId);

		const habit = allHabits.get(habitId);
		if (!habit) {
			return;
		}

		if (habit.habitType === "raw" || !habit.habitType) {
			// Raw habit (default is raw)
			results.set(habit.id, habit);
		} else if (habit.childIds) {
			// Tag - recurse into children
			for (const childId of habit.childIds) {
				collectDescendants(childId);
			}
		}
	}

	// Start from the tag's children (not the tag itself)
	if (tag.childIds) {
		for (const childId of tag.childIds) {
			collectDescendants(childId);
		}
	}

	return Array.from(results.values());
}

/**
 * Get all entries for a tag (tag's own entries + all descendant entries).
 *
 * @param tag - The tag habit to get entries for
 * @param allHabits - Map of all habits by ID
 * @param allEntries - Array of all entries
 * @returns Array of entries for this tag
 */
export function getTagEntries(
	tag: Habit,
	allHabits: Map<string, Habit>,
	allEntries: HabitEntry[],
): HabitEntry[] {
	// Tag's own direct entries
	const tagOwnEntries = allEntries.filter((e) => e.habitId === tag.id);

	// Descendant raw habit entries
	const rawHabits = getDescendantRawHabits(tag, allHabits);
	const rawHabitIds = new Set(rawHabits.map((h) => h.id));
	const descendantEntries = allEntries.filter((e) =>
		rawHabitIds.has(e.habitId),
	);

	return [...tagOwnEntries, ...descendantEntries];
}

/**
 * Check if a tag is completed for a specific day.
 *
 * A tag follows "single-complete" semantics: it's completed for a day
 * if ANY child has ANY entry for that day. This is humane - you showed
 * up and did something in this category, that's what matters.
 *
 * @param tag - The tag habit to check
 * @param allHabits - Map of all habits by ID
 * @param allEntries - Array of all entries
 * @param date - The date to check completion for
 * @returns true if the tag has any descendant entry for that day
 */
export function isTagCompletedForDay(
	tag: Habit,
	allHabits: Map<string, Habit>,
	allEntries: HabitEntry[],
	date: Date,
): boolean {
	const entries = getTagEntries(tag, allHabits, allEntries);

	// Use standard date string format (YYYY-MM-DD) for comparison
	const targetDay = toDateString(date);

	return entries.some((e) => {
		// Handle both Date objects and ISO strings from IndexedDB
		const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
		const entryDay = toDateString(entryDate);
		return entryDay === targetDay;
	});
}

/**
 * Get unique entry days count for a tag within a date range.
 *
 * @param tag - The tag habit to count for
 * @param allHabits - Map of all habits by ID
 * @param allEntries - Array of all entries
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Number of unique days with entries
 */
export function getTagWeeklyCount(
	tag: Habit,
	allHabits: Map<string, Habit>,
	allEntries: HabitEntry[],
	startDate?: Date,
	endDate?: Date,
): number {
	let entries = getTagEntries(tag, allHabits, allEntries);

	// Filter by date range if provided
	if (startDate || endDate) {
		entries = entries.filter((e) => {
			// Handle both Date objects and ISO strings from IndexedDB
			const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
			const entryTime = entryDate.getTime();
			if (startDate && entryTime < startDate.getTime()) {
				return false;
			}
			if (endDate && entryTime > endDate.getTime()) {
				return false;
			}
			return true;
		});
	}

	// Count unique days using standard date string format (YYYY-MM-DD)
	const uniqueDays = new Set(
		entries.map((e) => {
			// Handle both Date objects and ISO strings from IndexedDB
			const d = e.date instanceof Date ? e.date : new Date(e.date);
			return toDateString(d);
		}),
	);
	return uniqueDays.size;
}
