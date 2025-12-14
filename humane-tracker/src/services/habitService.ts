import {
	entryRepository,
	habitRepository,
	toDateString,
} from "../repositories";
import type {
	Habit,
	HabitEntry,
	HabitStatus,
	HabitWithStatus,
} from "../types/habit";
import { getTrailingWeekDateRange } from "../utils/dateUtils";
import { getDescendantRawHabits } from "../utils/tagUtils";

// ============================================================================
// Pure functions (easily testable)
// ============================================================================

// Re-export validators from repository for backwards compatibility
export {
	validateCategory,
	validateHabitName,
	validateTargetPerWeek,
} from "../repositories/habitRepository";

/**
 * Calculate habit status based on entries in trailing 7-day window.
 * This is a pure function for easy testing.
 */
export function calculateHabitStatus(
	habit: Pick<Habit, "name" | "targetPerWeek">,
	entries: Pick<HabitEntry, "date" | "value">[],
	currentDate: Date = new Date(),
): HabitStatus {
	// Use trailing 7 days (today and 6 days back) to match UI display
	const { startDate: weekStart, endDate: weekEnd } =
		getTrailingWeekDateRange(currentDate);

	const todayStr = toDateString(currentDate);

	const weekEntries = entries.filter((e) => {
		// Handle both Date objects and ISO strings
		const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
		return entryDate >= weekStart && entryDate <= weekEnd;
	});

	// Count unique days with entries (not total values)
	// A day counts if there's any entry with value > 0
	const daysWithEntries = new Set(
		weekEntries
			.filter((e) => e.value > 0)
			.map((e) => {
				const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
				return toDateString(entryDate);
			}),
	).size;

	// Check if there's an entry for today (using currentDate, not real today)
	const todayEntry = weekEntries.find((e) => {
		const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
		return toDateString(entryDate) === todayStr;
	});
	const doneToday = todayEntry && todayEntry.value >= 1;
	const targetMet = daysWithEntries >= habit.targetPerWeek;

	// Check if weekly target is met first
	if (targetMet) {
		return doneToday ? "done" : "met";
	}

	// For trailing 7-day window: check if on track to meet target
	const daysNeeded = habit.targetPerWeek - daysWithEntries;

	// With trailing window, urgency is based on whether you're behind pace
	if (daysNeeded >= habit.targetPerWeek && !todayEntry) {
		// Haven't started at all this week
		return "today";
	}

	if (daysNeeded > 0 && !todayEntry) {
		// Behind but not critical - do tomorrow
		return "tomorrow";
	}

	return "pending";
}

/**
 * Result of computing tag status - includes synthetic entries and count.
 */
export interface TagStatusResult {
	entries: HabitEntry[];
	currentWeekCount: number;
	status: HabitStatus;
}

/**
 * Compute tag status based on children's entries (single-complete model).
 *
 * A tag is "completed" for a day if ANY child has ANY entry for that day.
 * This is humane - showing up is what matters.
 *
 * Returns synthetic entries (one per unique day) and the computed status.
 */
export function computeTagStatus(
	tag: Habit,
	allHabits: Habit[],
	allEntries: HabitEntry[],
	currentDate: Date = new Date(),
): TagStatusResult {
	// Build habits map for getDescendantRawHabits
	const habitsMap = new Map<string, Habit>();
	for (const habit of allHabits) {
		habitsMap.set(habit.id, habit);
	}

	// Get all descendant raw habits
	const descendants = getDescendantRawHabits(tag, habitsMap);
	const descendantIds = new Set(descendants.map((h) => h.id));

	// Get trailing week range
	const { startDate: weekStart, endDate: weekEnd } =
		getTrailingWeekDateRange(currentDate);

	// Find all entries for descendants within the week
	const descendantEntries = allEntries.filter((e) => {
		if (!descendantIds.has(e.habitId)) return false;
		const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
		return entryDate >= weekStart && entryDate <= weekEnd;
	});

	// Group by unique day - one synthetic entry per day
	const uniqueDays = new Map<string, Date>();
	for (const entry of descendantEntries) {
		const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
		const dayKey = toDateString(entryDate);
		if (!uniqueDays.has(dayKey)) {
			uniqueDays.set(dayKey, entryDate);
		}
	}

	// Create synthetic entries (value=1 for each unique day)
	const syntheticEntries: HabitEntry[] = Array.from(uniqueDays.entries()).map(
		([dayKey, date], index) => ({
			id: `synthetic-${tag.id}-${dayKey}`,
			habitId: tag.id,
			userId: tag.userId,
			date,
			value: 1, // Binary: completed for this day
			createdAt: new Date(),
		}),
	);

	// Count unique days
	const currentWeekCount = uniqueDays.size;

	// Calculate status using the same logic as regular habits
	const status = calculateHabitStatus(tag, syntheticEntries, currentDate);

	return {
		entries: syntheticEntries,
		currentWeekCount,
		status,
	};
}

export class HabitService {
	// Create a new habit with validation
	async createHabit(
		habit: Omit<Habit, "id" | "createdAt" | "updatedAt">,
	): Promise<string> {
		return habitRepository.create(habit);
	}

	// Get all habits for a user
	async getUserHabits(userId: string): Promise<Habit[]> {
		return habitRepository.getByUserId(userId);
	}

	// Subscribe to habits changes
	subscribeToHabits(
		userId: string,
		callback: (habits: Habit[]) => void,
		onError?: (error: unknown) => void,
	) {
		return habitRepository.subscribeByUserId(userId, callback, onError);
	}

	// Add a habit entry
	async addEntry(entry: Omit<HabitEntry, "id" | "createdAt">): Promise<string> {
		return entryRepository.add(entry);
	}

	// Get entries for a habit within a date range
	async getHabitEntries(
		habitId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		return entryRepository.getForHabitInRange(habitId, startDate, endDate);
	}

	// Subscribe to entries changes for a date range
	subscribeToWeekEntries(
		userId: string,
		startDate: Date,
		endDate: Date,
		callback: (entries: HabitEntry[]) => void,
		onError?: (error: unknown) => void,
	) {
		return entryRepository.subscribeForDateRange(
			userId,
			startDate,
			endDate,
			callback,
			onError,
		);
	}

	// Calculate habit status - delegates to pure function
	calculateHabitStatus(
		habit: Habit,
		entries: HabitEntry[],
		currentDate: Date = new Date(),
	): HabitStatus {
		return calculateHabitStatus(habit, entries, currentDate);
	}

	// Get habits with status for trailing 7 days
	async getHabitsWithStatus(userId: string): Promise<HabitWithStatus[]> {
		const habits = await this.getUserHabits(userId);
		const currentDate = new Date();
		const { startDate, endDate } = getTrailingWeekDateRange(currentDate);

		// Fetch ALL entries for the date range once (needed for tag aggregation)
		const allEntries = await entryRepository.getForDateRange(
			userId,
			startDate,
			endDate,
		);

		const habitsWithStatus: HabitWithStatus[] = [];

		for (const habit of habits) {
			// For tags, compute synthetic entries from children
			if (habit.habitType === "tag") {
				const tagStatus = computeTagStatus(
					habit,
					habits,
					allEntries,
					currentDate,
				);
				habitsWithStatus.push({
					...habit,
					status: tagStatus.status,
					currentWeekCount: tagStatus.currentWeekCount,
					entries: tagStatus.entries,
				});
			} else {
				// For raw habits, use entries for this specific habit
				const entries = allEntries.filter((e) => e.habitId === habit.id);
				const status = this.calculateHabitStatus(habit, entries, currentDate);

				// Count unique days with entries (not total values)
				// According to PRD: "Weekly goals count DAYS not total sets"
				const currentWeekCount = new Set(
					entries.filter((e) => e.value > 0).map((e) => toDateString(e.date)),
				).size;

				habitsWithStatus.push({
					...habit,
					status,
					currentWeekCount,
					entries,
				});
			}
		}

		return habitsWithStatus;
	}

	// Update entry value
	async updateEntry(entryId: string, value: number): Promise<void> {
		return entryRepository.updateValue(entryId, value);
	}

	// Delete entry
	async deleteEntry(entryId: string): Promise<void> {
		return entryRepository.delete(entryId);
	}

	// Delete habit
	async deleteHabit(habitId: string): Promise<void> {
		return habitRepository.delete(habitId);
	}

	// Delete multiple habits atomically (all-or-nothing)
	async bulkDeleteHabits(habitIds: string[]): Promise<void> {
		return habitRepository.bulkDelete(habitIds);
	}

	// Update habit with validation
	// Note: habitType is intentionally excluded - it's immutable after creation
	async updateHabit(
		habitId: string,
		updates: Partial<
			Pick<
				Habit,
				| "name"
				| "category"
				| "targetPerWeek"
				| "trackingType"
				| "hidden"
				| "childIds"
				| "parentIds"
			>
		>,
	): Promise<void> {
		return habitRepository.update(habitId, updates);
	}

	// Get entries for a specific habit
	async getEntriesForHabit(habitId: string): Promise<HabitEntry[]> {
		return entryRepository.getByHabitId(habitId);
	}

	// Get all habits for a user (alias for getUserHabits)
	async getHabits(userId: string): Promise<Habit[]> {
		return this.getUserHabits(userId);
	}

	// Bulk create habits (faster than individual creates)
	async bulkCreateHabits(
		habits: Array<Omit<Habit, "id" | "createdAt" | "updatedAt">>,
	): Promise<string[]> {
		return habitRepository.bulkCreate(habits);
	}
}

// Export a singleton instance for convenience (used in tests)
export const habitService = new HabitService();
