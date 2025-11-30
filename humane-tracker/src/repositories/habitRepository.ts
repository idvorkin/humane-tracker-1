import { liveQuery } from "dexie";
import { db } from "../config/db";
import type { Habit } from "../types/habit";
import {
	type HabitRecord,
	normalizeDate,
	toTimestamp,
} from "./types";

/**
 * Validate and normalize a category string.
 */
function validateCategory(category: string): string {
	const trimmed = category.trim();
	if (!trimmed) {
		throw new Error("Category cannot be empty");
	}
	return trimmed;
}

/**
 * Validate and normalize a habit name.
 */
function validateHabitName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error("Habit name cannot be empty");
	}
	return trimmed;
}

/**
 * Validate targetPerWeek is within bounds.
 */
function validateTargetPerWeek(target: number): number {
	if (typeof target !== "number" || Number.isNaN(target)) {
		return 3;
	}
	return Math.max(1, Math.min(7, target));
}

/**
 * Convert a database record to a domain object.
 */
function toHabit(record: HabitRecord | Habit): Habit {
	return {
		id: record.id,
		name: record.name,
		category: record.category,
		targetPerWeek: record.targetPerWeek,
		trackingType: record.trackingType,
		userId: record.userId,
		createdAt: normalizeDate(record.createdAt as string | Date),
		updatedAt: normalizeDate(record.updatedAt as string | Date),
	};
}

/**
 * Convert a domain object to a database record.
 */
function toRecord(
	habit: Omit<Habit, "id" | "createdAt" | "updatedAt">,
): Omit<HabitRecord, "id"> {
	const now = toTimestamp(new Date());
	return {
		name: validateHabitName(habit.name),
		category: validateCategory(habit.category),
		targetPerWeek: validateTargetPerWeek(habit.targetPerWeek),
		trackingType: habit.trackingType,
		userId: habit.userId,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Repository for habits.
 * Handles date conversion: ISO strings in DB, Date objects in app.
 */
export const habitRepository = {
	/**
	 * Get all habits (for export).
	 */
	async getAll(): Promise<Habit[]> {
		const records = await db.habits.toArray();
		return records.map((r) => toHabit(r as unknown as HabitRecord));
	},

	/**
	 * Clear all habits (for import replace mode).
	 */
	async clear(): Promise<void> {
		await db.habits.clear();
	},

	/**
	 * Get all habits for a user.
	 */
	async getByUserId(userId: string): Promise<Habit[]> {
		const records = await db.habits.where("userId").equals(userId).toArray();
		return records.map((r) => toHabit(r as unknown as HabitRecord));
	},

	/**
	 * Get a single habit by ID.
	 */
	async getById(habitId: string): Promise<Habit | undefined> {
		const record = await db.habits.get(habitId);
		return record ? toHabit(record as unknown as HabitRecord) : undefined;
	},

	/**
	 * Create a new habit.
	 */
	async create(
		habit: Omit<Habit, "id" | "createdAt" | "updatedAt">,
	): Promise<string> {
		const record = toRecord(habit);
		const id = await db.habits.add(record as unknown as Habit);
		return id;
	},

	/**
	 * Bulk create habits.
	 */
	async bulkCreate(
		habits: Array<Omit<Habit, "id" | "createdAt" | "updatedAt">>,
	): Promise<string[]> {
		const records = habits.map(toRecord);
		const ids = await db.habits.bulkAdd(records as unknown as Habit[], {
			allKeys: true,
		});
		return ids;
	},

	/**
	 * Update a habit.
	 */
	async update(
		habitId: string,
		updates: Partial<Pick<Habit, "name" | "category" | "targetPerWeek">>,
	): Promise<void> {
		const validatedUpdates: Record<string, unknown> = {
			updatedAt: toTimestamp(new Date()),
		};

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
	},

	/**
	 * Delete a habit.
	 */
	async delete(habitId: string): Promise<void> {
		await db.habits.delete(habitId);
	},

	/**
	 * Bulk insert habits (for import).
	 */
	async bulkPut(habits: Habit[]): Promise<void> {
		const records = habits.map((habit) => ({
			id: habit.id,
			name: habit.name,
			category: habit.category,
			targetPerWeek: habit.targetPerWeek,
			trackingType: habit.trackingType,
			userId: habit.userId,
			createdAt: toTimestamp(habit.createdAt),
			updatedAt: toTimestamp(habit.updatedAt),
		}));
		await db.habits.bulkPut(records as unknown as Habit[]);
	},

	/**
	 * Subscribe to habits for a user.
	 * Returns an unsubscribe function.
	 */
	subscribeByUserId(
		userId: string,
		callback: (habits: Habit[]) => void,
	): () => void {
		const observable = liveQuery(() =>
			db.habits.where("userId").equals(userId).toArray(),
		);

		const subscription = observable.subscribe({
			next: (records) =>
				callback(records.map((r) => toHabit(r as unknown as HabitRecord))),
			error: (error) => console.error("Error in habits subscription:", error),
		});

		return () => subscription.unsubscribe();
	},
};

// Re-export validators for use in services
export { validateCategory, validateHabitName, validateTargetPerWeek };
