import { format } from "date-fns";
import { liveQuery } from "dexie";
import { db } from "../config/db";
import type {
	Habit,
	HabitEntry,
	HabitStatus,
	HabitWithStatus,
} from "../types/habit";

// ============================================================================
// Pure functions (easily testable)
// ============================================================================

/**
 * Validate and normalize a category string.
 * Returns the trimmed category or throws if invalid.
 */
export function validateCategory(category: string): string {
	const trimmed = category.trim();
	if (!trimmed) {
		throw new Error("Category cannot be empty");
	}
	return trimmed;
}

/**
 * Validate and normalize a habit name.
 * Returns the trimmed name or throws if invalid.
 */
export function validateHabitName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Habit name cannot be empty");
	}
	return trimmed;
}

/**
 * Validate targetPerWeek is within bounds.
 * Returns the clamped value.
 */
export function validateTargetPerWeek(target: number): number {
	if (typeof target !== "number" || Number.isNaN(target)) {
		return 3; // default
	}
	return Math.max(1, Math.min(7, target));
}

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
		const entryDate = new Date(e.date);
		return entryDate >= weekStart && entryDate <= weekEnd;
	});

	// Count unique days with entries (not total values)
	// A day counts if there's any entry with value > 0
	const daysWithEntries = new Set(
		weekEntries
			.filter((e) => e.value > 0)
			.map((e) => format(new Date(e.date), "yyyy-MM-dd")),
	).size;

	// Check if there's an entry for today (using currentDate, not real today)
	const todayEntry = weekEntries.find(
		(e) => format(new Date(e.date), "yyyy-MM-dd") === todayStr,
	);
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
		const validatedName = validateHabitName(habit.name);
		const validatedCategory = validateCategory(habit.category);
		const validatedTarget = validateTargetPerWeek(habit.targetPerWeek);

		const newHabit: Omit<Habit, "id"> = {
			...habit,
			name: validatedName,
			category: validatedCategory,
			targetPerWeek: validatedTarget,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const id = await db.habits.add(newHabit as any);
		return id;
	}

	// Get all habits for a user
	async getUserHabits(userId: string): Promise<Habit[]> {
		return await db.habits.where("userId").equals(userId).toArray();
	}

	// Subscribe to habits changes
	subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
		const observable = liveQuery(() =>
			db.habits.where("userId").equals(userId).toArray(),
		);

		const subscription = observable.subscribe({
			next: (habits) => callback(habits),
			error: (error) => console.error("Error in habits subscription:", error),
		});

		// Return unsubscribe function
		return () => subscription.unsubscribe();
	}

	// Add a habit entry
	async addEntry(entry: Omit<HabitEntry, "id" | "createdAt">): Promise<string> {
		const newEntry: Omit<HabitEntry, "id"> = {
			...entry,
			createdAt: new Date(),
		};
		const id = await db.entries.add(newEntry as any);
		return id;
	}

	// Get entries for a habit within a date range
	async getHabitEntries(
		habitId: string,
		startDate: Date,
		endDate: Date,
	): Promise<HabitEntry[]> {
		return await db.entries
			.where("habitId")
			.equals(habitId)
			.and((entry) => {
				// entry.date may be a string (ISO format) from IndexedDB, so convert to Date for comparison
				const entryDate = new Date(entry.date);
				return entryDate >= startDate && entryDate <= endDate;
			})
			.toArray();
	}

	// Subscribe to entries changes for a date range
	subscribeToWeekEntries(
		userId: string,
		startDate: Date,
		endDate: Date,
		callback: (entries: HabitEntry[]) => void,
	) {
		const observable = liveQuery(() =>
			db.entries
				.where("userId")
				.equals(userId)
				.and((entry) => {
					// entry.date may be a string (ISO format) from IndexedDB, so convert to Date for comparison
					const entryDate = new Date(entry.date);
					return entryDate >= startDate && entryDate <= endDate;
				})
				.toArray(),
		);

		const subscription = observable.subscribe({
			next: (entries) => callback(entries),
			error: (error) => console.error("Error in entries subscription:", error),
		});

		// Return unsubscribe function
		return () => subscription.unsubscribe();
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
					.map((e) => format(e.date, "yyyy-MM-dd")),
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
		await db.entries.update(entryId, { value });
	}

	// Delete entry
	async deleteEntry(entryId: string): Promise<void> {
		await db.entries.delete(entryId);
	}

	// Delete habit
	async deleteHabit(habitId: string): Promise<void> {
		await db.habits.delete(habitId);
	}

	// Update habit with validation
	async updateHabit(habitId: string, updates: Partial<Habit>): Promise<void> {
		const validatedUpdates = { ...updates };

		// Validate fields if they're being updated
		if (updates.name !== undefined) {
			validatedUpdates.name = validateHabitName(updates.name);
		}
		if (updates.category !== undefined) {
			validatedUpdates.category = validateCategory(updates.category);
		}
		if (updates.targetPerWeek !== undefined) {
			validatedUpdates.targetPerWeek = validateTargetPerWeek(
				updates.targetPerWeek,
			);
		}

		await db.habits.update(habitId, validatedUpdates);
	}

	// Get entries for a specific habit
	async getEntriesForHabit(habitId: string): Promise<HabitEntry[]> {
		return await db.entries.where("habitId").equals(habitId).toArray();
	}

	// Get all habits for a user (alias for getUserHabits)
	async getHabits(userId: string): Promise<Habit[]> {
		return this.getUserHabits(userId);
	}

	// Bulk create habits (faster than individual creates)
	async bulkCreateHabits(
		habits: Array<Omit<Habit, "id" | "createdAt" | "updatedAt">>,
	): Promise<string[]> {
		const now = new Date();
		const habitsToInsert = habits.map((habit) => ({
			...habit,
			createdAt: now,
			updatedAt: now,
		}));
		const ids = await db.habits.bulkAdd(habitsToInsert as any[], {
			allKeys: true,
		});
		return ids;
	}
}
