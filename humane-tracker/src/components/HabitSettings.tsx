import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	type ExportData,
	exportAllData,
	generateExportFilename,
	importAllData,
	validateExportData,
} from "../services/dataService";
import { HabitService } from "../services/habitService";
import type { Habit } from "../types/habit";
import {
	buildCategoryInfo,
	extractCategories,
	migrateCategoryValue,
} from "../utils/categoryUtils";
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
		category: "Mobility",
		trackingType: "hybrid" as "binary" | "sets" | "hybrid",
		targetPerWeek: 3,
	});
	const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
		new Set(),
	);

	// Import/Export state
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importStatus, setImportStatus] = useState<string | null>(null);
	const [pendingImportData, setPendingImportData] = useState<ExportData | null>(
		null,
	);
	const [showImportConfirm, setShowImportConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const habitService = new HabitService();

	// Derive existing categories from habits
	const existingCategories = extractCategories(habits);

	// Group habits by category
	const habitsByCategory = existingCategories.reduce(
		(acc, category) => {
			acc[category] = habits.filter((h) => h.category === category);
			return acc;
		},
		{} as Record<string, Habit[]>,
	);

	useEffect(() => {
		loadHabits();
	}, [userId]);

	// Start with all categories collapsed after habits load
	useEffect(() => {
		if (habits.length > 0) {
			const allCategories = extractCategories(habits);
			setCollapsedCategories(new Set(allCategories));
		}
	}, [habits.length]); // Only run when habit count changes (initial load)

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

		if (!newHabit.category.trim()) {
			alert("Please enter a category");
			return;
		}

		try {
			await habitService.createHabit({
				name: newHabit.name.trim(),
				category: newHabit.category.trim(),
				trackingType: newHabit.trackingType,
				targetPerWeek: newHabit.targetPerWeek,
				userId,
			});

			// Reset form and reload habits
			setNewHabit({
				name: "",
				category: "Mobility",
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

	const toggleCategory = (category: string) => {
		setCollapsedCategories((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(category)) {
				newSet.delete(category);
			} else {
				newSet.add(category);
			}
			return newSet;
		});
	};

	// Import/Export handlers
	const handleExport = async () => {
		setIsExporting(true);
		setImportStatus(null);
		try {
			const data = await exportAllData();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = generateExportFilename();
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			setImportStatus(
				`Exported ${data.habits.length} habits and ${data.entries.length} entries`,
			);
		} catch (error) {
			console.error("Export failed:", error);
			setImportStatus("Export failed. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImportStatus(null);
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);

			if (!validateExportData(parsed)) {
				throw new Error("Invalid backup file format");
			}

			setPendingImportData(parsed);
			setShowImportConfirm(true);
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus(
				error instanceof SyntaxError
					? "Invalid JSON file"
					: "Import failed. Please check the file format.",
			);
		} finally {
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleImportConfirm = async (mode: "merge" | "replace") => {
		if (!pendingImportData) return;

		setIsImporting(true);
		setShowImportConfirm(false);
		try {
			const result = await importAllData(pendingImportData, mode);
			const modeLabel =
				mode === "replace" ? "Replaced all data with" : "Merged";
			setImportStatus(
				`${modeLabel} ${result.habitsImported} habits and ${result.entriesImported} entries`,
			);
			await loadHabits();
			onUpdate();
		} catch (error) {
			console.error("Import failed:", error);
			setImportStatus("Import failed. Please try again.");
		} finally {
			setIsImporting(false);
			setPendingImportData(null);
		}
	};

	const handleImportCancel = () => {
		setShowImportConfirm(false);
		setPendingImportData(null);
	};

	// Check if any habits need migration
	const habitsNeedingMigration = habits.filter(
		(h) => migrateCategoryValue(h.category) !== h.category,
	);
	const needsMigration = habitsNeedingMigration.length > 0;

	const [isMigrating, setIsMigrating] = useState(false);
	const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

	const handleMigrate = async () => {
		setIsMigrating(true);
		setMigrationStatus(null);
		try {
			let migratedCount = 0;
			for (const habit of habitsNeedingMigration) {
				const newCategory = migrateCategoryValue(habit.category);
				await habitService.updateHabit(habit.id, {
					category: newCategory,
					updatedAt: new Date(),
				});
				migratedCount++;
			}
			setMigrationStatus(
				`Migrated ${migratedCount} habits to new category names`,
			);
			await loadHabits();
			onUpdate();
		} catch (error) {
			console.error("Migration failed:", error);
			setMigrationStatus("Migration failed. Please try again.");
		} finally {
			setIsMigrating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="habit-settings-overlay">
				<div className="habit-settings-modal">
					<div className="modal-header">
						<h2>Manage Habits</h2>
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

	// Helper to render a single habit row
	const renderHabitRow = (habit: Habit) => {
		return (
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

					<div className="habit-type-field">
						<select
							value={
								(getHabitValue(habit, "trackingType") as string) || "hybrid"
							}
							onChange={(e) =>
								handleFieldChange(habit.id, "trackingType", e.target.value)
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
									Math.max(1, Math.min(7, parseInt(e.target.value) || 1)),
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
						✕
					</button>
				</div>
			</div>
		);
	};

	return (
		<div className="habit-settings-overlay">
			{/* Import Confirm Dialog */}
			{showImportConfirm && pendingImportData && (
				<div className="import-confirm-overlay">
					<div className="import-confirm-dialog">
						<h3>Import Data</h3>
						<p>
							Found <strong>{pendingImportData.habits.length}</strong> habits
							and <strong>{pendingImportData.entries.length}</strong> entries
						</p>
						<p className="import-date">
							Backup from{" "}
							{new Date(pendingImportData.exportedAt).toLocaleDateString()}
						</p>
						<div className="import-confirm-buttons">
							<button
								className="btn-merge"
								onClick={() => handleImportConfirm("merge")}
							>
								Merge (keep existing)
							</button>
							<button
								className="btn-replace"
								onClick={() => handleImportConfirm("replace")}
							>
								Replace all
							</button>
							<button className="btn-cancel" onClick={handleImportCancel}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="habit-settings-modal">
				<div className="modal-header">
					<h2>Manage Habits</h2>
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

									<input
										type="text"
										list="new-habit-category-options"
										placeholder="Category"
										value={newHabit.category}
										onChange={(e) =>
											setNewHabit({
												...newHabit,
												category: e.target.value,
											})
										}
										className="category-input"
									/>
									<datalist id="new-habit-category-options">
										{existingCategories.map((cat) => (
											<option key={cat} value={cat} />
										))}
									</datalist>

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
												category: "Mobility",
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

					{/* Habits grouped by category */}
					<div className="habits-list">
						{existingCategories.map((category) => {
							const categoryInfo = buildCategoryInfo(category);
							const categoryHabits = habitsByCategory[category] || [];
							const isCollapsed = collapsedCategories.has(category);

							return (
								<div key={category} className="category-group">
									<button
										className="category-header"
										onClick={() => toggleCategory(category)}
									>
										<span
											className={`category-arrow ${isCollapsed ? "collapsed" : ""}`}
										>
											▼
										</span>
										<span
											className="category-dot"
											style={{ background: categoryInfo.color }}
										/>
										<span className="category-name">{category}</span>
										<span className="category-count">
											({categoryHabits.length})
										</span>
									</button>

									{!isCollapsed && (
										<div className="category-habits">
											{categoryHabits.map(renderHabitRow)}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{habits.length === 0 && (
						<div className="empty-state">
							<p>No habits yet. Click "+ Add New Habit" to get started!</p>
						</div>
					)}

					{deletingHabits.size > 0 && (
						<div className="deletion-warning">
							{deletingHabits.size} habit{deletingHabits.size > 1 ? "s" : ""}{" "}
							marked for deletion. This will permanently delete all history.
						</div>
					)}

					{/* Migration Section - only show if needed */}
					{needsMigration && (
						<div className="migration-section">
							<div className="migration-info">
								<strong>{habitsNeedingMigration.length}</strong> habit
								{habitsNeedingMigration.length > 1 ? "s" : ""} use old category
								names
							</div>
							<button
								className="btn-migrate"
								onClick={handleMigrate}
								disabled={isMigrating}
							>
								{isMigrating ? "Migrating..." : "Migrate to New Names"}
							</button>
							{migrationStatus && (
								<div className="migration-status">{migrationStatus}</div>
							)}
						</div>
					)}

					{/* Import/Export Section */}
					<div className="import-export-section">
						<input
							type="file"
							ref={fileInputRef}
							accept=".json"
							onChange={handleFileChange}
							style={{ display: "none" }}
						/>
						<div className="import-export-buttons">
							<button
								className="btn-export"
								onClick={handleExport}
								disabled={isExporting}
							>
								{isExporting ? "Exporting..." : "↓ Export"}
							</button>
							<button
								className="btn-import"
								onClick={handleImportClick}
								disabled={isImporting}
							>
								{isImporting ? "Importing..." : "↑ Import"}
							</button>
						</div>
						{importStatus && (
							<div className="import-status">{importStatus}</div>
						)}
					</div>
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
