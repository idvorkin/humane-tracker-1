export interface HabitVariant {
	id: string;
	name: string;
	usageCount?: number;
}

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
}

export interface HabitEntry {
	id: string;
	habitId: string;
	userId: string;
	date: Date;
	value: number; // Can be 1 for done, 0.5 for partial, or actual count
	notes?: string;
	createdAt: Date;
	variantId?: string;
	variantName?: string;
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
