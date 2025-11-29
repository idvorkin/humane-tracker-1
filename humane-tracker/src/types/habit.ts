export interface Habit {
	id: string;
	name: string;
	category: HabitCategory;
	targetPerWeek: number;
	trackingType?: "binary" | "sets" | "hybrid";
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface HabitEntry {
	id: string;
	habitId: string;
	userId: string;
	date: Date;
	value: number; // Can be 1 for done, 0.5 for partial, or actual count
	notes?: string;
	createdAt: Date;
}

export type HabitCategory =
	| "mobility"
	| "connection"
	| "balance"
	| "joy"
	| "strength";

export interface CategoryInfo {
	value: HabitCategory;
	label: string;
	name: string;
	color: string;
}

export const CATEGORIES: CategoryInfo[] = [
	{
		value: "mobility",
		label: "Movement",
		name: "Movement & Mobility",
		color: "#60a5fa",
	},
	{
		value: "connection",
		label: "Connection",
		name: "Connections",
		color: "#a855f7",
	},
	{
		value: "balance",
		label: "Balance",
		name: "Inner Balance",
		color: "#fbbf24",
	},
	{ value: "joy", label: "Joy", name: "Joy & Play", color: "#f472b6" },
	{
		value: "strength",
		label: "Strength",
		name: "Strength Building",
		color: "#34d399",
	},
];

export const CATEGORY_MAP: Record<HabitCategory, CategoryInfo> =
	Object.fromEntries(CATEGORIES.map((cat) => [cat.value, cat])) as Record<
		HabitCategory,
		CategoryInfo
	>;

export const ALL_CATEGORY_VALUES: HabitCategory[] = CATEGORIES.map(
	(c) => c.value,
);

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
	category: HabitCategory;
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
