import type React from "react";
import { useEffect, useState } from "react";
import { HabitService } from "../services/habitService";
import { CATEGORIES, type Habit } from "../types/habit";
import "./HabitSettings.css";

interface HabitSettingsProps {
	userId: string;
	onClose: () => void;
	onUpdate: () => void;
}

const TRACKING_TYPES = [
	{ value: "binary", label: "Binary", icon: "✓" },
	{ value: "sets", label: "Sets", icon: "123" },
	{ value: "hybrid", label: "Hybrid", icon: "✓/123" },
];

export const HabitSettings: React.FC<HabitSettingsProps> = ({
	userId,
	onClose,
	onUpdate,
}) => {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [changes, setChanges] = useState<Record<string, Partial<Habit>>>({});
	const [deletingHabits, setDeletingHabits] = useState<Set<string>>(new Set());
	const [showAddNew, setShowAddNew] = useState(false);
	const [newHabit, setNewHabit] = useState({
		name: "",
		category: "mobility" as any,
		trackingType: "hybrid" as any,
		targetPerWeek: 3,
	});

	const habitService = new HabitService();

	useEffect(() => {
		loadHabits();
	}, [userId]);

	const loadHabits = async () => {
		try {
			setIsLoading(true);
			const userHabits = await habitService.getHabits(userId);
			// Sort by category then by name
			userHabits.sort((a, b) => {
				if (a.category !== b.category) {
					return a.category.localeCompare(b.category);
				}
				return a.name.localeCompare(b.name);
			});
			setHabits(userHabits);
		} catch (err) {
			console.error("Error loading habits:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFieldChange = (habitId: string, field: string, value: any) => {
		setChanges((prev) => ({
			...prev,
			[habitId]: {
				...prev[habitId],
				[field]: value,
			},
		}));
	};

	const getHabitValue = (habit: Habit, field: keyof Habit) => {
		if (changes[habit.id] && field in changes[habit.id]) {
			return changes[habit.id][
				field as keyof (typeof changes)[typeof habit.id]
			];
		}
		return habit[field];
	};

	const handleDeleteToggle = (habitId: string) => {
		setDeletingHabits((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(habitId)) {
				newSet.delete(habitId);
			} else {
				newSet.add(habitId);
			}
			return newSet;
		});
	};

	const handleAddNewHabit = async () => {
		if (!newHabit.name.trim()) {
			alert("Please enter a habit name");
			return;
		}

		try {
			await habitService.createHabit({
				name: newHabit.name.trim(),
				category: newHabit.category,
				trackingType: newHabit.trackingType,
				targetPerWeek: newHabit.targetPerWeek,
				userId,
			});

			// Reset form and reload habits
			setNewHabit({
				name: "",
				category: "mobility",
				trackingType: "hybrid",
				targetPerWeek: 3,
			});
			setShowAddNew(false);
			await loadHabits();
		} catch (err) {
			console.error("Error creating habit:", err);
			alert("Failed to create habit. Please try again.");
		}
	};

	const handleSaveAll = async () => {
		try {
			// Save changes
			for (const [habitId, habitChanges] of Object.entries(changes)) {
				if (Object.keys(habitChanges).length > 0) {
					await habitService.updateHabit(habitId, {
						...habitChanges,
						updatedAt: new Date(),
					});
				}
			}

			// Delete marked habits
			const habitsToDelete = Array.from(deletingHabits);
			for (const habitId of habitsToDelete) {
				// Delete all entries for this habit first
				const entries = await habitService.getEntriesForHabit(habitId);
				for (const entry of entries) {
					await habitService.deleteEntry(entry.id);
				}
				// Then delete the habit
				await habitService.deleteHabit(habitId);
			}

			onUpdate();
			onClose();
		} catch (err) {
			console.error("Error saving changes:", err);
		}
	};

	const hasChanges = Object.keys(changes).length > 0 || deletingHabits.size > 0;

	if (isLoading) {
		return (
			<div className="habit-settings-overlay">
				<div className="habit-settings-modal">
					<div className="modal-header">
						<h2>⚙️ Manage Habits</h2>
						<button className="close-btn" onClick={onClose}>
							✕
						</button>
					</div>
					<div className="modal-body">
						<div className="loading">Loading habits...</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="habit-settings-overlay">
			<div className="habit-settings-modal">
				<div className="modal-header">
					<h2>⚙️ Manage Habits</h2>
					<button className="close-btn" onClick={onClose}>
						✕
					</button>
				</div>

				<div className="modal-body">
					{/* Add New Habit Section */}
					<div className="add-new-section">
						{!showAddNew ? (
							<button
								className="add-new-btn"
								onClick={() => setShowAddNew(true)}
							>
								+ Add New Habit
							</button>
						) : (
							<div className="add-new-form">
								<div className="form-row">
									<input
										type="text"
										placeholder="Habit name"
										value={newHabit.name}
										onChange={(e) =>
											setNewHabit({ ...newHabit, name: e.target.value })
										}
										className="new-habit-input"
										autoFocus
									/>

									<select
										value={newHabit.category}
										onChange={(e) =>
											setNewHabit({
												...newHabit,
												category: e.target.value as any,
											})
										}
										className="category-select"
									>
										{CATEGORIES.map((cat) => (
											<option key={cat.value} value={cat.value}>
												{cat.label}
											</option>
										))}
									</select>

									<select
										value={newHabit.trackingType}
										onChange={(e) =>
											setNewHabit({
												...newHabit,
												trackingType: e.target.value as any,
											})
										}
										className="type-select"
										title="Tracking Type"
									>
										{TRACKING_TYPES.map((type) => (
											<option key={type.value} value={type.value}>
												{type.icon} {type.label}
											</option>
										))}
									</select>

									<div className="target-field">
										<input
											type="number"
											value={newHabit.targetPerWeek}
											onChange={(e) =>
												setNewHabit({
													...newHabit,
													targetPerWeek: Math.max(
														1,
														Math.min(7, parseInt(e.target.value) || 1),
													),
												})
											}
											className="target-input"
											min="1"
											max="7"
											title="Days per week"
										/>
										<span className="target-label">days/wk</span>
									</div>

									<button className="btn-add" onClick={handleAddNewHabit}>
										Add
									</button>

									<button
										className="btn-cancel-add"
										onClick={() => {
											setShowAddNew(false);
											setNewHabit({
												name: "",
												category: "mobility",
												trackingType: "hybrid",
												targetPerWeek: 3,
											});
										}}
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="habits-list">
						{habits.map((habit) => (
							<div
								key={habit.id}
								className={`habit-item ${deletingHabits.has(habit.id) ? "deleting" : ""}`}
							>
								<div className="habit-row">
									<div className="habit-name-field">
										<input
											type="text"
											value={getHabitValue(habit, "name") as string}
											onChange={(e) =>
												handleFieldChange(habit.id, "name", e.target.value)
											}
											className="habit-name-input"
											placeholder="Habit name"
										/>
									</div>

									<div className="habit-category-field">
										<select
											value={getHabitValue(habit, "category") as string}
											onChange={(e) =>
												handleFieldChange(habit.id, "category", e.target.value)
											}
											className="category-select"
										>
											{CATEGORIES.map((cat) => (
												<option key={cat.value} value={cat.value}>
													{cat.label}
												</option>
											))}
										</select>
									</div>

									<div className="habit-type-field">
										<select
											value={
												(getHabitValue(habit, "trackingType") as string) ||
												"hybrid"
											}
											onChange={(e) =>
												handleFieldChange(
													habit.id,
													"trackingType",
													e.target.value,
												)
											}
											className="type-select"
											title="Tracking Type"
										>
											{TRACKING_TYPES.map((type) => (
												<option key={type.value} value={type.value}>
													{type.icon} {type.label}
												</option>
											))}
										</select>
									</div>

									<div className="habit-target-field">
										<input
											type="number"
											value={getHabitValue(habit, "targetPerWeek") as number}
											onChange={(e) =>
												handleFieldChange(
													habit.id,
													"targetPerWeek",
													Math.max(
														1,
														Math.min(7, parseInt(e.target.value) || 1),
													),
												)
											}
											className="target-input"
											min="1"
											max="7"
											title="Days per week"
										/>
										<span className="target-label">/wk</span>
									</div>

									<button
										className={`delete-btn ${deletingHabits.has(habit.id) ? "active" : ""}`}
										onClick={() => handleDeleteToggle(habit.id)}
										title={
											deletingHabits.has(habit.id)
												? "Click to cancel deletion"
												: "Mark for deletion"
										}
									>
										🗑️
									</button>
								</div>
							</div>
						))}
					</div>

					{habits.length === 0 && (
						<div className="empty-state">
							<p>
								No habits yet. Close this window and click "+ Add Habit" to get
								started!
							</p>
						</div>
					)}

					{deletingHabits.size > 0 && (
						<div className="deletion-warning">
							⚠️ {deletingHabits.size} habit{deletingHabits.size > 1 ? "s" : ""}{" "}
							marked for deletion. This will permanently delete all history.
						</div>
					)}
				</div>

				<div className="modal-footer">
					<button className="btn-cancel" onClick={onClose}>
						Cancel
					</button>
					<button
						className="btn-save"
						onClick={handleSaveAll}
						disabled={!hasChanges}
					>
						{hasChanges
							? `Save Changes (${Object.keys(changes).length + deletingHabits.size})`
							: "No Changes"}
					</button>
				</div>
			</div>
		</div>
	);
};
