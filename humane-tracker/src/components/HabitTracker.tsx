import {
	ActionIcon,
	Badge,
	Box,
	Button,
	Center,
	Container,
	Flex,
	Group,
	Loader,
	Paper,
	Stack,
	Table,
	Text,
	Title,
	Tooltip,
} from "@mantine/core";
import { IconArrowLeft, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { format, isSameDay, isToday } from "date-fns";
import React, { useState } from "react";
import { useHabitTrackerVM } from "../hooks/useHabitTrackerVM";
import { buildCategoryInfo } from "../utils/categoryUtils";
import { CleanupDuplicates } from "./CleanupDuplicates";
import { HabitSettings } from "./HabitSettings";
import { InitializeHabits } from "./InitializeHabits";
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

	// All business logic from the ViewModel
	const vm = useHabitTrackerVM({ userId });

	// Loading screen
	if (vm.isLoading) {
		return (
			<Center mih={400}>
				<Stack align="center" gap="lg">
					<Loader color="warmAmber" size="xl" />
					<Text size="lg" c="dimmed">
						Loading your habits...
					</Text>
					<Text size="sm" c="dimmed">
						Setting up your tracking dashboard
					</Text>
				</Stack>
			</Center>
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
		<Container size="lg" px={0}>
			{/* Header */}
			<Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
				<Group gap="sm">
					{vm.zoomedSection ? (
						<>
							<Title order={4} style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
								{buildCategoryInfo(vm.zoomedSection).name}
							</Title>
							<Button
								variant="subtle"
								size="compact-sm"
								leftSection={<IconArrowLeft size={14} />}
								onClick={vm.zoomOut}
							>
								Back
							</Button>
						</>
					) : (
						<Title
							order={4}
							c={vm.selectedDate && !isToday(vm.selectedDate) ? "blue" : "warmAmber"}
							style={{
								fontFamily: "'Fraunces', Georgia, serif",
								fontStyle: "italic",
								cursor: vm.selectedDate ? "pointer" : "default",
							}}
							onClick={() => vm.selectDate(null)}
							title={vm.selectedDate ? "Click to return to today" : undefined}
						>
							{vm.selectedDate
								? format(vm.selectedDate, "EEEE, MMM d")
								: format(new Date(), "EEEE, MMM d")}
						</Title>
					)}
				</Group>
				<Group gap="xs">
					{!vm.zoomedSection && (
						<Button variant="default" size="compact-sm" onClick={toggleExpandCollapse}>
							{vm.allExpanded ? "Collapse All" : "Expand All"}
						</Button>
					)}
					{userMenu?.({
						onManageHabits: () => setShowSettings(true),
						onLoadDefaults: () => setShowInitializer(true),
						showLoadDefaults: vm.hasNoHabits,
					})}
				</Group>
			</Flex>

			{/* Main Table - keep existing CSS structure for stability */}
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
									className={getDateColumnClass("col-day", isTodayDate, isSelected)}
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
													{vm.weekDates.map((date) => {
														const cellDisplay = vm.getCellDisplay(habit, date);
														const isTodayDate = isToday(date);
														const isSelected = Boolean(
															vm.selectedDate && isSameDay(date, vm.selectedDate),
														);
														const cellClass = [
															cellDisplay.className,
															getDateColumnClass("cell", isTodayDate, isSelected),
														]
															.filter(Boolean)
															.join(" ");
														return (
															<td
																key={date.toISOString()}
																className={cellClass}
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

			{/* Legend */}
			<Group gap="md" mt="md" p="xs" justify="center" wrap="wrap">
				<Text size="xs" c="dimmed">● = done</Text>
				<Text size="xs" c="dimmed">✓ = met target</Text>
				<Text size="xs" c="dimmed">⏰ = due today</Text>
				<Text size="xs" c="dimmed">→ = tomorrow</Text>
				<Text size="xs" c="dimmed">! = overdue</Text>
				<Text size="xs" c="dimmed">½ = partial</Text>
			</Group>

			{/* Summary Bar */}
			<Paper shadow="sm" p="md" mt="md" radius="md" withBorder>
				<Group gap="xl" wrap="wrap">
					<Group gap="xs">
						<Text size="sm" c="dimmed">Due Today:</Text>
						<Text size="sm" fw={600} c="blue">{vm.summaryStats.dueToday}</Text>
					</Group>
					<Group gap="xs">
						<Text size="sm" c="dimmed">Overdue:</Text>
						<Text size="sm" fw={600} c="red">{vm.summaryStats.overdue}</Text>
					</Group>
					<Group gap="xs">
						<Text size="sm" c="dimmed">Done Today:</Text>
						<Text size="sm" fw={600} c="green">{vm.summaryStats.doneToday}</Text>
					</Group>
					<Group gap="xs">
						<Text size="sm" c="dimmed">On Track:</Text>
						<Text size="sm" fw={600} c="teal">{vm.summaryStats.onTrack}</Text>
					</Group>
				</Group>
			</Paper>

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
		</Container>
	);
};
