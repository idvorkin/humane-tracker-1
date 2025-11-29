import { format } from "date-fns";
import React, { useState } from "react";
import { useHabitTrackerVM } from "../hooks/useHabitTrackerVM";
import { CleanupDuplicates } from "./CleanupDuplicates";
import { HabitSettings } from "./HabitSettings";
import { InitializeHabits } from "./InitializeHabits";
import "./HabitTracker.css";

const CATEGORIES: { [key: string]: { name: string; color: string } } = {
	mobility: { name: "Movement & Mobility", color: "#60a5fa" },
	connection: { name: "Connections", color: "#a855f7" },
	balance: { name: "Inner Balance", color: "#fbbf24" },
	joy: { name: "Joy & Play", color: "#f472b6" },
	strength: { name: "Strength Building", color: "#34d399" },
};

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

	// All business logic from the ViewModel
	const vm = useHabitTrackerVM({ userId });

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

	return (
		<div className="container">
			<div className="week-header">
				<div className="week-title">
					{vm.zoomedSection ? (
						<>
							<button className="zoom-back-btn" onClick={vm.zoomOut}>
								← Back
							</button>
							{CATEGORIES[vm.zoomedSection].name} •
							<span className="current-day">
								{format(new Date(), "EEEE, MMM d")}
							</span>
						</>
					) : (
						<span className="current-day">
							{format(new Date(), "EEEE, MMM d")}
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
						{vm.weekDates.map((date, index) => (
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
													{!vm.zoomedSection && (
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
											return (
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
															{vm.getStatusIcon(habit.status)}
														</span>
													</td>
													{vm.weekDates.map((date, index) => {
														const cellDisplay = vm.getCellDisplay(habit, date);
														return (
															<td
																key={date.toISOString()}
																className={`${cellDisplay.className} ${index === 0 ? "cell-today" : ""}`}
																onClick={() => vm.toggleEntry(habit.id, date)}
																style={{ cursor: "pointer" }}
															>
																{cellDisplay.content}
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
		</div>
	);
};
