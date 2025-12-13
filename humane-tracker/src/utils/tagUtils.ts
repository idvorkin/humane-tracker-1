import type { Habit, HabitEntry } from "../types/habit";

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
			const entryDate = e.date.getTime();
			if (startDate && entryDate < startDate.getTime()) {
				return false;
			}
			if (endDate && entryDate > endDate.getTime()) {
				return false;
			}
			return true;
		});
	}

	// Count unique days
	const uniqueDays = new Set(
		entries.map((e) => {
			const d = e.date;
			return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
		}),
	);
	return uniqueDays.size;
}
