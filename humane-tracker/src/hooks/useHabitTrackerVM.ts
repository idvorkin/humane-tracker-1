import { addDays, format, isSameDay, isToday, isYesterday } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { toDateString } from "../repositories";
import { habitService } from "../services/habitService";
import type {
	CategorySection,
	HabitStatus,
	HabitVariant,
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
	// Count habits with entries for today (not just status "done")
	const todayStr = toDateString(new Date());
	const doneToday = habits.filter((h) =>
		h.entries.some((e) => toDateString(e.date) === todayStr && e.value >= 1),
	).length;

	const total = habits.length;

	// Count habits that met their weekly target
	const met = habits.filter(
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
 * Cycle: empty → 1 → 2 → 3 → 4 → 5 → 0.5 → empty
 */
export function getNextEntryValue(currentValue: number | null): number | null {
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

	// Tag tree support
	habitTree: FlatTreeNode[];
	expandedTags: Set<string>;

	// Computed helpers (exposed for convenience)
	getCategorySummary: typeof getCategorySummary;
	getStatusIcon: typeof getStatusIcon;
	getCellDisplay: typeof getCellDisplay;

	// Actions
	toggleEntry: (habitId: string, date: Date) => Promise<void>;
	addEntryWithVariant: (
		habitId: string,
		date: Date,
		variant: HabitVariant | null,
	) => Promise<void>;
	toggleSection: (category: string) => void;
	toggleTagExpanded: (tagId: string) => void;
	expandAll: () => void;
	collapseAll: () => void;
	zoomIn: (category: string) => void;
	zoomOut: () => void;
	selectDate: (date: Date | null) => void;

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

				// Deduplicate habits by name (keeping the one with most entries)
				const uniqueHabits = habitsWithStatus.reduce((acc, habit) => {
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
		setZoomedSection(null);
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

	const addEntryWithVariant = useCallback(
		async (habitId: string, date: Date, variant: HabitVariant | null) => {
			const habit = habits.find((h) => h.id === habitId);
			if (!habit) {
				console.error("Habit not found:", habitId);
				return;
			}

			try {
				await habitService.addEntry({
					habitId,
					userId,
					date,
					value: 1,
					variantId: variant?.id,
					variantName: variant?.name,
				});
			} catch (error) {
				console.error("Error adding entry with variant:", error);
			}
		},
		[habits, userId],
	);

	const toggleEntry = useCallback(
		async (habitId: string, date: Date) => {
			// Check if date is older than yesterday and confirm
			// Skip confirmation if the date is the currently selected date
			const isSelectedDate = selectedDate && isSameDay(date, selectedDate);
			if (!isToday(date) && !isYesterday(date) && !isSelectedDate) {
				const dateStr = format(date, "MMM d");
				if (
					!window.confirm(
						`Are you sure you want to modify entries for ${dateStr}? This is an older date.`,
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
			const existingEntry = habit.entries.find(
				(e) => toDateString(e.date) === targetDateStr,
			);

			const currentValue = existingEntry?.value ?? null;
			const nextValue = getNextEntryValue(currentValue);

			// Just write to DB - liveQuery will notify us and trigger a refresh
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
			}
		},
		[habits, userId, selectedDate],
	);

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

		// Tag tree support
		habitTree,
		expandedTags: expandedTagsRef.current,

		// Computed helpers
		getCategorySummary,
		getStatusIcon,
		getCellDisplay,

		// Actions
		toggleEntry,
		addEntryWithVariant,
		toggleSection,
		toggleTagExpanded,
		expandAll,
		collapseAll,
		zoomIn,
		zoomOut,
		selectDate,

		// Menu helpers
		hasNoHabits: !isLoading && habits.length === 0,
	};
}
