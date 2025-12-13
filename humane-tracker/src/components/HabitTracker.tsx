import { format, isSameDay, isToday } from "date-fns";
import React, { useCallback, useRef, useState } from "react";
import { useHabitTrackerVM } from "../hooks/useHabitTrackerVM";
import type { HabitVariant, HabitWithStatus } from "../types/habit";
import { buildCategoryInfo } from "../utils/categoryUtils";
import { CleanupDuplicates } from "./CleanupDuplicates";
import { HabitSettings } from "./HabitSettings";
import { InitializeHabits } from "./InitializeHabits";
import { VariantPicker } from "./VariantPicker";
import "./HabitTracker.css";

interface HabitTrackerProps {
	userId: string;
	userMenu?: (props: {
		onManageHabits: () => void;
		onLoadDefaults: () => void;
		showLoadDefaults: boolean;
	}) => React.ReactNode;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({
	userId,
	userMenu,
}) => {
	// View-only state (dialogs)
	const [showInitializer, setShowInitializer] = useState(false);
	const [showCleanup, setShowCleanup] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	// Variant picker state
	const [variantPickerState, setVariantPickerState] = useState<{
		habit: HabitWithStatus;
		date: Date;
		position: { x: number; y: number };
	} | null>(null);

	// Long-press detection refs
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressTriggered = useRef(false);

	// All business logic from the ViewModel
	const vm = useHabitTrackerVM({ userId });

	// Long press handlers for cells with variants
	const handleCellPressStart = useCallback(
		(
			habit: HabitWithStatus,
			date: Date,
			event: React.MouseEvent | React.TouchEvent,
		) => {
			// Only enable long-press for habits with variants
			if (!habit.variants || habit.variants.length === 0) return;

			longPressTriggered.current = false;
			const clientX =
				"touches" in event ? event.touches[0].clientX : event.clientX;
			const clientY =
				"touches" in event ? event.touches[0].clientY : event.clientY;

			longPressTimer.current = setTimeout(() => {
				longPressTriggered.current = true;
				setVariantPickerState({
					habit,
					date,
					position: { x: clientX, y: clientY },
				});
			}, 500); // 500ms for long press
		},
		[],
	);

	const handleCellPressEnd = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const handleCellClick = useCallback(
		(habit: HabitWithStatus, date: Date) => {
			// If long press was triggered, don't also do click action
			if (longPressTriggered.current) {
				longPressTriggered.current = false;
				return;
			}
			vm.toggleEntry(habit.id, date);
		},
		[vm],
	);

	const handleVariantSelect = useCallback(
		async (variant: HabitVariant | null) => {
			if (!variantPickerState) return;
			await vm.addEntryWithVariant(
				variantPickerState.habit.id,
				variantPickerState.date,
				variant,
			);
			setVariantPickerState(null);
		},
		[variantPickerState, vm],
	);

	// Loading screen
	if (vm.isLoading) {
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

	const toggleExpandCollapse = () => {
		if (vm.allExpanded) {
			vm.collapseAll();
		} else {
			vm.expandAll();
		}
	};

	// Helper to generate column/cell class names for date columns
	const getDateColumnClass = (
		baseClass: string,
		isTodayDate: boolean,
		isSelected: boolean,
	): string => {
		const classes = [baseClass];
		if (isTodayDate) classes.push(`${baseClass.split("-")[0]}-today`);
		if (isSelected && !isTodayDate)
			classes.push(`${baseClass.split("-")[0]}-selected`);
		return classes.join(" ");
	};

	// Helper to handle date header click
	const handleDateHeaderClick = (
		date: Date,
		isTodayDate: boolean,
		isSelected: boolean,
	) => {
		if (isTodayDate) return; // Today is not selectable
		vm.selectDate(isSelected ? null : date);
	};

	return (
		<div className="container">
			<div className="week-header">
				<div className="week-title">
					{vm.zoomedSection ? (
						<>
							{buildCategoryInfo(vm.zoomedSection).name}
							<button className="zoom-back-btn" onClick={vm.zoomOut}>
								← Back
							</button>
						</>
					) : (
						<span
							className={`current-day ${vm.selectedDate && !isToday(vm.selectedDate) ? "selected-day" : ""}`}
							onClick={() => vm.selectDate(null)}
							style={{ cursor: vm.selectedDate ? "pointer" : "default" }}
							title={vm.selectedDate ? "Click to return to today" : undefined}
						>
							{vm.selectedDate
								? format(vm.selectedDate, "EEEE, MMM d")
								: format(new Date(), "EEEE, MMM d")}
						</span>
					)}
				</div>
				<div className="view-toggle">
					{!vm.zoomedSection && (
						<button className="toggle-btn" onClick={toggleExpandCollapse}>
							{vm.allExpanded ? "Collapse All" : "Expand All"}
						</button>
					)}
					{userMenu?.({
						onManageHabits: () => setShowSettings(true),
						onLoadDefaults: () => setShowInitializer(true),
						showLoadDefaults: vm.hasNoHabits,
					})}
				</div>
			</div>

			<table>
				<thead>
					<tr>
						<th className="col-habit">Habit</th>
						<th className="col-status">●</th>
						{vm.weekDates.map((date) => {
							const isTodayDate = isToday(date);
							const isSelected = Boolean(
								vm.selectedDate && isSameDay(date, vm.selectedDate),
							);
							return (
								<th
									key={date.toISOString()}
									className={getDateColumnClass(
										"col-day",
										isTodayDate,
										isSelected,
									)}
									onClick={() =>
										handleDateHeaderClick(date, isTodayDate, isSelected)
									}
									style={{ cursor: isTodayDate ? "default" : "pointer" }}
									title={isTodayDate ? undefined : "Click to select this day"}
								>
									{format(date, "EEE").slice(0, 2)}
									<br />
									{format(date, "d")}
								</th>
							);
						})}
						<th className="col-total">Total</th>
					</tr>
				</thead>
				<tbody>
					{vm.sections
						.filter(
							(section) =>
								!vm.zoomedSection || section.category === vm.zoomedSection,
						)
						.map((section) => {
							const summary = vm.getCategorySummary(section.habits);
							return (
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
													onClick={() => vm.toggleSection(section.category)}
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
													{vm.zoomedSection ? (
														<button
															className="zoom-btn"
															onClick={(e) => {
																e.stopPropagation();
																vm.zoomOut();
															}}
															title="Back to all categories"
														>
															← Back
														</button>
													) : (
														<button
															className="zoom-btn"
															onClick={(e) => {
																e.stopPropagation();
																vm.zoomIn(section.category);
															}}
															title="Focus on this category"
														>
															🔍
														</button>
													)}
												</div>
												<div className="section-summary">
													<span className="summary-stat">
														<span
															className={`stat-value stat-${summary.todayStatus}`}
														>
															{summary.doneToday}/{summary.dueToday}
														</span>
													</span>
													<span className="summary-stat">
														<span
															className={`stat-value stat-${summary.totalStatus}`}
														>
															{summary.met}/{summary.total}
														</span>
													</span>
												</div>
											</div>
										</td>
									</tr>
									{!section.isCollapsed &&
										section.habits.map((habit) => {
											// Find tree node for this habit to get depth info
											const treeNode = vm.habitTree.find(
												(n) => n.habit.id === habit.id,
											);
											const depth = treeNode?.depth ?? 0;
											const isTag = treeNode?.isTag ?? false;
											const isExpanded = treeNode?.isExpanded ?? false;
											const hasChildren = treeNode?.hasChildren ?? false;

											return (
												<tr key={habit.id} className="section-row">
													<td className="col-habit">
														<div
															className="habit-name"
															style={{ paddingLeft: `${depth * 16}px` }}
														>
															{isTag && hasChildren && (
																<span
																	className={`tag-arrow ${isExpanded ? "" : "collapsed"}`}
																	onClick={(e) => {
																		e.stopPropagation();
																		vm.toggleTagExpanded(habit.id);
																	}}
																	style={{ cursor: "pointer", marginRight: 4 }}
																>
																	▼
																</span>
															)}
															{isTag && (
																<span
																	className="tag-indicator"
																	title="Tag (aggregates children)"
																>
																	🏷️
																</span>
															)}
															{habit.name}
															<span className="habit-target">
																({habit.targetPerWeek}/w)
															</span>
														</div>
													</td>
													<td>
														<span className={`status status-${habit.status}`}>
															{vm.getStatusIcon(habit.status)}
														</span>
													</td>
													{vm.weekDates.map((date) => {
														const cellDisplay = vm.getCellDisplay(habit, date);
														const isTodayDate = isToday(date);
														const isSelected = Boolean(
															vm.selectedDate &&
																isSameDay(date, vm.selectedDate),
														);
														const cellClass = [
															cellDisplay.className,
															getDateColumnClass(
																"cell",
																isTodayDate,
																isSelected,
															),
															habit.variants?.length ? "has-variants" : "",
															isTag ? "tag-cell" : "",
														]
															.filter(Boolean)
															.join(" ");
														const hasVariants =
															habit.variants && habit.variants.length > 0;
														return (
															<td
																key={date.toISOString()}
																className={cellClass}
																onClick={() => handleCellClick(habit, date)}
																onMouseDown={(e) =>
																	handleCellPressStart(habit, date, e)
																}
																onMouseUp={handleCellPressEnd}
																onMouseLeave={handleCellPressEnd}
																onTouchStart={(e) =>
																	handleCellPressStart(habit, date, e)
																}
																onTouchEnd={handleCellPressEnd}
																style={{ cursor: "pointer" }}
															>
																{cellDisplay.content}
																{hasVariants && (
																	<button
																		className="variant-trigger"
																		onClick={(e) => {
																			e.stopPropagation();
																			setVariantPickerState({
																				habit,
																				date,
																				position: {
																					x: e.clientX,
																					y: e.clientY,
																				},
																			});
																		}}
																		title="Select variant"
																	>
																		▾
																	</button>
																)}
															</td>
														);
													})}
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
											);
										})}
								</React.Fragment>
							);
						})}
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

			<div className="summary-bar">
				<div className="summary-item">
					<span className="summary-label">Due Today:</span>
					<span className="summary-value value-today">
						{vm.summaryStats.dueToday}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">Overdue:</span>
					<span className="summary-value value-overdue">
						{vm.summaryStats.overdue}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">Done Today:</span>
					<span className="summary-value value-done">
						{vm.summaryStats.doneToday}
					</span>
				</div>
				<div className="summary-item">
					<span className="summary-label">On Track:</span>
					<span className="summary-value value-track">
						{vm.summaryStats.onTrack}
					</span>
				</div>
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
						window.location.reload();
					}}
				/>
			)}

			{variantPickerState && (
				<VariantPicker
					habit={variantPickerState.habit}
					date={variantPickerState.date}
					position={variantPickerState.position}
					onSelect={handleVariantSelect}
					onClose={() => setVariantPickerState(null)}
				/>
			)}
		</div>
	);
};
