import { addDays, format, isSameDay, isToday } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { toDateString } from "../repositories";
import { habitService } from "../services/habitService";
import type {
	CategorySection,
	HabitStatus,
	HabitWithStatus,
	SummaryStats,
} from "../types/habit";
import { buildCategoryInfo, extractCategories } from "../utils/categoryUtils";
import { getTrailingWeekDateRange } from "../utils/dateUtils";
import {
	buildHabitTree,
	type FlatTreeNode,
	flattenTree,
} from "../utils/habitTreeUtils";

// ============================================================================
// Pure helper functions (easily testable)
// ============================================================================

/**
 * Determines if a confirmation dialog should be shown before modifying an entry.
 * Returns true if the date is NOT today AND NOT the currently selected date.
 */
export function shouldConfirmDateModification(
	date: Date,
	selectedDate: Date | null,
): boolean {
	const isSelectedDate = selectedDate !== null && isSameDay(date, selectedDate);
	return !isToday(date) && !isSelectedDate;
}

export type StatStatus = "good" | "warn" | "bad" | "neutral";

export interface CategorySummary {
	doneToday: number;
	dueToday: number;
	met: number;
	total: number;
	todayStatus: StatStatus;
	totalStatus: StatStatus;
}

export function getCategorySummary(habits: HabitWithStatus[]): CategorySummary {
	// Build set of all child IDs - children of tags shouldn't count separately
	// They roll up into their parent tag's count
	const childIds = new Set<string>();
	for (const h of habits) {
		if (h.habitType === "tag" && h.childIds) {
			for (const childId of h.childIds) {
				childIds.add(childId);
			}
		}
	}

	// Filter to top-level habits only (exclude children of tags)
	const topLevelHabits = habits.filter((h) => !childIds.has(h.id));

	// Count habits with entries for today (not just status "done")
	const todayStr = toDateString(new Date());
	const doneToday = topLevelHabits.filter((h) =>
		h.entries.some((e) => toDateString(e.date) === todayStr && e.value >= 1),
	).length;

	const total = topLevelHabits.length;

	// Count habits that met their weekly target
	const met = topLevelHabits.filter(
		(h) => h.currentWeekCount >= h.targetPerWeek,
	).length;

	const todayStatus: StatStatus =
		total === 0
			? "neutral"
			: doneToday === total
				? "good"
				: doneToday > 0
					? "warn"
					: "bad";

	const totalStatus: StatStatus =
		total === 0 ? "neutral" : met === total ? "good" : met > 0 ? "warn" : "bad";

	return { doneToday, dueToday: total, met, total, todayStatus, totalStatus };
}

export function getStatusIcon(status: HabitStatus): string {
	switch (status) {
		case "done":
			return "●";
		case "met":
			return "✓";
		case "today":
			return "⏰";
		case "tomorrow":
			return "→";
		case "overdue":
			return "!";
		default:
			return "";
	}
}

export interface CellDisplay {
	content: string;
	className: string;
}

export function getCellDisplay(
	habit: HabitWithStatus,
	date: Date,
): CellDisplay {
	const targetDateStr = toDateString(date);
	const entry = habit.entries.find(
		(e) => toDateString(e.date) === targetDateStr,
	);

	if (!entry) {
		return { content: "", className: "" };
	}

	let content = "";
	if (entry.value === 1) content = "✓";
	else if (entry.value === 0.5) content = "½";
	else if (entry.value > 1) content = entry.value.toString();

	let className = "";
	if (entry.value >= 1) className = "completed";
	else if (entry.value === 0.5) className = "partial";

	return { content, className };
}

export function calculateSummaryStats(habits: HabitWithStatus[]): SummaryStats {
	// Count habits with entries for today (not just status "done")
	const todayStr = toDateString(new Date());
	const doneToday = habits.filter((h) =>
		h.entries.some((e) => toDateString(e.date) === todayStr && e.value >= 1),
	).length;

	// Count habits that met their weekly target
	const onTrack = habits.filter(
		(h) => h.currentWeekCount >= h.targetPerWeek,
	).length;

	return {
		dueToday: habits.filter((h) => h.status === "today").length,
		overdue: habits.filter((h) => h.status === "overdue").length,
		doneToday,
		onTrack,
	};
}

export function groupHabitsByCategory(
	habits: HabitWithStatus[],
	collapsedCategories: Set<string>,
): CategorySection[] {
	const categories = extractCategories(habits);
	return categories
		.map((category) => {
			const info = buildCategoryInfo(category);
			return {
				category,
				name: info.name,
				color: info.color,
				habits: habits.filter((h) => h.category === category),
				isCollapsed: collapsedCategories.has(category),
			};
		})
		.filter((section) => section.habits.length > 0);
}

export function getTrailingWeekDates(): Date[] {
	const today = new Date();
	const dates: Date[] = [];
	for (let i = 0; i <= 6; i++) {
		dates.push(addDays(today, -i));
	}
	return dates;
}

/**
 * Calculate the next entry value when cycling through click states.
 * For raw habits: empty → 1 → 2 → 3 → 4 → 5 → 0.5 → empty
 * For tags: empty → 1 → empty (binary toggle)
 */
export function getNextEntryValue(
	currentValue: number | null,
	isTag = false,
): number | null {
	// Tags are binary - just toggle on/off
	if (isTag) {
		return currentValue === null || currentValue === 0 ? 1 : null;
	}

	// Raw habits cycle through values
	if (currentValue === null) return 1;
	if (currentValue >= 1 && currentValue < 5) return currentValue + 1;
	if (currentValue >= 5) return 0.5;
	if (currentValue === 0.5) return null; // delete
	return 1;
}

// ============================================================================
// ViewModel Hook
// ============================================================================

interface UseHabitTrackerVMProps {
	userId: string;
}

export interface HabitTrackerVM {
	// State
	habits: HabitWithStatus[];
	sections: CategorySection[];
	weekDates: Date[];
	summaryStats: SummaryStats;
	isLoading: boolean;
	zoomedSection: string | null;
	allExpanded: boolean;
	selectedDate: Date | null;
	entryError: string | null;

	// Tag tree support
	habitTree: FlatTreeNode[];
	expandedTags: ReadonlySet<string>;

	// Computed helpers (exposed for convenience)
	getCategorySummary: typeof getCategorySummary;
	getStatusIcon: typeof getStatusIcon;
	getCellDisplay: typeof getCellDisplay;

	// Actions
	toggleEntry: (habitId: string, date: Date) => Promise<void>;
	toggleSection: (category: string) => void;
	toggleTagExpanded: (tagId: string) => void;
	expandAll: () => void;
	collapseAll: () => void;
	zoomIn: (category: string) => void;
	zoomOut: () => void;
	selectDate: (date: Date | null) => void;
	clearEntryError: () => void;

	// For menu actions
	hasNoHabits: boolean;
}

export function useHabitTrackerVM({
	userId,
}: UseHabitTrackerVMProps): HabitTrackerVM {
	const [habits, setHabits] = useState<HabitWithStatus[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [zoomedSection, setZoomedSection] = useState<string | null>(null);
	const [allExpanded, setAllExpanded] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [entryError, setEntryError] = useState<string | null>(null);
	// Start with empty set - categories derived dynamically from habits
	const collapsedSectionsRef = useRef<Set<string>>(new Set());
	const [collapsedVersion, setCollapsedVersion] = useState(0); // trigger re-render on collapse changes

	// Tag expansion state
	const expandedTagsRef = useRef<Set<string>>(new Set());
	const [expandedTagsVersion, setExpandedTagsVersion] = useState(0);

	// Mock mode is now handled by mock repositories (injected in index.tsx for tests)
	// No need for special logic here - subscriptions work the same way
	const weekDates = useMemo(() => getTrailingWeekDates(), []);

	// Derived state
	const sections = useMemo(
		() => groupHabitsByCategory(habits, collapsedSectionsRef.current),
		[habits, collapsedVersion], // eslint-disable-line react-hooks/exhaustive-deps
	);

	// Build habit tree for nested tag display
	const habitTree = useMemo(() => {
		const tree = buildHabitTree(habits, expandedTagsRef.current);
		return flattenTree(tree);
	}, [habits, expandedTagsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

	const summaryStats = useMemo(() => {
		// When zoomed, show stats only for that category
		if (zoomedSection) {
			const section = sections.find((s) => s.category === zoomedSection);
			if (section) {
				return calculateSummaryStats(section.habits);
			}
		}
		return calculateSummaryStats(habits);
	}, [habits, zoomedSection, sections]);

	// Load habits
	useEffect(() => {
		setHabits([]);
		setIsLoading(true);

		const loadHabits = async (skipLoading = false) => {
			try {
				if (!skipLoading) setIsLoading(true);
				const habitsWithStatus = await habitService.getHabitsWithStatus(userId);

				// Filter out hidden habits
				const visibleHabits = habitsWithStatus.filter((h) => !h.hidden);

				// Deduplicate habits by name (keeping the one with most entries)
				const uniqueHabits = visibleHabits.reduce((acc, habit) => {
					const existing = acc.find((h) => h.name === habit.name);
					if (!existing) {
						acc.push(habit);
					} else if (habit.entries.length > existing.entries.length) {
						const index = acc.indexOf(existing);
						acc[index] = habit;
					}
					return acc;
				}, [] as HabitWithStatus[]);

				setHabits(uniqueHabits);
				// On initial load, collapse all categories
				if (!skipLoading && collapsedSectionsRef.current.size === 0) {
					const categories = extractCategories(uniqueHabits);
					categories.forEach((cat) => collapsedSectionsRef.current.add(cat));
					setCollapsedVersion((v) => v + 1);
				}
				if (!skipLoading) setIsLoading(false);
			} catch (error) {
				console.error("Error fetching habits:", error);
				setHabits([]);
				if (!skipLoading) setIsLoading(false);
			}
		};

		// Set up subscriptions - works for both real and mock repositories
		let isInitialLoad = true;

		const handleSubscriptionError = (error: unknown) => {
			const errorMsg = error instanceof Error ? error.message : String(error);
			alert(
				`Failed to load habit data: ${errorMsg}\n\nPlease refresh the page. If the problem persists, contact support.`,
			);
		};

		const unsubscribeHabits = habitService.subscribeToHabits(
			userId,
			() => {
				if (!isInitialLoad) loadHabits(true);
			},
			handleSubscriptionError,
		);

		const { startDate, endDate } = getTrailingWeekDateRange();

		const unsubscribeEntries = habitService.subscribeToWeekEntries(
			userId,
			startDate,
			endDate,
			() => {
				if (!isInitialLoad) loadHabits(true);
			},
			handleSubscriptionError,
		);

		loadHabits().then(() => {
			isInitialLoad = false;
		});

		return () => {
			unsubscribeHabits();
			unsubscribeEntries();
		};
	}, [userId]);

	// Actions
	const toggleSection = useCallback(
		(category: string) => {
			// Don't allow collapsing when zoomed in
			if (zoomedSection) return;

			const isCurrentlyCollapsed = collapsedSectionsRef.current.has(category);

			if (isCurrentlyCollapsed) {
				// Expanding this section - collapse all others first (accordion behavior)
				const allCategories = extractCategories(habits);
				allCategories.forEach((cat) => collapsedSectionsRef.current.add(cat));
				// Then expand only this one
				collapsedSectionsRef.current.delete(category);
			} else {
				// Collapsing this section
				collapsedSectionsRef.current.add(category);
			}
			setCollapsedVersion((v) => v + 1);
			setAllExpanded(false);
		},
		[zoomedSection, habits],
	);

	const expandAll = useCallback(() => {
		collapsedSectionsRef.current.clear();
		setCollapsedVersion((v) => v + 1);
		setAllExpanded(true);
	}, []);

	const collapseAll = useCallback(() => {
		const allCategories = extractCategories(habits);
		allCategories.forEach((cat) => collapsedSectionsRef.current.add(cat));
		setCollapsedVersion((v) => v + 1);
		setAllExpanded(false);
	}, [habits]);

	const zoomIn = useCallback((category: string) => {
		setZoomedSection(category);
		collapsedSectionsRef.current.delete(category);
		setCollapsedVersion((v) => v + 1);
	}, []);

	const zoomOut = useCallback(() => {
		// Collapse the section we're zooming out of
		setZoomedSection((current) => {
			if (current) {
				collapsedSectionsRef.current.add(current);
				setCollapsedVersion((v) => v + 1);
			}
			return null;
		});
	}, []);

	const selectDate = useCallback((date: Date | null) => {
		setSelectedDate(date);
	}, []);

	const toggleTagExpanded = useCallback((tagId: string) => {
		if (expandedTagsRef.current.has(tagId)) {
			expandedTagsRef.current.delete(tagId);
		} else {
			expandedTagsRef.current.add(tagId);
		}
		setExpandedTagsVersion((v) => v + 1);
	}, []);

	const toggleEntry = useCallback(
		async (habitId: string, date: Date) => {
			// Confirm modification of any date except today or the selected date
			if (shouldConfirmDateModification(date, selectedDate)) {
				const dateStr = format(date, "MMM d");
				if (
					!window.confirm(
						`Are you sure you want to modify entries for ${dateStr}?`,
					)
				) {
					return;
				}
			}

			const habit = habits.find((h) => h.id === habitId);
			if (!habit) {
				console.error("Habit not found:", habitId);
				return;
			}

			const targetDateStr = toDateString(date);

			// For tags, entries array contains synthetic entries (for display).
			// We need to find a REAL entry on the tag itself, not synthetic ones.
			const existingEntry = habit.entries.find(
				(e) =>
					toDateString(e.date) === targetDateStr &&
					!e.id.startsWith("synthetic-"),
			);

			const currentValue = existingEntry?.value ?? null;
			const isTag = habit.habitType === "tag";
			const nextValue = getNextEntryValue(currentValue, isTag);

			// Just write to DB - liveQuery will notify us and trigger a refresh
			setEntryError(null);
			try {
				if (existingEntry) {
					if (nextValue === null) {
						await habitService.deleteEntry(existingEntry.id);
					} else {
						await habitService.updateEntry(existingEntry.id, nextValue);
					}
				} else if (nextValue !== null) {
					await habitService.addEntry({
						habitId,
						userId,
						date,
						value: nextValue,
					});
				}
			} catch (error) {
				console.error("Error updating entry:", error);
				const message =
					error instanceof Error ? error.message : "Unknown error occurred";
				setEntryError(`Failed to save entry: ${message}`);
			}
		},
		[habits, userId, selectedDate],
	);

	const clearEntryError = useCallback(() => {
		setEntryError(null);
	}, []);

	return {
		// State
		habits,
		sections,
		weekDates,
		summaryStats,
		isLoading,
		zoomedSection,
		allExpanded,
		selectedDate,
		entryError,

		// Tag tree support
		habitTree,
		expandedTags: new Set(expandedTagsRef.current) as ReadonlySet<string>,

		// Computed helpers
		getCategorySummary,
		getStatusIcon,
		getCellDisplay,

		// Actions
		toggleEntry,
		toggleSection,
		toggleTagExpanded,
		expandAll,
		collapseAll,
		zoomIn,
		zoomOut,
		selectDate,
		clearEntryError,

		// Menu helpers
		hasNoHabits: !isLoading && habits.length === 0,
	};
}
