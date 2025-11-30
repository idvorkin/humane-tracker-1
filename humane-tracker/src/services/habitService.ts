import { format } from "date-fns";
import type {
	Habit,
	HabitEntry,
	HabitStatus,
	HabitWithStatus,
} from "../types/habit";
import {
	entryRepository,
	habitRepository,
	toDateString,
} from "../repositories";

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
	const weekEnd = new Date(currentDate);
	weekEnd.setHours(23, 59, 59, 999);
	const weekStart = new Date(currentDate);
	weekStart.setDate(weekStart.getDate() - 6);
	weekStart.setHours(0, 0, 0, 0);

	const todayStr = format(currentDate, "yyyy-MM-dd");

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
				return format(entryDate, "yyyy-MM-dd");
			}),
	).size;

	// Check if there's an entry for today (using currentDate, not real today)
	const todayEntry = weekEntries.find((e) => {
		const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
		return format(entryDate, "yyyy-MM-dd") === todayStr;
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
	subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
		return habitRepository.subscribeByUserId(userId, callback);
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
	) {
		return entryRepository.subscribeForDateRange(
			userId,
			startDate,
			endDate,
			callback,
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
		// Get trailing 7 days (today and previous 6 days)
		const endDate = new Date(currentDate);
		endDate.setHours(23, 59, 59, 999);
		const startDate = new Date(currentDate);
		startDate.setDate(startDate.getDate() - 6);
		startDate.setHours(0, 0, 0, 0);

		const habitsWithStatus: HabitWithStatus[] = [];

		for (const habit of habits) {
			const entries = await this.getHabitEntries(habit.id, startDate, endDate);
			const status = this.calculateHabitStatus(habit, entries, currentDate);

			// Count unique days with entries (not total values)
			// According to PRD: "Weekly goals count DAYS not total sets"
			const currentWeekCount = new Set(
				entries
					.filter((e) => e.value > 0)
					.map((e) => toDateString(e.date)),
			).size;

			habitsWithStatus.push({
				...habit,
				status,
				currentWeekCount,
				entries,
			});
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

	// Update habit with validation
	async updateHabit(habitId: string, updates: Partial<Habit>): Promise<void> {
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
