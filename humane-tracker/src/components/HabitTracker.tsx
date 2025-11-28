import { addDays, format, isToday, isYesterday } from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { HabitService } from "../services/habitService";
import type {
	CategorySection,
	HabitWithStatus,
	SummaryStats,
} from "../types/habit";
import { CleanupDuplicates } from "./CleanupDuplicates";
import { HabitSettings } from "./HabitSettings";
import { InitializeHabits } from "./InitializeHabits";
import "./HabitTracker.css";

const habitService = new HabitService();

const CATEGORIES: { [key: string]: { name: string; color: string } } = {
	mobility: { name: "Movement & Mobility", color: "#60a5fa" },
	connection: { name: "Connections", color: "#a855f7" },
	balance: { name: "Inner Balance", color: "#fbbf24" },
	joy: { name: "Joy & Play", color: "#f472b6" },
	strength: { name: "Strength Building", color: "#34d399" },
};

interface HabitTrackerProps {
	userId: string;
	userMenu?: React.ReactNode;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({
	userId,
	userMenu,
}) => {
	const [habits, setHabits] = useState<HabitWithStatus[]>([]);
	const [sections, setSections] = useState<CategorySection[]>([]);
	const [weekDates, setWeekDates] = useState<Date[]>([]);
	const [showInitializer, setShowInitializer] = useState(false);
	const [showCleanup, setShowCleanup] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [zoomedSection, setZoomedSection] = useState<string | null>(null);
	const collapsedSectionsRef = useRef<Set<string>>(new Set(["balance", "joy"]));
	const useMockMode = !userId || userId === "mock-user";
	const [summaryStats, setSummaryStats] = useState<SummaryStats>({
		dueToday: 0,
		overdue: 0,
		doneToday: 0,
		onTrack: 0,
	});

	useEffect(() => {
		// Reset state when mode changes
		setHabits([]);
		setSections([]);

		// Set up trailing 7 days with today on the left (newest to oldest)
		const today = new Date();
		const dates = [];
		for (let i = 0; i <= 6; i++) {
			dates.push(addDays(today, -i));
		}
		setWeekDates(dates);

		// Function to fetch and update habits with their status
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
						// Replace with the one that has more entries
						const index = acc.indexOf(existing);
						acc[index] = habit;
					}
					return acc;
				}, [] as HabitWithStatus[]);

				if (uniqueHabits.length < habitsWithStatus.length) {
					console.log(
						`Removed ${habitsWithStatus.length - uniqueHabits.length} duplicate habits`,
					);
				}

				setHabits(uniqueHabits);

				// Check if user has no habits and show initializer (skip in mock mode)
				if (uniqueHabits.length === 0 && !showInitializer && !useMockMode) {
					setShowInitializer(true);
				}

				// Group by category
				const categorySections: CategorySection[] = Object.keys(CATEGORIES).map(
					(cat) => ({
						category: cat as any,
						name: CATEGORIES[cat].name,
						color: CATEGORIES[cat].color,
						habits: uniqueHabits.filter((h) => h.category === cat),
						isCollapsed: collapsedSectionsRef.current.has(cat),
					}),
				);
				setSections(categorySections);

				// Calculate summary stats
				const stats: SummaryStats = {
					dueToday: uniqueHabits.filter((h) => h.status === "today").length,
					overdue: uniqueHabits.filter((h) => h.status === "overdue").length,
					doneToday: uniqueHabits.filter((h) => h.status === "done").length,
					onTrack: uniqueHabits.filter((h) => h.status === "met").length,
				};
				setSummaryStats(stats);
				if (!skipLoading) setIsLoading(false);
			} catch (error) {
				console.error("Error fetching habits:", error);
				// Set defaults on error
				setSections(
					Object.keys(CATEGORIES).map((cat) => ({
						category: cat as any,
						name: CATEGORIES[cat].name,
						color: CATEGORIES[cat].color,
						habits: [],
						isCollapsed: cat === "balance" || cat === "joy",
					})),
				);
				setSummaryStats({
					dueToday: 0,
					overdue: 0,
					doneToday: 0,
					onTrack: 0,
				});
				if (!skipLoading) setIsLoading(false);
			}
		};

		// Handle mock mode - seed habits then load
		if (useMockMode) {
			const seedMockHabits = async () => {
				const existingHabits = await habitService.getHabits(userId);
				if (existingHabits.length === 0) {
					console.log("Mock mode: Seeding default habits to IndexedDB");
					const habitsToCreate = DEFAULT_HABITS.map((habit) => ({
						name: habit.name,
						category: habit.category,
						targetPerWeek: habit.targetPerWeek,
						userId,
					}));
					await habitService.bulkCreateHabits(habitsToCreate);
				}
			};

			seedMockHabits().then(() => {
				loadHabits();
			});
			return;
		}

		// Non-mock mode: set up subscriptions
		let isInitialLoad = true;

		// Subscribe to habits changes
		const unsubscribeHabits = habitService.subscribeToHabits(userId, () => {
			// For subsequent updates, only update if not loading
			if (!isInitialLoad) {
				loadHabits(true);
			}
		});

		// Subscribe to entries changes for the trailing 7 days
		const endDate = new Date();
		endDate.setHours(23, 59, 59, 999);
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 6);
		startDate.setHours(0, 0, 0, 0);

		const unsubscribeEntries = habitService.subscribeToWeekEntries(
			userId,
			startDate,
			endDate,
			() => {
				// For subsequent updates, only update if not loading
				if (!isInitialLoad) {
					loadHabits(true);
				}
			},
		);

		// Initial load
		loadHabits().then(() => {
			isInitialLoad = false;
		});

		return () => {
			unsubscribeHabits();
			unsubscribeEntries();
		};
	}, [userId, useMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

	const toggleSection = (category: string) => {
		if (collapsedSectionsRef.current.has(category)) {
			collapsedSectionsRef.current.delete(category);
		} else {
			collapsedSectionsRef.current.add(category);
		}
		setSections((prev) =>
			prev.map((s) =>
				s.category === category ? { ...s, isCollapsed: !s.isCollapsed } : s,
			),
		);
	};

	const handleZoomIn = (category: string) => {
		setZoomedSection(category);
		// Ensure the zoomed section is expanded
		collapsedSectionsRef.current.delete(category);
		setSections((prev) =>
			prev.map((s) =>
				s.category === category ? { ...s, isCollapsed: false } : s,
			),
		);
	};

	const handleZoomOut = () => {
		setZoomedSection(null);
	};

	const expandAll = () => {
		collapsedSectionsRef.current.clear();
		setSections((prev) => prev.map((s) => ({ ...s, isCollapsed: false })));
	};

	const collapseAll = () => {
		Object.keys(CATEGORIES).forEach((cat) =>
			collapsedSectionsRef.current.add(cat),
		);
		setSections((prev) => prev.map((s) => ({ ...s, isCollapsed: true })));
	};

	const handleCellClick = async (habitId: string, date: Date) => {
		console.log(
			"Handling click for habit:",
			habitId,
			"on date:",
			format(date, "yyyy-MM-dd"),
		);

		// Check if date is older than yesterday and confirm
		if (!isToday(date) && !isYesterday(date)) {
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

		const existingEntry = habit.entries.find(
			(e) => format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
		);

		// Handle mock mode updates locally
		if (useMockMode) {
			// Update local state for mock mode
			const updatedHabits = habits.map((h) => {
				if (h.id !== habitId) return h;

				let newEntries = [...h.entries];

				if (existingEntry) {
					// Cycle through values: number -> number+1 -> 0.5 -> 0 (remove)
					if (existingEntry.value >= 1) {
						if (existingEntry.value < 5) {
							newEntries = newEntries.map((e) =>
								e.id === existingEntry.id
									? { ...e, value: existingEntry.value + 1 }
									: e,
							);
						} else {
							newEntries = newEntries.map((e) =>
								e.id === existingEntry.id ? { ...e, value: 0.5 } : e,
							);
						}
					} else if (existingEntry.value === 0.5) {
						newEntries = newEntries.filter((e) => e.id !== existingEntry.id);
					}
				} else {
					// Add new entry
					newEntries.push({
						id: crypto.randomUUID(),
						habitId,
						userId,
						date,
						value: 1,
						createdAt: new Date(),
					} as any);
				}

				// Count unique days with entries (not total values)
				const daysWithEntries = new Set(
					newEntries
						.filter((e) => e.value > 0)
						.map((e) => format(e.date, "yyyy-MM-dd")),
				).size;
				const currentWeekCount = daysWithEntries;
				let status = h.status;
				if (currentWeekCount >= h.targetPerWeek) {
					status = "met";
				}

				return { ...h, entries: newEntries, currentWeekCount, status };
			});

			setHabits(updatedHabits);

			// Update sections
			const categorySections: CategorySection[] = Object.keys(CATEGORIES).map(
				(cat) => ({
					category: cat as any,
					name: CATEGORIES[cat].name,
					color: CATEGORIES[cat].color,
					habits: updatedHabits.filter((h) => h.category === cat),
					isCollapsed:
						sections.find((s) => s.category === cat)?.isCollapsed || false,
				}),
			);
			setSections(categorySections);

			// Update stats
			setSummaryStats({
				dueToday: updatedHabits.filter((h) => h.status === "today").length,
				overdue: updatedHabits.filter((h) => h.status === "overdue").length,
				doneToday: updatedHabits.filter((h) => h.status === "done").length,
				onTrack: updatedHabits.filter((h) => h.status === "met").length,
			});

			return;
		}

		// Cloud mode - handle cycling through values

		// Optimistic UI update - update local state immediately
		const optimisticUpdate = () => {
			setHabits((prevHabits) => {
				return prevHabits.map((h) => {
					if (h.id === habitId) {
						const updatedEntries = [...h.entries];
						const entryIndex = updatedEntries.findIndex(
							(e) =>
								format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
						);

						if (entryIndex >= 0) {
							const entry = updatedEntries[entryIndex];
							if (entry.value >= 1 && entry.value < 5) {
								updatedEntries[entryIndex] = {
									...entry,
									value: entry.value + 1,
								};
							} else if (entry.value >= 5) {
								updatedEntries[entryIndex] = { ...entry, value: 0.5 };
							} else if (entry.value === 0.5) {
								updatedEntries.splice(entryIndex, 1);
							}
						} else {
							// Add new entry
							updatedEntries.push({
								id: crypto.randomUUID(),
								habitId,
								userId,
								date,
								value: 1,
								createdAt: new Date(),
							});
						}

						// Recalculate status
						const newStatus = habitService.calculateHabitStatus(
							h,
							updatedEntries,
						);
						// Count unique days with entries (not total values)
						const daysWithEntries = new Set(
							updatedEntries
								.filter((e) => e.value > 0)
								.map((e) => format(e.date, "yyyy-MM-dd")),
						).size;
						const currentWeekCount = daysWithEntries;

						return {
							...h,
							entries: updatedEntries,
							status: newStatus,
							currentWeekCount,
						};
					}
					return h;
				});
			});

			// Also update sections immediately
			setSections((prevSections) => {
				return prevSections.map((section) => {
					const updatedSectionHabits = section.habits.map((h) => {
						if (h.id === habitId) {
							const habit = habits.find((habit) => habit.id === habitId);
							if (habit) {
								const updatedEntries = [...h.entries];
								const entryIndex = updatedEntries.findIndex(
									(e) =>
										format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
								);

								if (entryIndex >= 0) {
									const entry = updatedEntries[entryIndex];
									if (entry.value >= 1 && entry.value < 5) {
										updatedEntries[entryIndex] = {
											...entry,
											value: entry.value + 1,
										};
									} else if (entry.value >= 5) {
										updatedEntries[entryIndex] = { ...entry, value: 0.5 };
									} else if (entry.value === 0.5) {
										updatedEntries.splice(entryIndex, 1);
									}
								} else {
									updatedEntries.push({
										id: crypto.randomUUID(),
										habitId,
										userId,
										date,
										value: 1,
										createdAt: new Date(),
									});
								}

								const newStatus = habitService.calculateHabitStatus(
									habit,
									updatedEntries,
								);
								// Count unique days with entries (not total values)
								const daysWithEntries = new Set(
									updatedEntries
										.filter((e) => e.value > 0)
										.map((e) => format(e.date, "yyyy-MM-dd")),
								).size;
								const currentWeekCount = daysWithEntries;

								return {
									...h,
									entries: updatedEntries,
									status: newStatus,
									currentWeekCount,
								};
							}
						}
						return h;
					});

					return {
						...section,
						habits: updatedSectionHabits,
					};
				});
			});
		};

		// Apply optimistic update immediately
		optimisticUpdate();

		try {
			if (existingEntry) {
				// Cycle through values: 1 -> 2 -> 3 -> 4 -> 5 -> 0.5 -> delete
				if (existingEntry.value >= 1 && existingEntry.value < 5) {
					habitService.updateEntry(existingEntry.id, existingEntry.value + 1);
				} else if (existingEntry.value >= 5) {
					habitService.updateEntry(existingEntry.id, 0.5);
				} else if (existingEntry.value === 0.5) {
					habitService.deleteEntry(existingEntry.id);
				}
			} else {
				// Create new entry with value 1
				habitService.addEntry({
					habitId,
					userId,
					date,
					value: 1,
				});
			}
		} catch (error) {
			console.error("Error updating entry:", error);
		}
	};

	const getStatusIcon = (status: string) => {
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
	};

	const getCellContent = (habit: HabitWithStatus, date: Date) => {
		const entry = habit.entries.find(
			(e) => format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
		);

		if (!entry) return "";
		if (entry.value === 1) return "✓";
		if (entry.value === 0.5) return "½";
		return entry.value > 1 ? entry.value.toString() : "";
	};

	const getCellClass = (habit: HabitWithStatus, date: Date) => {
		const entry = habit.entries.find(
			(e) => format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
		);

		if (!entry) return "";
		if (entry.value >= 1) return "completed";
		if (entry.value === 0.5) return "partial";
		return "";
	};

	// Show loading screen
	if (isLoading) {
		return (
			<div
				className="container"
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "400px",
					gap: "20px",
				}}
			>
				<div
					style={{
						fontSize: "48px",
						animation: "pulse 1.5s ease-in-out infinite",
					}}
				>
					⏳
				</div>
				<div style={{ fontSize: "18px", color: "#94a3b8" }}>
					Loading your habits...
				</div>
				<div style={{ fontSize: "14px", color: "#64748b" }}>
					Setting up your tracking dashboard
				</div>
			</div>
		);
	}

	return (
		<div className="container">
			<div className="week-header">
				<div className="week-title">
					{zoomedSection ? (
						<>
							<button className="zoom-back-btn" onClick={handleZoomOut}>
								← Back
							</button>
							{CATEGORIES[zoomedSection].name} •
							<span className="current-day">
								{format(new Date(), "EEEE, MMM d")}
							</span>
						</>
					) : (
						<>
							Last 7 Days •
							<span className="current-day">
								{format(new Date(), "EEEE, MMM d")}
							</span>
						</>
					)}
				</div>
				<div className="view-toggle">
					{!zoomedSection && (
						<>
							<button className="toggle-btn" onClick={expandAll}>
								Expand All
							</button>
							<button className="toggle-btn" onClick={collapseAll}>
								Collapse All
							</button>
						</>
					)}
					<button className="toggle-btn active">Dense View</button>
					<button
						className="toggle-btn settings"
						onClick={() => setShowSettings(true)}
						style={{ background: "#374151" }}
					>
						⚙️ Manage Habits
					</button>
					{habits.length === 0 && (
						<button
							className="toggle-btn initialize"
							onClick={() => setShowInitializer(true)}
						>
							📥 Load Default Habits
						</button>
					)}
					{!useMockMode && habits.length > 0 && (
						<button
							className="toggle-btn cleanup"
							onClick={() => setShowCleanup(true)}
							style={{ background: "#dc2626", marginLeft: "8px" }}
						>
							🧹 Clean Duplicates
						</button>
					)}
					{userMenu}
				</div>
			</div>

			<div className="summary-bar">
				<div className="summary-item">
					<span className="summary-label">Due Today:</span>
					<span className="summary-value value-today">
						{summaryStats.dueToday}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">Overdue:</span>
					<span className="summary-value value-overdue">
						{summaryStats.overdue}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">Done Today:</span>
					<span className="summary-value value-done">
						{summaryStats.doneToday}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">On Track:</span>
					<span className="summary-value value-track">
						{summaryStats.onTrack}
					</span>
				</div>
			</div>

			<table>
				<thead>
					<tr>
						<th className="col-habit">Habit</th>
						<th className="col-status">●</th>
						{weekDates.map((date, index) => (
							<th
								key={date.toISOString()}
								className={`col-day ${index === 0 ? "col-today" : ""}`}
							>
								{format(date, "E")[0]}
								<br />
								{format(date, "d")}
							</th>
						))}
						<th className="col-total">Total</th>
					</tr>
				</thead>
				<tbody>
					{sections
						.filter(
							(section) => !zoomedSection || section.category === zoomedSection,
						)
						.map((section) => (
							<React.Fragment key={section.category}>
								<tr className="section-header">
									<td colSpan={10}>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
											}}
										>
											<div
												className="section-title"
												onClick={() => toggleSection(section.category)}
											>
												<span
													className={`section-arrow ${section.isCollapsed ? "collapsed" : ""}`}
												>
													▼
												</span>
												<span
													className="section-indicator"
													style={{ background: section.color }}
												/>
												{section.name}
												{!zoomedSection && (
													<button
														className="zoom-btn"
														onClick={(e) => {
															e.stopPropagation();
															handleZoomIn(section.category);
														}}
														title="Focus on this category"
													>
														🔍
													</button>
												)}
											</div>
											{section.isCollapsed && (
												<div className="section-summary">
													<span className="summary-stat">
														<span
															className={`stat-value stat-${
																section.habits.filter((h) => h.status === "met")
																	.length > 0
																	? "good"
																	: section.habits.filter(
																				(h) => h.status === "today",
																			).length > 0
																		? "warn"
																		: "bad"
															}`}
														>
															{
																section.habits.filter((h) => h.status === "met")
																	.length
															}{" "}
															met
														</span>
													</span>
													<span className="summary-stat">
														{section.habits.reduce(
															(sum, h) => sum + h.currentWeekCount,
															0,
														)}{" "}
														total
													</span>
												</div>
											)}
										</div>
									</td>
								</tr>
								{!section.isCollapsed &&
									section.habits.map((habit) => (
										<tr key={habit.id} className="section-row">
											<td className="col-habit">
												<div className="habit-name">
													{habit.name}
													<span className="habit-target">
														({habit.targetPerWeek}/w)
													</span>
												</div>
											</td>
											<td>
												<span className={`status status-${habit.status}`}>
													{getStatusIcon(habit.status)}
												</span>
											</td>
											{weekDates.map((date, index) => (
												<td
													key={date.toISOString()}
													className={`${getCellClass(habit, date)} ${index === 0 ? "cell-today" : ""}`}
													onClick={() => handleCellClick(habit.id, date)}
													style={{ cursor: "pointer" }}
												>
													{getCellContent(habit, date)}
												</td>
											))}
											<td
												className={`total total-${
													habit.currentWeekCount >= habit.targetPerWeek
														? "good"
														: habit.currentWeekCount > 0
															? "warn"
															: "bad"
												}`}
											>
												{habit.currentWeekCount}/{habit.targetPerWeek}
											</td>
										</tr>
									))}
							</React.Fragment>
						))}
				</tbody>
			</table>

			<div className="legend-strip">
				<div className="legend-item">● = done</div>
				<div className="legend-item">✓ = met target</div>
				<div className="legend-item">⏰ = due today</div>
				<div className="legend-item">→ = tomorrow</div>
				<div className="legend-item">! = overdue</div>
				<div className="legend-item">½ = partial</div>
			</div>

			{showInitializer && (
				<InitializeHabits
					userId={userId}
					onComplete={() => setShowInitializer(false)}
				/>
			)}

			{showCleanup && (
				<CleanupDuplicates
					userId={userId}
					onComplete={() => {
						setShowCleanup(false);
						// Force refresh after cleanup
						window.location.reload();
					}}
				/>
			)}

			{showSettings && (
				<HabitSettings
					userId={userId}
					onClose={() => setShowSettings(false)}
					onUpdate={() => {
						setShowSettings(false);
						// Force refresh after settings change
						window.location.reload();
					}}
				/>
			)}
		</div>
	);
};
