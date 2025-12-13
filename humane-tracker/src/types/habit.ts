export interface HabitVariant {
	id: string;
	name: string;
	usageCount?: number;
}

export type HabitType = "raw" | "tag";

export interface Habit {
	id: string;
	name: string;
	category: string;
	targetPerWeek: number;
	trackingType?: "binary" | "sets" | "hybrid";
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	variants?: HabitVariant[];
	allowCustomVariant?: boolean;

	// Tag system fields
	habitType?: HabitType; // 'raw' (default) or 'tag'
	childIds?: string[]; // For tags: IDs of children (raw habits or other tags)
	parentIds?: string[]; // For reverse lookup: which tags contain this habit
}

// Structured set data for "write loose, structure later"
export interface SetData {
	weight?: number; // in kg
	reps?: number;
	duration?: number; // in seconds
}

export interface HabitEntry {
	id: string;
	habitId: string;
	userId: string;
	date: Date;
	value: number; // Can be 1 for done, 0.5 for partial, or actual count
	notes?: string; // Freeform notes (write loose)
	createdAt: Date;
	variantId?: string;
	variantName?: string;

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
