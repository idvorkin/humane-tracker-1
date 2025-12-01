import { liveQuery } from "dexie";
import { db } from "../config/db";
import type { Habit } from "../types/habit";
import { type HabitRecord, normalizeDate, toTimestamp } from "./types";

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
 * Returns a default value of 3 for invalid input, clamps to 1-7 range.
 * Logs warnings when correcting invalid input.
 */
function validateTargetPerWeek(target: number): number {
	if (typeof target !== "number" || Number.isNaN(target)) {
		console.warn(
			`[HabitRepository] Invalid targetPerWeek value: ${target}. Using default value 3.`,
		);
		return 3;
	}
	if (target < 1) {
		console.warn(
			`[HabitRepository] targetPerWeek ${target} is below minimum. Clamping to 1.`,
		);
		return 1;
	}
	if (target > 7) {
		console.warn(
			`[HabitRepository] targetPerWeek ${target} is above maximum. Clamping to 7.`,
		);
		return 7;
	}
	return target;
}

/**
 * Convert a database record to a domain object.
 * During migration period, date fields may be Date objects or ISO strings.
 */
function toHabit(record: HabitRecord): Habit {
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
	try {
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
	} catch (error) {
		throw new Error(
			`Invalid habit data: ${error instanceof Error ? error.message : String(error)}. Name: "${habit.name}", Category: "${habit.category}"`,
		);
	}
}

/**
 * Repository for habits.
 * Handles date conversion: ISO strings in DB, Date objects in app.
 */
export const habitRepository = {
	async getAll(): Promise<Habit[]> {
		try {
			const records = await db.habits.toArray();
			return records.map(toHabit);
		} catch (error) {
			console.error("[HabitRepository] Failed to get all habits:", error);
			throw new Error(
				`Failed to load habits: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async clear(): Promise<void> {
		try {
			const count = await db.habits.count();
			console.warn(
				`[HabitRepository] DESTRUCTIVE: Clearing ${count} habits. This should only happen during import replace mode.`,
			);
			await db.habits.clear();
			console.log(`[HabitRepository] Successfully cleared ${count} habits`);
		} catch (error) {
			console.error("[HabitRepository] Failed to clear habits:", error);
			throw new Error(
				`Failed to clear habits: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserId(userId: string): Promise<Habit[]> {
		try {
			const records = await db.habits.where("userId").equals(userId).toArray();
			return records.map(toHabit);
		} catch (error) {
			console.error(
				`[HabitRepository] Failed to get habits for user ${userId}:`,
				error,
			);
			throw new Error(
				`Failed to load habits: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getById(habitId: string): Promise<Habit | undefined> {
		try {
			const record = await db.habits.get(habitId);
			return record ? toHabit(record) : undefined;
		} catch (error) {
			console.error(`[HabitRepository] Failed to get habit ${habitId}:`, error);
			throw new Error(
				`Failed to load habit: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async create(
		habit: Omit<Habit, "id" | "createdAt" | "updatedAt">,
	): Promise<string> {
		try {
			const record = toRecord(habit);
			const id = await db.habits.add(record);
			return id;
		} catch (error) {
			console.error("[HabitRepository] Failed to create habit:", {
				name: habit.name,
				category: habit.category,
				error,
			});
			throw new Error(
				`Failed to create habit "${habit.name}": ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	/**
	 * Bulk create habits.
	 */
	async bulkCreate(
		habits: Array<Omit<Habit, "id" | "createdAt" | "updatedAt">>,
	): Promise<string[]> {
		const records = habits.map(toRecord);
		const ids = await db.habits.bulkAdd(records, {
			allKeys: true,
		});
		return ids;
	},

	async update(
		habitId: string,
		updates: Partial<Pick<Habit, "name" | "category" | "targetPerWeek">>,
	): Promise<void> {
		try {
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
		} catch (error) {
			console.error(`[HabitRepository] Failed to update habit ${habitId}:`, {
				updates,
				error,
			});
			throw new Error(
				`Failed to update habit: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async delete(habitId: string): Promise<void> {
		try {
			await db.habits.delete(habitId);
		} catch (error) {
			console.error(
				`[HabitRepository] Failed to delete habit ${habitId}:`,
				error,
			);
			throw new Error(
				`Failed to delete habit: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async bulkPut(habits: Habit[]): Promise<void> {
		try {
			const records: HabitRecord[] = habits.map((habit) => ({
				id: habit.id,
				name: habit.name,
				category: habit.category,
				targetPerWeek: habit.targetPerWeek,
				trackingType: habit.trackingType,
				userId: habit.userId,
				createdAt: toTimestamp(habit.createdAt),
				updatedAt: toTimestamp(habit.updatedAt),
			}));
			await db.habits.bulkPut(records);
		} catch (error) {
			console.error(
				`[HabitRepository] Failed to bulk insert ${habits.length} habits:`,
				error,
			);
			throw new Error(
				`Failed to import habits: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
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
			next: (records) => callback(records.map(toHabit)),
			error: (error) => {
				console.error("[HabitRepository] Error in habits subscription:", error);
				console.error(
					"[HabitRepository] Failed to load habit updates. Please refresh the page.",
				);
				// Return empty array so UI doesn't crash
				callback([]);
			},
		});

		return () => subscription.unsubscribe();
	},
};

// Re-export validators for use in services
export { validateCategory, validateHabitName, validateTargetPerWeek };
