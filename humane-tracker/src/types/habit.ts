import type { TargetPerWeek } from "../repositories/types";

export type HabitType = "raw" | "tag";

export interface Habit {
	id: string;
	name: string;
	category: string;
	targetPerWeek: TargetPerWeek;
	trackingType?: "binary" | "sets" | "hybrid";
	userId: string;
	createdAt: Date;
	updatedAt: Date;

	// Tag system fields
	habitType?: HabitType; // 'raw' (default) or 'tag'
	childIds?: string[]; // For tags: IDs of children (raw habits or other tags)
	parentIds?: string[]; // For reverse lookup: which tags contain this habit

	// Visibility
	hidden?: boolean; // If true, habit is hidden from tracker view
}

// Structured set data for "write loose, structure later"
export interface SetData {
	weight?: number; // in kg
	reps?: number;
	duration?: number; // in seconds
}

/**
 * Re-export EntryValue type for convenience.
 * Valid values: 0, 0.5, or any non-negative integer (for set counts).
 */
export type { EntryValue } from "../repositories/types";

export interface HabitEntry {
	id: string;
	habitId: string;
	userId: string;
	date: Date;
	value: number; // 0 (not done), 0.5 (partial), 1 (done), or count for sets
	notes?: string; // Freeform notes (write loose)
	createdAt: Date;

	// Structured data (structure later - via LLM parsing or manual entry)
	sets?: SetData[];
	parsed?: boolean; // Has this entry been LLM-processed?
}

export interface CategoryInfo {
	name: string;
	color: string;
}

export type HabitStatus =
	| "done"
	| "met"
	| "today"
	| "tomorrow"
	| "soon"
	| "overdue"
	| "pending";

export interface HabitWithStatus extends Habit {
	status: HabitStatus;
	currentWeekCount: number;
	entries: HabitEntry[];
}

export interface WeekData {
	startDate: Date;
	endDate: Date;
	currentDay: Date;
	habits: HabitWithStatus[];
}

export interface CategorySection {
	category: string;
	name: string;
	color: string;
	habits: HabitWithStatus[];
	isCollapsed: boolean;
}

export interface SummaryStats {
	dueToday: number;
	overdue: number;
	doneToday: number;
	onTrack: number;
}
